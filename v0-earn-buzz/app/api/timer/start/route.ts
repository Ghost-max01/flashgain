import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export const runtime = "nodejs"

// Server-issued 1-minute claim cadence.
const CLAIM_CADENCE_MS = 60_000
const DEFAULT_TIMER_TYPE = "claim"

// Initialize Supabase Admin client for timer tracking
function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || ""
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || ""

  if (!url || !key) {
    console.warn("[timer/start] Supabase not configured, timer won't persist on server")
    return null
  }

  return createClient(url, key)
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { userId } = body

    if (!userId) {
      return NextResponse.json(
        { success: false, error: "Missing userId" },
        { status: 400 },
      )
    }

    // IGNORE client-supplied timerEndsAt/timerDuration — server issues expiry.
    const timerType: string =
      typeof body.timer_type === "string" && /^[A-Za-z0-9_-]{1,32}$/.test(body.timer_type)
        ? body.timer_type
        : DEFAULT_TIMER_TYPE
    const now = Date.now()
    const expiresAt = new Date(now + CLAIM_CADENCE_MS)

    const supabase = getSupabaseAdmin()

    if (!supabase) {
      console.log("[timer/start] No Supabase, returning success for local-only timer")
      return NextResponse.json({
        success: true,
        message: "Timer started (local only)",
        timerEndsAt: expiresAt.toISOString(),
        expiresAt: expiresAt.toISOString(),
      })
    }

    try {
      // Store timer — upsert so re-claiming resets the timer.
      // Key: (user_id, timer_type); fall back to user_id-only upsert if the
      // timer_type column/constraint is not yet migrated (see 007).
      const row: Record<string, unknown> = {
        user_id: userId,
        timer_ends_at: expiresAt.toISOString(),
        timer_duration: Math.round(CLAIM_CADENCE_MS / 1000),
        created_at: new Date().toISOString(),
        notified: false,
      }
      let error: any = null
      try {
        const res = await supabase.from("user_timers").upsert(
          { ...row, timer_type: timerType },
          { onConflict: "user_id,timer_type" },
        )
        error = (res as any)?.error ?? null
      } catch (compositeErr: any) {
        // Likely missing column/constraint pre-migration — retry user_id-only.
        const res = await supabase.from("user_timers").upsert(row, { onConflict: "user_id" })
        error = (res as any)?.error ?? null
      }

      if (error) {
        console.error("[timer/start] Supabase error:", error)
        return NextResponse.json(
          {
            success: true,
            message: "Timer started (local fallback - DB error)",
            timerEndsAt: expiresAt.toISOString(),
            expiresAt: expiresAt.toISOString(),
          },
          { status: 200 },
        )
      }

      return NextResponse.json({
        success: true,
        timerEndsAt: expiresAt.toISOString(),
        expiresAt: expiresAt.toISOString(),
      })
    } catch (err) {
      console.error("[timer/start] Database operation failed:", err)
      return NextResponse.json(
        {
          success: true,
          message: "Timer started (local fallback - exception)",
          timerEndsAt: expiresAt.toISOString(),
          expiresAt: expiresAt.toISOString(),
        },
        { status: 200 },
      )
    }
  } catch (error) {
    console.error("[timer/start]", error)
    return NextResponse.json(
      { success: true, message: "Timer started" },
      { status: 200 },
    )
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 })
}
