// ── Shared due-reminder flush (ONE source for all delivery triggers) ──
// Called by:
//   • /api/timer/cron      (daily Hobby cron / external scheduler / manual)
//   • traffic piggyback     (e.g. tap accruals — opportunistic, sampled)
//   • foreground self-ping  (dashboard, own uid only)
// Rows come from user_timers (claim / auto_* / tap_refill, notified=false,
// timer_ends_at passed). Only rows with a real delivery are marked notified;
// the rest stay pending for the next trigger. Oldest-due first.

import { sendNotificationToUser } from "@/lib/notifications/server"
import { timerMessage } from "@/lib/notifications/notify-auth"

export type DueTimer = {
  id: number
  user_id: string
  timer_type: string | null
}

export async function flushDueNotifications(
  supabase: any,
  opts?: { limit?: number; scopeUid?: string | null; logTag?: string },
): Promise<{ processed: number; failed: number }> {
  const tag = opts?.logTag || "notify-due"
  const limit = Math.max(1, Math.min(100, Math.floor(Number(opts?.limit) || 100)))
  const scopeUid = opts?.scopeUid || null
  try {
    const now = new Date().toISOString()
    let query = supabase
      .from("user_timers")
      .select("id,user_id,timer_type")
      .eq("notified", false)
      .lte("timer_ends_at", now)
      .order("timer_ends_at", { ascending: true })
      .limit(limit)
    if (scopeUid) query = query.eq("user_id", scopeUid)
    const { data: expiredTimers, error: fetchError } = await query
    if (fetchError) {
      console.error(`[${tag}] Error fetching expired timers:`, fetchError)
      return { processed: 0, failed: 0 }
    }
    const timers = ((expiredTimers || []) as DueTimer[]).filter((t) => Boolean(t?.user_id))
    if (timers.length === 0) return { processed: 0, failed: 0 }
    console.log(`[${tag}] Flushing ${timers.length} due timers${scopeUid ? ` (self-scope ${scopeUid})` : ""}`)

    const concurrency = 5
    const succeeded: number[] = []
    let failed = 0
    for (let i = 0; i < timers.length; i += concurrency) {
      const batch = timers.slice(i, i + concurrency)
      const results = await Promise.all(
        batch.map(async (timer) => {
          const msg = timerMessage(timer.timer_type)
          try {
            const stats = await sendNotificationToUser({
              uid: timer.user_id,
              title: msg.title,
              body: msg.body,
              clickUrl: msg.clickUrl,
            })
            const sent = (stats?.fcmSent || 0) + (stats?.webpushSent || 0)
            return { rowId: timer.id, ok: sent > 0 }
          } catch (error) {
            console.error(`[${tag}] Error notifying user ${timer.user_id}:`, error)
            return { rowId: timer.id, ok: false }
          }
        }),
      )
      for (const r of results) {
        if (r.ok) succeeded.push(r.rowId)
        else failed += 1
      }
    }

    let processed = 0
    if (succeeded.length > 0) {
      const { error: updateError } = await supabase
        .from("user_timers")
        .update({ notified: true })
        .in("id", succeeded)
      if (updateError) {
        console.error(`[${tag}] Error marking timers notified:`, updateError)
      } else {
        processed = succeeded.length
      }
    }
    return { processed, failed }
  } catch (err) {
    console.error(`[${tag}] Flush failed:`, err)
    return { processed: 0, failed: 0 }
  }
}
