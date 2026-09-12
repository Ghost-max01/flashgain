import { NextResponse } from "next/server"
import { randomUUID } from "crypto"
import { getSupabaseAdmin } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"

function serverReference(): string {
  const hex = randomUUID().replace(/-/g, "").slice(0, 12).toUpperCase()
  return `EB${hex}`
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({} as any))
    const rawAmount = body?.amount
    const amount = Number(String(rawAmount ?? "").replace(/[^0-9.-]/g, ""))
    const method = String(body?.method || "Bank Transfer")
    const clientUserId = String(body?.userId || body?.user_id || "").trim()

    if (!Number.isFinite(amount) || amount < 1000 || amount > 10_000_000) {
      return NextResponse.json({ error: "Amount must be between 1,000 and 10,000,000" }, { status: 400 })
    }

    // Resolve userId: JWT ownership wins; legacy body fallback when no session.
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

    const reference = serverReference()
    const admin: any = getSupabaseAdmin()
    const { error } = await admin.from("withdrawals").insert({
      user_id: userId,
      amount: Math.round(amount),
      method,
      status: "pending",
      reference,
    })
    if (error) {
      return NextResponse.json({ error: (error as any)?.message || "Could not create withdrawal" }, { status: 500 })
    }
    return NextResponse.json({ success: true, reference, amount: Math.round(amount), status: "pending", method })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 })
  }
}
