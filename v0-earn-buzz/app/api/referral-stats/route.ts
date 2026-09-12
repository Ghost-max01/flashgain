import { NextResponse } from "next/server"
import { getSupabaseAdmin } from "@/lib/supabase/admin"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const rawId = (searchParams.get("userId") || "").trim()

    if (!rawId) {
      return NextResponse.json({
        success: false,
        referral_code: "",
        referral_count: 0,
        referral_balance: 0,
        pending_count: 0,
        approved_count: 0,
        pending_balance: 0,
      })
    }

    // Use admin client: anon/RLS would return 0 rows and look like "didn't count"
    const supabase = getSupabaseAdmin()

    // Accept either the users.id (UUID) or the referral_code — callers
    // sometimes pass userId (=referral_code), which previously returned all zeros.
    let userId = rawId
    let userCode = ""
    const { data: byId } = await supabase
      .from("users")
      .select("id, referral_code")
      .eq("id", rawId)
      .maybeSingle()
    if (byId) {
      userId = (byId as any).id
      userCode = (byId as any).referral_code || ""
    } else {
      const { data: byCode } = await supabase
        .from("users")
        .select("id, referral_code")
        .ilike("referral_code", rawId)
        .maybeSingle()
      if (byCode) {
        userId = (byCode as any).id
        userCode = (byCode as any).referral_code || ""
      } else {
        // Unknown identifier — return zeros but mark unsuccessful so UI doesn't cache it
        return NextResponse.json({
          success: false,
          referral_code: "",
          referral_count: 0,
          referral_balance: 0,
          pending_count: 0,
          approved_count: 0,
          pending_balance: 0,
        })
      }
    }

    const user = { referral_code: userCode }

    // Fetch all referrals for this referrer (paginate up to 2000 for now).
    // Exclude consumed (already-withdrawn) rows so a withdrawal isn't undone
    // by the next recompute; fall back if the 008 migration isn't applied yet.
    let allRefs: any[] | null = null
    try {
      const r = await supabase
        .from("referrals")
        .select("referred_id, amount, processed, consumed")
        .eq("referrer_id", userId)
        .limit(2000)
      if (r.error) throw r.error
      allRefs = (r.data ?? []).filter((x: any) => x.consumed !== true)
    } catch {
      const r2 = await supabase
        .from("referrals")
        .select("referred_id, amount, processed")
        .eq("referrer_id", userId)
        .limit(2000)
      if (r2.error) throw r2.error
      allRefs = r2.data ?? []
    }

    const totalCount = allRefs?.length ?? 0

    // No referrals -> early return
    if (totalCount === 0) {
      return NextResponse.json({
        success: true,
        referral_code: user?.referral_code || "",
        referral_count: 0, // total
        referral_balance: 0, // withdrawable: approved only
        pending_count: 0,
        approved_count: 0,
        pending_balance: 0,
      })
    }

    const ids = (allRefs as any[]).map((r) => r.referred_id).filter(Boolean)
    let approvedCount = 0
    let pendingCount = totalCount
    let referralBalance = 0

    try {
      const { data: referredUsers } = await supabase
        .from("users")
        .select("id, trust_score")
        .in("id", ids)

      const scoreMap = new Map(
        (referredUsers || []).map((u: any) => [u.id, Number(u.trust_score || 0)])
      )

      let approved = 0
      let pending = 0
      let approvedSum = 0
      for (const r of allRefs as any[]) {
        const sc = scoreMap.get(r.referred_id) ?? 0
        if (sc >= 30) {
          approved++
          // Normalize legacy ₦10,000 rows down to the ₦500 tier.
          approvedSum += Math.min(Number(r.amount || 500), 500)
        } else {
          pending++
        }
      }
      approvedCount = approved
      pendingCount = pending
      referralBalance = approvedSum
    } catch {
      // Fallback to processed flag if trust lookup fails
      const approvedRows = (allRefs as any[]).filter((r) => r.processed === true)
      approvedCount = approvedRows.length
      pendingCount = totalCount - approvedCount
      referralBalance = approvedRows.reduce((s, r) => s + Number(r.amount || 500), 0)
    }

    // referral_count = total (immediate count), referral_balance = approved only
    return NextResponse.json({
      success: true,
      referral_code: user?.referral_code || "",
      referral_count: totalCount,
      referral_balance: referralBalance,
      pending_count: pendingCount,
      approved_count: approvedCount,
      pending_balance: pendingCount * 500,
    })
  } catch (error) {
    console.error("referral-stats error:", error)
    return NextResponse.json({
      success: false,
      referral_code: "",
      referral_count: 0,
      referral_balance: 0,
      pending_count: 0,
      approved_count: 0,
      pending_balance: 0,
    })
  }
}
