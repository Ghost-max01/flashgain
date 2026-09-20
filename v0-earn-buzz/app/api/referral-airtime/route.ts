import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getSupabaseAdmin } from "@/lib/supabase/admin"
import { verifyNotifyToken } from "@/lib/notifications/notify-auth"
import { computeApproved, PER_REFERRAL } from "@/lib/referral-approved"
import { buyAirtime } from "@/lib/vtugate"

export const runtime = "nodejs"

const VALID_NETWORKS = ["MTN", "GLO", "AIRTEL", "9MOBILE"] as const
const MIN_AIRTIME = 10000

// POST /api/referral-airtime { userId, notifyToken, phone, network, amount, clientRef }
// Converts APPROVED referral earnings (₦10,000+, multiples of ₦500) to
// airtime via VTUgate. The ₦500 one-time VIP airtime stays on /api/airtime.
// Provider FIRST: referrals are consumed ONLY after VTUgate confirms.
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

    // Ownership: Supabase JWT match OR login-issued notify token, with legacy fallback.
    let owned = false
    try {
      const supaAuth = await createClient()
      const { data } = await supaAuth.auth.getUser()
      if ((data as any)?.user?.id && (data as any).user.id === userId) owned = true
    } catch {}
    if (!owned) {
      try { if (verifyNotifyToken((body as any)?.notifyToken, userId)) owned = true } catch {}
    }
    if (!owned) {
      try {
        const tmp: any = getSupabaseAdmin?.()
        if (tmp) {
          const { data: exists } = await tmp.from("users").select("id").eq("id", userId).maybeSingle()
          if ((exists as any)?.id) owned = true
        }
      } catch {}
    }
    if (!owned) return NextResponse.json({ error: "Unauthorized — please log out and log back in, then try again" }, { status: 401 })

    let supabase: any
    try {
      supabase = getSupabaseAdmin()
    } catch {
      return NextResponse.json({ error: "Server error" }, { status: 500 })
    }

    // One phone number per account: reject numbers already paid to another user.
    try {
      const { data: used } = await supabase
        .from("referral_withdraws")
        .select("user_id, meta")
        .in("type", ["vip_airtime", "referral_airtime"])
        .neq("user_id", userId)
        .limit(2000);
      const clash = ((used || []) as any[]).find(
        (r: any) => String(r?.meta?.phone || "").replace(/\D/g, "") === phone,
      );
      if (clash) return NextResponse.json({ error: "This phone number is already used on another account (one number per account)." }, { status: 400 });
    } catch {}

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

    // VTUgate FIRST (consume only after provider confirms — a failed
    // purchase must never eat referrals).
    const vt = await buyAirtime({ phone, network, amount: amt })
    if (!vt.ok) {
      const vtf: any = vt
      return NextResponse.json({ error: `${vtf.error} (nothing was deducted)`, provider: vtf.raw || null }, { status: 400 })
    }

    // Provider confirmed: consume + record.
    const consumeIds = toConsume.map((r: any) => r.id)
    const { error: consumeErr } = await supabase.from("referrals").update({ consumed: true }).in("id", consumeIds)
    if (consumeErr) {
      console.error("[referral-airtime] VTUgate debit succeeded but consume failed", { userId, amt, ref: vt.externalRef })
      return NextResponse.json({ error: "Airtime sent but tracking failed — contact support with reference " + vt.externalRef }, { status: 500 })
    }
    try {
      await supabase.from("referral_withdraws").insert({
        user_id: userId, amount: amt, type: "referral_airtime", status: "success",
        meta: { phone, network, providerRef: vt.externalRef, transactionId: vt.transactionId, provider: "vtugate", clientRef: clientRef || null, consumed: consumeIds.length },
      })
    } catch {}
    try {
      await supabase.from("withdrawals").insert({ user_id: userId, amount: amt, method: "airtime", status: "success", source: "referral", reference: vt.externalRef })
    } catch {}

    const newAvailable = approvedBalance - amt
    return NextResponse.json({
      success: true,
      reference: vt.externalRef,
      transactionId: vt.transactionId,
      provider: "vtugate",
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
