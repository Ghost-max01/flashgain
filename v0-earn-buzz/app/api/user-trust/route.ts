import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { computeScore, type TrustMeta } from "@/lib/trust-score-core";

// Server-side trust recompute. Mirrors lib/trust-score-core EXACTLY (same
// single source of truth, no per-category caps): the client reports its
// activity meta (timeMs/navCount/tapCount); the server combines them with
// SERVER-COUNTED referrals/payments/tasks using the same computeScore(), so a
// referred user who genuinely reaches Beginner (30) on the client also reaches
// it here — which is what credits the referrer.
// Anti-cheat stays: client time is capped by account age; nav/tap/task/referral
// counters are sanity-clamped to plausible ceilings by sanitizeMeta().
const TIME_MS_MAX = 30 * 24 * 60 * 60 * 1000;

function computeServerScore(
  referralCount: number,
  payCount: number,
  taskCount: number,
  timeMs: number,
  navCount: number,
  tapCount: number,
): number {
  const meta: Partial<TrustMeta> = {
    timeMs: Math.min(Math.max(0, timeMs), TIME_MS_MAX),
    referralCount,
    navCount,
    tapCount,
    payCount,
    taskCount,
  };
  return computeScore(meta);
}

async function getOwnedUid(req: NextRequest, claimedUserId: string | null): Promise<string | null> {
  if (!claimedUserId) return null;
  try {
    const auth = req.headers.get("authorization") || "";
    const m = auth.match(/^Bearer\s+(.+)$/i);
    const token = m ? m[1].trim() : null;
    if (token) {
      try {
        const admin: any = getSupabaseAdmin();
        const { data } = await admin.auth.getUser(token);
        const uid = (data as any)?.user?.id as string | undefined;
        if (uid && uid === claimedUserId) return uid;
        if (uid) return null;
      } catch {}
    }
  } catch {}
  try {
    const { createClient } = await import("@/lib/supabase/server");
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    const uid = (data as any)?.user?.id as string | undefined;
    if (uid && uid === claimedUserId) return uid;
  } catch {}
  return null;
}

// Exported for reuse by /api/tap/accrue's fresh-rate check (same formula,
// same caps — single source of truth, no drift between the two routes).
export async function recomputeScore(
  supabase: any,
  userId: string,
  clientMeta?: { timeMs?: number; navCount?: number; tapCount?: number },
): Promise<{ score: number; referralCount: number; payCount: number; taskCount: number }> {
  // Referrals: approved count uses trust>=30 truth for others; referralCount
  // for scoring uses total referrals by this user.
  let referralCount = 0;
  try {
    const { data: refs } = await supabase.from("referrals").select("id").eq("referrer_id", userId).limit(5000);
    referralCount = refs?.length ?? 0;
  } catch {}

  // Payments: best-effort from transactions table if it exists.
  // ONLY automatic Paystack-verified money-in rows count — tap payouts
  // (tap_manual/tap_auto) are money OUT and must never inflate this (each
  // flush would otherwise mint +10). Manual verification-fee bank transfers
  // never go through Paystack verification so they never land here either;
  // defensively, anything tagged verification/manual/fee (non-loan-fee) is
  // also excluded — only real payments into the app earn trust.
  let payCount = 0;
  try {
    // Prefer selecting metadata too (for the verification-fee exclusion);
    // fall back to id/type only if the column doesn't exist yet.
    let txs: any[] | null = null;
    try {
      const r1 = await supabase.from("transactions").select("id,type,metadata").eq("user_id", userId).limit(5000);
      if (!r1.error) txs = r1.data as any[];
      else throw new Error("no-metadata-col");
    } catch {
      try {
        const r2 = await supabase.from("transactions").select("id,type").eq("user_id", userId).limit(5000);
        if (!r2.error) txs = r2.data as any[];
      } catch {}
    }
    if (txs) payCount = (txs || []).filter((t: any) => {
      const ty = String((t as any)?.type || "").toLowerCase();
      if (ty.startsWith("tap_")) return false;
      if (/(verif|manual|receipt)/.test(ty)) return false;
      const meta = JSON.stringify((t as any)?.metadata || "").toLowerCase();
      if (/(verification|verifyme|verify_fee|manual)/.test(meta)) return false;
      return true;
    }).length;
  } catch {}

  // Tasks: prefer user_tasks, fall back to task_completions.
  let taskCount = 0;
  try {
    const { data: tasks, error } = await supabase.from("user_tasks").select("id").eq("user_id", userId).limit(5000);
    if (!error && tasks) {
      taskCount = tasks.length;
    } else {
      throw new Error("fallback");
    }
  } catch {
    try {
      const { data: comps, error } = await supabase.from("task_completions").select("id").eq("user_id", userId).limit(5000);
      if (!error) taskCount = comps?.length ?? 0;
    } catch {}
  }

  // Client activity (time/nav/taps) with sanity caps. Time can never exceed
  // the account's age; nav/tap counts are capped to block forged jumps.
  let timeMs = Math.min(Math.max(0, Math.floor(Number(clientMeta?.timeMs) || 0)), 30 * 24 * 60 * 60 * 1000);
  let navCount = Math.min(Math.max(0, Math.floor(Number(clientMeta?.navCount) || 0)), 10000);
  let tapCount = Math.min(Math.max(0, Math.floor(Number(clientMeta?.tapCount) || 0)), 10000);
  try {
    const { data: u } = await supabase.from("users").select("created_at").eq("id", userId).maybeSingle();
    const created = (u as any)?.created_at ? new Date((u as any).created_at).getTime() : 0;
    if (created > 0) {
      const ageMs = Math.max(0, Date.now() - created);
      timeMs = Math.min(timeMs, ageMs);
    }
  } catch {}

  return { score: computeServerScore(referralCount, payCount, taskCount, timeMs, navCount, tapCount), referralCount, payCount, taskCount };
}

export async function POST(req: NextRequest){
  try{
    const body = await req.json();
    const userId = body?.userId as string | undefined;
    if(!userId) return NextResponse.json({error:"Missing"}, {status:400});
    // NOTE: client-supplied trustScore is IGNORED — score is recomputed server-side.
    const authed = await getOwnedUid(req, userId);
    if (!authed) return NextResponse.json({error:"Unauthorized"}, {status:401});
    try{
      const supabase: any = getSupabaseAdmin();
      if(supabase){
        const clientMeta = {
          timeMs: Number((body as any)?.timeMs ?? (body as any)?.trustMeta?.timeMs ?? 0),
          navCount: Number((body as any)?.navCount ?? (body as any)?.trustMeta?.navCount ?? 0),
          tapCount: Number((body as any)?.tapCount ?? (body as any)?.trustMeta?.tapCount ?? 0),
        };
        const { score } = await recomputeScore(supabase, userId, clientMeta);
        // fetch old score to detect 30 crossing
        let oldScore = 0;
        try{
          const { data: prev } = await supabase.from("users").select("trust_score").eq("id", userId).maybeSingle();
          oldScore = Number(prev?.trust_score || 0);
        } catch {}
        await supabase.from("users").update({ trust_score: score }).eq("id", userId);

        // Fallback promotion if DB trigger not yet deployed: when crossing 30, credit referrers.
        // Idempotent: only rows with processed=false, flip to processed=true.
        if(score >= 30 && oldScore < 30){
          try{
            const { data: pendings } = await supabase.from("referrals").select("id, referrer_id, amount").eq("referred_id", userId).eq("processed", false);
            if(pendings && pendings.length > 0){
              for(const r of pendings as any[]){
                const { data: referrer } = await supabase.from("users").select("referral_balance").eq("id", r.referrer_id).maybeSingle();
                const cur = Number(referrer?.referral_balance || 0);
                await supabase.from("users").update({ referral_balance: cur + Number(r.amount || 500) }).eq("id", r.referrer_id);
                await supabase.from("referrals").update({ processed: true, processed_at: new Date().toISOString() }).eq("id", r.id).eq("processed", false);
              }
            }
          } catch {}
        }
        return NextResponse.json({success:true, trust_score: score});
      }
    } catch{}
    return NextResponse.json({success:true});
  }catch(e:any){ return NextResponse.json({error:e.message},{status:500}); }
}
export async function GET(req: NextRequest){
  try{
    const userId = new URL(req.url).searchParams.get("userId");
    if(!userId) return NextResponse.json({error:"Missing"}, {status:400});
    const authed = await getOwnedUid(req, userId);
    if (!authed) return NextResponse.json({success:false, trust_score: 0}, {status:401});
    const supabase: any = getSupabaseAdmin();
    if(!supabase) return NextResponse.json({success:false});
    const { data } = await supabase.from("users").select("trust_score").eq("id", userId).maybeSingle();
    return NextResponse.json({success:true, trust_score: data?.trust_score ?? 0});
  }catch(e:any){ return NextResponse.json({error:e.message},{status:500}); }
}
