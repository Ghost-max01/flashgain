import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { sendNotificationToUser } from "@/lib/notifications/server"
import { timerMessage } from "@/lib/notifications/notify-auth"

export const runtime = "nodejs"

type ExpiredTimer = {
  id: number
  user_id: string
  timer_type: string | null
}

type TimerResult = {
  rowId: number
  userId: string
  success: boolean
  attemptedCount: number
  reason?: string
}

async function runCron(req: NextRequest) {
  const authHeader = req.headers.get("authorization")
  const expectedKey = process.env.CRON_SECRET || ""

  const hasSecret = Boolean(authHeader && expectedKey && authHeader === `Bearer ${expectedKey}`)

  // Foreground expedite: a logged-in app may ping its OWN due rows without
  // the cron secret (covers users while any session is open). With a valid
  // secret (Vercel Cron / scheduler) all due rows are processed as before.
  let scopeUid: string | null = null
  if (!hasSecret) {
    if (expectedKey) {
      let bodyUid = ""
      try {
        const b = await req.json().catch(() => ({} as any))
        bodyUid = String((b as any)?.userId || "")
      } catch {}
      if (!bodyUid) {
        return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
      }
      scopeUid = bodyUid
    }
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
    let query = supabase
      .from("user_timers")
      .select("id,user_id,timer_type")
      .eq("notified", false)
      .lte("timer_ends_at", now)
      .limit(100)
    if (scopeUid) query = query.eq("user_id", scopeUid)
    const { data: expiredTimers, error: fetchError } = await query

    if (fetchError) {
      console.error("[timer/cron] Error fetching expired timers:", fetchError)
      return NextResponse.json({ success: true, processed: 0 }, { status: 200 })
    }

    const timers = (expiredTimers || []).filter(
      (timer): timer is ExpiredTimer => Boolean(timer?.user_id),
    )

    console.log(`[timer/cron] Found ${timers.length} expired timers${scopeUid ? ` (self-scope ${scopeUid})` : ""}`)

    if (timers.length === 0) {
      return NextResponse.json({ success: true, processed: 0, message: "No expired timers" })
    }

    const processTimer = async (timer: ExpiredTimer): Promise<TimerResult> => {
      const userId = timer.user_id
      // Per-type message: claim timers keep the long-standing Claim Ready
      // text; auto/refill rows (from /api/notify/schedule) get their own.
      const msg = timerMessage(timer.timer_type)
      try {
        console.log(`[timer/cron] Sending ${timer.timer_type || "claim"} notification to user: ${userId}`)

        const stats = await sendNotificationToUser({
          uid: userId,
          title: msg.title,
          body: msg.body,
          clickUrl: msg.clickUrl,
        })

        const sentCount = (stats?.fcmSent || 0) + (stats?.webpushSent || 0)
        const attemptedCount = (stats?.fcmAttempted || 0) + (stats?.webpushAttempted || 0)

        if (sentCount > 0) {
          return { rowId: timer.id, userId, success: true, attemptedCount, reason: undefined }
        }

        const reason = (stats as any)?.reason || "no notification delivered"
        console.warn(
          `[timer/cron] No push sent for user ${userId}. Keeping timer pending for retry. attempted=${attemptedCount} reason=${reason}`,
        )

        return { rowId: timer.id, userId, success: false, attemptedCount, reason }
      } catch (error) {
        console.error(`[timer/cron] Error processing timer for user ${userId}:`, error)
        return { rowId: timer.id, userId, success: false, attemptedCount: 0, reason: String(error) }
      }
    }

    const concurrency = 5
    const results: TimerResult[] = []

    for (let i = 0; i < timers.length; i += concurrency) {
      const batch = timers.slice(i, i + concurrency)
      const batchResults = await Promise.all(batch.map(processTimer))
      results.push(...batchResults)
    }

    // Mark notified PER ROW (user_id + timer_type), never blanket per user —
    // a user can hold claim + auto + refill rows at once.
    const successIds = results.filter((result) => result.success).map((result) => result.rowId)
    const failureCount = results.filter((result) => !result.success).length

    let updatedCount = 0
    if (successIds.length > 0) {
      const { error: updateError } = await supabase
        .from("user_timers")
        .update({ notified: true })
        .in("id", successIds)

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
