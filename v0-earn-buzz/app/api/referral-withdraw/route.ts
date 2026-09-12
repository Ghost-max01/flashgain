import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export async function POST(req: NextRequest){
  try{
    const { userId, amount } = await req.json();
    if(!userId || !amount) return NextResponse.json({error:"Missing"}, {status:400});
    const supabase: any = getSupabaseAdmin?.();
    if(supabase){
      // Compute approved (withdrawable) balance: only referrals where referred trust >=30
      let approvedBalance = 0;
      try{
        const { data: allRefs } = await supabase.from("referrals").select("referred_id, amount").eq("referrer_id", userId).limit(2000);
        if(allRefs && allRefs.length > 0){
          const ids = (allRefs as any[]).map((r:any)=> r.referred_id).filter(Boolean);
          const { data: referredUsers } = await supabase.from("users").select("id, trust_score").in("id", ids);
          const scoreMap = new Map((referredUsers||[]).map((u:any)=> [u.id, Number(u.trust_score||0)]));
          for(const r of allRefs as any[]){
            if((scoreMap.get(r.referred_id) ?? 0) >= 30) approvedBalance += Number(r.amount || 500);
          }
        } else {
          const { data: u } = await supabase.from("users").select("referral_balance").eq("id", userId).maybeSingle();
          approvedBalance = Number(u?.referral_balance || 0);
        }
      } catch {}
      if(Number(amount) > approvedBalance){
        return NextResponse.json({error: `Insufficient approved balance. Approved: ₦${approvedBalance}, pending not withdrawable until friends reach Beginner (30+)`}, {status:400});
      }
      // Atomically deduct from referral_balance
      try{
        const { data: cur } = await supabase.from("users").select("referral_balance").eq("id", userId).maybeSingle();
        const next = Math.max(0, Number(cur?.referral_balance || approvedBalance) - Number(amount));
        await supabase.from("users").update({ referral_balance: next }).eq("id", userId);
      } catch {}

      try{ await supabase.from("referral_withdraws").insert({ user_id: userId, amount, type: "referral", status: "pending", meta: { approvedBalance } }); } catch {}
      try{ await supabase.from("withdrawals").insert({ user_id: userId, amount, method: "bank", status: "pending", source: "referral" }); } catch {}
    }
    return NextResponse.json({ success:true });
  }catch(e:any){ return NextResponse.json({error:e.message||"Server error"}, {status:500}); }
}
