import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get("userId")

    if (!userId) {
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

    const supabase = await createClient()

    const { data: user, error: userError } = await supabase
      .from("users")
      .select("referral_code")
      .eq("id", userId)
      .maybeSingle()
    if (userError) throw userError

    // Fetch all referrals for this referrer (paginate up to 2000 for now)
    const { data: allRefs, error: refsError } = await supabase
      .from("referrals")
      .select("referred_id, amount, processed")
      .eq("referrer_id", userId)
      .limit(2000)
    if (refsError) throw refsError

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
          approvedSum += Number(r.amount || 500)
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
