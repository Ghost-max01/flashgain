import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export const runtime = "nodejs"

function getAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || ""
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || ""
  if (!url || !key) return null
  return createClient(url, key)
}

// POST /api/withdrawals/confirm {userId, amount, method, status}
// Manual-transfer receipts go to awaiting_review — never success screen.
export async function POST(req: NextRequest) {
  try {
    const { userId, amount, method, status } = await req.json().catch(() => ({}))
    const supabase = getAdmin()
    if (supabase) {
      try {
        await supabase.from("referral_withdraws").insert({
          user_id: userId || "unknown",
          amount: Number(amount) || 0,
          type: `manual_${String(method || "transfer").toLowerCase()}`,
          status: "awaiting_review",
          meta: { method, requestedStatus: status, at: new Date().toISOString() },
        } as any)
      } catch {}
    }
    return NextResponse.json({ success: true, status: "awaiting_review" })
  } catch (e: any) {
    return NextResponse.json({ success: true, status: "awaiting_review" })
  }
}
