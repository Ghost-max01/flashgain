// ── Trust Score — compounding engine (SINGLE SOURCE OF TRUTH) ──
// This module is PURE: no "use client", no window/localStorage access.
// It is imported by BOTH the browser (via lib/trust-score.ts) and the server
// route (app/api/user-trust/route.ts) so the two can never disagree again.
//
// RULES (all compound / sum — nothing is capped):
//  • time spent in app : every 5 minutes   = +2
//  • referrals         : every 1 referral  = +1
//  • tasks completed   : every 10 tasks    = +2   (auto-tap + daily, combined, cumulative)
//  • app navigations   : every 10 navs     = +1
//  • dashboard taps    : every 20 taps     = +1
//  • payments into app : each Paystack-verified payment = +10
//    (manual verification-fee bank transfers are NOT auto-verified and never count)
//
// The displayed breakdown rows and the total are produced by the SAME
// computeBreakdown() call, so the rows always sum exactly to the total.
// (Historically per-category point caps existed on the total but NOT on the
// rows, which made "200 navigations" render next to a total that ignored
// them. Those caps are gone: activity is always counted in full.)
//
// TIERS: every tier is exactly 30 points above the previous one.
// Free 0-29 · Beginner 30-59 · Trusted 60-89 · Verified 90-119 · Elite 120+
//
// TAP EARNINGS: +10 per tier (Free ₦100 → Elite ₦140).
export const TRUST_STORAGE_KEY = "tivexx-trust-score";
export const TRUST_META_KEY = "tivexx-trust-meta";
export const TRUST_TIME_KEY = "tivexx-trust-time-ms";

export const TRUST_TIER_STEP = 30;

export const TRUST_LEVELS = [
  { label: "Free", min: 0, max: 29, color: "#2563eb", next: 30 as number | null },
  { label: "Beginner", min: 30, max: 59, color: "#10b981", next: 60 as number | null },
  { label: "Trusted", min: 60, max: 89, color: "#059669", next: 90 as number | null },
  { label: "Verified", min: 90, max: 119, color: "#7c3aed", next: 120 as number | null },
  { label: "Elite", min: 120, max: 999999, color: "#f59e0b", next: null as number | null },
];

// ── Per-tap earnings by trust level ──
// Free = ₦100/tap, Beginner = ₦110, Trusted = ₦120, Verified = ₦130, Elite = ₦140.
export const EARN_PER_TAP_BASE = 100;
export const EARN_PER_TAP_STEP = 10;

// ── Compounding rates (kept here so labels can never drift from the math) ──
export const RATES = {
  timeMinutesPerPoint: 5,
  timePointsPerHit: 2,
  referralsPerPoint: 1,
  referralPointsPerHit: 1,
  tasksPerPoint: 10,
  taskPointsPerHit: 2,
  navsPerPoint: 10,
  navPointsPerHit: 1,
  tapsPerPoint: 20,
  tapPointsPerHit: 1,
  pointsPerPayment: 10,
} as const;

export interface TrustMeta {
  timeMs: number;          // total active ms spent in app
  referralCount: number;
  navCount: number;
  payCount: number;
  payAmount: number;       // total paid (display only)
  taskCount: number;       // cumulative completed tasks (never decremented)
  tapCount: number;        // dashboard taps (20 = +1)
  lastTimeAwarded: number;
  bonus: number;           // manual bumps (display only, clamped)
}

export function defaultMeta(): TrustMeta {
  return {
    timeMs: 0,
    referralCount: 0,
    navCount: 0,
    payCount: 0,
    payAmount: 0,
    taskCount: 0,
    tapCount: 0,
    lastTimeAwarded: 0,
    bonus: 0,
  };
}

// Raw counters are sanity-clamped (finite, non-negative, plausible ceiling).
// These are NOT point caps — every unit of counted activity earns its points.
const RAW_MAX = 1_000_000;
const TIME_MS_MAX = 30 * 24 * 60 * 60 * 1000; // 30 days of active time

function raw(value: unknown, max: number = RAW_MAX): number {
  const n = Math.floor(Number(value));
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.min(n, max);
}

/** Normalise any partially-stored meta object into a complete, sane TrustMeta. */
export function sanitizeMeta(m: Partial<TrustMeta> | null | undefined): TrustMeta {
  const base = defaultMeta();
  if (!m || typeof m !== "object") return base;
  return {
    timeMs: raw(m.timeMs, TIME_MS_MAX),
    referralCount: raw(m.referralCount),
    navCount: raw(m.navCount),
    payCount: raw(m.payCount),
    payAmount: raw(m.payAmount),
    taskCount: raw(m.taskCount),
    tapCount: raw(m.tapCount),
    lastTimeAwarded: raw(m.lastTimeAwarded, TIME_MS_MAX),
    bonus: Math.min(5, Math.max(0, Math.floor(Number(m.bonus) || 0))),
  };
}

export type BreakdownKey = "time" | "referrals" | "tasks" | "nav" | "taps" | "payments" | "bonus";

export interface BreakdownRow {
  key: BreakdownKey;
  /** Short label for the UI, e.g. "Time in app (5m = +2)" */
  label: string;
  /** Human value of the raw counter, e.g. "12m" / "7" */
  value: string;
  /** Points this row contributes to the total. */
  pts: number;
  /** Progress toward the next point for this row, 0-100 (UI nicety). */
  progress: number;
  /** Raw counter, for callers that want it. */
  count: number;
}

export interface Breakdown {
  rows: BreakdownRow[];
  total: number;
}

/**
 * THE authoritative scoring function.
 * Returns the exact per-row points AND the total. total === sum(rows.pts).
 */
export function computeBreakdown(input: Partial<TrustMeta> | null | undefined): Breakdown {
  const m = sanitizeMeta(input);

  const timeHits = Math.floor(m.timeMs / (RATES.timeMinutesPerPoint * 60 * 1000));
  const refHits = Math.floor(m.referralCount / RATES.referralsPerPoint);
  const taskHits = Math.floor(m.taskCount / RATES.tasksPerPoint);
  const navHits = Math.floor(m.navCount / RATES.navsPerPoint);
  const tapHits = Math.floor(m.tapCount / RATES.tapsPerPoint);

  const timePts = timeHits * RATES.timePointsPerHit;
  const refPts = refHits * RATES.referralPointsPerHit;
  const taskPts = taskHits * RATES.taskPointsPerHit;
  const navPts = navHits * RATES.navPointsPerHit;
  const tapPts = tapHits * RATES.tapPointsPerHit;
  const payPts = m.payCount * RATES.pointsPerPayment;
  const bonusPts = m.bonus;

  const pct = (count: number, per: number) => (per <= 0 ? 0 : Math.round(((count % per) / per) * 100));

  const rows: BreakdownRow[] = [
    {
      key: "time",
      label: `Time in app (${RATES.timeMinutesPerPoint}m = +${RATES.timePointsPerHit})`,
      value: `${Math.floor(m.timeMs / 60000)}m`,
      pts: timePts,
      progress: pct(Math.floor(m.timeMs / 60000), RATES.timeMinutesPerPoint),
      count: Math.floor(m.timeMs / 60000),
    },
    {
      key: "referrals",
      label: `Referrals (${RATES.referralsPerPoint} = +${RATES.referralPointsPerHit})`,
      value: `${m.referralCount}`,
      pts: refPts,
      progress: pct(m.referralCount, RATES.referralsPerPoint),
      count: m.referralCount,
    },
    {
      key: "tasks",
      label: `Tasks done (${RATES.tasksPerPoint} = +${RATES.taskPointsPerHit})`,
      value: `${m.taskCount}`,
      pts: taskPts,
      progress: pct(m.taskCount, RATES.tasksPerPoint),
      count: m.taskCount,
    },
    {
      key: "nav",
      label: `App navigations (${RATES.navsPerPoint} = +${RATES.navPointsPerHit})`,
      value: `${m.navCount}`,
      pts: navPts,
      progress: pct(m.navCount, RATES.navsPerPoint),
      count: m.navCount,
    },
    {
      key: "taps",
      label: `Taps to earn (${RATES.tapsPerPoint} = +${RATES.tapPointsPerHit})`,
      value: `${m.tapCount}`,
      pts: tapPts,
      progress: pct(m.tapCount, RATES.tapsPerPoint),
      count: m.tapCount,
    },
    {
      key: "payments",
      label: `Payments into app (+${RATES.pointsPerPayment} each)`,
      value: `${m.payCount}`,
      pts: payPts,
      progress: 0,
      count: m.payCount,
    },
  ];

  if (bonusPts > 0) {
    rows.push({
      key: "bonus",
      label: "Bonus",
      value: `${bonusPts}`,
      pts: bonusPts,
      progress: 0,
      count: bonusPts,
    });
  }

  const total = rows.reduce((sum, r) => sum + r.pts, 0);
  return { rows, total };
}

/** Total trust score. Always equals sum of computeBreakdown().rows pts. */
export function computeScore(m: Partial<TrustMeta> | null | undefined): number {
  return computeBreakdown(m).total;
}

export function getLevelIndex(score: number): number {
  const s = Number.isFinite(score) ? score : 0;
  const idx = TRUST_LEVELS.findIndex((l) => s >= l.min && s <= l.max);
  if (idx !== -1) return idx;
  return s < 0 ? 0 : TRUST_LEVELS.length - 1;
}

export function getLevel(score: number) {
  return TRUST_LEVELS[getLevelIndex(score)];
}

export function getEarnPerTap(score: number): number {
  return EARN_PER_TAP_BASE + getLevelIndex(score) * EARN_PER_TAP_STEP;
}

/** Progress within the current 30-point tier, 0-100. Elite is always 100. */
export function getProgress(score: number): number {
  const lvl = getLevel(score);
  if (lvl.next == null) return 100;
  const span = lvl.next - lvl.min;
  const into = Math.max(0, score - lvl.min);
  return Math.max(0, Math.min(100, Math.round((into / span) * 100)));
}

/** Next tier and how many points are still needed. Null at Elite. */
export function getNextLabel(score: number): { label: string; need: number; min: number } | null {
  const idx = getLevelIndex(score);
  if (idx >= TRUST_LEVELS.length - 1) return null;
  const next = TRUST_LEVELS[idx + 1];
  return { label: next.label, need: Math.max(0, next.min - score), min: next.min };
}

/** Points still needed to reach the next tier (0 at Elite). */
export function pointsToNextLevel(score: number): number {
  return getNextLabel(score)?.need ?? 0;
}
