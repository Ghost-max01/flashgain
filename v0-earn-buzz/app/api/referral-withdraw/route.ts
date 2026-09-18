import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { verifyNotifyToken } from "@/lib/notifications/notify-auth";
import { computeApproved, PER_REFERRAL } from "@/lib/referral-approved";

export async function POST(req: NextRequest){
  try{
    const { userId, amount, notifyToken } = await req.json();
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
    if(!owned) return NextResponse.json({error:"Unauthorized"}, {status:401});
    // (d) validate amount scale
    if(!Number.isFinite(amt) || amt <= 0 || amt % PER_REFERRAL !== 0){
      return NextResponse.json({error:"Amount must be a positive multiple of ₦500"}, {status:400});
    }
    const supabase: any = getSupabaseAdmin?.();
    if(!supabase) return NextResponse.json({error:"Server error"}, {status:500});
    // (b) approved balance from the single shared helper (same math as airtime).
    const { approvedCount, approvedBalance, approvedRows } = await computeApproved(supabase, String(userId));
    if(amt > approvedBalance){
      return NextResponse.json({error: `Insufficient approved balance. Approved: ₦${approvedBalance}, pending not withdrawable until friends reach Beginner (30+)`}, {status:400});
    }
    // (e) enforce min server-side: vip_redeemed?10000:500 (do NOT trust client vip)
    let vipRedeemed = false;
    try{
      const { data: urow } = await supabase.from("users").select("vip_redeemed").eq("id", userId).maybeSingle();
      vipRedeemed = (urow as any)?.vip_redeemed === true;
    } catch {}
    const min = vipRedeemed ? 10000 : 500;
    if(amt < min){
      return NextResponse.json({error:`Minimum referral withdrawal is ₦${min.toLocaleString()}`}, {status:400});
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
    try{ await supabase.from("referral_withdraws").insert({ user_id: userId, amount: amt, type: "referral", status: "success", meta: { approvedBalance, consumed: consumeIds.length } }); } catch {}
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
