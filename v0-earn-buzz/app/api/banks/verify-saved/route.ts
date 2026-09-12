import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

// GET /api/banks/verify-saved?userId= — verify cached bank details against server truth.
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = (searchParams.get("userId") || "").trim();
    if (!userId) return NextResponse.json({ error: "Missing userId" }, { status: 400 });
    let supabase: any = null;
    try { supabase = getSupabaseAdmin(); } catch { supabase = null; }
    if (!supabase) return NextResponse.json({ unverified: true });
    try {
      const { data, error } = await supabase.from("users").select("*").eq("id", userId).maybeSingle();
      if (error || !data) return NextResponse.json({ unverified: true });
      const row: any = data;
      const bank = row.bank_name ?? row.bank ?? row.bankName ?? null;
      const bankCode = row.bank_code ?? row.bankCode ?? null;
      const accountNumber = row.account_number ?? row.accountNumber ?? null;
      const accountName = row.account_name ?? row.accountName ?? null;
      // If bank columns don't exist on users table, we can't verify
      if (bank === undefined && bankCode === undefined && accountNumber === undefined && accountName === undefined) {
        return NextResponse.json({ unverified: true });
      }
      if (bank && bankCode && accountNumber && accountName) {
        return NextResponse.json({ verified: true });
      }
      return NextResponse.json({ verified: false });
    } catch {
      return NextResponse.json({ unverified: true });
    }
  } catch (e: any) {
    return NextResponse.json({ unverified: true });
  }
}
