import { NextResponse } from "next/server"
import { getSupabaseAdmin } from "@/lib/supabase/admin"

export async function GET(req: Request) {
  try {
    const reference = new URL(req.url).searchParams.get("reference") || new URL(req.url).searchParams.get("ref") || ""
    if (!reference) return NextResponse.json({ error: "Missing reference" }, { status: 400 })
    const admin: any = getSupabaseAdmin()
    const { data, error } = await admin.from("withdrawals").select("*").eq("reference", reference).maybeSingle()
    if (error) return NextResponse.json({ error: (error as any)?.message || "Lookup failed" }, { status: 500 })
    if (!data) return NextResponse.json({ error: "Withdrawal not found" }, { status: 404 })
    const amount = Number((data as any).amount || 0)
    return NextResponse.json({
      success: true,
      reference: String((data as any).reference || reference),
      amount: Number.isFinite(amount) && amount >= 0 ? amount : 0,
      status: String((data as any).status || "pending"),
      method: String((data as any).method || ""),
      created_at: (data as any).created_at || null,
    })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 })
  }
}
