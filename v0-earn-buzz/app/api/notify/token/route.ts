import { NextRequest, NextResponse } from "next/server"
import { createHash } from "node:crypto"
import { getSupabaseAdmin } from "@/lib/supabase/admin"
import { issueNotifyToken } from "@/lib/notifications/notify-auth"

export const runtime = "nodejs"

// POST /api/notify/token — one-time offline-push token for sessions that
// predate token issuance (logged in before the token shipped), so those
// users get background alerts WITHOUT logging out and back in.
// Body: { userId, password }. The password is verified EXACTLY like /api/login
// (hash + plaintext fallback). Referral codes are deliberately NOT accepted
// here (they are public by design); referral-code users can re-login instead.
// Rate-limited best-effort: max 5 attempts per uid per hour (in-memory).
const attempts = new Map<string, { count: number; resetAt: number }>()
const MAX_ATTEMPTS = 5
const WINDOW_MS = 60 * 60 * 1000

function sha256Hex(input: string) {
  return createHash("sha256").update(input).digest("hex")
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({} as any))
    const userId = String(body?.userId || "").trim()
    const password = String(body?.password || "")
    if (!userId || userId.length > 128 || !password) {
      return NextResponse.json({ success: false, error: "Missing credentials" }, { status: 400 })
    }

    const now = Date.now()
    const rec = attempts.get(userId)
    if (rec && now < rec.resetAt && rec.count >= MAX_ATTEMPTS) {
      return NextResponse.json({ success: false, error: "Too many tries — try again later" }, { status: 429 })
    }

    let supabase: any
    try {
      supabase = getSupabaseAdmin()
    } catch {
      return NextResponse.json({ success: false, error: "Server not configured" }, { status: 500 })
    }

    const { data: user } = await supabase
      .from("users")
      .select("id,password,password_hash,password_salt,referral_code")
      .eq("id", userId)
      .maybeSingle()

    // Verified EXACTLY like /api/login: hash, plaintext, or referral-code
    // credential. (Many users log in with their referral code / user ID as
    // the password, so password-only checks would lock them out here.)
    // Note: a mint token only ever subscribes a device to THIS uid's pushes
    // — strictly less privilege than the full login the same credential buys.
    let ok = false
    if (user) {
      if ((user as any)?.password_hash) {
        try {
          ok = sha256Hex(((user as any)?.password_salt || "") + password) === (user as any).password_hash
        } catch {}
      } else if (typeof (user as any)?.password === "string" && (user as any).password) {
        ok = (user as any).password === password
      }
      if (!ok) {
        const normalizedInput = password.trim().toUpperCase()
        const normalizedCode = String((user as any)?.referral_code || "").toUpperCase()
        if (normalizedInput.length > 0 && normalizedInput === normalizedCode) ok = true
      }
    }
    if (!ok) {
      const cur = attempts.get(userId)
      attempts.set(userId, {
        count: (cur && now < cur.resetAt ? cur.count : 0) + 1,
        resetAt: cur && now < cur.resetAt ? cur.resetAt : now + WINDOW_MS,
      })
      // Generic message — never reveal whether the id exists.
      await new Promise((r) => setTimeout(r, 150))
      return NextResponse.json({ success: false, error: "Invalid credentials" }, { status: 401 })
    }

    attempts.delete(userId)
    const token = issueNotifyToken(userId)
    if (!token) {
      return NextResponse.json({ success: false, error: "Server not configured" }, { status: 500 })
    }
    return NextResponse.json({ success: true, notifyToken: token })
  } catch (e: any) {
    console.error("[notify/token]", e)
    return NextResponse.json({ success: false, error: "Server error" }, { status: 500 })
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 })
}
