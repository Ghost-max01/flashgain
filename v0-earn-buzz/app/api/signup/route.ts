import { type NextRequest, NextResponse } from "next/server"
import { createHash, randomBytes } from "node:crypto"
import { createClient } from "@/lib/supabase/server"
import { generateReferralCode } from "@/lib/utils/referral"
import { getSupabaseAdmin } from "@/lib/supabase/admin"

export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin()
    const { name, email, password, referralCode: bodyRef } = await request.json()
    // Fallback to pending_ref cookie if body didn't send it (direct link -> register -> signup)
    let referralCode = bodyRef
    if (!referralCode) {
      try { referralCode = request.cookies.get("pending_ref")?.value ? decodeURIComponent(request.cookies.get("pending_ref")!.value) : undefined } catch {}
    }

    if (!name || !email || !password) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 })
    }

    if (password.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 })
    }

    // 1. Create user in Supabase Auth
    const supabaseClient = await createClient()
    const redirectUrl =
      process.env.NEXT_PUBLIC_APP_URL ||
      process.env.NEXT_PUBLIC_SITE_URL ||
      ""

    const signUpOptions: any = { data: { name } }
    if (redirectUrl) {
      signUpOptions.emailRedirectTo = redirectUrl
    }

    const { data: authData, error: authError } = await supabaseClient.auth.signUp({
      email,
      password,
      options: signUpOptions,
    })

    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: 400 })
    }

    const userId = authData.user?.id
    if (!userId) return NextResponse.json({ error: "Failed to create user" }, { status: 500 })

    // 2. Generate unique referral code
    let newReferralCode = generateReferralCode()
    while (true) {
      const { data } = await supabase
        .from("users")
        .select("id")
        .eq("referral_code", newReferralCode)
        .maybeSingle()
      if (!data) break
      newReferralCode = generateReferralCode()
    }

    // 3. Find referrer — normalize and case-insensitive (link may be lowercased by some apps)
    let referrerId = null
    const normalizedRef = (referralCode || "").toString().trim().toUpperCase()
    if (normalizedRef) {
      // try exact then case-insensitive fallback
      let referrerData: any = null
      const { data: exact } = await supabase
        .from("users")
        .select("id, referral_count, referral_balance, balance")
        .eq("referral_code", normalizedRef)
        .maybeSingle()
      referrerData = exact
      if (!referrerData) {
        const { data: ci } = await supabase
          .from("users")
          .select("id, referral_count, referral_balance, balance")
          .ilike("referral_code", normalizedRef)
          .maybeSingle()
        referrerData = ci
      }
      if (referrerData) referrerId = referrerData.id
      else console.warn(`[signup] referral_code not found: ${normalizedRef}`)
    }

    // 4. Insert into users table (hashed password; legacy column kept empty)
    const salt = randomBytes(16).toString("hex")
    const password_hash = createHash("sha256").update(salt + password).digest("hex")
    const { data: newUser, error: insertError } = await supabase
      .from("users")
      .insert({
        id: userId,
        name,
        email,
        password: "",
        password_hash,
        password_salt: salt,
        referral_code: newReferralCode,
        referred_by: referrerId,
        referral_count: 0, // Initialize count
        referral_balance: 0, // Initialize balance
        balance: 5000, // Initialize main balance with 5,000 (welcome bonus)
      })
      .select("id, name, email, referral_code")
      .single()

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    // 5. Record referral: count increments immediately, but amount stays pending
    //    until referred user reaches Beginner (trust_score >=30). DB trigger handles it;
    //    referrals row inserted as pending (processed=false) if trust <30.
    if (referrerId) {
      await supabase.from("referrals").insert({
        referrer_id: referrerId,
        referred_id: userId,
        amount: 500, // 500 naira — withdrawable only after referred hits Beginner 30
      })
    }

    return NextResponse.json({ success: true, user: newUser })
  } catch (error) {
    console.error("[v0] Signup error:", error)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}