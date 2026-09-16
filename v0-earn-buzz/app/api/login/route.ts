import { type NextRequest, NextResponse } from "next/server"
import { createHash } from "node:crypto"
import { createClient } from "@supabase/supabase-js"
import { getSupabaseAdmin } from "@/lib/supabase/admin"

function sha256Hex(input: string) {
  return createHash("sha256").update(input).digest("hex")
}

const USER_COLUMNS =
  "id,name,email,referral_code,password,password_hash,password_salt,referred_by,created_at,balance,referral_balance,referral_count,trust_score,vip_redeemed,referral_vip_balance"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const email = String(body?.email || "").trim().toLowerCase()
    const password = String(body?.password || "")

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 })
    }

    const admin = getSupabaseAdmin()
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ""
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
    const anonClient = supabaseUrl && anonKey ? createClient(supabaseUrl, anonKey) : null

    let fullUser: any = null

    // STEP 1: Try the real Supabase Auth login
    if (anonClient) {
      const { data: authData, error: authError } = await anonClient.auth.signInWithPassword({
        email,
        password,
      })

      if (!authError && authData?.user) {
        const { data } = await admin
          .from("users")
          .select(USER_COLUMNS)
          .eq("id", authData.user.id)
          .maybeSingle()

        if (data) {
          fullUser = data
        }
      }
    }

    // STEP 2: Legacy fallback through the service role so RLS cannot block it
    if (!fullUser) {
      const { data: localUser, error: localError } = await admin
        .from("users")
        .select(USER_COLUMNS)
        .eq("email", email)
        .maybeSingle()

      const legacyUser: any = localUser || null

      if (localError) {
        console.error("[login] legacy user lookup failed:", localError)
      }

      if (!legacyUser) {
        return NextResponse.json({ error: "Invalid email, password, or user ID" }, { status: 401 })
      }

      const normalizedInput = password.trim().toUpperCase()
      const normalizedReferralCode = String(legacyUser?.referral_code || "").toUpperCase()
      const matchesPassword = legacyUser?.password_hash
        ? sha256Hex((legacyUser?.password_salt || "") + password) === legacyUser.password_hash
        : legacyUser?.password === password
      const matchesUserId = normalizedInput.length > 0 && normalizedInput === normalizedReferralCode

      if (!matchesPassword && !matchesUserId) {
        return NextResponse.json({ error: "Invalid email, password, or user ID" }, { status: 401 })
      }

      fullUser = legacyUser
    }

    const { password: _password, password_hash: _passwordHash, password_salt: _passwordSalt, ...safeUser } = fullUser
    return NextResponse.json({ user: safeUser })
  } catch (error) {
    console.error("[login] error:", error)
    return NextResponse.json({ error: "Login failed" }, { status: 500 })
  }
}
