import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export const runtime = "nodejs"

function getAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || ""
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || ""
  if (!url || !key) return null
  return createClient(url, key)
}

const DAILY_LIMIT = 3
const DAY_MS = 24 * 60 * 60 * 1000

// GET /api/spin/status?userId= — 3 spins per 24h, enforced server-side.
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const userId = searchParams.get("userId") || ""
    if (!userId) return NextResponse.json({ success: false, remaining: 0 }, { status: 400 })
    const supabase = getAdmin()
    if (!supabase) {
      return NextResponse.json({ success: true, remaining: 3, serverEnforced: false })
    }
    const since = new Date(Date.now() - DAY_MS).toISOString()
    const { data } = await supabase.from("spins").select("id").eq("user_id", userId).gte("created_at", since)
    const used = data?.length || 0
    return NextResponse.json({ success: true, remaining: Math.max(0, DAILY_LIMIT - used), used, limit: DAILY_LIMIT })
  } catch (e: any) {
    return NextResponse.json({ success: false, remaining: 0 }, { status: 200 })
  }
}

// POST /api/spin/play {userId} — server RNG returns winIndex; records the spin.
export async function POST(req: NextRequest) {
  try {
    const { userId, segments } = await req.json().catch(() => ({}))
    if (!userId) return NextResponse.json({ success: false, error: "Missing userId" }, { status: 400 })
    const count = Math.max(2, Math.min(24, Number(segments) || 12))
    const winIndex = Math.floor(Math.random() * count)
    const supabase = getAdmin()
    if (supabase) {
      try {
        const since = new Date(Date.now() - DAY_MS).toISOString()
        const { data } = await supabase.from("spins").select("id").eq("user_id", userId).gte("created_at", since)
        if ((data?.length || 0) >= DAILY_LIMIT) {
          return NextResponse.json({ success: false, error: "Daily limit reached", remaining: 0 }, { status: 200 })
        }
        await supabase.from("spins").insert({ user_id: userId, win_index: winIndex, status: "pending", created_at: new Date().toISOString() } as any)
      } catch {}
    }
    return NextResponse.json({ success: true, winIndex, segments: count })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: String(e?.message || e) }, { status: 500 })
  }
}
