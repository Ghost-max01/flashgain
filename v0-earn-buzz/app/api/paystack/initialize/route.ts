import { NextResponse } from "next/server"

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { email, amount, metadata, callbackUrl } = body as {
      email?: string
      amount?: number // in Naira
      metadata?: Record<string, any>
      callbackUrl?: string
    }

    if (!email || !amount || amount <= 0) {
      return NextResponse.json({ error: "Missing email or amount" }, { status: 400 })
    }

    const PAYSTACK_KEY =
      process.env.PAYSTACK_SECRET_KEY ||
      process.env.NEXT_PUBLIC_PAYSTACK_SECRET_KEY ||
      process.env.PAYSTACK_SECRET ||
      ""

    if (!PAYSTACK_KEY) {
      return NextResponse.json({ error: "Missing Paystack secret key on server (PAYSTACK_SECRET_KEY)" }, { status: 500 })
    }

    // Paystack expects kobo
    const amountKobo = Math.round(amount * 100)

    // Build callback URL: use provided or fallback to same origin + /paystack/callback
    let finalCallback = callbackUrl
    if (!finalCallback) {
      const origin = req.headers.get("origin") || req.headers.get("referer")?.split("/").slice(0,3).join("/") || ""
      finalCallback = origin ? `${origin}/paystack/callback` : undefined
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
        metadata: metadata || {},
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
