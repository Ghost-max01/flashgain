import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

const VALID_NETWORKS = ["MTN", "GLO", "AIRTEL", "9MOBILE"] as const;

// Paystack Bills requires amount in kobo
const AMOUNT_KOBO = 500 * 100;

// helper: map network to Paystack bill code if needed - Paystack Bills uses codes like BIL099 etc
// We attempt generic airtime bill first, then fall back to provider-specific code if Paystack demands it.
function networkCode(network: string): string {
  const n = network.toUpperCase();
  // These are example BIL codes — Paystack dashboard -> Bills -> biller codes. Adjust if your dashboard shows different codes.
  if (n === "MTN") return "BIL108"; // MTN airtime
  if (n === "GLO") return "BIL109";
  if (n === "AIRTEL") return "BIL110";
  if (n === "9MOBILE") return "BIL111";
  return "BIL099";
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, phone, network, amount } = body || {};
    if (!userId || !phone || !network) return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    if (Number(amount) !== 500) return NextResponse.json({ error: "VIP airtime is exactly ₦500" }, { status: 400 });

    const digits = String(phone).replace(/\D/g, "");
    if (!/^0[789][01][0-9]{8}$/.test(digits)) return NextResponse.json({ error: "Invalid Nigerian phone (11 digits, starts 070/080/081/090)" }, { status: 400 });
    if (!VALID_NETWORKS.includes(String(network).toUpperCase() as any)) return NextResponse.json({ error: "Invalid network" }, { status: 400 });

    const supabase: any = (() => { try { return getSupabaseAdmin?.(); } catch { return null; } })();

    // server-side idempotency: already redeemed?
    if (supabase) {
      try {
        const { data: userRow } = await supabase.from("users").select("vip_redeemed, referral_vip_balance").eq("id", userId).maybeSingle();
        if (userRow?.vip_redeemed === true) return NextResponse.json({ error: "VIP already redeemed" }, { status: 400 });
      } catch {}
    }

    const PAYSTACK_KEY = process.env.PAYSTACK_SECRET_KEY || process.env.NEXT_PUBLIC_PAYSTACK_SECRET_KEY || process.env.PAYSTACK_SECRET || "";
    if (!PAYSTACK_KEY) {
      return NextResponse.json({ error: "Paystack not configured on server (PAYSTACK_SECRET_KEY missing). Add it on Vercel and redeploy." }, { status: 500 });
    }

    // --- REAL PAYSTACK BILLS CALL — real debit from your Paystack balance ---
    // Docs: POST https://api.paystack.co/bill  (Bills Payment) — requires Bills enabled on your Paystack account.
    // If Bills is not enabled, Paystack returns 400/403 with message — we surface it and DO NOT mark redeemed (so tracking stays honest).
    const reference = `FG-VIP-${userId.slice(0, 8)}-${Date.now()}`;
    const code = networkCode(network);

    // Paystack Bills payload — amount in kobo, customer = phone
    const billPayload: any = {
      customer: digits,
      amount: AMOUNT_KOBO,
      code,
      // Some Paystack bills setups require these; harmless if ignored:
      country: "NG",
      recurrence: "One Time",
      reference,
    };

    // Also try generic type field for airtime if your biller expects it
    // Keep reference unique per attempt for tracking.

    let paystackRes: Response | null = null;
    let paystackJson: any = null;
    let lastError = "";

    // Primary endpoint: /bill
    try {
      paystackRes = await fetch("https://api.paystack.co/bill", {
        method: "POST",
        headers: { Authorization: `Bearer ${PAYSTACK_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify(billPayload),
      });
      paystackJson = await paystackRes.json().catch(() => null);
    } catch (e: any) {
      lastError = e?.message || "network error to Paystack /bill";
    }

    // Fallback: some accounts expose /bills (plural)
    if (!paystackRes || !paystackRes.ok) {
      const errMsg = paystackJson?.message || lastError || `Paystack /bill failed (${paystackRes?.status})`;
      // If it's clearly "not enabled" or 404, try plural endpoint once
      const shouldTryPlural = paystackRes?.status === 404 || /not found|route|bills.*enable/i.test(errMsg);
      if (shouldTryPlural) {
        try {
          paystackRes = await fetch("https://api.paystack.co/bills", {
            method: "POST",
            headers: { Authorization: `Bearer ${PAYSTACK_KEY}`, "Content-Type": "application/json" },
            body: JSON.stringify(billPayload),
          });
          paystackJson = await paystackRes.json().catch(() => null);
        } catch (e: any) {
          lastError = e?.message || lastError;
        }
      }
    }

    // Determine success — ONLY mark redeemed if Paystack confirms
    const isSuccess = !!(paystackRes && paystackRes.ok && paystackJson && (paystackJson.status === true || paystackJson.status === "success"));
    const dataStatus = paystackJson?.data?.status || paystackJson?.data?.data?.status || "";

    if (!isSuccess) {
      const msg = paystackJson?.message || paystackJson?.data?.message || lastError || "Paystack Bills rejected the request";
      const hint =
        /bills?.*not.*enable|enable.*bills|not.*whitelisted|permission/i.test(msg)
          ? " Your Paystack account needs Bills/Airtime enabled. Contact Paystack support to enable Bills, or the charge won't debit. Tracking is NOT marked successful until Paystack returns success."
          : "";
      console.error("[airtime] Paystack debit failed", { status: paystackRes?.status, paystackJson, digits, code });
      return NextResponse.json({ error: msg + hint, paystack: paystackJson, statusCode: paystackRes?.status || 500 }, { status: 400 });
    }

    // At this point Paystack accepted the bill — dataStatus may be "success" or "pending"
    // For pending, we return pending and let frontend poll /api/airtime/status; but for VIP we consider accepted as success and track reference.
    const providerRef: string = paystackJson?.data?.reference || paystackJson?.data?.id || paystackJson?.data?.data?.reference || reference;
    const providerStatus: string = dataStatus || (paystackJson?.data ? "success" : "accepted");

    // --- ONLY on verified Paystack success/accepted do we mark redeemed and track ---
    try {
      if (supabase) {
        await supabase.from("users").update({ vip_redeemed: true, referral_vip_balance: 0 }).eq("id", userId);
        await supabase.from("referral_withdraws").insert({
          user_id: userId,
          amount: 500,
          type: "vip_airtime",
          status: providerStatus === "pending" ? "pending" : "success",
          meta: { phone: digits, network: String(network).toUpperCase(), providerRef, providerStatus, paystackResponse: paystackJson?.data || paystackJson },
        } as any);
      }
    } catch (e) {
      console.error("[airtime] post-success DB log failed", e);
      // don't fail the request — debit already happened, return reference so user can track
    }

    return NextResponse.json({
      success: true,
      reference: providerRef,
      status: providerStatus,
      message: providerStatus === "pending" ? "Airtime queued — will confirm shortly. Reference tracked." : "Airtime sent — debited from Paystack. Reference tracked.",
      paystack: paystackJson?.data || paystackJson,
    });
  } catch (e: any) {
    console.error("[airtime] exception", e);
    return NextResponse.json({ error: e.message || "Server error" }, { status: 500 });
  }
}
