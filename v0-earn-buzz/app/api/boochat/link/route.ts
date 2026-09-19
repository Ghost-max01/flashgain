import { NextRequest, NextResponse } from "next/server"
import crypto from "node:crypto"
import { getBoochatConfig } from "@/lib/boochat/config"

export const runtime = "nodejs"

function base64Url(input: string) {
  return Buffer.from(input).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")
}

export async function GET(req: NextRequest) {
  try {
    const cfg = getBoochatConfig()

    // Read session cookie (client stores JSON in base64)
    const cookieHeader = req.headers.get("cookie") || ""
    const cookieParts = cookieHeader.split(";").map((s) => s.trim())
    const sessionPart = cookieParts.find((c) => c.startsWith("tivexx-session="))
    if (!sessionPart) return NextResponse.json({ success: false, error: "Not logged in" }, { status: 401 })
    const raw = sessionPart.slice("tivexx-session=".length) || ""
    let decoded = ""
    try {
      decoded = Buffer.from(raw, "base64").toString("utf8")
    } catch (e) {
      return NextResponse.json({ success: false, error: "Invalid session" }, { status: 401 })
    }

    let user: any = null
    try {
      user = JSON.parse(decoded)
    } catch (e) {
      return NextResponse.json({ success: false, error: "Invalid session" }, { status: 401 })
    }

    const id = String(user?.id || user?.userId || "").trim()
    const email = String(user?.email || "").trim()
    const name = String(user?.name || "").trim()
    if (!id) return NextResponse.json({ success: false, error: "Not logged in" }, { status: 401 })

    const iat = Math.floor(Date.now() / 1000)
    const exp = iat + 300
    const nonce = crypto.randomBytes(16).toString("hex")

    const header = { alg: "HS256", typ: "JWT" }
    const payload = {
      partner: cfg.partnerSlug,
      ext_user_id: id,
      email: email,
      name: name,
      iat: iat,
      exp: exp,
      nonce: nonce,
    }

    const headerB = base64Url(JSON.stringify(header))
    const payloadB = base64Url(JSON.stringify(payload))
    const toSign = `${headerB}.${payloadB}`
    const sig = crypto.createHmac("sha256", cfg.sharedSecret).update(toSign).digest("base64")
    const sigB = sig.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")
    const token = `${headerB}.${payloadB}.${sigB}`

    const redirectTo = `${cfg.baseUrl}/auth?partner=${encodeURIComponent(cfg.partnerSlug)}&token=${encodeURIComponent(token)}`
    return NextResponse.redirect(redirectTo)
  } catch (e: any) {
    console.error("/api/boochat/link error:", e)
    return NextResponse.json({ success: false, error: "Server error" }, { status: 500 })
  }
}
