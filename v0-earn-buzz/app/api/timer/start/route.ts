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
    const { userId, timerDuration } = await req.json()

    if (!userId || !timerDuration) {
      return NextResponse.json(
        { success: false, error: "Missing userId or timerDuration" },
        { status: 400 },
      )
    }

    const supabase = getSupabaseAdmin()

    if (!supabase) {
      console.log("[timer/start] No Supabase, returning success for local-only timer")
      return NextResponse.json({
        success: true,
        message: "Timer started (local only)",
        timerEndsAt: new Date(Date.now() + timerDuration * 1000).toISOString(),
      })
    }

    try {
      const timerEndsAt = new Date(Date.now() + timerDuration * 1000)

      // Store timer info in a timers table
      const { error } = await supabase.from("user_timers").upsert(
        {
          user_id: userId,
          timer_ends_at: timerEndsAt.toISOString(),
          timer_duration: timerDuration,
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
          timerEndsAt: new Date(Date.now() + timerDuration * 1000).toISOString(),
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
