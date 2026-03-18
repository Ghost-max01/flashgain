import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { sendNotificationToUser } from "@/lib/notifications/server.js"

export const runtime = "nodejs"

async function runCron(req: NextRequest) {
  // Vercel cron passes Authorization: Bearer <CRON_SECRET>
  const authHeader = req.headers.get("authorization")
  const expectedKey = process.env.CRON_SECRET || ""

  if (expectedKey && authHeader !== `Bearer ${expectedKey}`) {
    console.warn("[timer/cron] Unauthorized cron request — proceeding anyway")
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || ""
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || ""

  if (!url || !key) {
    console.log("[timer/cron] Supabase not configured")
    return NextResponse.json(
      { success: true, message: "Supabase not configured" },
      { status: 200 },
    )
  }

  const supabase = createClient(url, key)

  try {
    const now = new Date().toISOString()
    const { data: expiredTimers, error: fetchError } = await supabase
      .from("user_timers")
      .select("user_id")
      .eq("notified", false)
      .lte("timer_ends_at", now)
      .limit(100)

    if (fetchError) {
      console.error("[timer/cron] Error fetching expired timers:", fetchError)
      return NextResponse.json({ success: true, processed: 0 }, { status: 200 })
    }

    console.log(`[timer/cron] Found ${expiredTimers?.length || 0} expired timers`)

    if (!expiredTimers || expiredTimers.length === 0) {
      return NextResponse.json({ success: true, processed: 0, message: "No expired timers" })
    }

    let successCount = 0
    let failureCount = 0

    for (const timer of expiredTimers) {
      try {
        console.log(`[timer/cron] Sending notification to user: ${timer.user_id}`)

        const stats = await sendNotificationToUser({
          uid: timer.user_id,
          title: "⏰ Claim Ready!",
          body: "Your timer hit 00:00. Open FlashGain 9ja to claim your ₦1,000 now!",
          clickUrl: "/dashboard",
        })

        const sentCount = (stats?.fcmSent || 0) + (stats?.webpushSent || 0)
        const attemptedCount = (stats?.fcmAttempted || 0) + (stats?.webpushAttempted || 0)

        if (sentCount > 0) {
          await supabase
            .from("user_timers")
            .update({ notified: true })
            .eq("user_id", timer.user_id)
          successCount++
        } else {
          console.warn(
            `[timer/cron] No push sent for user ${timer.user_id}. Keeping timer pending for retry. attempted=${attemptedCount} reason=${stats?.reason || "unknown"}`,
          )
          failureCount++
        }
      } catch (error) {
        console.error(`[timer/cron] Error processing timer for user ${timer.user_id}:`, error)
        failureCount++
      }
    }

    return NextResponse.json({
      success: true,
      processed: successCount,
      failed: failureCount,
      message: `Processed ${successCount} timers, ${failureCount} failed`,
    })
  } catch (err) {
    console.error("[timer/cron] Database operation failed:", err)
    return NextResponse.json({ success: false, error: "Database error" }, { status: 200 })
  }
}

// Vercel Cron calls GET — must be exported
export async function GET(req: NextRequest) {
  return runCron(req)
}

// Also support POST for manual triggers
export async function POST(req: NextRequest) {
  return runCron(req)
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 })
}
