import { NextResponse } from "next/server"
import { getSupabaseAdmin } from "@/lib/supabase/admin"

async function verifyWithPaystack(reference: string, key: string) {
  const verifyRes = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
    method: "GET",
    headers: { Authorization: `Bearer ${key}` },
  })
  const data = await verifyRes.json().catch(() => ({}))
  return { verifyRes, data }
}

async function creditOnce(opts: { reference: string; userId: string; type: string; creditAmount: number; metadata: any }) {
  const { reference, userId, type, creditAmount, metadata } = opts
  const supabase: any = getSupabaseAdmin()
  // Idempotency: if reference already recorded, do not credit again.
  try {
    const { data: existing } = await supabase.from("transactions").select("reference").eq("reference", reference).maybeSingle()
    if (existing) return { duplicate: true as const }
  } catch {}
  // Insert transaction FIRST (unique reference — conflict means duplicate).
  try {
    const { error: insErr } = await supabase.from("transactions").insert({
      user_id: userId,
      type: type || "deposit",
      amount: creditAmount,
      reference,
      status: "success",
      metadata,
    })
    if (insErr) {
      const msg = String((insErr as any)?.message || (insErr as any)?.code || "")
      if (/duplicate|unique|conflict|already exists/i.test(msg)) return { duplicate: true as const }
      // If table missing, fall through to balance update attempt? No — treat as error.
      throw insErr
    }
  } catch (e: any) {
    const msg = String(e?.message || "")
    if (/duplicate|unique|conflict|already exists/i.test(msg)) return { duplicate: true as const }
    throw e
  }
  // Then update balance.
  const { data: user } = await supabase.from("users").select("balance").eq("id", userId).single()
  if (user) {
    const newBalance = Number(user.balance || 0) + creditAmount
    await supabase.from("users").update({ balance: newBalance }).eq("id", userId)
  }
  return { duplicate: false as const }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const reference = searchParams.get("reference") || searchParams.get("trxref")

    if (!reference) {
      return NextResponse.json({ error: "Missing reference" }, { status: 400 })
    }

    const PAYSTACK_KEY = process.env.PAYSTACK_SECRET_KEY || ""

    if (!PAYSTACK_KEY) {
      return NextResponse.json({ error: "Missing Paystack secret key" }, { status: 500 })
    }

    const { verifyRes, data } = await verifyWithPaystack(reference, PAYSTACK_KEY)

    if (!verifyRes.ok) {
      return NextResponse.json({ error: data?.message || "Verify failed", data }, { status: verifyRes.status })
    }

    const txData = data?.data
    if (!txData || txData.status !== "success") {
      return NextResponse.json({ success: false, status: txData?.status || "failed", data }, { status: 200 })
    }

    const metadata = txData.metadata || {}
    const amountNaira = (txData.amount || 0) / 100 // kobo -> naira (authoritative paid amount)
    const email = txData.customer?.email || ""

    const userId = metadata.userId || metadata.user_id || metadata.uid
    const type = (metadata as any).type

    // Credit ONLY the amount actually paid. Loan disbursement is a separate
    // admin-approved step — never auto-credit loanAmount from metadata.
    if (userId && amountNaira > 0) {
      try {
        const creditAmount = Number(amountNaira)
        const res = await creditOnce({ reference, userId, type: type || "deposit", creditAmount, metadata })
        if (res.duplicate) {
          return NextResponse.json({
            success: true,
            status: "success",
            duplicate: true,
            reference,
            amount: amountNaira,
            email,
            metadata,
            data: txData,
          })
        }
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
    const PAYSTACK_KEY = process.env.PAYSTACK_SECRET_KEY || ""
    if (!PAYSTACK_KEY) return NextResponse.json({ error: "Missing Paystack secret key" }, { status: 500 })
    const { verifyRes, data } = await verifyWithPaystack(reference, PAYSTACK_KEY)
    if (!verifyRes.ok) return NextResponse.json({ error: data?.message || "Verify failed", data }, { status: verifyRes.status })
    const txData = data?.data
    if (!txData || txData.status !== "success") return NextResponse.json({ success: false, status: txData?.status || "failed", data }, { status: 200 })
    const metadata = txData.metadata || {}
    const amountNaira = (txData.amount || 0) / 100
    const userId = metadata.userId || metadata.user_id || metadata.uid
    const type = (metadata as any).type
    // Same-only-amount rule: credit ONLY amountNaira actually paid, never loanAmount.
    if (userId && amountNaira > 0) {
      try {
        const creditAmount = Number(amountNaira)
        const res = await creditOnce({ reference, userId, type: type || "deposit", creditAmount, metadata })
        if (res.duplicate) {
          return NextResponse.json({ success: true, status: "success", duplicate: true, reference, amount: amountNaira, metadata, data: txData })
        }
      } catch {}
    }
    return NextResponse.json({ success: true, status: "success", reference, amount: amountNaira, metadata, data: txData })
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}
