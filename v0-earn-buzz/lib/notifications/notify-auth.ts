// ── Offline-push auth + scheduling validators (SERVER-ONLY helpers) ──
// IMPORTANT: this module imports node:crypto and must NEVER be imported by
// client bundles. It is used by /api/login, /api/notifications/subscribe,
// /api/notifications/status, /api/notify/schedule and /api/timer/cron.
//
// Why tokens exist: the app logs users in with its own custom session
// (tivexx-user), so there is no Supabase Auth JWT in the browser. Push
// subscription endpoints still need real per-user auth (otherwise anyone
// could attach their device to someone else's uid and READ that user's
// pushes). The login route issues an HMAC-bound token; the client stores it
// inside tivexx-user and presents it on subscribe/status calls.

import { createHmac, timingSafeEqual } from "node:crypto";

const TOKEN_PREFIX = "v1.";
const TOKEN_CONTEXT = "notify-v1:";

function getNotifySecret(): string {
  return process.env.NOTIFY_TOKEN_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || "";
}

export function issueNotifyToken(userId: string): string | null {
  const uid = String(userId || "").trim();
  const secret = getNotifySecret();
  if (!uid || !secret || uid.length > 128) return null;
  const mac = createHmac("sha256", secret).update(`${TOKEN_CONTEXT}${uid}`).digest("hex");
  return `${TOKEN_PREFIX}${uid}.${mac}`;
}

export function verifyNotifyToken(token: unknown, uid: unknown): boolean {
  try {
    const t = String(token || "");
    const id = String(uid || "").trim();
    const secret = getNotifySecret();
    if (!t.startsWith(TOKEN_PREFIX) || !id || !secret) return false;
    const rest = t.slice(TOKEN_PREFIX.length);
    const dot = rest.lastIndexOf(".");
    if (dot <= 0) return false;
    const tokenUid = rest.slice(0, dot);
    const mac = rest.slice(dot + 1);
    if (tokenUid !== id) return false;
    const expected = createHmac("sha256", secret).update(`${TOKEN_CONTEXT}${id}`).digest("hex");
    const a = Buffer.from(mac, "hex");
    const b = Buffer.from(expected, "hex");
    return a.length > 0 && a.length === b.length && timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

// ── Auto-tap plan catalogue (mirrors the client AUTO_PLANS durations) ──
export const AUTO_DURATIONS_MS: Record<string, number> = {
  free1h: 20 * 60 * 1000,
  "24h": 24 * 60 * 60 * 1000,
  "2d": 2 * 24 * 60 * 60 * 1000,
  "3d": 3 * 24 * 60 * 60 * 1000,
  "1w": 7 * 24 * 60 * 60 * 1000,
};

export const AUTO_LABELS: Record<string, string> = {
  free1h: "20 mins FREE",
  "24h": "24 hours",
  "2d": "2 days",
  "3d": "3 days",
  "1w": "1 week",
};

export const TAP_REFILL_MS = 10 * 60 * 1000;
const MAX_SKEW_MS = 60 * 1000;

export function validateAutoSchedule(
  planId: unknown,
  startedAt: unknown,
  now: number,
): { ok: true; expiresAt: number } | { ok: false; error: string } {
  const plan = String(planId || "");
  const duration = AUTO_DURATIONS_MS[plan];
  if (!duration) return { ok: false, error: "Unknown plan" };
  const start = Number(startedAt);
  if (!Number.isFinite(start) || start <= 0) return { ok: false, error: "Bad startedAt" };
  if (start > now + MAX_SKEW_MS) return { ok: false, error: "startedAt in future" };
  if (start < now - duration - 24 * 60 * 60 * 1000) return { ok: false, error: "Stale run" };
  return { ok: true, expiresAt: start + duration };
}

export function validateRefillSchedule(
  endsAt: unknown,
  now: number,
): { ok: true; expiresAt: number } | { ok: false; error: string } {
  const end = Number(endsAt);
  if (!Number.isFinite(end) || end <= 0) return { ok: false, error: "Bad endsAt" };
  if (end <= now) return { ok: false, error: "Already due" };
  if (end > now + TAP_REFILL_MS + 5 * 60 * 1000) return { ok: false, error: "Too far out" };
  return { ok: true, expiresAt: end };
}

export type TimerKind = "claim" | "auto" | "tap_refill";

export function timerTypeKind(timerType: unknown): TimerKind {
  const v = String(timerType || "");
  if (v === "tap_refill") return "tap_refill";
  if (v === "claim" || v === "") return "claim";
  if (v === "auto" || v.startsWith("auto_") || v.startsWith("auto:")) return "auto";
  return "claim"; // unknown legacy rows keep the long-standing claim behavior
}

export function planIdFromTimerType(timerType: unknown): string | null {
  const v = String(timerType || "");
  const m = /^auto[_:](.+)$/.exec(v);
  if (m && AUTO_DURATIONS_MS[m[1]]) return m[1];
  if (v === "auto") return null;
  return null;
}

export function timerMessage(timerType: unknown): { title: string; body: string; clickUrl: string } {
  const kind = timerTypeKind(timerType);
  if (kind === "tap_refill") {
    return {
      title: "⚡ Energy refilled!",
      body: "Your energy is now filled, Dive in to make more money 💴",
      clickUrl: "/earn/tap",
    };
  }
  if (kind === "auto") {
    const plan = planIdFromTimerType(timerType);
    const label = (plan && AUTO_LABELS[plan]) || "Auto Tap";
    return {
      title: "🔥 Auto Tap finished!",
      body: `Your ${label} run is complete — open Tap & Earn to start a new one and keep earning.`,
      clickUrl: "/earn/tap",
    };
  }
  return {
    title: "⏰ Claim Ready!",
    body: "Your timer hit 00:00. Open FlashGain 9ja to claim your ₦2,000 now!",
    clickUrl: "/dashboard",
  };
}
