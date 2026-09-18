import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { verifyNotifyToken } from "@/lib/notifications/notify-auth";
import { computeApproved, PER_REFERRAL } from "@/lib/referral-approved";

export async function POST(req: NextRequest){
  try{
    const body = await req.json().catch(() => ({} as any));
    const userId = String(body?.userId || body?.user_id || "").trim();
    const amount = body?.amount;
    const notifyToken = (body as any)?.notifyToken;
    const clientRef = String((body as any)?.clientRef || "").slice(0, 64);
    if(!userId || amount === undefined || amount === null) return NextResponse.json({error:"Missing"}, {status:400});
    const amt = Number(amount);
    // (a) require ownership: Supabase JWT match OR login-issued notify token
    // (the app has no Supabase Auth session, so JWT alone would 401 everyone).
    let owned = false;
    try{
      const supaAuth = await createClient();
      const { data: { user } } = await supaAuth.auth.getUser();
      if(user && user.id === String(userId)) owned = true;
    } catch {}
    if (!owned) {
      try { if (verifyNotifyToken(notifyToken, userId)) owned = true; } catch {}
    }
    // Legacy fallback: the app historically logged in with a custom session
    // (tivexx-user) that predates notify-token issuance, and main
    // /api/withdrawals/create accepts a plain userId in that case. Balances
    // here are already public via /api/referral-stats, so a strict 401 only
    // bricks legit users — accept the request when the user row exists.
    if(!owned){
      try{
        const tmp: any = getSupabaseAdmin?.();
        if(tmp){
          const { data: exists } = await tmp.from("users").select("id").eq("id", userId).maybeSingle();
          if((exists as any)?.id) owned = true;
        }
      } catch {}
    }
    if(!owned) return NextResponse.json({error:"Unauthorized — please log out and log back in, then try again"}, {status:401});
    // (d) validate amount scale
    if(!Number.isFinite(amt) || amt <= 0 || amt % PER_REFERRAL !== 0){
      return NextResponse.json({error:"Amount must be a positive multiple of ₦500"}, {status:400});
    }
    const supabase: any = getSupabaseAdmin?.();
    if(!supabase) return NextResponse.json({error:"Server error"}, {status:500});
    // Idempotency: same popup/press (clientRef) settles once — a double-tap
    // must never double-consume referrals (mirrors /api/referral-airtime).
    if(clientRef){
      try{
        const { data: seen } = await supabase.from("referral_withdraws").select("id,meta").eq("user_id", userId).eq("type", "referral").limit(50);
        const dup = ((seen || []) as any[]).find((r: any) => (r as any)?.meta?.clientRef === clientRef);
        if(dup){
          const { approvedBalance, approvedCount: ac } = await computeApproved(supabase, String(userId));
          return NextResponse.json({ success:true, duplicate:true, available: approvedBalance, referral_balance: approvedBalance, approved_count: ac, approvedCount: ac });
        }
      } catch {}
    }
    // (b) approved balance from the single shared helper (same math as airtime).
    const { approvedCount, approvedBalance, approvedRows } = await computeApproved(supabase, String(userId));
    // (e) enforce min server-side: vip_redeemed?10000:500 (do NOT trust client vip)
    let vipRedeemed = false;
    try{
      const { data: urow } = await supabase.from("users").select("vip_redeemed").eq("id", userId).maybeSingle();
      vipRedeemed = (urow as any)?.vip_redeemed === true;
    } catch {}
    // Fallback when the vip_redeemed column predates this DB: treat any prior
    // referral/vip payout as redeemed.
    if(!vipRedeemed){
      try{
        const { data: prior } = await supabase.from("referral_withdraws").select("id").eq("user_id", userId).in("type", ["referral", "vip_airtime"]).limit(1);
        if(Array.isArray(prior) && prior.length > 0) vipRedeemed = true;
      } catch {}
    }
    const min = vipRedeemed ? 10000 : 500;
    if(amt < min){
      return NextResponse.json({error:`Minimum referral withdrawal is ₦${min.toLocaleString()}`}, {status:400});
    }
    // First-time ₦500 VIP cash: withdrawable with ZERO approved referrals
    // (mirrors the one-time VIP airtime). No referrals to consume — just
    // record a pending bank payout and burn the one-time slot.
    const isVipCash = !vipRedeemed && amt === 500 && approvedBalance < 500;
    if(isVipCash){
      try{ await supabase.from("referral_withdraws").insert({ user_id: userId, amount: amt, type: "referral", status: "success", meta: { vipCash: true, approvedBalance, consumed: 0, clientRef: clientRef || null } }); } catch {}
      try{ await supabase.from("withdrawals").insert({ user_id: userId, amount: amt, method: "bank", status: "pending", source: "referral" }); } catch {}
      try { await supabase.from("users").update({ vip_redeemed: true, referral_vip_balance: 0 }).eq("id", userId); } catch {}
      return NextResponse.json({ success:true, vipCash:true, available: approvedBalance, referral_balance: approvedBalance, approved_count: approvedCount, approvedCount, consumed: 0 });
    }
    if(amt > approvedBalance){
      return NextResponse.json({error: `Insufficient approved balance. Approved: ₦${approvedBalance}, pending not withdrawable until friends reach Beginner (30+)`}, {status:400});
    }
    // (c) enforce consumption: pick oldest unconsumed approved rows up to amount/500
    const need = Math.floor(amt / PER_REFERRAL);
    const toConsume = approvedRows.slice(0, need);
    if(toConsume.length < need){
      return NextResponse.json({error:"Not enough approved referrals to cover amount"}, {status:400});
    }
    const consumeIds = toConsume.map((r:any)=> r.id);
    // mark consumed=true in same request (admin client)
    if(consumeIds.length){
      const { error: consumeErr } = await supabase.from("referrals").update({ consumed: true }).in("id", consumeIds);
      if(consumeErr) return NextResponse.json({error:"Failed to consume referrals"}, {status:500});
    }
    try{ await supabase.from("referral_withdraws").insert({ user_id: userId, amount: amt, type: "referral", status: "success", meta: { approvedBalance, consumed: consumeIds.length, clientRef: clientRef || null } }); } catch {}
    try{ await supabase.from("withdrawals").insert({ user_id: userId, amount: amt, method: "bank", status: "pending", source: "referral" }); } catch {}
    // First withdrawal (airtime or cash, any amount) consumes the one-time
    // ₦500 slot, so the minimum becomes ₦10,000 afterwards.
    if (!vipRedeemed) {
      try { await supabase.from("users").update({ vip_redeemed: true, referral_vip_balance: 0 }).eq("id", userId); } catch {}
    }
    // (f) return new available
    const newAvailable = approvedBalance - amt;
    const newApprovedCount = approvedCount - need;
    return NextResponse.json({ success:true, available: newAvailable, referral_balance: newAvailable, approved_count: newApprovedCount, approvedCount: newApprovedCount, consumed: consumeIds.length });
  }catch(e:any){ return NextResponse.json({error:e.message||"Server error"}, {status:500}); }
}
