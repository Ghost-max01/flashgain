import { NextRequest, NextResponse } from "next/server"
import { getSupabaseAdmin } from "@/lib/supabase/admin"

export const runtime = "nodejs"

// Win multipliers paid by the Stake Spin & Win wheel.
const WIN_MULTIPLIERS = [2, 3, 5]
const MIN_STAKE = 200
const MAX_RESULTS_PER_DAY = 20

// POST /api/stake/result { userId, spinId, stake, winAmount } — records one
// settled spin and applies it to the server balance atomically.
// winAmount must be 0 (loss: stake deducted) or stake×{2,3,5} (win: paid on
// top, stake not taken — matches page economy). spinId makes replays safe.
export async function POST(req: NextRequest) {
  try {
    const { userId, spinId, stake, winAmount } = await req.json().catch(() => ({} as any))
    if (!userId || typeof userId !== "string") {
      return NextResponse.json({ success: false, error: "Missing userId" }, { status: 400 })
    }
    if (!spinId || typeof spinId !== "string" || spinId.length > 64) {
      return NextResponse.json({ success: false, error: "Missing spinId" }, { status: 400 })
    }
    const stakeNum = Math.floor(Number(stake))
    const winNum = Math.floor(Number(winAmount))
    if (!Number.isFinite(stakeNum) || stakeNum < MIN_STAKE) {
      return NextResponse.json({ success: false, error: "Invalid stake" }, { status: 400 })
    }
    if (!Number.isFinite(winNum) || winNum < 0) {
      return NextResponse.json({ success: false, error: "Invalid win amount" }, { status: 400 })
    }
    const isWin = winNum > 0
    if (isWin && !WIN_MULTIPLIERS.some((m) => m * stakeNum === winNum)) {
      return NextResponse.json({ success: false, error: "Win amount does not match stake tier" }, { status: 400 })
    }

    let supabase: any
    try {
      supabase = getSupabaseAdmin()
    } catch {
      return NextResponse.json({ success: false, error: "Server not configured" }, { status: 500 })
    }

    const reference = `stake-${userId}-${spinId}`.slice(0, 80)

    // Idempotency: same spinId settles once.
    try {
      const { data: existing } = await supabase
        .from("transactions")
        .select("id")
        .eq("reference", reference)
        .maybeSingle()
      if (existing) {
        const { data: u } = await supabase.from("users").select("balance").eq("id", userId).maybeSingle()
        return NextResponse.json({ success: true, duplicate: true, newBalance: Number((u as any)?.balance || 0) })
      }
    } catch {}

    // Daily cap (best-effort; missing table = skip cap, never block).
    try {
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
      const { count } = await supabase
        .from("transactions")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .like("reference", "stake-%")
        .gte("created_at", since)
      if ((count ?? 0) >= MAX_RESULTS_PER_DAY) {
        return NextResponse.json({ success: false, error: "Daily spin limit reached" }, { status: 429 })
      }
    } catch {}

    const { data: user } = await supabase.from("users").select("balance").eq("id", userId).maybeSingle()
    if (!user) {
      return NextResponse.json({ success: false, error: "User not found" }, { status: 404 })
    }
    const bal = Number((user as any).balance || 0)
    if (bal < stakeNum) {
      return NextResponse.json({ success: false, error: "Insufficient balance" }, { status: 400 })
    }

    // Page economy: win pays winAmount on top (stake not taken); loss deducts stake.
    const newBalance = isWin ? bal + winNum : Math.max(0, bal - stakeNum)

    try {
      const { error: txErr } = await supabase.from("transactions").insert({
        user_id: userId,
        type: isWin ? "stake_win" : "stake_loss",
        amount: isWin ? winNum : -stakeNum,
        reference,
        status: "success",
        metadata: { stake: stakeNum, winAmount: winNum },
      })
      if (txErr) throw txErr
    } catch (e: any) {
      if (String((e as any)?.code || (e as any)?.message || e).includes("23505")) {
        const { data: u2 } = await supabase.from("users").select("balance").eq("id", userId).maybeSingle()
        return NextResponse.json({ success: true, duplicate: true, newBalance: Number((u2 as any)?.balance || 0) })
      }
      // transactions table may not exist — continue to direct credit.
    }

    const { error: balErr } = await supabase.from("users").update({ balance: newBalance }).eq("id", userId)
    if (balErr) throw balErr

    return NextResponse.json({ success: true, newBalance, winAmount: winNum })
  } catch (e: any) {
    console.error("stake result error:", e)
    return NextResponse.json({ success: false, error: "Server error" }, { status: 500 })
  }
}
