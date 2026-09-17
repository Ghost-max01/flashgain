import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export const runtime = "nodejs"

function getAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || ""
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || ""
  if (!url || !key) return null
  return createClient(url, key)
}

// POST /api/timer/claim {userId}
// Verifies user_timers row expiresAt<=now server-side, sets next expiresAt=now+60s,
// increments claim_count, enforces 5h pause after 50 claims server-side.
// Balance incremented ONLY server-side via admin client.
export async function POST(req: NextRequest) {
  try {
    const { userId } = await req.json().catch(() => ({}))
    if (!userId) return NextResponse.json({ success: false, error: "Missing userId" }, { status: 400 })
    const supabase = getAdmin()
    if (!supabase) return NextResponse.json({ success: false, error: "Server not configured" }, { status: 500 })

    const now = Date.now()
    // Claim row only: the table also holds push-reminder rows (auto_*, tap_refill)
    // which must never be read or overwritten here. Fall back to legacy
    // user_id-only lookup when the timer_type migration hasn't been applied.
    let timerRow: any = null
    try {
      const scoped = await supabase.from("user_timers").select("*").eq("user_id", userId).or("timer_type.is.null,timer_type.eq.claim").maybeSingle()
      timerRow = scoped.data || null
      if (scoped.error) throw scoped.error
    } catch {
      try {
        const legacy = await supabase.from("user_timers").select("*").eq("user_id", userId).maybeSingle()
        timerRow = (legacy as any)?.data || null
      } catch {}
    }

    // Pause enforcement: claim_count>=50 and pause_until in future
    const pauseUntil = timerRow?.pause_until ? new Date(timerRow.pause_until).getTime() : 0
    if (pauseUntil && pauseUntil > now) {
      return NextResponse.json({ success: false, error: "Paused", pauseUntil, claimCount: timerRow?.claim_count || 0 }, { status: 200 })
    }

    // If no timer row, or timer not yet expired → not claimable (server decides)
    const endsAt = timerRow?.timer_ends_at ? new Date(timerRow.timer_ends_at).getTime() : 0
    if (timerRow && endsAt > now) {
      return NextResponse.json({ success: false, error: "Not ready", timeRemaining: Math.floor((endsAt - now) / 1000) }, { status: 200 })
    }

    const prevCount = Number(timerRow?.claim_count || 0)
    const newCount = prevCount + 1

    // Increment balance server-side only (+2000)
    let newBalance = 0
    try {
      const { data: u } = await supabase.from("users").select("balance").eq("id", userId).maybeSingle()
      newBalance = Number((u as any)?.balance || 0) + 2000
      await supabase.from("users").update({ balance: newBalance }).eq("id", userId)
    } catch {}

    if (newCount >= 50) {
      const pause = new Date(now + 5 * 60 * 60 * 1000).toISOString()
      // Composite upsert (per-type rows); fall back to legacy user_id-only
      // when the migration hasn't been applied yet.
      try {
        const r = await supabase.from("user_timers").upsert(
          { user_id: userId, timer_type: "claim", timer_ends_at: new Date(now + 5 * 60 * 60 * 1000).toISOString(), claim_count: 0, pause_until: pause, notified: false },
          { onConflict: "user_id,timer_type" },
        )
        if ((r as any)?.error) throw (r as any).error
      } catch {
        await supabase.from("user_timers").upsert(
          { user_id: userId, timer_ends_at: new Date(now + 5 * 60 * 60 * 1000).toISOString(), claim_count: 0, pause_until: pause, notified: false },
          { onConflict: "user_id" },
        )
      }
      return NextResponse.json({ success: true, newBalance, claimCount: 0, paused: true, pauseUntil: pause })
    }

    try {
      const r = await supabase.from("user_timers").upsert(
        { user_id: userId, timer_type: "claim", timer_ends_at: new Date(now + 60 * 1000).toISOString(), claim_count: newCount, pause_until: null, notified: false },
        { onConflict: "user_id,timer_type" },
      )
      if ((r as any)?.error) throw (r as any).error
    } catch {
      await supabase.from("user_timers").upsert(
        { user_id: userId, timer_ends_at: new Date(now + 60 * 1000).toISOString(), claim_count: newCount, pause_until: null, notified: false },
        { onConflict: "user_id" },
      )
    }
    return NextResponse.json({ success: true, newBalance, claimCount: newCount })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: String(e?.message || e) }, { status: 500 })
  }
}
