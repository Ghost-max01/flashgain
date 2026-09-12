import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

// Server-side trust recompute. Mirrors lib/trust-score thresholds without
// importing the "use client" module:
//   timePoints = floor(timeMs / 5min) * 2  (unknown server-side -> 0)
//   refPoints  = floor(referralCount / 5) * 2 (capped)
//   navPoints  = floor(navCount / 5)         (unknown server-side -> 0)
//   payPoints  = payCount * 5                (capped)
//   taskPoints = floor(taskCount / 10) * 2   (capped)
//   tapPoints  = floor(tapCount / 50)        (unknown server-side -> 0)
// Beginner threshold: score >= 30.
const REF_POINTS_CAP = 20;
const PAY_POINTS_CAP = 50;
const TASK_POINTS_CAP = 20;

function computeServerScore(referralCount: number, payCount: number, taskCount: number): number {
  const refPoints = Math.min(Math.floor(Math.max(0, referralCount) / 5) * 2, REF_POINTS_CAP);
  const payPoints = Math.min(Math.max(0, payCount) * 5, PAY_POINTS_CAP);
  const taskPoints = Math.min(Math.floor(Math.max(0, taskCount) / 10) * 2, TASK_POINTS_CAP);
  return refPoints + payPoints + taskPoints;
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

async function recomputeScore(supabase: any, userId: string): Promise<{ score: number; referralCount: number; payCount: number; taskCount: number }> {
  // Referrals: approved count uses trust>=30 truth for others; referralCount
  // for scoring uses total referrals by this user.
  let referralCount = 0;
  try {
    const { data: refs } = await supabase.from("referrals").select("id").eq("referrer_id", userId).limit(5000);
    referralCount = refs?.length ?? 0;
  } catch {}

  // Payments: best-effort from transactions table if it exists.
  let payCount = 0;
  try {
    const { data: txs, error } = await supabase.from("transactions").select("id").eq("user_id", userId).limit(5000);
    if (!error) payCount = txs?.length ?? 0;
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

  return { score: computeServerScore(referralCount, payCount, taskCount), referralCount, payCount, taskCount };
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
        const { score } = await recomputeScore(supabase, userId);
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
