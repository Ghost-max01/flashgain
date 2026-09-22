"use client";

// ── Nigerian-day tap energy reset ──
// Energy refills to 100/100 on every new day in Africa/Lagos (WAT, UTC+1,
// no DST), regardless of the 10-min exhaust cooldown.

export const TAP_DAY_KEY = "tap_day_key";
export const TAP_STORAGE_KEY_SHARED = "tap_earn_state";
export const TAP_EXHAUST_KEY_SHARED = "tap_exhaust_until";

export function lagosDayKey(now: number = Date.now()): string {
  try {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: "Africa/Lagos",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date(now));
  } catch {
    const d = new Date(now);
    const p = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
  }
}

// If Lagos has rolled into a new day since the last check: snap energy to
// `max`, clear any exhaust cooldown, stamp the new day. Returns true when a
// reset was applied. Safe to call on mount, focus and visibility-return.
export function applyNigerianDailyRefill(max: number = 100): boolean {
  try {
    if (typeof window === "undefined") return false;
    const today = lagosDayKey();
    let stamped = "";
    try {
      stamped = String(localStorage.getItem(TAP_DAY_KEY) || "");
    } catch {
      stamped = "";
    }
    if (stamped === today) return false;
    try {
      const raw = localStorage.getItem(TAP_STORAGE_KEY_SHARED);
      const s = raw ? JSON.parse(raw) : {};
      const earned = s && typeof s === "object" ? Number(s.earned || 0) : 0;
      localStorage.setItem(
        TAP_STORAGE_KEY_SHARED,
        JSON.stringify({ energy: max, earned: Number.isFinite(earned) ? earned : 0, lastTime: Date.now() }),
      );
    } catch {}
    try {
      localStorage.removeItem(TAP_EXHAUST_KEY_SHARED);
    } catch {}
    try {
      localStorage.setItem(TAP_DAY_KEY, today);
    } catch {}
    return true;
  } catch {
    return false;
  }
}
