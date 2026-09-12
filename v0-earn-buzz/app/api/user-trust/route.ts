import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export async function POST(req: NextRequest){
  try{
    const { userId, trustScore } = await req.json();
    if(!userId || typeof trustScore !== "number") return NextResponse.json({error:"Missing"}, {status:400});
    const score = Math.floor(trustScore);
    try{
      const supabase: any = getSupabaseAdmin();
      if(supabase){
        // fetch old score to detect 30 crossing
        let oldScore = 0;
        try{
          const { data: prev } = await supabase.from("users").select("trust_score").eq("id", userId).maybeSingle();
          oldScore = Number(prev?.trust_score || 0);
        } catch {}
        await supabase.from("users").update({ trust_score: score }).eq("id", userId);

        // Fallback promotion if DB trigger not yet deployed: when crossing 30, credit referrers
        if(score >= 30 && oldScore < 30){
          try{
            const { data: pendings } = await supabase.from("referrals").select("id, referrer_id, amount").eq("referred_id", userId).eq("processed", false);
            if(pendings && pendings.length > 0){
              for(const r of pendings as any[]){
                const { data: referrer } = await supabase.from("users").select("referral_balance").eq("id", r.referrer_id).maybeSingle();
                const cur = Number(referrer?.referral_balance || 0);
                await supabase.from("users").update({ referral_balance: cur + Number(r.amount || 500) }).eq("id", r.referrer_id);
                await supabase.from("referrals").update({ processed: true, processed_at: new Date().toISOString() }).eq("id", r.id);
              }
            }
          } catch {}
        }
      }
    } catch{}
    return NextResponse.json({success:true});
  }catch(e:any){ return NextResponse.json({error:e.message},{status:500}); }
}
export async function GET(req: NextRequest){
  try{
    const userId = new URL(req.url).searchParams.get("userId");
    if(!userId) return NextResponse.json({error:"Missing"}, {status:400});
    const supabase: any = getSupabaseAdmin();
    if(!supabase) return NextResponse.json({success:false});
    const { data } = await supabase.from("users").select("trust_score").eq("id", userId).maybeSingle();
    return NextResponse.json({success:true, trust_score: data?.trust_score ?? 0});
  }catch(e:any){ return NextResponse.json({error:e.message},{status:500}); }
}
