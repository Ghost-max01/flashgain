import { NextResponse } from "next/server"
import { getSupabaseAdmin } from "@/lib/supabase/admin"

const ZERO_STATS = {
  success: false,
  balance: 0,
  referral_balance: 0,
  referral_count: 0,
  pending_count: 0,
  approved_count: 0,
  pending_balance: 0,
}

// Verify the caller owns `claimedUserId`:
// (i) Authorization: Bearer <user JWT> validates via admin.auth.getUser() to
// the same user id, or (ii) cookie session via server client matches.
// Returns the authenticated uid on success, else null.
async function getOwnedUid(request: Request, claimedUserId: string | null): Promise<string | null> {
  if (!claimedUserId) return null
  // (i) Bearer JWT
  try {
    const auth = request.headers.get("authorization") || ""
    const m = auth.match(/^Bearer\s+(.+)$/i)
    const token = m ? m[1].trim() : null
    if (token) {
      try {
        const admin: any = getSupabaseAdmin()
        const { data } = await admin.auth.getUser(token)
        const uid = (data as any)?.user?.id as string | undefined
        if (uid && uid === claimedUserId) return uid
        // Valid token for a different user -> not authorized for claimed id.
        if (uid) return null
      } catch {}
    }
  } catch {}
  // (ii) Cookie session fallback
  try {
    const { createClient } = await import("@/lib/supabase/server")
    const supabase = await createClient()
    const { data } = await supabase.auth.getUser()
    const uid = (data as any)?.user?.id as string | undefined
    if (uid && uid === claimedUserId) return uid
  } catch {}
  return null
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get("userId")

    if (!userId) {
      return NextResponse.json({ ...ZERO_STATS })
    }

    // Ownership required — else return non-sensitive zeros (no enumeration).
    const authed = await getOwnedUid(request, userId)
    if (!authed) {
      return NextResponse.json({ ...ZERO_STATS }, { status: 401 })
    }

    let supabase: any
    try {
      supabase = getSupabaseAdmin()
    } catch {
      return NextResponse.json({ ...ZERO_STATS }, { status: 500 })
    }

    const { data: user, error: userError } = await supabase
      .from("users")
      .select("balance, referral_balance, referral_count")
      .eq("id", userId)
      .single()
    if (userError) throw userError

    const balance = user.balance || 100000

    // Compute referral stats from trust_score truth (count immediately, pay on Beginner 30+)
    let referralCount = 0
    let referralBalance = 0
    let pendingCount = 0
    let approvedCount = 0

    try {
      const { data: allRefs } = await supabase.from("referrals").select("referred_id, amount").eq("referrer_id", userId).limit(2000)
      const total = allRefs?.length ?? 0
      referralCount = total
      if (total > 0) {
        const ids = (allRefs as any[]).map((r) => r.referred_id).filter(Boolean)
        const { data: referredUsers } = await supabase.from("users").select("id, trust_score").in("id", ids)
        const scoreMap = new Map((referredUsers || []).map((u: any) => [u.id, Number(u.trust_score || 0)]))
        let approved = 0
        let sum = 0
        for (const r of allRefs as any[]) {
          if ((scoreMap.get(r.referred_id) ?? 0) >= 30) {
            approved++
            sum += Number((r as any).amount || 500)
          }
        }
        approvedCount = approved
        pendingCount = total - approved
        referralBalance = sum
      }
    } catch (refError) {
      console.error("Error fetching referrals:", refError)
      return NextResponse.json({ success: true, balance, referral_balance: 0, referral_count: 0, pending_count: 0, approved_count: 0 })
    }

    // Sync users table (best-effort) so legacy reads stay consistent
    try {
      await supabase.from("users").update({ referral_count: referralCount, referral_balance: referralBalance }).eq("id", userId)
    } catch {}

    return NextResponse.json({
      success: true,
      balance,
      referral_balance: referralBalance,
      referral_count: referralCount,
      pending_count: pendingCount,
      approved_count: approvedCount,
      pending_balance: pendingCount * 500,
    })
  } catch (error) {
    console.error("Error:", error)
    return NextResponse.json({ ...ZERO_STATS })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const userId = body?.userId as string | undefined
    const balanceDelta = body?.balanceDelta as unknown
    if (!userId || typeof balanceDelta !== "number" || !Number.isFinite(balanceDelta)) {
      return NextResponse.json({ error: "Invalid data: expected { userId, balanceDelta }" }, { status: 400 })
    }
    // Clamp delta to [-1000000, 1000000]; arbitrary absolute balance sets removed.
    const delta = Math.max(-1000000, Math.min(1000000, Math.floor(balanceDelta)))

    // Ownership required.
    const authed = await getOwnedUid(request, userId)
    if (!authed) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    let supabase: any
    try {
      supabase = getSupabaseAdmin()
    } catch {
      return NextResponse.json({ error: "Server error" }, { status: 500 })
    }

    const { data: current, error: readError } = await supabase
      .from("users")
      .select("balance")
      .eq("id", userId)
      .maybeSingle()
    if (readError) throw readError
    const nextBalance = Number(current?.balance || 0) + delta
    const { error } = await supabase.from("users").update({ balance: nextBalance }).eq("id", userId)
    if (error) throw error
    return NextResponse.json({ success: true, balance: nextBalance, appliedDelta: delta })
  } catch (error) {
    console.error("Update error:", error)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}
