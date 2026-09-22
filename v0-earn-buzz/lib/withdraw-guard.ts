"use client";

// ── Shared withdrawal-requirements gate (single source of truth) ──
// Mirrors the gates on /withdraw (handleCashout): minimum balance, daily
// tasks, referrals (skipped in withdraw-without-referral mode) and daily
// Spin & Win. Used by downstream flow pages (verifyme, bank-transfer) so a
// deep link can't skip requirements the /withdraw page would enforce.

export const NO_REFERRAL_KEY = "tivexx-no-referral";
export const REQ_MIN_BALANCE = 200000;
export const REQ_TASKS = 15;
export const REQ_REFERRALS = 5;

export function isNoReferralMode(): boolean {
  try {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(NO_REFERRAL_KEY) === "1";
  } catch {
    return false;
  }
}

export function setNoReferralMode(on: boolean) {
  try {
    localStorage.setItem(NO_REFERRAL_KEY, on ? "1" : "0");
  } catch {}
}

export function checkWithdrawalRequirements(): {
  ok: boolean;
  missing: string[];
  noReferral: boolean;
} {
  const missing: string[] = [];
  try {
    if (typeof window === "undefined") return { ok: false, missing: ["session"], noReferral: false };
    const noReferral = isNoReferralMode();
    let balance = 0;
    let referralCount = 0;
    try {
      const raw = localStorage.getItem("tivexx-user");
      const u = raw ? JSON.parse(raw) : null;
      balance = Number(u?.balance || 0);
      referralCount = Number(u?.referral_count ?? u?.referralCount ?? 0);
    } catch {}
    if (!(balance >= REQ_MIN_BALANCE)) missing.push("balance");
    try {
      const tasks = JSON.parse(localStorage.getItem("tivexx-completed-tasks") || "[]");
      const n = Array.isArray(tasks) ? tasks.length : 0;
      if (n < REQ_TASKS) missing.push("tasks");
    } catch {
      missing.push("tasks");
    }
    if (!noReferral && referralCount < REQ_REFERRALS) missing.push("referrals");
    try {
      const spinDate = localStorage.getItem("tivexx-spin-played-date") || "";
      if (spinDate !== new Date().toDateString()) missing.push("spin");
    } catch {
      missing.push("spin");
    }
    return { ok: missing.length === 0, missing, noReferral };
  } catch {
    return { ok: false, missing: ["unknown"], noReferral: false };
  }
}
