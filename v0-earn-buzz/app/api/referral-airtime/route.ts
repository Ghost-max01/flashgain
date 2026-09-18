import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getSupabaseAdmin } from "@/lib/supabase/admin"
import { verifyNotifyToken } from "@/lib/notifications/notify-auth"
import { computeApproved, PER_REFERRAL } from "@/lib/referral-approved"

export const runtime = "nodejs"

const VALID_NETWORKS = ["MTN", "GLO", "AIRTEL", "9MOBILE"] as const
const MIN_AIRTIME = 10000

function networkCode(network: string): string {
  const n = network.toUpperCase()
  if (n === "MTN") return "BIL108"
  if (n === "GLO") return "BIL109"
  if (n === "AIRTEL") return "BIL110"
  if (n === "9MOBILE") return "BIL111"
  return "BIL099"
}

// POST /api/referral-airtime { userId, notifyToken, phone, network, amount, clientRef }
// Converts APPROVED referral earnings (₦10,000+, multiples of ₦500) to
// airtime via Paystack Bills. The ₦500 one-time VIP airtime stays on
// /api/airtime untouched. clientRef (uuid per popup open) makes retried
// taps idempotent so a double-press can never double-charge.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({} as any))
    const userId = String(body?.userId || body?.user_id || "").trim()
    const phone = String(body?.phone || "").replace(/\D/g, "")
    const network = String(body?.network || "").toUpperCase()
    const amt = Math.floor(Number(body?.amount))
    const clientRef = String(body?.clientRef || "").slice(0, 64)

    if (!userId) return NextResponse.json({ error: "Missing userId" }, { status: 400 })
    if (!/^0[789][01][0-9]{8}$/.test(phone)) {
      return NextResponse.json({ error: "Invalid Nigerian phone (11 digits, starts 070/080/081/090)" }, { status: 400 })
    }
    if (!VALID_NETWORKS.includes(network as any)) {
      return NextResponse.json({ error: "Invalid network" }, { status: 400 })
    }
    if (!Number.isFinite(amt) || amt < MIN_AIRTIME || amt % PER_REFERRAL !== 0) {
      return NextResponse.json({ error: `Minimum airtime withdrawal is ₦${MIN_AIRTIME.toLocaleString()} (multiples of ₦500)` }, { status: 400 })
    }

    // Ownership: Supabase JWT match OR login-issued notify token.
    let owned = false
    try {
      const supaAuth = await createClient()
      const { data } = await supaAuth.auth.getUser()
      if ((data as any)?.user?.id && (data as any).user.id === userId) owned = true
    } catch {}
    if (!owned) {
      try { if (verifyNotifyToken((body as any)?.notifyToken, userId)) owned = true } catch {}
    }
    if (!owned) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    let supabase: any
    try {
      supabase = getSupabaseAdmin()
    } catch {
      return NextResponse.json({ error: "Server error" }, { status: 500 })
    }

    // Idempotency: same popup (clientRef) settles once.
    if (clientRef) {
      try {
        const { data: seen } = await supabase
          .from("referral_withdraws")
          .select("id,meta")
          .eq("user_id", userId)
          .eq("type", "referral_airtime")
          .limit(50)
        const dup = ((seen || []) as any[]).find((r: any) => (r as any)?.meta?.clientRef === clientRef)
        if (dup) {
          const { approvedBalance } = await computeApproved(supabase, userId)
          return NextResponse.json({ success: true, duplicate: true, available: approvedBalance, referral_balance: approvedBalance })
        }
      } catch {}
    }

    const { approvedCount, approvedBalance, approvedRows } = await computeApproved(supabase, userId)
    if (amt > approvedBalance) {
      return NextResponse.json({ error: `Insufficient approved balance. Approved: ₦${approvedBalance.toLocaleString()}` }, { status: 400 })
    }
    const need = Math.floor(amt / PER_REFERRAL)
    const toConsume = approvedRows.slice(0, need)
    if (toConsume.length < need) {
      return NextResponse.json({ error: "Not enough approved referrals to cover amount" }, { status: 400 })
    }

    const PAYSTACK_KEY = process.env.PAYSTACK_SECRET_KEY || ""
    if (!PAYSTACK_KEY) {
      return NextResponse.json({ error: "Paystack not configured on server (PAYSTACK_SECRET_KEY missing)." }, { status: 500 })
    }

    // Paystack FIRST (consume only after provider confirms — a failed debit
    // must never eat referrals).
    const reference = `FG-REF-AIR-${userId.slice(0, 8)}-${Date.now()}`
    let paystackRes: Response | null = null
    let paystackJson: any = null
    try {
      paystackRes = await fetch("https://api.paystack.co/bill", {
        method: "POST",
        headers: { Authorization: `Bearer ${PAYSTACK_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({ customer: phone, amount: amt * 100, code: networkCode(network), country: "NG", recurrence: "One Time", reference }),
      })
      paystackJson = await paystackRes.json().catch(() => null)
    } catch (e: any) {
      return NextResponse.json({ error: e?.message || "Network error to Paystack — try again (Pending)" }, { status: 400 })
    }
    const isSuccess = !!(paystackRes && paystackRes.ok && paystackJson && (paystackJson.status === true || paystackJson.status === "success"))
    const dataStatus = String(paystackJson?.data?.status || paystackJson?.data?.data?.status || "").toLowerCase()
    const providerRef: string = paystackJson?.data?.reference || paystackJson?.data?.id || reference
    const confirmed = ["success", "successful", "delivered", "completed"].includes(dataStatus)
    if (!isSuccess) {
      const msg = paystackJson?.message || paystackJson?.data?.message || "Paystack Bills rejected the request"
      return NextResponse.json({ error: `${msg} (Pending — nothing was deducted)`, paystack: paystackJson }, { status: 400 })
    }
    if (!confirmed) {
      return NextResponse.json({ success: false, retryable: true, reference: providerRef, message: "Provider has not confirmed delivery yet — Pending, nothing was deducted." }, { status: 202 })
    }

    // Provider confirmed: consume + record + balance row.
    const consumeIds = toConsume.map((r: any) => r.id)
    const { error: consumeErr } = await supabase.from("referrals").update({ consumed: true }).in("id", consumeIds)
    if (consumeErr) {
      console.error("[referral-airtime] consume failed AFTER provider debit", { userId, amt, providerRef })
      return NextResponse.json({ error: "Debit succeeded but tracking failed — contact support with reference " + providerRef }, { status: 500 })
    }
    try {
      await supabase.from("referral_withdraws").insert({
        user_id: userId, amount: amt, type: "referral_airtime", status: "success",
        meta: { phone, network, providerRef, clientRef: clientRef || null, consumed: consumeIds.length },
      })
    } catch {}
    try {
      await supabase.from("withdrawals").insert({ user_id: userId, amount: amt, method: "airtime", status: "success", source: "referral" })
    } catch {}

    const newAvailable = approvedBalance - amt
    return NextResponse.json({
      success: true,
      reference: providerRef,
      available: newAvailable,
      referral_balance: newAvailable,
      approved_count: approvedCount - need,
      approvedCount: approvedCount - need,
      consumed: consumeIds.length,
    })
  } catch (e: any) {
    console.error("[referral-airtime]", e)
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 })
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 })
}
