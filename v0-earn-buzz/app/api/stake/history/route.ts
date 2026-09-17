import { NextRequest, NextResponse } from "next/server"
import { getSupabaseAdmin } from "@/lib/supabase/admin"

export const runtime = "nodejs"

// GET /api/stake/history?userId= — recent settled spins for History.
// Returns up to 50, newest first. Same open pattern as /api/referral-stats
// (uid-scoped read of the caller's own rows).
export async function GET(req: NextRequest) {
  try {
    const userId = new URL(req.url).searchParams.get("userId")?.trim() || ""
    if (!userId) return NextResponse.json({ success: false, spins: [] })

    let supabase: any
    try {
      supabase = getSupabaseAdmin()
    } catch {
      return NextResponse.json({ success: false, spins: [] })
    }

    let rows: any[] = []
    try {
      const { data, error } = await supabase
        .from("transactions")
        .select("amount,created_at,reference,metadata")
        .eq("user_id", userId)
        .like("reference", "stake-%")
        .order("created_at", { ascending: false })
        .limit(50)
      if (error) throw error
      rows = (data || []).filter((r: any) => String((r as any)?.reference || "").startsWith("stake-"))
    } catch {
      return NextResponse.json({ success: true, spins: [] })
    }

    const spins = rows.map((r: any, i: number) => {
      const meta = (r as any)?.metadata || {}
      const amount = Number((r as any)?.amount || 0)
      const outcome = amount > 0 ? "win" : "loss"
      const stake = Math.max(0, Math.floor(Number((meta as any)?.stake) || 0))
      const at = new Date((r as any)?.created_at || 0).getTime() || 0
      return {
        id: String((r as any)?.reference || `srv-${at}-${i}`),
        stake,
        credited: outcome === "win" ? amount : 0,
        multiplier: outcome === "win" ? (Number((meta as any)?.multiplier) === 2 ? 2 : 1) : 0,
        outcome,
        at,
      }
    })
    return NextResponse.json({ success: true, spins })
  } catch (e: any) {
    console.error("[stake/history]", e)
    return NextResponse.json({ success: false, spins: [] })
  }
}
