import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { sendNotificationToUser } from "@/lib/notifications/server"

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
        { success: false, timerReady: false, message: "No server config" },
        { status: 200 },
      )
    }

    try {
      // Claim row only: the table also holds push-reminder rows (auto_*,
      // tap_refill) which belong to /api/timer/cron, not here. Fall back to
      // legacy user_id-only lookup when the migration hasn't been applied.
      let timerData: any = null
      try {
        const scoped = await supabase
          .from("user_timers")
          .select("*")
          .eq("user_id", userId)
          .or("timer_type.is.null,timer_type.eq.claim")
          .maybeSingle()
        if (scoped.error && (scoped.error as any)?.code !== "PGRST116") throw scoped.error
        timerData = scoped.data || null
      } catch (e: any) {
        // Legacy single-row table (or unexpected shape): best-effort fallback.
        try {
          const legacy = await supabase
            .from("user_timers")
            .select("*")
            .eq("user_id", userId)
            .maybeSingle()
          timerData = (legacy as any)?.data || null
        } catch {
          console.error("[timer/check] Error fetching timer:", (e as any)?.message || e)
          return NextResponse.json(
            { success: false, timerReady: false },
            { status: 200 },
          )
        }
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

        // Send push notification (+ inbox mirror so it shows in-app too).
        // Dedupe key pins it to this timer expiry — the 30s poll retries
        // without duplicating the inbox row.
        let stats: any = null
        try {
          const endsIso = timerData?.timer_ends_at ? new Date(timerData.timer_ends_at).toISOString() : "na"
          stats = await sendNotificationToUser({
            uid: userId,
            title: "Claim Ready!",
            body: "Your timer is 00:00. Claim your ₦2,000 now.",
            clickUrl: "/dashboard",
            kind: "claim",
            dedupeKey: `claim:${userId}:${endsIso}`,
          })
        } catch (notifyErr) {
          console.error("[timer/check] Error sending notification:", notifyErr)
        }

        const sentCount = (stats?.fcmSent || 0) + (stats?.webpushSent || 0)

        if (sentCount > 0) {
          try {
            // Scope to THIS claim row only — never blanket-mark the user's
            // auto/refill reminder rows (those belong to /api/timer/cron).
            if ((timerData as any)?.id !== undefined && (timerData as any)?.id !== null) {
              await supabase
                .from("user_timers")
                .update({ notified: true })
                .eq("id", (timerData as any).id)
            } else {
              await supabase
                .from("user_timers")
                .update({ notified: true })
                .eq("user_id", userId)
            }
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
        { success: false, timerReady: false, message: "DB error" },
        { status: 200 },
      )
    }
  } catch (error) {
    console.error("[timer/check]", error)
    return NextResponse.json(
      { success: false, timerReady: false },
      { status: 200 },
    )
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 })
}
