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
