import { NextRequest, NextResponse } from "next/server"
import { getSupabaseAdmin } from "@/lib/supabase/admin"
import {
  AUTO_DURATIONS_MS,
  validateAutoSchedule,
  validateRefillSchedule,
} from "@/lib/notifications/notify-auth"

export const runtime = "nodejs"

// POST /api/notify/schedule — register a background reminder for the CALLER.
// Body: { userId, kind: "auto_finish" | "tap_refill", planId?, startedAt?, endsAt? }
//   auto_finish: planId must be a known plan, startedAt recent & not future.
//     Server derives expiresAt = startedAt + plan duration (never trusts it).
//   tap_refill: endsAt must be within the next ~15 minutes.
// Rows live in user_timers (timer_type auto_<plan> / tap_refill) with
// notified=false; /api/timer/cron delivers them even when the app is closed.
// Auth: self-asserted uid with strict validation + hourly rate limit (same
// exposure class as /api/timer/start). Content is fixed server templates, so
// a forged row can only send the owner a truthful reminder early/late.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({} as any))
    const userId = String(body?.userId || "").trim()
    const kind = String(body?.kind || "")
    if (!userId || userId.length > 128) {
      return NextResponse.json({ success: false, error: "Missing userId" }, { status: 400 })
    }
    if (kind !== "auto_finish" && kind !== "tap_refill") {
      return NextResponse.json({ success: false, error: "Bad kind" }, { status: 400 })
    }

    const now = Date.now()
    let timerType = ""
    let expiresAt = 0
    let durationSec = 0

    if (kind === "auto_finish") {
      const v = validateAutoSchedule(body?.planId, body?.startedAt, now)
      if (!v.ok) return NextResponse.json({ success: false, error: v.error }, { status: 400 })
      const plan = String(body.planId)
      timerType = `auto_${plan}`
      expiresAt = v.expiresAt
      durationSec = Math.round((AUTO_DURATIONS_MS[plan] || 0) / 1000)
    } else {
      const v = validateRefillSchedule(body?.endsAt, now)
      if (!v.ok) return NextResponse.json({ success: false, error: v.error }, { status: 400 })
      timerType = "tap_refill"
      expiresAt = v.expiresAt
      durationSec = 600
    }

    let supabase: any
    try {
      supabase = getSupabaseAdmin()
    } catch {
      return NextResponse.json({ success: false, error: "Server not configured" }, { status: 500 })
    }

    // Rate limit: max 10 schedule writes per uid per hour (best-effort).
    try {
      const oneHourAgo = new Date(now - 60 * 60 * 1000).toISOString()
      const { data: recent } = await supabase
        .from("user_timers")
        .select("id")
        .eq("user_id", userId)
        .gte("created_at", oneHourAgo)
        .limit(20)
      if ((recent || []).length >= 10) {
        return NextResponse.json({ success: false, error: "Rate limited" }, { status: 429 })
      }
    } catch {}

    // Delete-then-insert (no unique-constraint assumption — works whether or
    // not the (user_id, timer_type) migration has been applied).
    try {
      await supabase.from("user_timers").delete().eq("user_id", userId).eq("timer_type", timerType)
    } catch {}
    try {
      const { error } = await supabase.from("user_timers").insert({
        user_id: userId,
        timer_type: timerType,
        timer_ends_at: new Date(expiresAt).toISOString(),
        timer_duration: durationSec,
        created_at: new Date(now).toISOString(),
        notified: false,
      })
      if (error) throw error
    } catch (e: any) {
      const msg = String((e as any)?.message || e || "")
      // timer_type column predates some DBs — surface a clear, actionable error.
      if (/timer_type|column|schema/i.test(msg)) {
        return NextResponse.json(
          { success: false, error: "Scheduler unavailable (apply timer_type migration)" },
          { status: 500 },
        )
      }
      return NextResponse.json({ success: false, error: "Schedule failed" }, { status: 500 })
    }

    return NextResponse.json({ success: true, timerType, endsAt: expiresAt })
  } catch (e: any) {
    console.error("[notify/schedule]", e)
    return NextResponse.json({ success: false, error: "Server error" }, { status: 500 })
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 })
}
