import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export const runtime = "nodejs"

function getAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || ""
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || ""
  if (!url || !key) return null
  return createClient(url, key)
}

// POST /api/loans/request {userId, amount}
// Stores status=pending, does NOT credit. 7-day limit enforced server-side.
export async function POST(req: NextRequest) {
  try {
    const { userId, amount } = await req.json().catch(() => ({}))
    if (!userId || !Number(amount)) return NextResponse.json({ success: false, error: "Missing userId/amount" }, { status: 400 })
    const supabase = getAdmin()
    if (!supabase) return NextResponse.json({ success: false, error: "Server not configured" }, { status: 500 })

    // 7-day server-side limit: check loans table for recent request
    try {
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
      const { data: recent } = await supabase.from("loans").select("id,created_at").eq("user_id", userId).gte("created_at", sevenDaysAgo).limit(1)
      if (recent && recent.length > 0) {
        return NextResponse.json({ success: false, error: "You can apply for a loan again in 7 days.", restricted: true }, { status: 200 })
      }
    } catch {}

    try {
      await supabase.from("loans").insert({ user_id: userId, amount: Math.floor(Number(amount)), status: "pending", created_at: new Date().toISOString() })
    } catch (e: any) {
      // If loans table missing, fall back to user_timers marker (still no credit)
      try {
        await supabase.from("user_timers").upsert({ user_id: userId, loan_request_at: new Date().toISOString() } as any, { onConflict: "user_id" })
      } catch {}
      return NextResponse.json({ success: true, status: "pending", message: "Under review" })
    }
    return NextResponse.json({ success: true, status: "pending", message: "Under review" })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: String(e?.message || e) }, { status: 500 })
  }
}

// GET /api/loans/request?userId= — returns pending status / restriction for UI
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const userId = searchParams.get("userId") || ""
    if (!userId) return NextResponse.json({ success: false }, { status: 400 })
    const supabase = getAdmin()
    if (!supabase) return NextResponse.json({ success: true, restricted: false })
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
    const { data } = await supabase.from("loans").select("id,status,created_at").eq("user_id", userId).order("created_at", { ascending: false }).limit(1)
    const last = data?.[0] as any
    const restricted = last ? new Date(last.created_at).getTime() > Date.now() - 7 * 24 * 60 * 60 * 1000 : false
    void sevenDaysAgo
    return NextResponse.json({ success: true, restricted, last })
  } catch {
    return NextResponse.json({ success: true, restricted: false })
  }
}
