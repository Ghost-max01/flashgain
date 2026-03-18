import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { sendNotificationToUser } from "@/lib/notifications/server.js"

export const runtime = "nodejs"

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || ""
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || ""

  if (!url || !key) {
    return null
  }

  return createClient(url, key)
}

export async function POST(req: NextRequest) {
  try {
    const { userId } = await req.json()

    if (!userId) {
      return NextResponse.json(
        { success: false, error: "Missing userId" },
        { status: 400 },
      )
    }

    const supabase = getSupabaseAdmin()

    if (!supabase) {
      console.log("[timer/check] No Supabase configured")
      return NextResponse.json(
        { success: true, timerReady: false, message: "No server config" },
        { status: 200 },
      )
    }

    try {
      // Get user's active timer
      const { data: timerData, error: timerError } = await supabase
        .from("user_timers")
        .select("*")
        .eq("user_id", userId)
        .single()

      if (timerError && timerError.code !== "PGRST116") {
        console.error("[timer/check] Error fetching timer:", timerError)
        return NextResponse.json(
          { success: true, timerReady: false },
          { status: 200 },
        )
      }

      if (!timerData) {
        return NextResponse.json({
          success: true,
          timerReady: false,
          message: "No active timer",
        })
      }

      const timerEndsAt = new Date(timerData.timer_ends_at).getTime()
      const now = Date.now()
      const isExpired = now >= timerEndsAt
      const timeRemaining = Math.max(0, Math.floor((timerEndsAt - now) / 1000))

      if (isExpired && !timerData.notified) {
        console.log(`[timer/check] Timer expired for user ${userId}, sending notification`)

        // Send push notification
        let stats: any = null
        try {
          stats = await sendNotificationToUser({
            uid: userId,
            title: "Claim Ready!",
            body: "Your timer is 00:00. Claim your ₦1,000 now.",
          })
        } catch (notifyErr) {
          console.error("[timer/check] Error sending notification:", notifyErr)
        }

        const sentCount = (stats?.fcmSent || 0) + (stats?.webpushSent || 0)

        if (sentCount > 0) {
          try {
            await supabase
              .from("user_timers")
              .update({ notified: true })
              .eq("user_id", userId)
          } catch (updateErr) {
            console.error("[timer/check] Error marking notified:", updateErr)
          }
        } else {
          console.warn(
            `[timer/check] No background push sent for ${userId}; timer remains pending for retry. reason=${stats?.reason || "unknown"}`,
          )
        }

        return NextResponse.json({
          success: true,
          timerReady: true,
          message: sentCount > 0 ? "Timer expired, notification sent" : "Timer expired, push pending retry",
        })
      }

      return NextResponse.json({
        success: true,
        timerReady: isExpired,
        timeRemaining,
      })
    } catch (err) {
      console.error("[timer/check] Database query failed:", err)
      return NextResponse.json(
        { success: true, timerReady: false, message: "DB error (handled)" },
        { status: 200 },
      )
    }
  } catch (error) {
    console.error("[timer/check]", error)
    return NextResponse.json(
      { success: true, timerReady: false },
      { status: 200 },
    )
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 })
}
