// ── Spin & Win economy (SINGLE SOURCE OF TRUTH, pure — no deps) ──
// Imported by BOTH app/stake/page.tsx (animation + display) and
// app/api/stake/result/route.ts (money settlement) so the two can never
// disagree on payouts or the session rule again.
//
// Economy: the stake is ALWAYS deducted at spin.
//   ×1 win credits stake back + half-stake profit  → 1.5× stake total
//   ×2 win credits stake back + full-stake profit  → 2× stake total
//   loss credits nothing.
// Session rule (rolling history, oldest → newest): never 3 straight wins,
// never 3 straight losses — after WW force LOSS, after LL force WIN.

export function creditForWin(stake: number, multiplier: 1 | 2): number {
  const s = Math.floor(Number(stake) || 0);
  if (!Number.isFinite(s) || s <= 0) return 0;
  return multiplier === 1 ? Math.floor((s * 3) / 2) : s * 2;
}

export function forcedSessionOutcome(history: number[]): 0 | 1 | null {
  if (!Array.isArray(history)) return null;
  const h = history.map((w) => (w ? 1 : 0));
  const n = h.length;
  if (n >= 2 && h[n - 1] === 1 && h[n - 2] === 1) return 0;
  if (n >= 2 && h[n - 1] === 0 && h[n - 2] === 0) return 1;
  return null;
}
