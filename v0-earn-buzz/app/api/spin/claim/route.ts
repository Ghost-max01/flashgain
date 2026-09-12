import { NextRequest, NextResponse } from "next/server"
import { getSupabaseAdmin } from "@/lib/supabase/admin"

export const runtime = "nodejs"

const GIFT_CARD_NAME = "Gift Card"
const GIFT_CARD_AMOUNT = 50000

// POST /api/spin/claim { userId, prize } — credits the ₦50,000 Gift Card win
// to balance. Physical prizes (iPhone, TV, …) go through the delivery/upgrade
// flow and are NEVER credited as cash. One gift-card credit per user per day.
export async function POST(req: NextRequest) {
  try {
    const { userId, prize } = await req.json().catch(() => ({} as any))
    if (!userId || typeof userId !== "string") {
      return NextResponse.json({ success: false, error: "Missing userId" }, { status: 400 })
    }
    if (typeof prize !== "string" || !prize.includes(GIFT_CARD_NAME)) {
      return NextResponse.json({ success: false, error: "Only the Gift Card prize is credited to balance" }, { status: 400 })
    }

    const day = new Date().toISOString().split("T")[0]
    const reference = `spin-gift-${userId}-${day}`

    let supabase: any
    try {
      supabase = getSupabaseAdmin()
    } catch {
      return NextResponse.json({ success: false, error: "Server not configured" }, { status: 500 })
    }

    // Idempotency: one gift-card credit per user per day.
    try {
      const { data: existing } = await supabase
        .from("transactions")
        .select("id")
        .eq("reference", reference)
        .maybeSingle()
      if (existing) {
        const { data: u } = await supabase.from("users").select("balance").eq("id", userId).maybeSingle()
        return NextResponse.json({ success: true, duplicate: true, newBalance: Number((u as any)?.balance || 0) })
      }
    } catch {}

    // Record first, then credit (conflict = duplicate claim).
    try {
      const { error: txErr } = await supabase.from("transactions").insert({
        user_id: userId,
        type: "spin_win",
        amount: GIFT_CARD_AMOUNT,
        reference,
        status: "success",
        metadata: { prize },
      })
      if (txErr) throw txErr
    } catch (e: any) {
      if (String((e as any)?.code || (e as any)?.message || e).includes("23505")) {
        const { data: u } = await supabase.from("users").select("balance").eq("id", userId).maybeSingle()
        return NextResponse.json({ success: true, duplicate: true, newBalance: Number((u as any)?.balance || 0) })
      }
      // transactions table may not exist — fall through to direct credit.
    }

    const { data: user } = await supabase.from("users").select("balance").eq("id", userId).maybeSingle()
    if (!user) {
      return NextResponse.json({ success: false, error: "User not found" }, { status: 404 })
    }
    const newBalance = Number((user as any).balance || 0) + GIFT_CARD_AMOUNT
    const { error: balErr } = await supabase.from("users").update({ balance: newBalance }).eq("id", userId)
    if (balErr) throw balErr

    return NextResponse.json({ success: true, newBalance, amount: GIFT_CARD_AMOUNT })
  } catch (e: any) {
    console.error("spin claim error:", e)
    return NextResponse.json({ success: false, error: "Server error" }, { status: 500 })
  }
}
