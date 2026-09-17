"use client";

// Browser-facing storage + re-export of the PURE core math.
// ALL scoring/labels/tiers live in lib/trust-score-core.ts so the client and
// the server route (app/api/user-trust/route.ts) can never disagree.
import {
  TRUST_STORAGE_KEY,
  TRUST_META_KEY,
  TRUST_TIME_KEY,
  TRUST_LEVELS,
  EARN_PER_TAP_BASE,
  EARN_PER_TAP_STEP,
  RATES,
  type TrustMeta,
  type Breakdown,
  type BreakdownRow,
  type BreakdownKey,
  defaultMeta,
  sanitizeMeta,
  computeBreakdown,
  computeScore,
  getLevelIndex,
  getLevel,
  getEarnPerTap,
  getProgress,
  getNextLabel,
  pointsToNextLevel,
} from "@/lib/trust-score-core";

export {
  TRUST_STORAGE_KEY,
  TRUST_META_KEY,
  TRUST_TIME_KEY,
  TRUST_LEVELS,
  EARN_PER_TAP_BASE,
  EARN_PER_TAP_STEP,
  RATES,
  type TrustMeta,
  type Breakdown,
  type BreakdownRow,
  type BreakdownKey,
  defaultMeta,
  sanitizeMeta,
  computeBreakdown,
  computeScore,
  getLevelIndex,
  getLevel,
  getEarnPerTap,
  getProgress,
  getNextLabel,
  pointsToNextLevel,
};

export function loadMeta(): TrustMeta {
  try {
    if (typeof window === "undefined") return defaultMeta();
    const raw = localStorage.getItem(TRUST_META_KEY);
    if (raw) {
      const parsed = sanitizeMeta(JSON.parse(raw));
      // Persist the sanitised copy so a tampered/partial object can't linger.
      try { localStorage.setItem(TRUST_META_KEY, JSON.stringify(parsed)); } catch {}
      return parsed;
    }
  } catch {
    // storage unavailable (private mode / quota) — fall through to defaults
  }
  return defaultMeta();
}

export function saveMeta(m: Partial<TrustMeta>) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(TRUST_META_KEY, JSON.stringify(sanitizeMeta(m)));
  } catch {
    // storage unavailable — ignore (no behaviour change otherwise)
  }
}

// ── Cross-login persistence ──
// The server keeps a snapshot of the counters (users.trust_meta, written on
// every verified tap accrual). On login / balance refresh, max-merge it with
// local activity: counters only ever grow, so element-wise max can never
// move the score backwards, and the breakdown rows still sum to the total.
export function mergeServerMeta(local: Partial<TrustMeta> | null | undefined, server: unknown): TrustMeta {
  const l = sanitizeMeta(local || {});
  const s = sanitizeMeta((server || {}) as Partial<TrustMeta>);
  return sanitizeMeta({
    timeMs: Math.max(l.timeMs, s.timeMs),
    referralCount: Math.max(l.referralCount, s.referralCount),
    navCount: Math.max(l.navCount, s.navCount),
    payCount: Math.max(l.payCount, s.payCount),
    payAmount: Math.max(l.payAmount, s.payAmount),
    taskCount: Math.max(l.taskCount, s.taskCount),
    tapCount: Math.max(l.tapCount, s.tapCount),
    lastTimeAwarded: Math.max(l.lastTimeAwarded, s.lastTimeAwarded),
    bonus: Math.max(l.bonus, s.bonus),
  });
}

// Loads local meta, max-merges a server snapshot, saves, returns merged.
export function hydrateTrustFromServer(serverMeta: unknown): TrustMeta {
  const merged = mergeServerMeta(typeof window !== "undefined" ? loadMeta() : null, serverMeta);
  saveMeta(merged);
  return merged;
}
