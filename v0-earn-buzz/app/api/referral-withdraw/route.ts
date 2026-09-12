import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

const PER_REFERRAL = 500;

export async function POST(req: NextRequest){
  try{
    const { userId, amount } = await req.json();
    if(!userId || amount === undefined || amount === null) return NextResponse.json({error:"Missing"}, {status:400});
    const amt = Number(amount);
    // (a) require JWT ownership (user-balance pattern)
    try{
      const supaAuth = await createClient();
      const { data: { user } } = await supaAuth.auth.getUser();
      if(!user || user.id !== String(userId)) return NextResponse.json({error:"Unauthorized"}, {status:401});
    } catch { return NextResponse.json({error:"Unauthorized"}, {status:401}); }
    // (d) validate amount scale
    if(!Number.isFinite(amt) || amt <= 0 || amt % PER_REFERRAL !== 0){
      return NextResponse.json({error:"Amount must be a positive multiple of ₦500"}, {status:400});
    }
    const supabase: any = getSupabaseAdmin?.();
    if(!supabase) return NextResponse.json({error:"Server error"}, {status:500});
    // (b) compute approved from trust>=30 via admin client (normalize legacy 10000 → 500 via min)
    const { data: allRefs } = await supabase.from("referrals").select("id, referred_id, amount, consumed, created_at").eq("referrer_id", userId).order("created_at", { ascending: true }).limit(2000);
    const rows = (allRefs as any[]) || [];
    let approvedRows: any[] = [];
    if(rows.length > 0){
      const ids = rows.map((r:any)=> r.referred_id).filter(Boolean);
      let scoreMap = new Map<string, number>();
      if(ids.length){
        const { data: referredUsers } = await supabase.from("users").select("id, trust_score").in("id", ids);
        scoreMap = new Map((referredUsers||[]).map((u:any)=> [u.id, Number(u.trust_score||0)]));
      }
      for(const r of rows){
        if(r.consumed === true) continue;
        if((scoreMap.get(r.referred_id) ?? 0) >= 30) approvedRows.push(r);
      }
    }
    const approvedCount = approvedRows.length;
    const approvedBalance = approvedCount * PER_REFERRAL;
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
    // (f) return new available
    const newAvailable = approvedBalance - amt;
    const newApprovedCount = approvedCount - need;
    return NextResponse.json({ success:true, available: newAvailable, referral_balance: newAvailable, approved_count: newApprovedCount, approvedCount: newApprovedCount, consumed: consumeIds.length });
  }catch(e:any){ return NextResponse.json({error:e.message||"Server error"}, {status:500}); }
}
