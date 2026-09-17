import { NextRequest, NextResponse, after } from "next/server"
import { getSupabaseAdmin } from "@/lib/supabase/admin"
import { getEarnPerTap } from "@/lib/trust-score-core"
import { recomputeScore } from "@/app/api/user-trust/route"

export const runtime = "nodejs"

const MANUAL_MAX_PER_CALL = 200
const MANUAL_MAX_PER_DAY = 15000

const AUTO_PLANS: Record<string, { durationMs: number; maxTaps: number }> = {
  free1h: { durationMs: 20 * 60 * 1000, maxTaps: 200 },
  "24h": { durationMs: 24 * 60 * 60 * 1000, maxTaps: 1500 },
  "2d": { durationMs: 2 * 24 * 60 * 60 * 1000, maxTaps: 3500 },
  "3d": { durationMs: 3 * 24 * 60 * 60 * 1000, maxTaps: 5500 },
  "1w": { durationMs: 7 * 24 * 60 * 60 * 1000, maxTaps: 10000 },
}

const autoIntervalMs = (planId: string) => {
  const p = AUTO_PLANS[planId]
  if (!p) return 0
  return Math.max(900, Math.floor(p.durationMs / p.maxTaps))
}

async function creditBalance(supabase: any, userId: string, amount: number) {
  const { data: user } = await supabase.from("users").select("balance").eq("id", userId).maybeSingle()
  if (!user) return null
  const newBalance = Number((user as any).balance || 0) + amount
  const { error } = await supabase.from("users").update({ balance: newBalance }).eq("id", userId)
  if (error) throw error
  return newBalance
}

// POST /api/tap/accrue — the ONLY way tap earnings reach the server balance.
// The old flow POSTed an absolute balance (now rejected) so tap earnings
// silently evaporated on the next server sync.
//
// Body:
//   { userId, accrualId, kind: "manual"|"auto", taps, planId?, startedAt? }
// - manual: taps 1..200 per call, 15,000/day cap. amount = taps × trust rate
//   (Free ₦100, Beginner ₦110, +₦10 per tier from users.trust_score).
// - auto: taps are validated against the plan schedule derived from
//   startedAt (wall-clock, so background/offline time counts). Credit is capped at
//   what the schedule allows minus what this run already paid (tracked in
//   transactions), so forged claims gain nothing beyond a normal plan run.
// accrualId makes each flush idempotent (replays return current balance).
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({} as any))
    const userId = String(body?.userId || "").trim()
    const accrualId = String(body?.accrualId || "").trim().slice(0, 64)
    const kind = body?.kind === "auto" ? "auto" : "manual"
    const taps = Math.floor(Number(body?.taps))
    if (!userId) return NextResponse.json({ success: false, error: "Missing userId" }, { status: 400 })
    if (!accrualId) return NextResponse.json({ success: false, error: "Missing accrualId" }, { status: 400 })
    if (!Number.isFinite(taps) || taps <= 0) {
      return NextResponse.json({ success: false, error: "Invalid taps" }, { status: 400 })
    }

    let supabase: any
    try {
      supabase = getSupabaseAdmin()
    } catch {
      return NextResponse.json({ success: false, error: "Server not configured" }, { status: 500 })
    }

    const reference = `tapacc-${userId}-${accrualId}`.slice(0, 120)

    // Idempotency first.
    try {
      const { data: existing } = await supabase
        .from("transactions")
        .select("id")
        .eq("reference", reference)
        .maybeSingle()
      if (existing) {
        const { data: u } = await supabase.from("users").select("balance").eq("id", userId).maybeSingle()
        console.log(`[tap/accrue] Duplicate accrual for ${userId}: ${taps} taps, earnPerTap baseline`);
        return NextResponse.json({ success: true, duplicate: true, newBalance: Number((u as any)?.balance || 0) })
      }
    } catch {}

    const now = Date.now()
    const day = new Date(now).toISOString().split("T")[0]
    let creditTaps = 0
    let type = "tap_manual"

    // Trust-based rate (authoritative): read the user's stored trust_score.
    let earnPerTap = getEarnPerTap(0);  // defaults to Free (100)
    let userTrustScore = 0;
    try {
      const { data: tu } = await supabase.from("users").select("trust_score").eq("id", userId).maybeSingle()
      userTrustScore = Number((tu as any)?.trust_score || 0)
      earnPerTap = getEarnPerTap(userTrustScore)
      console.log(`[tap/accrue] User ${userId} trust_score=${userTrustScore}, earnPerTap=₦${earnPerTap}`);
    } catch (err) {
      console.log(`[tap/accrue] trust_score query failed for ${userId}, using default earnPerTap=₦${earnPerTap}`, err);
    }

    // Fresh-rate check: users.trust_score can lag behind real activity
    // (trust syncs are best-effort), which would underpay taps at a stale
    // tier (e.g. ₦100 instead of ₦120). When the client claims a higher
    // tier, re-verify server-side with the SAME capped formula as
    // /api/user-trust and pay the verified rate. This can only ever raise
    // the rate toward the honest value — never lower it — and the verified
    // score is written back so later calls skip this check (zero added cost
    // once converged).
    const claimedScore = Math.floor(Number((body as any)?.trustScore) || 0)
    if (getEarnPerTap(claimedScore) > earnPerTap) {
      try {
        const t = ((body as any)?.trust || {}) as { timeMs?: unknown; navCount?: unknown; tapCount?: unknown }
        const verified = await recomputeScore(supabase, userId, {
          timeMs: Number(t?.timeMs) || 0,
          navCount: Number(t?.navCount) || 0,
          tapCount: Number(t?.tapCount) || 0,
        })
        const freshScore = verified.score
        if (Number.isFinite(freshScore) && freshScore > userTrustScore) {
          userTrustScore = freshScore
          earnPerTap = getEarnPerTap(freshScore)
          // Persist score AND counters so any login/device restores the
          // exact score (client max-merges this snapshot with new activity).
          // Caps mirror /api/user-trust so stored values always score sanely.
          const snap = {
            timeMs: Math.min(Math.max(0, Math.floor(Number(t?.timeMs) || 0)), 30 * 24 * 60 * 60 * 1000),
            referralCount: Math.max(0, Math.floor(Number(verified.referralCount) || 0)),
            navCount: Math.min(Math.max(0, Math.floor(Number(t?.navCount) || 0)), 10000),
            payCount: Math.max(0, Math.floor(Number(verified.payCount) || 0)),
            payAmount: 0,
            taskCount: Math.max(0, Math.floor(Number(verified.taskCount) || 0)),
            tapCount: Math.min(Math.max(0, Math.floor(Number(t?.tapCount) || 0)), 10000),
            lastTimeAwarded: 0,
            bonus: 0,
          }
          try { await supabase.from("users").update({ trust_score: freshScore, trust_meta: snap }).eq("id", userId) } catch {
            try { await supabase.from("users").update({ trust_score: freshScore }).eq("id", userId) } catch {}
          }
          console.log(`[tap/accrue] Fresh verified rate for ${userId}: score=${freshScore}, earnPerTap=₦${earnPerTap}`)
        }
      } catch {}
    }

    if (kind === "manual") {
      if (taps > MANUAL_MAX_PER_CALL) {
        return NextResponse.json({ success: false, error: "Too many taps per flush" }, { status: 400 })
      }
      // Daily cap (best-effort; missing table = skip cap). Counts taps, so
      // divide stored amounts by the current rate (best effort).
      try {
        const { data: rows } = await supabase
          .from("transactions")
          .select("amount")
          .eq("user_id", userId)
          .eq("type", "tap_manual")
          .gte("created_at", `${day}T00:00:00.000Z`)
          .limit(20000)
        const used = (rows || []).reduce((s: number, r: any) => s + Math.floor(Number(r.amount || 0) / earnPerTap), 0)
        if (used >= MANUAL_MAX_PER_DAY) {
          return NextResponse.json({ success: false, error: "Daily tap limit reached" }, { status: 429 })
        }
        creditTaps = Math.min(taps, MANUAL_MAX_PER_DAY - used)
      } catch {
        creditTaps = Math.min(taps, MANUAL_MAX_PER_CALL)
      }
      if (creditTaps <= 0) {
        return NextResponse.json({ success: false, error: "Daily tap limit reached" }, { status: 429 })
      }
    } else {
      // auto: schedule-validated.
      const planId = String(body?.planId || "")
      const startedAt = Number(body?.startedAt)
      const plan = AUTO_PLANS[planId]
      const intervalMs = autoIntervalMs(planId)
      if (!plan || !intervalMs || !Number.isFinite(startedAt) || startedAt <= 0 || startedAt > now) {
        return NextResponse.json({ success: false, error: "Invalid plan run" }, { status: 400 })
      }
      if (startedAt < now - plan.durationMs - 24 * 60 * 60 * 1000) {
        return NextResponse.json({ success: false, error: "Stale plan run" }, { status: 400 })
      }
      const effectiveEnd = Math.min(now, startedAt + plan.durationMs)
      const earnedTotal = Math.max(0, Math.min(plan.maxTaps, Math.floor((effectiveEnd - startedAt) / intervalMs)))
      // Already paid for this run (best-effort; missing table = trust schedule cap only).
      let already = 0
      try {
        const { data: rows } = await supabase
          .from("transactions")
          .select("amount")
          .eq("user_id", userId)
          .eq("type", "tap_auto")
          .like("reference", `tapacc-${userId}-auto-${planId}-${startedAt}-%`)
          .limit(5000)
        already = (rows || []).reduce((s: number, r: any) => s + Math.floor(Number(r.amount || 0) / earnPerTap), 0)
      } catch {}
      creditTaps = Math.max(0, Math.min(taps, earnedTotal - already))
      if (creditTaps <= 0) {
        const { data: u0 } = await supabase.from("users").select("balance").eq("id", userId).maybeSingle()
        return NextResponse.json({ success: true, newBalance: Number((u0 as any)?.balance || 0), earnedTotal, already })
      }
      type = "tap_auto"
    }

    const amount = creditTaps * earnPerTap
    const finalRef = kind === "auto"
      ? `tapacc-${userId}-auto-${String(body?.planId)}-${Number(body?.startedAt)}-${accrualId}`.slice(0, 120)
      : reference

    console.log(`[tap/accrue] ${kind} crediting: taps=${creditTaps}, earnPerTap=₦${earnPerTap}, amount=₦${amount} (${creditTaps} × ₦${earnPerTap})`);

    try {
      const { error: txErr } = await supabase.from("transactions").insert({
        user_id: userId,
        type,
        amount,
        reference: finalRef,
        status: "success",
        metadata: kind === "auto" ? { planId: String(body?.planId), startedAt: Number(body?.startedAt) } : {},
      })
      if (txErr) throw txErr
    } catch (e: any) {
      if (String((e as any)?.code || (e as any)?.message || e).includes("23505")) {
        const { data: u } = await supabase.from("users").select("balance").eq("id", userId).maybeSingle()
        return NextResponse.json({ success: true, duplicate: true, newBalance: Number((u as any)?.balance || 0) })
      }
      // transactions table may not exist — fall through to direct credit.
    }

    const newBalance = await creditBalance(supabase, userId, amount)
    if (newBalance === null) {
      return NextResponse.json({ success: false, error: "User not found" }, { status: 404 })
    }
    // ── Hobby-plan survival: opportunistic due-reminder flush ──
    // Vercel Hobby runs the scheduler only daily, so pushes can't wait for
    // it. ~10% of successful accrues flush up to 10 due rows AFTER this
    // response (after() never delays the user; failures are swallowed).
    // Same shared routine as /api/timer/cron — one source, kneaded together.
    try {
      if (Math.random() < 0.10) {
        const { flushDueNotifications } = await import("@/lib/notifications/notify-due")
        after(() => flushDueNotifications(supabase, { limit: 10, logTag: "accrue-piggyback" }).catch(() => {}))
      }
    } catch {}
    return NextResponse.json({ success: true, newBalance, creditedTaps: creditTaps, creditedAmount: amount, earnPerTap })
  } catch (e: any) {
    console.error("tap accrue error:", e)
    return NextResponse.json({ success: false, error: "Server error" }, { status: 500 })
  }
}
