import { type NextRequest, NextResponse } from "next/server"
import { createHash, randomBytes } from "node:crypto"
import { createClient } from "@/lib/supabase/server"
import { generateReferralCode } from "@/lib/utils/referral"
import { getSupabaseAdmin } from "@/lib/supabase/admin"
import { issueNotifyToken } from "@/lib/notifications/notify-auth"
import { sendNotificationToUser } from "@/lib/notifications/server"

export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin()
    const { name, email, password, referralCode: bodyRef, autoTapPlan: bodyPlan } = await request.json()
    // Auto-tap plan attribution: stamped on the referral row so each plan
    // page counts ONLY its own link's signups (from zero). Anything else is
    // treated as a normal referral (plan stays NULL).
    const autoTapPlan = ["24h", "2d", "3d", "1w"].includes(String(bodyPlan || "")) ? String(bodyPlan) : null
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

    // 4. Insert into users table.
    // Supabase Auth already stores the real credential; the users-table hash
    // columns may not exist yet (schema cache: "could not find the password_hash
    // column"). Try full row first, fall back to minimal columns so signup never
    // breaks when the migration hasn't been applied.
    const salt = randomBytes(16).toString("hex")
    const password_hash = createHash("sha256").update(salt + password).digest("hex")
    const fullRow: Record<string, unknown> = {
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
    }
    const minimalRow: Record<string, unknown> = {
      id: userId,
      name,
      email,
      referral_code: newReferralCode,
      referred_by: referrerId,
      referral_count: 0,
      referral_balance: 0,
      balance: 5000,
    }
    // If the legacy `password` column is also missing, drop it too on retry.
    const bareRow: Record<string, unknown> = { ...minimalRow }
    delete (bareRow as any).password
    let newUser: any = null
    {
      const attempt = await supabase
        .from("users")
        .insert(fullRow)
        .select("id, name, email, referral_code")
        .single()
      if (!attempt.error) {
        newUser = attempt.data
      } else {
        const msg = String((attempt.error as any)?.message || "")
        const isSchemaCache = /schema cache|password_hash|password_salt|column/i.test(msg)
        console.warn(`[signup] full insert failed (${msg}) — retrying with minimal columns`)
        void isSchemaCache
        const retry = await supabase
          .from("users")
          .insert({ ...minimalRow, password: "" })
          .select("id, name, email, referral_code")
          .single()
        if (!retry.error) {
          newUser = retry.data
        } else {
          const msg2 = String((retry.error as any)?.message || "")
          console.warn(`[signup] minimal insert failed (${msg2}) — retrying bare columns`)
          const retry2 = await supabase
            .from("users")
            .insert(bareRow)
            .select("id, name, email, referral_code")
            .single()
          if (retry2.error) {
            // Run: ALTER TABLE public.users ADD COLUMN IF NOT EXISTS password_hash text;
            //      ALTER TABLE public.users ADD COLUMN IF NOT EXISTS password_salt text;
            return NextResponse.json({ error: retry2.error.message }, { status: 500 })
          }
          newUser = retry2.data
        }
      }
    }

    // 5. Record referral: count increments immediately, but amount stays pending
    //    until referred user reaches Beginner (trust_score >=30). DB trigger handles it;
    //    referrals row inserted as pending (processed=false) if trust <30.
    if (referrerId) {
      const referralRow: Record<string, unknown> = {
        referrer_id: referrerId,
        referred_id: userId,
        amount: 500, // 500 naira — withdrawable only after referred hits Beginner 30
      }
      if (autoTapPlan) (referralRow as any).plan = autoTapPlan
      try {
        await supabase.from("referrals").insert(referralRow)
      } catch (e: any) {
        // plan column predates some DBs — retry without it rather than fail signup.
        if (autoTapPlan && /plan|column|schema/i.test(String((e as any)?.message || e || ""))) {
          const { plan: _dropped, ...bare } = referralRow as any
          void _dropped
          await supabase.from("referrals").insert(bare)
        } else throw e
      }
    }

    // Offline-push token (see /api/login): fresh accounts can subscribe
    // for background alerts immediately, no re-login needed.
    let notifyToken: string | null = null
    try { notifyToken = issueNotifyToken(String((newUser as any)?.id || userId || "")) } catch {}
    // Seed a real inbox notification so fresh signups see the Join card
    try {
      const partnerName = String(process.env.BOOCHAT_PARTNER_NAME || "MoneyMate News")
      await sendNotificationToUser({
        uid: String((newUser as any)?.id || userId),
        title: `Join ${partnerName} channel to receive notifications and updates`,
        body: `Get announcements and direct messages from the channel.`,
        clickUrl: "/api/boochat/link",
        kind: "channel_invite",
        dedupeKey: `boochat:invite:${String((newUser as any)?.id || userId)}`,
      } as any)
    } catch (e) {
      // Non-fatal: inbox seeding should not block signup
      console.warn("[signup] failed to seed boochat invite inbox row:", e)
    }
    return NextResponse.json({ success: true, user: { ...newUser, notifyToken } })
  } catch (error) {
    console.error("[v0] Signup error:", error)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}