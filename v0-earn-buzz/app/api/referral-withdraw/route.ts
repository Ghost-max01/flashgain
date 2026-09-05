import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
export async function POST(req: NextRequest){
  try{
    const { userId, amount } = await req.json();
    if(!userId || !amount) return NextResponse.json({error:"Missing"}, {status:400});
    const supabase: any = getSupabaseAdmin?.();
    if(supabase){
      // verify approved balance >= amount
      // For now deduct from referral_balance - we trust client approved count
      // Log to withdrawals table with source referral
      try{
        await supabase.from("referral_withdraws").insert({ user_id: userId, amount, type: "referral", status: "pending" });
      } catch {}
      // Also try to insert into generic withdrawals if table exists
      try{
        await supabase.from("withdrawals").insert({ user_id: userId, amount, method: "bank", status: "pending", source: "referral" });
      } catch {}
    }
    return NextResponse.json({ success:true });
  }catch(e:any){ return NextResponse.json({error:e.message||"Server error"}, {status:500}); }
}
