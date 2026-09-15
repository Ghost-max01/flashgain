"use client";

/**
 * Crash-safe JSON read for browser storage.
 *
 * Root cause of the intermittent "Application error: a client-side exception
 * has occurred" on first load: dozens of call sites do
 * `JSON.parse(localStorage.getItem(...))` with no try/catch. One corrupted /
 * half-written value (interrupted write, full quota, old schema, manual
 * tampering) throws synchronously inside render/effect and — with no root
 * error boundary — takes down the whole app until site data is cleared.
 *
 * safeParse behaves EXACTLY like JSON.parse for valid input and returns the
 * caller-chosen fallback instead of throwing for invalid input.
 */
export function safeParse<T>(raw: string | null | undefined, fallback: T): T {
  if (raw === null || raw === undefined || raw === "") return fallback;
  try {
    const value = JSON.parse(raw) as T;
    return (value === null || value === undefined ? fallback : value) as T;
  } catch {
    return fallback;
  }
}

/** Read a JSON value from localStorage without ever throwing. */
export function readJSON<T>(key: string, fallback: T): T {
  try {
    return safeParse(localStorage.getItem(key), fallback);
  } catch {
    return fallback;
  }
}

/** Write a JSON value to localStorage without ever throwing (e.g. quota). */
export function writeJSON(key: string, value: unknown): boolean {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

/**
 * Keys known to hold JSON. A corrupted entry is unusable anyway — drop it so
 * the app boots clean instead of crashing. Runs once per boot (see
 * components/client-crash-guard.tsx) and from the error boundaries before
 * offering a retry.
 */
const KNOWN_JSON_KEYS = [
  "tivexx-user",
  "momo-credit-user",
  "tivexx-bank-details",
  "bank_details",
  "tivexx-referral-vip",
  "tivexx-vip-redeemed",
  "tivexx-referral-withdraws",
  "tivexx-trust-meta",
  "tivexx-pending-ref",
  "tivexx-last-synced-referrals",
  "auto_tap_state",
  "auto_tap_plan_cooldowns",
  "tivexx-tiered-completed-tasks",
  "tivexx-tiered-cooldowns",
  "tivexx-tiered-current-tier",
  "tivexx-completed-tasks",
  "tivexx-task-cooldowns",
  "auto-tap-completed-tasks",
  "auto-tap-task-cooldowns",
  "mt-completed-tasks",
  "mu-completed-tasks",
  "spin_tier_cooldowns",
  "spinTimestamps",
  "tivexx-transactions",
  "momo-credit-transactions",
  "momo-credit-notifications",
  "investment_history",
  "buzzCodePurchase",
  "momo-credit-momo-number-form",
];

const JSON_KEY_PREFIXES = [
  "auto_ref_count_",
  "auto_tap_paid_",
  "paystack_ref_",
  "tivexx-completed",
  "tivexx-task-cooldowns",
  "tivexx-claim",
  "tivexx-timer",
  "tivexx-pause",
  "mt-",
  "mu-",
];

function isKnownJsonKey(key: string): boolean {
  if (KNOWN_JSON_KEYS.includes(key)) return true;
  return JSON_KEY_PREFIXES.some((p) => key.startsWith(p));
}

/** Remove corrupted JSON entries. Returns the dropped keys (for logging). */
export function sanitizeCorruptedStorage(): string[] {
  if (typeof window === "undefined") return [];
  const dropped: string[] = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key || !isKnownJsonKey(key)) continue;
      const raw = localStorage.getItem(key);
      if (raw === null || raw === "") continue;
      try {
        JSON.parse(raw);
      } catch {
        try {
          localStorage.removeItem(key);
        } catch {}
        dropped.push(key);
      }
    }
  } catch {}
  if (dropped.length) {
    console.warn("[safe-storage] dropped corrupted keys:", dropped);
  }
  return dropped;
}
