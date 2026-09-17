import { NextResponse } from "next/server"
import { getSupabaseAdmin } from "@/lib/supabase/admin"

export const runtime = "nodejs"

// GET /api/withdrawals/history?userId= — recent withdrawals for History.
// Same open pattern as /api/referral-stats (uid-scoped read of own rows).
export async function GET(request: Request) {
  try {
    const userId = new URL(request.url).searchParams.get("userId")?.trim() || ""
    if (!userId) return NextResponse.json({ success: false, withdrawals: [] })

    let supabase: any
    try {
      supabase = getSupabaseAdmin()
    } catch {
      return NextResponse.json({ success: false, withdrawals: [] })
    }

    let rows: any[] = []
    try {
      const { data, error } = await supabase
        .from("withdrawals")
        .select("id,reference,amount,status,created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(50)
      if (error) throw error
      rows = data || []
    } catch {
      return NextResponse.json({ success: true, withdrawals: [] })
    }

    return NextResponse.json({
      success: true,
      withdrawals: rows.map((w: any, i: number) => ({
        reference: String(w?.reference || w?.id || `row-${i}`),
        id: String(w?.id || w?.reference || `row-${i}`),
        amount: Number(w?.amount || 0),
        status: String(w?.status || ""),
        created_at: (w as any)?.created_at || null,
      })),
    })
  } catch (e: any) {
    console.error("[withdrawals/history]", e)
    return NextResponse.json({ success: false, withdrawals: [] })
  }
}
