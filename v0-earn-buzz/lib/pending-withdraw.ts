"use client";

export const PENDING_WITHDRAW_KEY = "tivexx-pending-withdraw";
export const PENDING_WITHDRAW_WINDOW_MS = 60 * 60 * 1000; // 1h

export type PendingWithdraw = {
  startedAt: number;
  expiresAt: number;
  amount: string;
  method: string;
  fullName: string;
  ref: string;
  status: "pending" | "failed" | "cancelled";
};

export function readPendingWithdraw(): PendingWithdraw | null {
  try {
    if (typeof window === "undefined") return null;
    const raw = localStorage.getItem(PENDING_WITHDRAW_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw);
    if (!p || typeof p !== "object") return null;
    return p as PendingWithdraw;
  } catch {
    return null;
  }
}

export function startPendingWithdraw(input: { amount: string; method: string; fullName: string; ref: string }): PendingWithdraw {
  const now = Date.now();
  const rec: PendingWithdraw = {
    startedAt: now,
    expiresAt: now + PENDING_WITHDRAW_WINDOW_MS,
    amount: input.amount,
    method: input.method || "Bank Transfer",
    fullName: input.fullName || "",
    ref: input.ref || "",
    status: "pending",
  };
  try {
    localStorage.setItem(PENDING_WITHDRAW_KEY, JSON.stringify(rec));
  } catch {}
  return rec;
}

export function isPendingActive(p: PendingWithdraw | null): boolean {
  if (!p) return false;
  if (p.status !== "pending") return false;
  return p.expiresAt > Date.now();
}

export function markPendingFailed(): PendingWithdraw | null {
  try {
    const p = readPendingWithdraw();
    if (!p) return null;
    const next = { ...p, status: "failed" as const };
    localStorage.setItem(PENDING_WITHDRAW_KEY, JSON.stringify(next));
    return next;
  } catch {
    return null;
  }
}

export function cancelPendingWithdraw() {
  try {
    const p = readPendingWithdraw();
    if (!p) {
      localStorage.removeItem(PENDING_WITHDRAW_KEY);
      return;
    }
    localStorage.setItem(PENDING_WITHDRAW_KEY, JSON.stringify({ ...p, status: "cancelled" as const }));
    localStorage.removeItem(PENDING_WITHDRAW_KEY);
  } catch {
    try {
      localStorage.removeItem(PENDING_WITHDRAW_KEY);
    } catch {}
  }
}

export function pendingToQuery(p: PendingWithdraw): string {
  const qs = new URLSearchParams({
    fullName: p.fullName || "",
    amount: String(p.amount || "").replace(/[^0-9.-]/g, "") || String(p.amount || ""),
    method: p.method || "Bank Transfer",
    ...(p.ref ? { ref: p.ref } : {}),
  });
  return qs.toString();
}
