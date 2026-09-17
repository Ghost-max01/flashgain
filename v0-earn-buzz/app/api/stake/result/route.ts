import { NextRequest, NextResponse } from "next/server"
import { getSupabaseAdmin } from "@/lib/supabase/admin"
import { creditForWin, forcedSessionOutcome } from "@/lib/spin-economy"

export const runtime = "nodejs"

// Spin & Win economy lives in lib/spin-economy.ts (single source of truth —
// the client mirrors it exactly): stake always deducted; ×1 credits 1.5×,
// ×2 credits 2×; never WWW / never LLL in the rolling 24h window.
const MIN_STAKE = 200
const MAX_RESULTS_PER_DAY = 20

// POST /api/stake/result { userId, spinId, stake, multiplier, winAmount? } —
// records one settled spin and applies it to the server balance atomically.
// multiplier: 0 = loss, 1 = ×1 win, 2 = ×2 win. Legacy clients that only
// send winAmount (= stake×2 wins) keep working via the fallback check.
// spinId makes replays safe.
export async function POST(req: NextRequest) {
  try {
    const { userId, spinId, stake, multiplier, winAmount } = await req.json().catch(() => ({} as any))
    if (!userId || typeof userId !== "string") {
      return NextResponse.json({ success: false, error: "Missing userId" }, { status: 400 })
    }
    if (!spinId || typeof spinId !== "string" || spinId.length > 64) {
      return NextResponse.json({ success: false, error: "Missing spinId" }, { status: 400 })
    }
    const stakeNum = Math.floor(Number(stake))
    if (!Number.isFinite(stakeNum) || stakeNum < MIN_STAKE) {
      return NextResponse.json({ success: false, error: "Invalid stake" }, { status: 400 })
    }

    // Claimed outcome: prefer explicit multiplier, fall back to legacy amount.
    let claimedMult: 0 | 1 | 2 | null = null
    if (multiplier !== undefined && multiplier !== null && String(multiplier) !== "") {
      const m = Math.floor(Number(multiplier))
      if (m !== 0 && m !== 1 && m !== 2) {
        return NextResponse.json({ success: false, error: "Invalid multiplier" }, { status: 400 })
      }
      claimedMult = m as 0 | 1 | 2
    } else {
      const winNum = Math.floor(Number(winAmount))
      if (!Number.isFinite(winNum) || winNum < 0) {
        return NextResponse.json({ success: false, error: "Invalid win amount" }, { status: 400 })
      }
      if (winNum > 0 && winNum !== stakeNum * 2) {
        return NextResponse.json({ success: false, error: "Win amount does not match stake tier" }, { status: 400 })
      }
      claimedMult = winNum > 0 ? 2 : 0
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

    // Today's outcomes (rolling 24h, oldest first): drives the daily cap,
    // the no-WWW/no-LLL session rule, and the history sync for the client.
    let today: number[] = []
    try {
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
      const { data: rows } = await supabase
        .from("transactions")
        .select("type,created_at")
        .eq("user_id", userId)
        .like("reference", "stake-%")
        .gte("created_at", since)
        .order("created_at", { ascending: true })
        .limit(30)
      today = ((rows || []) as any[]).map((r) => ((r as any)?.type === "stake_win" ? 1 : 0))
    } catch {}
    if (today.length >= MAX_RESULTS_PER_DAY) {
      return NextResponse.json({ success: false, error: "Daily spin limit reached" }, { status: 429 })
    }

    // Session rule from server truth (shared lib).
    const forced = forcedSessionOutcome(today)

    let outcome: "win" | "loss"
    let mult: 1 | 2 = 1
    let corrected = false
    if ((claimedMult as number) > 0) {
      if (forced === 0) {
        outcome = "loss"
        corrected = true
      } else {
        outcome = "win"
        mult = (claimedMult as 1 | 2) || 2
      }
    } else {
      if (forced === 1) {
        outcome = "win"
        mult = 1
        corrected = true
      } else {
        outcome = "loss"
      }
    }

    const { data: user } = await supabase.from("users").select("balance").eq("id", userId).maybeSingle()
    if (!user) {
      return NextResponse.json({ success: false, error: "User not found" }, { status: 404 })
    }
    const bal = Number((user as any).balance || 0)
    if (bal < stakeNum) {
      return NextResponse.json({ success: false, error: "Insufficient balance" }, { status: 400 })
    }

    // Economy: stake always deducted; wins credit stake back + profit.
    const credit = outcome === "win" ? creditForWin(stakeNum, mult) : 0
    const newBalance = Math.max(0, bal - stakeNum + credit)

    try {
      const { error: txErr } = await supabase.from("transactions").insert({
        user_id: userId,
        type: outcome === "win" ? "stake_win" : "stake_loss",
        amount: outcome === "win" ? credit : -stakeNum,
        reference,
        status: "success",
        metadata: { stake: stakeNum, multiplier: outcome === "win" ? mult : 0, forced, corrected },
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

    const syncedToday = [...today, outcome === "win" ? 1 : 0].slice(-10)
    return NextResponse.json({
      success: true,
      newBalance,
      outcome,
      multiplier: outcome === "win" ? mult : 0,
      credited: credit,
      corrected,
      today: syncedToday,
    })
  } catch (e: any) {
    console.error("stake result error:", e)
    return NextResponse.json({ success: false, error: "Server error" }, { status: 500 })
  }
}
