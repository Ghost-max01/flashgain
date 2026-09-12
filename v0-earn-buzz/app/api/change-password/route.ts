import { type NextRequest, NextResponse } from "next/server"
import { createHash, randomBytes, timingSafeEqual } from "node:crypto"
import { getSupabaseAdmin } from "@/lib/supabase/admin"

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

export async function POST(request: NextRequest) {
  try {
    const { userId, email, currentPassword, newPassword } = await request.json()
    if ((!userId && !email) || !currentPassword || !newPassword) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 })
    }
    if (String(newPassword).length < 8) {
      return NextResponse.json({ error: "New password must be at least 8 characters" }, { status: 400 })
    }
    const supabase = getSupabaseAdmin()
    let query = supabase.from("users").select("id, email, password_hash, password_salt")
    const { data: user, error } = userId
      ? await query.eq("id", userId).maybeSingle()
      : await query.eq("email", email).maybeSingle()
    if (error || !user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }
    const storedHash = (user as any).password_hash as string | null
    const storedSalt = ((user as any).password_salt as string | null) || ""
    if (storedHash) {
      const ok = safeEqualHex(sha256Hex(storedSalt + String(currentPassword)), storedHash)
      if (!ok) {
        return NextResponse.json({ error: "Current password is incorrect" }, { status: 401 })
      }
    } else {
      // Legacy row without hash: fall back to plaintext column check
      const { data: legacy } = await supabase
        .from("users")
        .select("id, password")
        .eq("id", (user as any).id)
        .maybeSingle()
      if (!legacy || (legacy as any).password !== String(currentPassword)) {
        return NextResponse.json({ error: "Current password is incorrect" }, { status: 401 })
      }
    }
    const salt = randomBytes(16).toString("hex")
    const password_hash = sha256Hex(salt + String(newPassword))
    const { error: updateError } = await supabase
      .from("users")
      .update({ password: "", password_hash, password_salt: salt })
      .eq("id", (user as any).id)
    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }
    return NextResponse.json({ success: true })
  } catch (e) {
    console.error("[change-password] error:", e)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}
