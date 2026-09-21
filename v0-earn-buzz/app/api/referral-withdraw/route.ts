import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { verifyNotifyToken } from "@/lib/notifications/notify-auth";
import { computeApproved, PER_REFERRAL } from "@/lib/referral-approved";
import {
  createRecipient,
  initiateTransfer,
  resolveAccount,
  transferReference,
} from "@/lib/paystack-transfer";

// POST /api/referral-withdraw
// Body: { userId, amount, notifyToken?, clientRef?,
//         accountNumber?, account_number?, bankCode?, bank_code?, accountName? }
// Pays APPROVED referral earnings to the user's BANK via Paystack Transfer.
// Provider FIRST: referrals are marked consumed ONLY after Paystack accepts
// the transfer. Any provider failure → 4xx/5xx with nothing deducted.

export async function POST(req: NextRequest){
  try{
    const body = await req.json().catch(() => ({} as any));
    const userId = String(body?.userId || body?.user_id || "").trim();
    const amount = body?.amount;
    const notifyToken = (body as any)?.notifyToken;
    const clientRef = String((body as any)?.clientRef || "").slice(0, 64);
    const accountNumber = String(body?.accountNumber || body?.account_number || "").replace(/\D/g, "");
    const bankCode = String(body?.bankCode || body?.bank_code || "").trim();
    const accountName = String(body?.accountName || body?.account_name || "").trim();
    if(!userId || amount === undefined || amount === null) return NextResponse.json({error:"Missing"}, {status:400});
    const amt = Number(amount);
    // (a) ownership: Supabase JWT match OR login-issued notify token, with
    // legacy fallback (balances are public via /api/referral-stats).
    let owned = false;
    try{
      const supaAuth = await createClient();
      const { data: { user } } = await supaAuth.auth.getUser();
      if(user && user.id === String(userId)) owned = true;
    } catch {}
    if (!owned) {
      try { if (verifyNotifyToken(notifyToken, userId)) owned = true; } catch {}
    }
    if(!owned){
      try{
        const tmp: any = getSupabaseAdmin?.();
        if(tmp){
          const { data: exists } = await tmp.from("users").select("id").eq("id", userId).maybeSingle();
          if((exists as any)?.id) owned = true;
        }
      } catch {}
    }
    if(!owned) return NextResponse.json({error:"Unauthorized — please log out and log back in, then try again"}, {status:401});
    // (d) validate amount scale
    if(!Number.isFinite(amt) || amt <= 0 || amt % PER_REFERRAL !== 0){
      return NextResponse.json({error:"Amount must be a positive multiple of ₦500"}, {status:400});
    }
    const supabase: any = getSupabaseAdmin?.();
    if(!supabase) return NextResponse.json({error:"Server error"}, {status:500});
    // Idempotency: same press (clientRef) settles once — a double-tap must
    // never double-pay or double-consume.
    if(clientRef){
      try{
        const { data: seen } = await supabase.from("referral_withdraws").select("id,meta").eq("user_id", userId).eq("type", "referral").limit(50);
        const dup = ((seen || []) as any[]).find((r: any) => (r as any)?.meta?.clientRef === clientRef);
        if(dup){
          const { approvedBalance, approvedCount: ac } = await computeApproved(supabase, String(userId));
          return NextResponse.json({ success:true, duplicate:true, available: approvedBalance, referral_balance: approvedBalance, approved_count: ac, approvedCount: ac });
        }
      } catch {}
    }
    // (b) approved balance from the single shared helper.
    const { approvedCount, approvedBalance, approvedRows } = await computeApproved(supabase, String(userId));
    // Minimum is a flat ₦10,000 (20 referrals) — no first-₦500 exception.
    const min = 10000;
    if(amt < min){
      return NextResponse.json({error:`Minimum referral withdrawal is ₦${min.toLocaleString()} (20 referrals)`}, {status:400});
    }
    // Anything above the approved balance is rejected before touching the provider.
    if(amt > approvedBalance){
      return NextResponse.json({error: `Insufficient approved balance. Approved: ₦${approvedBalance}, pending not withdrawable until friends reach Beginner (30+)`}, {status:400});
    }
    {
      const need = Math.floor(amt / PER_REFERRAL);
      if(approvedRows.slice(0, need).length < need){
        return NextResponse.json({error:"Not enough approved referrals to cover amount"}, {status:400});
      }
    }
    // Bank destination is required — Paystack pays it, not us.
    if(!/^\d{10}$/.test(accountNumber) || !bankCode){
      return NextResponse.json({error:"Bank account missing — re-save your bank details in Setup Bank, then try again"}, {status:400});
    }
    // One bank account per account: reject account numbers already paid to another user.
    try{
      const { data: used } = await supabase
        .from("referral_withdraws")
        .select("user_id, meta")
        .eq("type", "referral")
        .neq("user_id", String(userId))
        .limit(2000);
      const clash = ((used || []) as any[]).find((r: any) => {
        const full = String(r?.meta?.accountNumberFull || r?.meta?.accountNumber || "").replace(/\D/g, "");
        // Legacy rows store only masked ****1234 — match on full 10 digits when
        // present, else on last4 + bankCode to avoid false positives.
        if (/^\d{10}$/.test(full)) return full === accountNumber;
        const last4 = full.slice(-4);
        return last4 === accountNumber.slice(-4) && String(r?.meta?.bankCode || "") === bankCode;
      });
      if(clash) return NextResponse.json({error:"This bank account is already used on another account (one account per user)."}, {status:400});
    } catch {}
    const PAYSTACK_KEY = process.env.PAYSTACK_SECRET_KEY || "";
    if(!PAYSTACK_KEY){
      return NextResponse.json({error:"Payouts not configured on server (PAYSTACK_SECRET_KEY missing). Nothing was deducted."}, {status:500});
    }
    // 1) Verify the account name (best-effort strict: fail closed).
    let resolvedName = accountName;
    try{
      const r = await resolveAccount(PAYSTACK_KEY, accountNumber, bankCode);
      if(!r.ok) return NextResponse.json({error:`Bank verify failed: ${r.error} — nothing was deducted`}, {status:400});
      resolvedName = (r as any).accountName || accountName;
    } catch (e: any){
      return NextResponse.json({error:`Bank verify failed — nothing was deducted`}, {status:400});
    }
    // 2) Create the transfer recipient.
    const rc = await createRecipient(PAYSTACK_KEY, {
      name: resolvedName || accountName || "Moneymate user",
      accountNumber,
      bankCode,
    });
    if(!rc.ok) return NextResponse.json({error:`${(rc as any).error} — nothing was deducted`}, {status:400});
    // 3) Initiate the transfer from Paystack balance.
    const reference = transferReference("fg-cash", userId);
    const tr = await initiateTransfer(PAYSTACK_KEY, {
      amountNaira: amt,
      recipientCode: (rc as any).recipientCode,
      reference,
      reason: "Moneymate referral payout",
    });
    if(!(tr as any).ok){
      const otp = (tr as any).otp === true;
      return NextResponse.json(
        { error: (tr as any).error, otpRequired: otp, retryable: true },
        { status: otp ? 202 : 400 },
      );
    }
    const transferCode = (tr as any).transferCode as string;
    const paystackRef = (tr as any).reference as string;
    // 4) Provider accepted → NOW consume + record. Never before.
    const consumeIds: string[] = [];
    {
      const need = Math.floor(amt / PER_REFERRAL);
      for(const r of approvedRows.slice(0, need)) consumeIds.push((r as any).id);
      if(consumeIds.length){
        const { error: consumeErr } = await supabase.from("referrals").update({ consumed: true }).in("id", consumeIds);
        if(consumeErr){
          console.error("[referral-withdraw] transfer accepted but consume failed", { userId, amt, paystackRef, transferCode });
          return NextResponse.json({error:"Paid but tracking failed — contact support with reference " + paystackRef}, {status:500});
        }
      }
    }
    try{ await supabase.from("referral_withdraws").insert({ user_id: userId, amount: amt, type: "referral", status: "success", meta: { approvedBalance, consumed: consumeIds.length, clientRef: clientRef || null, paystackRef, transferCode, transferStatus: (tr as any).status, accountNumber: `****${accountNumber.slice(-4)}`, accountNumberFull: accountNumber, bankCode } }); } catch {}
    try{ await supabase.from("withdrawals").insert({ user_id: userId, amount: amt, method: "bank", status: "success", source: "referral", reference: paystackRef }); } catch {}
    const newAvailable = approvedBalance - amt;
    const newApprovedCount = approvedCount - Math.floor(amt / PER_REFERRAL);
    return NextResponse.json({ success:true, reference: paystackRef, transferCode, available: newAvailable, referral_balance: newAvailable, approved_count: newApprovedCount, approvedCount: newApprovedCount, consumed: consumeIds.length });
  }catch(e:any){ return NextResponse.json({error:e.message||"Server error"}, {status:500}); }
}
