"use client";

import { safeParse } from "@/lib/safe-storage";

// ── Task earnings ledger (local-first) ──
// Every completed task (daily, mt-, mu-, auto-tap, tiered) records one row so
// Profile → History → Task Earnings can list them like the reference design:
// "Task Reward … +₦1,000 … Credited". All task payouts are ₦1,000.
export interface TaskLedgerRow {
  id: string;
  taskId: string;
  label: string;
  amount: number;
  date: string;
}

const LEDGER_KEY = "tivexx-task-ledger";
export const TASK_REWARD = 1000;

export function recordTaskEarning(taskId: string, label: string, amount: number = TASK_REWARD): void {
  if (typeof window === "undefined") return;
  try {
    const prev = safeParse<TaskLedgerRow[]>(localStorage.getItem(LEDGER_KEY), []);
    const list = Array.isArray(prev) ? prev : [];
    if (list.some((r) => r.taskId === taskId)) return; // idempotent per task
    list.unshift({
      id: `${Date.now()}-${Math.floor(Math.random() * 1e9)}`,
      taskId,
      label: label || "Task",
      amount,
      date: new Date().toISOString(),
    });
    localStorage.setItem(LEDGER_KEY, JSON.stringify(list.slice(0, 500)));
  } catch {}
}

export function loadTaskLedger(): TaskLedgerRow[] {
  if (typeof window === "undefined") return [];
  const v = safeParse<TaskLedgerRow[]>(localStorage.getItem(LEDGER_KEY), []);
  return Array.isArray(v) ? v : [];
}
