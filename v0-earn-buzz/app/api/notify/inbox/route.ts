import { NextRequest, NextResponse } from "next/server"
import { getSupabaseAdmin } from "@/lib/supabase/admin"

export const runtime = "nodejs"

// GET /api/notify/inbox?userId= — mail-icon inbox feed (latest 50, newest
// first) + unread count. Same open pattern as /api/referral-stats
// (uid-scoped read of the caller's own rows). Prunes beyond 100/user.
export async function GET(req: NextRequest) {
  try {
    const userId = new URL(req.url).searchParams.get("userId")?.trim() || ""
    if (!userId) return NextResponse.json({ success: false, items: [], unread: 0 })

    let supabase: any
    try {
      supabase = getSupabaseAdmin()
    } catch {
      return NextResponse.json({ success: false, items: [], unread: 0 })
    }

    let rows: any[] = []
    try {
      const { data, error } = await supabase
        .from("notification_inbox")
        .select("id,title,body,click_url,kind,read,created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(50)
      if (error) throw error
      rows = data || []
    } catch {
      return NextResponse.json({ success: true, items: [], unread: 0 })
    }

    const items = rows.map((r: any) => ({
      id: String(r?.id || ""),
      title: String(r?.title || "Notification"),
      body: String(r?.body || ""),
      clickUrl: String(r?.click_url || "/dashboard"),
      kind: String(r?.kind || "admin"),
      read: (r as any)?.read === true,
      at: new Date((r as any)?.created_at || 0).getTime() || 0,
    }))
    const unread = items.filter((i) => !i.read).length

    // Best-effort prune beyond 100/user (keeps the table bounded).
    try {
      const { data: oldest } = await supabase
        .from("notification_inbox")
        .select("id")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .range(100, 500)
      const ids = ((oldest || []) as any[]).map((r: any) => r?.id).filter(Boolean)
      if (ids.length > 0) {
        await supabase.from("notification_inbox").delete().in("id", ids.slice(0, 400))
      }
    } catch {}

    return NextResponse.json({ success: true, items, unread })
  } catch (e: any) {
    console.error("[notify/inbox]", e)
    return NextResponse.json({ success: false, items: [], unread: 0 })
  }
}

// POST /api/notify/inbox/read { userId, ids?: string[] } — mark read.
// No ids (or all:true) = mark all read for the uid.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({} as any))
    const userId = String(body?.userId || "").trim()
    if (!userId) return NextResponse.json({ success: false }, { status: 400 })

    let supabase: any
    try {
      supabase = getSupabaseAdmin()
    } catch {
      return NextResponse.json({ success: false }, { status: 500 })
    }

    try {
      const ids = Array.isArray(body?.ids)
        ? (body.ids as unknown[]).map((v) => String(v || "")).filter(Boolean).slice(0, 100)
        : []
      let q = supabase.from("notification_inbox").update({ read: true }).eq("user_id", userId)
      if (ids.length > 0 && !(body as any)?.all) q = q.in("id", ids)
      const { error } = await q
      if (error) throw error
    } catch {
      return NextResponse.json({ success: false }, { status: 500 })
    }
    return NextResponse.json({ success: true })
  } catch (e: any) {
    console.error("[notify/inbox/read]", e)
    return NextResponse.json({ success: false }, { status: 500 })
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 })
}
