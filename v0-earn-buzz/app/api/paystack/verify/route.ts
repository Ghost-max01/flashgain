import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const reference = searchParams.get("reference") || searchParams.get("trxref")

    if (!reference) {
      return NextResponse.json({ error: "Missing reference" }, { status: 400 })
    }

    const PAYSTACK_KEY =
      process.env.PAYSTACK_SECRET_KEY ||
      process.env.NEXT_PUBLIC_PAYSTACK_SECRET_KEY ||
      process.env.PAYSTACK_SECRET ||
      ""

    if (!PAYSTACK_KEY) {
      return NextResponse.json({ error: "Missing Paystack secret key" }, { status: 500 })
    }

    const verifyRes = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
      method: "GET",
      headers: { Authorization: `Bearer ${PAYSTACK_KEY}` },
    })

    const data = await verifyRes.json().catch(() => ({}))

    if (!verifyRes.ok) {
      return NextResponse.json({ error: data?.message || "Verify failed", data }, { status: verifyRes.status })
    }

    const txData = data?.data
    if (!txData || txData.status !== "success") {
      return NextResponse.json({ success: false, status: txData?.status || "failed", data }, { status: 200 })
    }

    // Extract our metadata
    const metadata = txData.metadata || {}
    const amountNaira = (txData.amount || 0) / 100 // kobo -> naira
    const email = txData.customer?.email || ""

    // Optionally credit Supabase balance here if userId present
    // We allow idempotent credit: frontend also credits, but server credit ensures persistence
    const userId = metadata.userId || metadata.user_id || metadata.uid
    const type = metadata.type // "auto_tap" | "investment" | "deposit"

    if (userId && amountNaira > 0) {
      try {
        const supabase = await createClient()
        // Read current balance and increment (simple, not race-proof but ok for now)
        const { data: user } = await supabase.from("users").select("balance").eq("id", userId).single()
        if (user) {
          const newBalance = Number(user.balance || 0) + Number(amountNaira)
          await supabase.from("users").update({ balance: newBalance }).eq("id", userId)
        }
        // Also log to transactions if table exists (ignore error)
        try {
          await supabase.from("transactions").insert({
            user_id: userId,
            type: type || "deposit",
            amount: amountNaira,
            reference,
            status: "success",
            metadata,
          })
        } catch {}
      } catch (e) {
        console.error("paystack verify: balance update failed", e)
      }
    }

    return NextResponse.json({
      success: true,
      status: "success",
      reference,
      amount: amountNaira,
      email,
      metadata,
      data: txData,
    })
  } catch (e) {
    return NextResponse.json({ error: "Server error verifying transaction" }, { status: 500 })
  }
}

// Also allow POST with { reference }
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}))
    const reference = body.reference || body.trxref
    if (!reference) return NextResponse.json({ error: "Missing reference" }, { status: 400 })
    // Reuse GET logic via internal fetch?
    const url = new URL(req.url)
    url.searchParams.set("reference", reference)
    // Instead duplicate logic
    const PAYSTACK_KEY =
      process.env.PAYSTACK_SECRET_KEY ||
      process.env.NEXT_PUBLIC_PAYSTACK_SECRET_KEY ||
      process.env.PAYSTACK_SECRET ||
      ""
    if (!PAYSTACK_KEY) return NextResponse.json({ error: "Missing Paystack secret key" }, { status: 500 })
    const verifyRes = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
      method: "GET",
      headers: { Authorization: `Bearer ${PAYSTACK_KEY}` },
    })
    const data = await verifyRes.json().catch(() => ({}))
    if (!verifyRes.ok) return NextResponse.json({ error: data?.message || "Verify failed", data }, { status: verifyRes.status })
    const txData = data?.data
    if (!txData || txData.status !== "success") return NextResponse.json({ success: false, status: txData?.status || "failed", data }, { status: 200 })
    const metadata = txData.metadata || {}
    const amountNaira = (txData.amount || 0) / 100
    const userId = metadata.userId || metadata.user_id || metadata.uid
    if (userId && amountNaira > 0) {
      try {
        const supabase = await createClient()
        const { data: user } = await supabase.from("users").select("balance").eq("id", userId).single()
        if (user) {
          const newBalance = Number(user.balance || 0) + Number(amountNaira)
          await supabase.from("users").update({ balance: newBalance }).eq("id", userId)
        }
      } catch {}
    }
    return NextResponse.json({ success: true, status: "success", reference, amount: amountNaira, metadata, data: txData })
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}
