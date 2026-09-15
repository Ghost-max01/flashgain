"use client";

// ── Trust Score — compounding engine ──
// Rules (all compound / sum):
//  • 5 mins spent in webapp = +2
//  • every 5 referrals        = +2   (5 refs = 2)
//  • every 5 app navigations  = +1 (1 point per 5 navigations)
//  • each successful payment  = +5
//  • every 10 tasks           = +2
//  • every 50 dashboard taps  = +1
//  • bonus (client display only): capped at +5; server user-trust route is
//    authoritative and recomputes. Values >100 in storage are ignored.
// NOTE on storage: loadMeta/saveMeta wrap localStorage in try/catch (private
// mode / quota). Cross-tab: no live sync — callers should re-read on
// focus/visibilitychange if they need fresh values. No behavior change otherwise.
export const TRUST_STORAGE_KEY = "tivexx-trust-score";
export const TRUST_META_KEY = "tivexx-trust-meta";
export const TRUST_TIME_KEY = "tivexx-trust-time-ms";

export const TRUST_LEVELS = [
  { label: "Free", min: 0, max: 29, color: "#2563eb", next: 30 },
  { label: "Beginner", min: 30, max: 59, color: "#10b981", next: 60 },
  { label: "Trusted", min: 60, max: 89, color: "#059669", next: 90 },
  { label: "Verified", min: 90, max: 119, color: "#7c3aed", next: 120 },
  { label: "Elite", min: 120, max: 9999, color: "#f59e0b", next: null as number | null },
] as const;

// ── Per-tap earnings by trust level ──
// Free = ₦100/tap, Beginner = ₦110, Trusted = ₦120, Verified = ₦130, Elite = ₦140.
// Each upgrade earns ₦10 more per tap.
export const EARN_PER_TAP_BASE = 100;
export const EARN_PER_TAP_STEP = 10;

export function getLevelIndex(score: number): number {
  const idx = TRUST_LEVELS.findIndex((l) => score >= l.min && score <= l.max);
  if (idx !== -1) return idx;
  return score < 0 ? 0 : TRUST_LEVELS.length - 1;
}

export function getEarnPerTap(score: number): number {
  return EARN_PER_TAP_BASE + getLevelIndex(score) * EARN_PER_TAP_STEP;
}

export interface TrustMeta {
  timeMs: number;       // total ms spent
  referralCount: number;
  navCount: number;
  payCount: number;
  payAmount: number;    // total paid (for display)
  taskCount: number;    // completed tasks
  tapCount: number;     // dashboard orb taps (50 = +1)
  lastTimeAwarded: number; // ms threshold already awarded
  bonus: number;        // manual bumps
}

export function defaultMeta(): TrustMeta {
  return { timeMs: 0, referralCount: 0, navCount: 0, payCount: 0, payAmount: 0, taskCount: 0, tapCount: 0, lastTimeAwarded: 0, bonus: 0 };
}

export function loadMeta(): TrustMeta {
  try {
    const raw = localStorage.getItem(TRUST_META_KEY);
    if (raw) {
      const parsed = { ...defaultMeta(), ...JSON.parse(raw) };
      // Sanitize client-authoritative bonus: clamp to 0..100 on load, ignore >100.
      // Server (user-trust route) recomputes authoritatively; this is display-only.
      const b = Number((parsed as TrustMeta).bonus);
      parsed.bonus = !Number.isFinite(b) ? 0 : Math.min(100, Math.max(0, Math.floor(b)));
      if (typeof window !== "undefined") {
        try {
          // Cross-tab note: storage event listeners should call loadMeta() again
          // on "storage" to pick up changes from other tabs. No auto-sync here.
          localStorage.setItem(TRUST_META_KEY, JSON.stringify(parsed));
        } catch {}
      }
      return parsed;
    }
  } catch {
    // storage unavailable (private mode / quota) — fall through to defaults
  }
  return defaultMeta();
}
export function saveMeta(m: TrustMeta) {
  try {
    // Sanitize before persisting so a tampered bonus never persists unbounded.
    const safe: TrustMeta = { ...m, bonus: Math.min(100, Math.max(0, Math.floor(Number(m.bonus) || 0))) };
    localStorage.setItem(TRUST_META_KEY, JSON.stringify(safe));
  } catch {
    // storage unavailable — ignore (no behavior change otherwise)
  }
}

export function computeScore(m: TrustMeta): number {
  // Cap meta values to prevent inflation from tampered localStorage
  const safeReferralCount = Math.min(Math.max(0, Math.floor(m.referralCount || 0)), 500)
  const safePayCount = Math.min(Math.max(0, Math.floor(m.payCount || 0)), 10000)
  const safeTaskCount = Math.min(Math.max(0, Math.floor(m.taskCount || 0)), 10000)
  const safeNavCount = Math.min(Math.max(0, Math.floor(m.navCount || 0)), 10000)
  const safeTapCount = Math.min(Math.max(0, Math.floor(m.tapCount || 0)), 10000)
  const safeTimeMs = Math.min(Math.max(0, Math.floor(m.timeMs || 0)), 30 * 24 * 60 * 60 * 1000) // 30 days cap

  // Caps keep growth in the normal range: a fresh account cannot jump to
  // 200 in minutes. Time/nav/tap are capped at +20 each so every stage
  // genuinely takes ~30 points of mixed activity to cross.
  const timePoints = Math.min(Math.floor(safeTimeMs / (5 * 60 * 1000)) * 2, 20)
  const refPoints = Math.min(Math.floor(safeReferralCount / 5) * 2, 20)
  const navPoints = Math.min(Math.floor(safeNavCount / 5), 20)
  const payPoints = Math.min(safePayCount * 5, 50)
  const taskPoints = Math.min(Math.floor((safeTaskCount || 0) / 10) * 2, 20)
  const tapPoints = Math.min(Math.floor((safeTapCount || 0) / 50) * 1, 20)
  const safeBonus = Math.min(5, Math.max(0, Number(m.bonus) || 0))
  return timePoints + refPoints + navPoints + payPoints + taskPoints + tapPoints + safeBonus
}

export function getLevel(score: number) {
  for (const l of TRUST_LEVELS) if (score >= l.min && score <= l.max) return l;
  return TRUST_LEVELS[TRUST_LEVELS.length - 1];
}

export function getProgress(score: number) {
  const lvl = getLevel(score);
  if (lvl.next == null) return 100;
  const range = lvl.next - lvl.min;
  const into = score - lvl.min;
  return Math.max(0, Math.min(100, Math.round((into / range) * 100)));
}

export function getNextLabel(score: number) {
  const idx = TRUST_LEVELS.findIndex(l => score >= l.min && score <= l.max);
  if (idx === -1 || idx === TRUST_LEVELS.length - 1) return null;
  const next = TRUST_LEVELS[idx + 1];
  return { label: next.label, need: next.min - score };
}
