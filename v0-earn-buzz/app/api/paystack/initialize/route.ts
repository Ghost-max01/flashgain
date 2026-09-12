import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

const AUTO_TAP_AMOUNTS = [15000, 20000, 30000, 50000]
const INVESTMENT_AMOUNTS = [50000, 100000, 150000]
const DEPOSIT_MIN = 1000
const DEPOSIT_MAX = 500000
const LOAN_MIN = 500000
const LOAN_MAX = 5000000
const LOAN_FEE_RATE = 0.03

type PayType = "auto_tap" | "investment" | "loan" | "loan_fee" | "deposit"

function resolveAppBase(req: Request): string {
  const envBase = (process.env.NEXT_PUBLIC_APP_URL || "").trim().replace(/\/$/, "")
  if (envBase) return envBase
  const origin = req.headers.get("origin") || ""
  if (origin) return origin.replace(/\/$/, "")
  const referer = req.headers.get("referer") || ""
  if (referer) {
    try {
      const u = new URL(referer)
      return u.origin
    } catch {}
  }
  return ""
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({} as any))
    const email = String(body?.email || "").trim()
    const rawType = String(body?.type || body?.metadata?.type || "").trim() as PayType
    const planId = body?.planId ?? body?.metadata?.planId
    const clientUserId = String(body?.userId || body?.user_id || body?.metadata?.userId || body?.metadata?.user_id || body?.metadata?.uid || "").trim()

    if (!email) {
      return NextResponse.json({ error: "Missing email" }, { status: 400 })
    }
    if (!["auto_tap", "investment", "loan", "loan_fee", "deposit"].includes(rawType)) {
      return NextResponse.json({ error: "Invalid type. Must be auto_tap | investment | loan_fee | deposit" }, { status: 400 })
    }
    const type: PayType = rawType === "loan" ? "loan_fee" : rawType

    // Resolve authenticated userId from JWT; enforce ownership on mismatch.
    // Fallback to client userId only when no JWT session exists (legacy localStorage login).
    let userId = ""
    try {
      const supabase = await createClient()
      const { data } = await supabase.auth.getUser()
      const authId = data?.user?.id || ""
      if (authId) {
        if (clientUserId && clientUserId !== authId) {
          return NextResponse.json({ error: "User mismatch" }, { status: 401 })
        }
        userId = authId
      }
    } catch {}
    if (!userId) userId = clientUserId
    if (!userId) {
      return NextResponse.json({ error: "Missing userId (sign in first)" }, { status: 401 })
    }

    // Server-side amount allowlist — never trust client amount blindly.
    let amount = 0
    let loanAmount: number | undefined
    if (type === "auto_tap") {
      const claimed = Number(body?.amount ?? body?.metadata?.amount)
      if (!AUTO_TAP_AMOUNTS.includes(claimed)) {
        return NextResponse.json({ error: "Invalid auto_tap amount" }, { status: 400 })
      }
      amount = claimed
    } else if (type === "investment") {
      const claimed = Number(body?.amount ?? body?.metadata?.amount)
      if (!INVESTMENT_AMOUNTS.includes(claimed)) {
        return NextResponse.json({ error: "Invalid investment amount" }, { status: 400 })
      }
      amount = claimed
    } else if (type === "loan_fee") {
      const requested = Number(body?.loanAmount ?? body?.metadata?.loanAmount)
      if (!Number.isFinite(requested) || requested < LOAN_MIN || requested > LOAN_MAX) {
        return NextResponse.json({ error: `loanAmount must be between ${LOAN_MIN} and ${LOAN_MAX}` }, { status: 400 })
      }
      loanAmount = Math.round(requested)
      amount = Math.ceil(loanAmount * LOAN_FEE_RATE)
    } else {
      // deposit
      const claimed = Number(body?.amount ?? body?.metadata?.amount)
      if (!Number.isFinite(claimed) || claimed < DEPOSIT_MIN || claimed > DEPOSIT_MAX) {
        return NextResponse.json({ error: `deposit amount must be between ${DEPOSIT_MIN} and ${DEPOSIT_MAX}` }, { status: 400 })
      }
      amount = Math.round(claimed)
    }

    const PAYSTACK_KEY = process.env.PAYSTACK_SECRET_KEY || ""
    if (!PAYSTACK_KEY) {
      return NextResponse.json({ error: "Missing Paystack secret key on server (PAYSTACK_SECRET_KEY)" }, { status: 500 })
    }

    const amountKobo = Math.round(amount * 100)

    // Server-side callback URL — ignore client value.
    const appBase = resolveAppBase(req)
    const finalCallback = appBase ? `${appBase}/paystack/callback` : undefined
    if (!finalCallback) {
      return NextResponse.json({ error: "Cannot resolve callback URL (set NEXT_PUBLIC_APP_URL)" }, { status: 500 })
    }

    // Build metadata server-side.
    const metadata: Record<string, any> = { type: type === "loan_fee" ? "loan" : type, userId, amount }
    if (planId !== undefined && planId !== null && String(planId) !== "") {
      metadata.planId = String(planId)
    }
    if (type === "loan_fee" && loanAmount !== undefined) {
      metadata.loanAmount = loanAmount
      metadata.fee = amount
    }

    const initRes = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${PAYSTACK_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email,
        amount: amountKobo,
        callback_url: finalCallback,
        metadata,
      }),
    })

    const data = await initRes.json().catch(() => ({}))

    if (!initRes.ok || !data?.status) {
      const msg = data?.message || "Paystack initialize failed"
      return NextResponse.json({ error: msg, data }, { status: initRes.status || 500 })
    }

    return NextResponse.json({
      success: true,
      authorization_url: data.data.authorization_url,
      access_code: data.data.access_code,
      reference: data.data.reference,
    })
  } catch (e) {
    return NextResponse.json({ error: "Server error initializing Paystack" }, { status: 500 })
  }
}
