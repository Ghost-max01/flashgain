"use client";

// ── Referral VIP — 500 welcome redeemable as airtime ──
export const VIP_AMOUNT = 500;
export const VIP_KEY = "tivexx-referral-vip";
export const VIP_REDEEMED_KEY = "tivexx-vip-redeemed";
export const REFERRAL_MIN_WITHDRAW = 10000; // after VIP redeemed: 20 referrals × 500
export const REFERRAL_VIP_MIN = 500;
export const REFERRAL_PER = 500;

export interface VipState {
  available: number;
  redeemed: boolean;
  phone?: string;
  network?: string;
  date?: string;
  history: { phone: string; network: string; date: string; status: string; amount: number }[];
}

export function loadVip(): VipState {
  try {
    const raw = localStorage.getItem(VIP_KEY);
    if (raw) {
      const j = JSON.parse(raw);
      return { available: VIP_AMOUNT, redeemed: false, history: [], ...j, history: Array.isArray(j.history) ? j.history : [] };
    }
  } catch {}
  return { available: VIP_AMOUNT, redeemed: false, history: [] };
}

export function saveVip(s: VipState) {
  try {
    localStorage.setItem(VIP_KEY, JSON.stringify(s));
    localStorage.setItem(VIP_REDEEMED_KEY, s.redeemed ? "1" : "0");
  } catch {}
}

export function isVipRedeemed(): boolean {
  try {
    return localStorage.getItem(VIP_REDEEMED_KEY) === "1";
  } catch { return false; }
}
