import { NextRequest, NextResponse } from "next/server"
import crypto from "node:crypto"
import { getBoochatConfig } from "@/lib/boochat/config"
import { getSupabaseAdmin } from "@/lib/supabase/admin"

export const runtime = "nodejs"

// Where users land if the support DM can't be opened (not logged in, not configured...).
const SUPPORT_FALLBACK_URL = "https://whatsapp.com/channel/0029VbChfh43mFYDayfQQH1j"

function base64Url(input: string) {
  return Buffer.from(input).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")
}

// Strip control chars / collapse whitespace / cap length. Used on anything that
// came from the query string before it goes into a message.
function cleanText(value: unknown, max: number) {
  return String(value ?? "")
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max)
}

// The message the admin will see as the first line in the DM.
// Identity fields come from the DATABASE (not the cookie / query string);
// only amount + method come from the query string and are sanitised.
function buildSupportNote(args: {
  amount: string | null
  method: string | null
  name: string
  email: string
  userId: string
  referralCode: string
}) {
  const n = Number(args.amount)
  const amountText = Number.isFinite(n) && n > 0 ? `₦${n.toLocaleString("en-NG")}` : "N/A"
  const methodText = cleanText(args.method, 40) || "Unknown"
  const lines = [
    "📋 Payment Support Request",
    "",
    `💰 Amount: ${amountText}`,
    `🏦 Method: ${methodText}`,
    `👤 Name: ${cleanText(args.name, 80) || "N/A"}`,
    `📧 Email: ${cleanText(args.email, 120) || "N/A"}`,
    `🆔 User ID: ${cleanText(args.userId, 64) || "N/A"}`,
  ]
  if (args.referralCode) lines.push(`🔑 Referral code: ${cleanText(args.referralCode, 32)}`)
  lines.push(
    "❌ Status: Failed / Not Confirmed",
    "",
    "I have made this payment but it was not verified. Please check and credit my account. Thank you.",
  )
  return lines.join("\n")
}

export async function GET(req: NextRequest) {
  // ?dest=support -> open a 1:1 DM with "MoneyMate Support" on Boochat and post the
  // payment details there (used by "Forward Details to Support").
  // Anything else -> the partner channel (existing behaviour).
  const params = req.nextUrl.searchParams
  const wantsSupport = params.get("dest") === "support"
  const fail = (body: any, status: number) =>
    wantsSupport ? NextResponse.redirect(SUPPORT_FALLBACK_URL) : NextResponse.json(body, { status })

  try {
    const cfg = getBoochatConfig()

    // Read session cookie (client stores JSON in base64)
    const cookieHeader = req.headers.get("cookie") || ""
    const cookieParts = cookieHeader.split(";").map((s) => s.trim())
    const sessionPart = cookieParts.find((c) => c.startsWith("tivexx-session="))
    if (!sessionPart) return fail({ success: false, error: "Not logged in" }, 401)
    const raw = sessionPart.slice("tivexx-session=".length) || ""
    let decoded = ""
    try {
      decoded = Buffer.from(raw, "base64").toString("utf8")
    } catch (e) {
      return fail({ success: false, error: "Invalid session" }, 401)
    }

    let cookieUser: any = null
    try {
      cookieUser = JSON.parse(decoded)
    } catch (e) {
      return fail({ success: false, error: "Invalid session" }, 401)
    }

    // SECURITY: the tivexx-session cookie is written by the browser and is NOT signed,
    // so anyone can forge it. Treat it only as a lookup key and take email/name from the
    // database. (Boochat links accounts by email, so a forged email = account takeover.)
    const cookieId = String(cookieUser?.id || cookieUser?.userId || "").trim()
    if (!cookieId) return fail({ success: false, error: "Not logged in" }, 401)

    const admin = getSupabaseAdmin()
    const { data: dbUser, error: dbError } = await admin
      .from("users")
      .select("id, name, email, referral_code")
      .eq("id", cookieId)
      .maybeSingle()
    if (dbError || !dbUser) return fail({ success: false, error: "Not logged in" }, 401)

    const id = String(dbUser.id)
    const email = String(dbUser.email || "").trim().toLowerCase()
    const name = String(dbUser.name || "").trim()
    if (!email) return fail({ success: false, error: "Account has no email" }, 400)

    const iat = Math.floor(Date.now() / 1000)
    const exp = iat + 300
    const nonce = crypto.randomBytes(16).toString("hex")

    const header = { alg: "HS256", typ: "JWT" }
    const payload: Record<string, unknown> = {
      partner: cfg.partnerSlug,
      ext_user_id: id,
      email: email,
      name: name,
      iat: iat,
      exp: exp,
      nonce: nonce,
    }
    if (wantsSupport) {
      // Signed, so Boochat can trust both. Boochat maps "support" to the MoneyMate Support
      // account itself, and posts `note` into that DM as the user.
      payload.dest = "support"
      payload.note = buildSupportNote({
        amount: params.get("amount"),
        method: params.get("method"),
        name,
        email,
        userId: id,
        referralCode: String(dbUser.referral_code || ""),
      })
    }

    const headerB = base64Url(JSON.stringify(header))
    const payloadB = base64Url(JSON.stringify(payload))
    const toSign = `${headerB}.${payloadB}`
    // Boochat verifies with Buffer.from(sig, "base64"); standard base64 is fine (the
    // token is encodeURIComponent'd below, so + / = are transport-safe).
    const sigB = crypto.createHmac("sha256", cfg.sharedSecret).update(toSign).digest("base64")
    const token = `${headerB}.${payloadB}.${sigB}`

    // Boochat has /auth/login and /auth/signup but NO bare /auth route.
    // Login handles new + existing partner users automatically.
    const redirectTo = `${cfg.baseUrl}/auth/login?partner=${encodeURIComponent(cfg.partnerSlug)}&token=${encodeURIComponent(token)}`
    return NextResponse.redirect(redirectTo)
  } catch (e: any) {
    // Missing BOOCHAT_* env vars is a config problem, not a crash - say so
    // (naming the missing key only, never its value) instead of a blank 500.
    const msg = String((e as any)?.message || "")
    if (msg.includes("BOOCHAT_")) {
      console.error("/api/boochat/link not configured:", msg)
      return fail({ success: false, error: "Channel join is not configured yet - please try again later." }, 503)
    }
    console.error("/api/boochat/link error:", e)
    return fail({ success: false, error: "Server error" }, 500)
  }
}
