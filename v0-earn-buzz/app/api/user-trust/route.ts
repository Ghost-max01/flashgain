import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export async function POST(req: NextRequest){
  try{
    const { userId, trustScore } = await req.json();
    if(!userId || typeof trustScore !== "number") return NextResponse.json({error:"Missing"}, {status:400});
    try{
      const supabase: any = getSupabaseAdmin();
      if(supabase) await supabase.from("users").update({ trust_score: Math.floor(trustScore) }).eq("id", userId);
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
