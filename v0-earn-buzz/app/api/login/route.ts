import { type NextRequest, NextResponse } from "next/server"
import { createHash } from "node:crypto"
import { createClient } from "@supabase/supabase-js"
import { getSupabaseAdmin } from "@/lib/supabase/admin"
import { issueNotifyToken } from "@/lib/notifications/notify-auth"

function sha256Hex(input: string) {
  return createHash("sha256").update(input).digest("hex")
}

const USER_COLUMNS =
  "id,name,email,referral_code,password,password_hash,password_salt,referred_by,created_at,balance,referral_balance,referral_count,trust_score,vip_redeemed,referral_vip_balance"

export async function POST(request: NextRequest) {
  try {
    console.log("[login] === START POST ===")
    
    const body = await request.json().catch(() => ({}))
    const email = String(body?.email || "").trim().toLowerCase()
    const password = String(body?.password || "")

    console.log("[login] Received email:", email, "password length:", password.length)

    if (!email || !password) {
      console.log("[login] Missing email or password")
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 })
    }

    let admin: any = null
    try {
      admin = getSupabaseAdmin()
      console.log("[login] Got admin client")
    } catch (e) {
      console.error("[login] Failed to get admin client:", e)
      return NextResponse.json({ error: "Server configuration error" }, { status: 500 })
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ""
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
    console.log("[login] Supabase config: url exists:", !!supabaseUrl, "key exists:", !!anonKey)
    
    const anonClient = supabaseUrl && anonKey ? createClient(supabaseUrl, anonKey) : null

    let fullUser: any = null

    // STEP 1: Try the real Supabase Auth login
    if (anonClient) {
      const { data: authData, error: authError } = await anonClient.auth.signInWithPassword({
        email,
        password,
      })

      console.log("[login] Supabase Auth attempt for:", email, "error:", authError?.message || "none")

      if (!authError && authData?.user) {
        const { data } = await admin
          .from("users")
          .select(USER_COLUMNS)
          .eq("id", authData.user.id)
          .maybeSingle()

        if (data) {
          console.log("[login] Supabase Auth success, user found in users table")
          fullUser = data
        }
      }
    }

    // STEP 2: Legacy fallback through the service role so RLS cannot block it
    if (!fullUser) {
      console.log("[login] Auth failed or user not in users table, trying legacy fallback for:", email)
      const { data: localUser, error: localError } = await admin
        .from("users")
        .select(USER_COLUMNS)
        .eq("email", email)
        .maybeSingle()

      const legacyUser: any = localUser || null

      if (localError) {
        console.error("[login] legacy user lookup failed:", localError)
        return NextResponse.json({ error: "Database error during lookup" }, { status: 500 })
      }

      if (!legacyUser) {
        console.log("[login] User not found in legacy table:", email)
        return NextResponse.json({ error: "Invalid email, password, or user ID" }, { status: 401 })
      }

      console.log("[login] Legacy user found, checking password. Has password_hash:", !!legacyUser?.password_hash, "has password:", !!legacyUser?.password)

      const normalizedInput = password.trim().toUpperCase()
      const normalizedReferralCode = String(legacyUser?.referral_code || "").toUpperCase()
      
      let matchesPassword = false
      if (legacyUser?.password_hash) {
        const computed = sha256Hex((legacyUser?.password_salt || "") + password)
        matchesPassword = computed === legacyUser.password_hash
        console.log("[login] Password hash check:", { computed: computed.substring(0, 8), stored: legacyUser.password_hash.substring(0, 8), match: matchesPassword })
      } else {
        matchesPassword = legacyUser?.password === password
        console.log("[login] Plaintext password check:", matchesPassword)
      }
      
      const matchesUserId = normalizedInput.length > 0 && normalizedInput === normalizedReferralCode
      console.log("[login] Referral code check:", { input: normalizedInput.substring(0, 4), stored: normalizedReferralCode.substring(0, 4), match: matchesUserId })

      if (!matchesPassword && !matchesUserId) {
        console.log("[login] Password and referral code both failed")
        return NextResponse.json({ error: "Invalid email, password, or user ID" }, { status: 401 })
      }

      console.log("[login] Legacy login successful for:", email)
      fullUser = legacyUser
    }

    const { password: _password, password_hash: _passwordHash, password_salt: _passwordSalt, ...safeUser } = fullUser
    console.log("[login] === SUCCESS, returning user ===")
    // Offline-push token: lets this device prove uid ownership on
    // /api/notifications/subscribe + /status (the app has no Supabase Auth
    // JWT). Stored inside tivexx-user by persistUserSession automatically.
    let notifyToken: string | null = null
    try { notifyToken = issueNotifyToken(String((fullUser as any)?.id || "")) } catch {}
    // Trust persistence: hand the server snapshot to the fresh session so
    // the score restores on login exactly like balance (client max-merges).
    let trustScore = 0
    let trustMeta: any = null
    try {
      const t = await admin.from("users").select("trust_score, trust_meta").eq("id", (fullUser as any)?.id).maybeSingle()
      if (!t.error && t.data) {
        trustScore = Number((t.data as any)?.trust_score || 0)
        const tm = (t.data as any)?.trust_meta
        trustMeta = tm && typeof tm === "object" ? tm : null
      }
    } catch {}
    return NextResponse.json({ user: { ...safeUser, notifyToken }, trustScore, trustMeta })
  } catch (error) {
    console.error("[login] === CAUGHT ERROR ===", error)
    const msg = error instanceof Error ? error.message : String(error)
    console.error("[login] Error message:", msg)
    console.error("[login] Error stack:", error instanceof Error ? error.stack : "no stack")
    return NextResponse.json({ error: "Login failed: " + msg }, { status: 500 })
  }
}
