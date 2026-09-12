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
    const redeemedFlag = (()=>{ try{ return localStorage.getItem(VIP_REDEEMED_KEY)==="1"; }catch{ return false; } })();
    const raw = localStorage.getItem(VIP_KEY);
    if (raw) {
      const j = JSON.parse(raw);
      const availRaw = Number(j.available ?? VIP_AMOUNT);
      const available = Number.isFinite(availRaw) ? Math.min(Math.max(0, availRaw), 500) : VIP_AMOUNT;
      const redeemed = Boolean(j.redeemed) || redeemedFlag;
      return { available, redeemed, phone: j.phone, network: j.network, date: j.date, history: Array.isArray(j.history) ? j.history : [] };
    }
    if (redeemedFlag) return { available: 0, redeemed: true, history: [] };
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
