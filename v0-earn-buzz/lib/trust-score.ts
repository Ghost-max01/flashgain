"use client";

// ── Trust Score — compounding engine ──
// Rules (all compound / sum):
//  • 5 mins spent in webapp = +2
//  • every 10 referrals       = +2
//  • each app navigation      = +1
//  • each successful payment  = +5
//  • every 10 tasks           = +2  (same as referrals)
export const TRUST_STORAGE_KEY = "tivexx-trust-score";
export const TRUST_META_KEY = "tivexx-trust-meta";
export const TRUST_TIME_KEY = "tivexx-trust-time-ms";

export const TRUST_LEVELS = [
  { label: "Free", min: 0, max: 29, color: "#2563eb", next: 30 },
  { label: "Beginner", min: 30, max: 49, color: "#10b981", next: 50 },
  { label: "Trusted", min: 50, max: 99, color: "#059669", next: 100 },
  { label: "Verified", min: 100, max: 199, color: "#7c3aed", next: 200 },
  { label: "Elite", min: 200, max: 9999, color: "#f59e0b", next: null as number | null },
] as const;

export interface TrustMeta {
  timeMs: number;       // total ms spent
  referralCount: number;
  navCount: number;
  payCount: number;
  payAmount: number;    // total paid (for display)
  taskCount: number;    // completed tasks (+1 each)
  lastTimeAwarded: number; // ms threshold already awarded
  bonus: number;        // manual bumps
}

export function defaultMeta(): TrustMeta {
  return { timeMs: 0, referralCount: 0, navCount: 0, payCount: 0, payAmount: 0, taskCount: 0, lastTimeAwarded: 0, bonus: 0 };
}

export function loadMeta(): TrustMeta {
  try {
    const raw = localStorage.getItem(TRUST_META_KEY);
    if (raw) return { ...defaultMeta(), ...JSON.parse(raw) };
  } catch {}
  return defaultMeta();
}
export function saveMeta(m: TrustMeta) {
  try { localStorage.setItem(TRUST_META_KEY, JSON.stringify(m)); } catch {}
}

export function computeScore(m: TrustMeta): number {
  const timePoints = Math.floor(m.timeMs / (5 * 60 * 1000)) * 2; // 5 mins = 2
  const refPoints = Math.floor(m.referralCount / 10) * 2;        // 10 refs = 2
  const navPoints = m.navCount * 1;                              // 1 per navigate
  const payPoints = m.payCount * 5;                              // 5 per pay
  const taskPoints = Math.floor((m.taskCount || 0) / 10) * 2;     // 10 tasks = 2 (same as referrals)
  return timePoints + refPoints + navPoints + payPoints + taskPoints + m.bonus;
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
