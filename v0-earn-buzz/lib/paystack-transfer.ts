// ── Paystack bank-transfer helper (SERVER-ONLY) ──
// Flow per Paystack docs: resolve account → create transferrecipient (nuban)
// → initiate transfer from balance. Callers must consume/redeem ONLY after
// initiateTransfer returns { ok:true } (queued/pending/success).
// If OTP is enabled on the Paystack account, transfers come back
// { otp:true } — nothing moves until finalized on the dashboard.

const PS = "https://api.paystack.co";

function headers(key: string): Record<string, string> {
  return { Authorization: `Bearer ${key}`, "Content-Type": "application/json" };
}

export function paystackConfigured(): boolean {
  return Boolean((process.env.PAYSTACK_SECRET_KEY || "").trim());
}

export async function resolveAccount(
  key: string,
  accountNumber: string,
  bankCode: string,
): Promise<{ ok: true; accountName: string } | { ok: false; error: string }> {
  try {
    const res = await fetch(
      `${PS}/bank/resolve?account_number=${encodeURIComponent(accountNumber)}&bank_code=${encodeURIComponent(bankCode)}`,
      { headers: { Authorization: `Bearer ${key}` } },
    );
    const j: any = await res.json().catch(() => null);
    if (res.ok && j?.status === true && j?.data?.account_name) {
      return { ok: true, accountName: String(j.data.account_name) };
    }
    return { ok: false, error: String(j?.message || `Account resolve failed (${res.status})`) };
  } catch (e: any) {
    return { ok: false, error: e?.message || "Network error resolving account" };
  }
}

export async function createRecipient(
  key: string,
  opts: { name: string; accountNumber: string; bankCode: string },
): Promise<{ ok: true; recipientCode: string; raw: any } | { ok: false; error: string; raw?: any }> {
  try {
    const res = await fetch(`${PS}/transferrecipient`, {
      method: "POST",
      headers: headers(key),
      body: JSON.stringify({
        type: "nuban",
        name: opts.name,
        account_number: opts.accountNumber,
        bank_code: opts.bankCode,
        currency: "NGN",
      }),
    });
    const j: any = await res.json().catch(() => null);
    const code = j?.data?.recipient_code;
    if (res.ok && j?.status === true && code) return { ok: true, recipientCode: String(code), raw: j };
    return { ok: false, error: String(j?.message || `Recipient creation failed (${res.status})`), raw: j };
  } catch (e: any) {
    return { ok: false, error: e?.message || "Network error creating recipient" };
  }
}

export type TransferResult =
  | { ok: true; transferCode: string; reference: string; status: string; raw: any }
  | { ok: false; otp: true; error: string; raw?: any }
  | { ok: false; otp: false; error: string; raw?: any };

// Paystack reference: lowercase a-z, 0-9, dash/underscore, 16–50 chars.
export function transferReference(prefix: string, uid: string): string {
  const clean = `${prefix}-${String(uid).slice(0, 8)}-${Date.now().toString(36)}`
    .toLowerCase()
    .replace(/[^a-z0-9-_]/g, "")
    .slice(0, 50);
  return clean.length >= 16 ? clean : `${clean}-0000000000`.slice(0, 16);
}

export async function initiateTransfer(
  key: string,
  opts: { amountNaira: number; recipientCode: string; reference: string; reason: string },
): Promise<TransferResult> {
  try {
    const res = await fetch(`${PS}/transfer`, {
      method: "POST",
      headers: headers(key),
      body: JSON.stringify({
        source: "balance",
        amount: Math.round(opts.amountNaira * 100), // kobo
        recipient: opts.recipientCode,
        reference: opts.reference,
        reason: opts.reason,
      }),
    });
    const j: any = await res.json().catch(() => null);
    const st = String(j?.data?.status || "").toLowerCase();
    if (st === "otp") {
      return {
        ok: false,
        otp: true,
        error: "Paystack requires OTP for transfers — approve/finalize it on your Paystack dashboard, then the user can retry. Nothing was deducted from referrals.",
        raw: j,
      };
    }
    if (res.ok && j?.status === true) {
      return {
        ok: true,
        transferCode: String(j?.data?.transfer_code || ""),
        reference: String(j?.data?.reference || opts.reference),
        status: st || "pending",
        raw: j,
      };
    }
    return { ok: false, otp: false, error: String(j?.message || `Transfer failed (${res.status}) — nothing was deducted`), raw: j };
  } catch (e: any) {
    return { ok: false, otp: false, error: e?.message || "Network error initiating transfer" };
  }
}

export async function verifyTransfer(key: string, referenceOrCode: string): Promise<{ ok: boolean; status: string; raw?: any }> {
  try {
    const res = await fetch(`${PS}/transfer/${encodeURIComponent(referenceOrCode)}`, {
      headers: { Authorization: `Bearer ${key}` },
    });
    const j: any = await res.json().catch(() => null);
    if (!res.ok || !j) return { ok: false, status: "unknown", raw: j };
    const st = String(j?.data?.status || "").toLowerCase();
    if (["success", "successful", "completed"].includes(st)) return { ok: true, status: st, raw: j };
    return { ok: false, status: st || "pending", raw: j };
  } catch {
    return { ok: false, status: "unknown" };
  }
}
