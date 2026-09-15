"use client";

import { safeParse } from "@/lib/safe-storage";

// ── Pending withdrawals (local-first state machine) ──
// Flow: user places withdrawal → balance is held (vanishes from available) →
// pending record (NOT in the completed list yet) → support verifies within
// 24h → status becomes "ready" + dashboard mail badge (red count) → user taps
// through History → Withdrawals to complete → moves to completed list.
// If a withdrawal is abandoned mid-flow, its pending row stays in History →
// Withdrawals where the user can tap to resume it.
export type PendingStatus = "awaiting_verification" | "ready" | "completed";

export interface PendingWithdrawal {
  id: string;
  reference: string;
  amount: number;
  bank: string;
  accountNumber: string;
  accountName: string;
  placedAt: number;
  verifyBy: number; // placedAt + 24h — support verification window
  status: PendingStatus;
  seenReady: boolean; // dashboard mail badge cleared once user opens history
}

export interface CompletedWithdrawal {
  id: string;
  reference: string;
  amount: number;
  bank: string;
  accountNumber: string;
  placedAt: number;
  completedAt: number;
}

const PENDING_KEY = "tivexx-pending-withdrawals";
const COMPLETED_KEY = "tivexx-withdrawals";
export const VERIFY_WINDOW_MS = 24 * 60 * 60 * 1000;

export function loadPendings(): PendingWithdrawal[] {
  if (typeof window === "undefined") return [];
  const v = safeParse<PendingWithdrawal[]>(localStorage.getItem(PENDING_KEY), []);
  return Array.isArray(v) ? v : [];
}

function savePendings(list: PendingWithdrawal[]) {
  try { localStorage.setItem(PENDING_KEY, JSON.stringify(list)); } catch {}
}

export function loadCompletedWithdrawals(): CompletedWithdrawal[] {
  if (typeof window === "undefined") return [];
  const v = safeParse<CompletedWithdrawal[]>(localStorage.getItem(COMPLETED_KEY), []);
  return Array.isArray(v) ? v : [];
}

function saveCompleted(list: CompletedWithdrawal[]) {
  try { localStorage.setItem(COMPLETED_KEY, JSON.stringify(list)); } catch {}
}

export function findPendingByReference(ref: string): PendingWithdrawal | null {
  if (!ref) return null;
  return loadPendings().find((p) => p.reference === ref) || null;
}

export function isReferenceKnown(ref: string): boolean {
  if (!ref) return false;
  if (findPendingByReference(ref)) return true;
  return loadCompletedWithdrawals().some((c) => c.reference === ref);
}

// Refresh derived statuses: verification window elapsed → ready.
// Returns true if anything newly became ready (caller raises the badge).
export function refreshPendingStatuses(): boolean {
  const list = loadPendings();
  const now = Date.now();
  let changed = false;
  for (const p of list) {
    if (p.status === "awaiting_verification" && now >= p.verifyBy) {
      p.status = "ready";
      changed = true;
    }
  }
  if (changed) savePendings(list);
  return changed;
}

// Place a withdrawal hold: deducts amount from the local balance, persists it
// to the server, and creates the pending record. Idempotent per reference.
export async function placePendingWithdrawal(input: {
  reference: string;
  amount: number;
  bank: string;
  accountNumber: string;
  accountName: string;
}): Promise<PendingWithdrawal | null> {
  if (typeof window === "undefined") return null;
  if (!input.reference || !(input.amount > 0)) return null;
  if (isReferenceKnown(input.reference)) return findPendingByReference(input.reference);
  const now = Date.now();
  const rec: PendingWithdrawal = {
    id: `${now}-${Math.floor(Math.random() * 1e9)}`,
    reference: input.reference,
    amount: Math.floor(input.amount),
    bank: input.bank || "",
    accountNumber: input.accountNumber || "",
    accountName: input.accountName || "",
    placedAt: now,
    verifyBy: now + VERIFY_WINDOW_MS,
    status: "awaiting_verification",
    seenReady: false,
  };
  const list = loadPendings();
  list.unshift(rec);
  savePendings(list);
  // Balance vanishes from available (held for this withdrawal).
  try {
    const raw = localStorage.getItem("tivexx-user");
    const u = safeParse<any>(raw, null);
    if (u) {
      const uid = u.id || u.userId || u.user_id || "";
      u.balance = Math.max(0, Number(u.balance || 0) - rec.amount);
      localStorage.setItem("tivexx-user", JSON.stringify(u));
      try { window.dispatchEvent(new CustomEvent("tivexx:update", { detail: { user: u } })); } catch {}
      if (uid) {
        void fetch("/api/user-balance", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: uid, balance: u.balance }),
        }).catch(() => {});
      }
    }
  } catch {}
  return rec;
}

export function markReadySeen(): void {
  const list = loadPendings();
  let changed = false;
  for (const p of list) {
    if (p.status === "ready" && !p.seenReady) { p.seenReady = true; changed = true; }
  }
  if (changed) savePendings(list);
}

// Number for the dashboard mail badge (red count): ready-but-unseen pendings.
export function readyUnseenCount(): number {
  refreshPendingStatuses();
  return loadPendings().filter((p) => p.status === "ready" && !p.seenReady).length;
}

export function listActivePendings(): PendingWithdrawal[] {
  refreshPendingStatuses();
  return loadPendings().filter((p) => p.status !== "completed");
}

// Complete a ready withdrawal → moves to the completed list (History tab).
export function completeWithdrawal(id: string): CompletedWithdrawal | null {
  const list = loadPendings();
  const idx = list.findIndex((p) => p.id === id);
  if (idx === -1) return null;
  const p = list[idx];
  if (p.status !== "ready") return null;
  list.splice(idx, 1);
  savePendings(list);
  const done: CompletedWithdrawal = {
    id: p.id,
    reference: p.reference,
    amount: p.amount,
    bank: p.bank,
    accountNumber: p.accountNumber,
    placedAt: p.placedAt,
    completedAt: Date.now(),
  };
  const completed = loadCompletedWithdrawals();
  completed.unshift(done);
  saveCompleted(completed);
  return done;
}
