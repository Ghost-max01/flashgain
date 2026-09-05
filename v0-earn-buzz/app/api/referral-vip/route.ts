import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export async function POST(req: NextRequest) {
  try {
    const { userId, available } = await req.json();
    if (!userId) return NextResponse.json({ error: "Missing userId" }, { status: 400 });
    try {
      const supabase: any = getSupabaseAdmin();
      if (supabase) {
        // best-effort: store vip balance if columns exist
        await supabase.from("users").update({ referral_vip_balance: available ?? 500, vip_redeemed: false }).eq("id", userId);
      }
    } catch {}
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Server error" }, { status: 500 });
  }
}
