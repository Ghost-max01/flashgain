import { NextRequest, NextResponse } from "next/server"
import crypto from "node:crypto"
import { getBoochatConfig } from "@/lib/boochat/config"
import { getSupabaseAdmin } from "@/lib/supabase/admin"
import { sendNotificationToUser } from "@/lib/notifications/server"

export const runtime = "nodejs"

// Simple in-memory rate limit (lightweight)
const RATE_WINDOW_MS = 60 * 1000
const MAX_PER_WINDOW = 300
const rateMap = new Map<string, { count: number; resetAt: number }>()

function hmacHex(secret: string, msg: string) {
  return crypto.createHmac("sha256", secret).update(msg).digest("hex")
}

export async function POST(req: NextRequest) {
  try {
    const cfg = getBoochatConfig()

    const tsHeader = req.headers.get("x-boochat-timestamp")
    const sigHeader = req.headers.get("x-boochat-signature") || ""
    if (!tsHeader || !sigHeader) return NextResponse.json({ success: false }, { status: 401 })

    // Rate-limit by partner slug (light)
    const key = `boochat:${cfg.partnerSlug}`
    const now = Date.now()
    const rec = rateMap.get(key)
    if (rec && now < rec.resetAt && rec.count >= MAX_PER_WINDOW) {
      return NextResponse.json({ success: false, error: "Rate limited" }, { status: 429 })
    }
    if (!rec || now >= rec.resetAt) {
      rateMap.set(key, { count: 1, resetAt: now + RATE_WINDOW_MS })
    } else {
      rec.count += 1
      rateMap.set(key, rec)
    }

    const rawBody = await req.text()

    // Verify timestamp freshness (5 minutes)
    const tsNum = Number(tsHeader)
    if (Number.isNaN(tsNum) || Math.abs(tsNum * 1000 - Date.now()) > 5 * 60 * 1000) {
      return NextResponse.json({ success: false }, { status: 401 })
    }

    // Signature header expected: sha256=<hex>
    const providedHex = sigHeader.startsWith("sha256=") ? sigHeader.slice(7) : sigHeader
    try {
      const expectedHex = hmacHex(cfg.webhookSecret, `${tsHeader}.${rawBody}`)
      const a = Buffer.from(expectedHex, "hex")
      const b = Buffer.from(providedHex || "", "hex")
      if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
        return NextResponse.json({ success: false }, { status: 401 })
      }
    } catch {
      return NextResponse.json({ success: false }, { status: 401 })
    }

    let payload: any = null
    try {
      payload = JSON.parse(rawBody)
    } catch (e) {
      return NextResponse.json({ success: false }, { status: 400 })
    }

    // Basic validation
    const { type, partner, recipients = [], event_id, channel_name, title, sender_name, body, deep_link } = payload || {}
    if (partner !== cfg.partnerSlug) return NextResponse.json({ success: false }, { status: 400 })
    if (!Array.isArray(recipients)) return NextResponse.json({ success: false }, { status: 400 })

    const supabase = getSupabaseAdmin()

    // Keep only recipients that exist in users
    const validRecipients: string[] = []
    try {
      const { data: users } = await supabase.from("users").select("id").in("id", recipients).limit(500)
      if (users && Array.isArray(users)) {
        for (const u of users) if (u?.id) validRecipients.push(String(u.id))
      }
    } catch (e) {
      // DB failure should be retried by Boochat — return 500
      console.error("boochat webhook: user lookup failed", e)
      return NextResponse.json({ success: false }, { status: 500 })
    }

    // Handle member_joined: upsert membership rows only
    if (type === "member_joined") {
      try {
        const rows = validRecipients.map((id) => ({ user_id: id }))
        if (rows.length > 0) {
          await supabase.from("boochat_membership").upsert(rows, { onConflict: "user_id" })
        }
        return NextResponse.json({ success: true, added: rows.length })
      } catch (e) {
        console.error("boochat webhook member_joined error", e)
        return NextResponse.json({ success: false }, { status: 500 })
      }
    }

    // For channel_post or direct_message: create inbox+push via existing helper
    if (type === "channel_post" || type === "direct_message") {
      const isChannel = type === "channel_post"
      const stats: any = { processed: 0, sent: 0 }
      for (const uid of validRecipients) {
        try {
          const notif = {
            uid,
            title: String(title || channel_name || cfg.partnerName).slice(0, 200),
            body: (isChannel ? `${String(sender_name || "").slice(0, 200)}: ${String(body || "").slice(0, 500)}` : String(body || "")).slice(0, 1000),
            clickUrl: String(deep_link || "/"),
            kind: isChannel ? "channel_broadcast" : "channel_dm",
            dedupeKey: `boochat:${String(event_id || "").slice(0,200)}:${uid}`,
          }
          // sendNotificationToUser will mirror into notification_inbox and send push
          try {
            await sendNotificationToUser(notif as any)
          } catch (err) {
            // Log but continue processing other recipients
            console.error("sendNotificationToUser failed for", uid, err)
          }

          // Ensure membership recorded
          try {
            await supabase.from("boochat_membership").upsert({ user_id: uid }, { onConflict: "user_id" })
          } catch {}

          stats.processed += 1
        } catch (e) {
          console.error("boochat webhook processing recipient error", e)
        }
      }
      return NextResponse.json({ success: true, processed: stats.processed })
    }

    return NextResponse.json({ success: false, error: "Unknown event type" }, { status: 400 })
  } catch (e: any) {
    console.error("[boochat/webhook]", e)
    return NextResponse.json({ success: false, error: "Server error" }, { status: 500 })
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 })
}
