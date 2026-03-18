import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { sendNotificationToUser } from "@/lib/notifications/server.js"

export const runtime = "nodejs"

// This endpoint should be called periodically (every 1 minute recommended)
// You can use Vercel Cron, GitHub Actions, or any external scheduler
export async function POST(req: NextRequest) {
  try {
    // Verify request is from authorized source (optional: add API key check)
    const authHeader = req.headers.get("authorization")
    const expectedKey = process.env.CRON_SECRET || "secret"

    if (authHeader !== `Bearer ${expectedKey}`) {
      console.warn("[timer/cron] Unauthorized cron request")
      // Still process but log warning
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
      // Get all unnotified timers that have expired
      const now = new Date().toISOString()
      const { data: expiredTimers, error: fetchError } = await supabase
        .from("user_timers")
        .select("user_id")
        .eq("notified", false)
        .lte("timer_ends_at", now)
        .limit(100) // Process max 100 timers per run

      if (fetchError) {
        console.error("[timer/cron] Error fetching expired timers:", fetchError)
        return NextResponse.json(
          { success: true, processed: 0, errors: 1 },
          { status: 200 },
        )
      }

      console.log(`[timer/cron] Found ${expiredTimers?.length || 0} expired timers`)

      if (!expiredTimers || expiredTimers.length === 0) {
        return NextResponse.json({
          success: true,
          processed: 0,
          message: "No expired timers",
        })
      }

      let successCount = 0
      let failureCount = 0

      // Process each expired timer
      for (const timer of expiredTimers) {
        try {
          console.log(`[timer/cron] Sending notification to user: ${timer.user_id}`)

          // Send push notification
          await sendNotificationToUser({
            uid: timer.user_id,
            title: "Claim Ready!",
            body: "Your timer is 00:00. Claim your ₦1,000 now.",
          })

          // Mark as notified
          await supabase
            .from("user_timers")
            .update({ notified: true })
            .eq("user_id", timer.user_id)

          successCount++
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
      return NextResponse.json(
        { success: false, error: "Database error" },
        { status: 200 },
      )
    }
  } catch (error) {
    console.error("[timer/cron]", error)
    return NextResponse.json(
      { success: false, error: "Internal error" },
      { status: 200 },
    )
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 })
}
