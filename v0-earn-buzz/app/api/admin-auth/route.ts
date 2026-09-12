import { type NextRequest, NextResponse } from "next/server"
import { createHash, createHmac, timingSafeEqual } from "node:crypto"

function sha256Hex(s: string) {
  return createHash("sha256").update(s).digest("hex")
}

function safeEqualHex(a: string, b: string) {
  try {
    const ba = Buffer.from(a, "hex")
    const bb = Buffer.from(b, "hex")
    if (ba.length !== bb.length) return false
    return timingSafeEqual(ba, bb)
  } catch {
    return false
  }
}

function expectedToken(email: string) {
  const secret = process.env.ADMIN_SESSION_SECRET || ""
  return createHmac("sha256", secret).update(email).digest("hex")
}

export async function POST(request: NextRequest) {
  const adminEmail = process.env.ADMIN_EMAIL
  const adminHash = process.env.ADMIN_PASSWORD_HASH
  const secret = process.env.ADMIN_SESSION_SECRET
  if (!adminEmail || !adminHash || !secret) {
    return NextResponse.json({ error: "Admin auth closed" }, { status: 503 })
  }
  try {
    const { email, password } = await request.json()
    if (!email || !password) {
      return NextResponse.json({ error: "Missing credentials" }, { status: 400 })
    }
    const emailOk =
      typeof email === "string" &&
      email.toLowerCase() === adminEmail.toLowerCase()
    const passOk = safeEqualHex(sha256Hex(String(password)), adminHash.toLowerCase())
    if (!emailOk || !passOk) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 })
    }
    return NextResponse.json({ success: true, token: expectedToken(adminEmail) })
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  const adminEmail = process.env.ADMIN_EMAIL
  const secret = process.env.ADMIN_SESSION_SECRET
  if (!adminEmail || !secret) {
    return NextResponse.json({ error: "Admin auth closed" }, { status: 503 })
  }
  const auth = request.headers.get("authorization") || ""
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : ""
  if (!token || !safeEqualHex(token, expectedToken(adminEmail))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  return NextResponse.json({ success: true, email: adminEmail })
}
