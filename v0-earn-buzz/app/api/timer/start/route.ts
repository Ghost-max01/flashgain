import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export const runtime = "nodejs"

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

    // Accept either absolute timerEndsAt or legacy timerDuration
    const timerEndsAt: Date = body.timerEndsAt
      ? new Date(body.timerEndsAt)
      : new Date(Date.now() + (body.timerDuration ?? 60) * 1000)

    if (!userId) {
      return NextResponse.json(
        { success: false, error: "Missing userId" },
        { status: 400 },
      )
    }

    const supabase = getSupabaseAdmin()

    if (!supabase) {
      console.log("[timer/start] No Supabase, returning success for local-only timer")
      return NextResponse.json({
        success: true,
        message: "Timer started (local only)",
        timerEndsAt: timerEndsAt.toISOString(),
      })
    }

    try {
      // Store timer — upsert so re-claiming resets the timer
      const { error } = await supabase.from("user_timers").upsert(
        {
          user_id: userId,
          timer_ends_at: timerEndsAt.toISOString(),
          timer_duration: Math.round((timerEndsAt.getTime() - Date.now()) / 1000),
          created_at: new Date().toISOString(),
          notified: false,
        },
        { onConflict: "user_id" },
      )

      if (error) {
        console.error("[timer/start] Supabase error:", error)
        return NextResponse.json(
          {
            success: true,
            message: "Timer started (local fallback - DB error)",
            timerEndsAt: timerEndsAt.toISOString(),
          },
          { status: 200 },
        )
      }

      return NextResponse.json({
        success: true,
        timerEndsAt: timerEndsAt.toISOString(),
      })
    } catch (err) {
      console.error("[timer/start] Database operation failed:", err)
      return NextResponse.json(
        {
          success: true,
          message: "Timer started (local fallback - exception)",
          timerEndsAt: timerEndsAt.toISOString(),
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
