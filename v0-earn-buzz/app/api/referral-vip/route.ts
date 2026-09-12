import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export async function POST(req: NextRequest) {
  try {
    const { userId } = await req.json();
    if (!userId) return NextResponse.json({ error: "Missing userId" }, { status: 400 });
    // Authenticated uid required
    try{
      const supaAuth = await createClient();
      const { data: { user } } = await supaAuth.auth.getUser();
      if(!user || user.id !== String(userId)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    } catch { return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); }
    const supabase: any = getSupabaseAdmin();
    // read users.vip_redeemed row; if already redeemed return 409 (no re-mint)
    try{
      const { data: row } = await supabase.from("users").select("vip_redeemed").eq("id", userId).maybeSingle();
      if((row as any)?.vip_redeemed === true) return NextResponse.json({ error: "VIP already redeemed" }, { status: 409 });
    } catch {}
    // new-browser mint requires zero prior VIP row (check referral_withdraws type vip_airtime for user) else 409
    try{
      const { data: prior } = await supabase.from("referral_withdraws").select("id").eq("user_id", userId).eq("type", "vip_airtime").limit(1);
      if(prior && (prior as any[]).length > 0) return NextResponse.json({ error: "VIP already redeemed" }, { status: 409 });
    } catch {}
    return NextResponse.json({ success: true, available: 500, redeemed: false });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Server error" }, { status: 500 });
  }
}
