import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { sendNotificationToUser } from "@/lib/notifications/server.js"

export const runtime = "nodejs"

type ExpiredTimer = {
  user_id: string
}

type TimerResult = {
  userId: string
  success: boolean
  attemptedCount: number
  reason?: string
}

async function runCron(req: NextRequest) {
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

    const timers = (expiredTimers || []).filter(
      (timer): timer is ExpiredTimer => Boolean(timer?.user_id),
    )

    console.log(`[timer/cron] Found ${timers.length} expired timers`)

    if (timers.length === 0) {
      return NextResponse.json({ success: true, processed: 0, message: "No expired timers" })
    }

    const processTimer = async (timer: ExpiredTimer): Promise<TimerResult> => {
      const userId = timer.user_id
      try {
        console.log(`[timer/cron] Sending notification to user: ${userId}`)

        const stats = await sendNotificationToUser({
          uid: userId,
          title: "⏰ Claim Ready!",
          body: "Your timer hit 00:00. Open FlashGain 9ja to claim your ₦2,000 now!",
          clickUrl: "/dashboard",
        })

        const sentCount = (stats?.fcmSent || 0) + (stats?.webpushSent || 0)
        const attemptedCount = (stats?.fcmAttempted || 0) + (stats?.webpushAttempted || 0)

        if (sentCount > 0) {
          return { userId, success: true, attemptedCount, reason: undefined }
        }

        const reason = stats?.reason || "no notification delivered"
        console.warn(
          `[timer/cron] No push sent for user ${userId}. Keeping timer pending for retry. attempted=${attemptedCount} reason=${reason}`,
        )

        return { userId, success: false, attemptedCount, reason }
      } catch (error) {
        console.error(`[timer/cron] Error processing timer for user ${userId}:`, error)
        return { userId, success: false, attemptedCount: 0, reason: String(error) }
      }
    }

    const concurrency = 5
    const results: TimerResult[] = []

    for (let i = 0; i < timers.length; i += concurrency) {
      const batch = timers.slice(i, i + concurrency)
      const batchResults = await Promise.all(batch.map(processTimer))
      results.push(...batchResults)
    }

    const successIds = results.filter((result) => result.success).map((result) => result.userId)
    const failureCount = results.filter((result) => !result.success).length

    let updatedCount = 0
    if (successIds.length > 0) {
      const { error: updateError } = await supabase
        .from("user_timers")
        .update({ notified: true })
        .in("user_id", successIds)

      if (updateError) {
        console.error("[timer/cron] Error updating notified timers:", updateError)
      } else {
        updatedCount = successIds.length
      }
    }

    return NextResponse.json({
      success: true,
      processed: updatedCount,
      failed: failureCount,
      message: `Processed ${updatedCount} timers, ${failureCount} failed`,
    })
  } catch (err) {
    console.error("[timer/cron] Database operation failed:", err)
    return NextResponse.json({ success: false, error: "Database error" }, { status: 200 })
  }
}

export async function GET(req: NextRequest) {
  return runCron(req)
}

export async function POST(req: NextRequest) {
  return runCron(req)
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 })
}
