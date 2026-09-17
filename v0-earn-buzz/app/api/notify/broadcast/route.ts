import { NextRequest, NextResponse } from "next/server"
import { getSupabaseAdmin } from "@/lib/supabase/admin"
import { sendNotificationToUser } from "@/lib/notifications/server"

export const runtime = "nodejs"

// POST /api/notify/broadcast — admin pushes to users (works offline via SW).
// Auth: Authorization: Bearer <ADMIN_NOTIFY_SECRET> (same secret as
// /api/notifications/send).
// Body: { title, body, clickUrl?, audience: { uid } | { uids: string[] } | { all: true }, limit?, offset? }
//   - { all: true } pages through every subscribed device (limit default 200,
//     max 500 per call; use offset to continue) and returns a summary.
// Content is admin-typed (trusted caller); title ≤120, body ≤500 chars.
export async function POST(req: NextRequest) {
  const secret = process.env.ADMIN_NOTIFY_SECRET
  const auth = req.headers.get("authorization") || ""
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }
  try {
    const body = await req.json().catch(() => ({} as any))
    const title = String(body?.title ?? "").slice(0, 120)
    const msgBody = String(body?.body ?? "").slice(0, 500)
    const clickUrl = String(body?.clickUrl || "/dashboard").slice(0, 500)
    if (!title || !msgBody) {
      return NextResponse.json({ success: false, error: "Missing title/body" }, { status: 400 })
    }
    const audience = (body?.audience || {}) as { uid?: unknown; uids?: unknown; all?: unknown }

    let supabase: any
    try {
      supabase = getSupabaseAdmin()
    } catch {
      return NextResponse.json({ success: false, error: "Server not configured" }, { status: 500 })
    }

    let uids: string[] = []
    if (typeof audience.uid === "string" && audience.uid.trim()) {
      uids = [audience.uid.trim()]
    } else if (Array.isArray(audience.uids)) {
      uids = (audience.uids as unknown[])
        .map((u) => String(u || "").trim())
        .filter(Boolean)
        .slice(0, 100)
    } else if (audience.all === true) {
      const limit = Math.max(1, Math.min(500, Math.floor(Number(body?.limit) || 200)))
      const offset = Math.max(0, Math.floor(Number(body?.offset) || 0))
      try {
        const [fcm, web] = await Promise.all([
          supabase.from("notification_fcm_tokens").select("user_id").range(offset, offset + limit - 1),
          supabase.from("notification_webpush_subscriptions").select("user_id").range(offset, offset + limit - 1),
        ])
        const set = new Set<string>()
        for (const r of ((fcm as any)?.data || []) as any[]) if (r?.user_id) set.add(String(r.user_id))
        for (const r of ((web as any)?.data || []) as any[]) if (r?.user_id) set.add(String(r.user_id))
        uids = [...set]
      } catch (e: any) {
        return NextResponse.json({ success: false, error: "Audience lookup failed" }, { status: 500 })
      }
    } else {
      return NextResponse.json({ success: false, error: "Bad audience" }, { status: 400 })
    }

    if (uids.length === 0) {
      return NextResponse.json({ success: true, targeted: 0, sent: 0, failed: 0 })
    }

    let sent = 0
    let failed = 0
    const concurrency = 5
    for (let i = 0; i < uids.length; i += concurrency) {
      const batch = uids.slice(i, i + concurrency)
      const results = await Promise.all(
        batch.map(async (uid) => {
          try {
            const stats = await sendNotificationToUser({ uid, title, body: msgBody, clickUrl, kind: "admin" })
            return (Number(stats?.fcmSent || 0) + Number(stats?.webpushSent || 0)) > 0
          } catch {
            return false
          }
        }),
      )
      for (const ok of results) {
        if (ok) sent += 1
        else failed += 1
      }
    }

    return NextResponse.json({
      success: true,
      targeted: uids.length,
      sent,
      failed,
      truncated: audience.all === true && uids.length >= Math.min(500, Math.floor(Number(body?.limit) || 200)),
    })
  } catch (e: any) {
    console.error("[notify/broadcast]", e)
    return NextResponse.json({ success: false, error: "Server error" }, { status: 500 })
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 })
}
