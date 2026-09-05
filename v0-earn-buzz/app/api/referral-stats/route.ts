import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

async function getProcessedReferralStats(supabase: any, userId: string) {
  const { count: referralCount, error: countError } = await supabase
    .from("referrals")
    .select("id", { count: "exact", head: true })
    .eq("referrer_id", userId)
    .eq("processed", true)

  if (countError) throw countError

  const pageSize = 1000
  let from = 0
  let referralBalance = 0

  while (true) {
    const { data, error } = await supabase
      .from("referrals")
      .select("amount")
      .eq("referrer_id", userId)
      .eq("processed", true)
      .range(from, from + pageSize - 1)

    if (error) throw error
    if (!data || data.length === 0) break

    referralBalance += data.reduce((sum: number, row: any) => sum + Number(row.amount || 0), 0)

    if (data.length < pageSize) break
    from += pageSize
  }

  return {
    referralCount: referralCount || 0,
    referralBalance,
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    
    if (!userId) {
      return NextResponse.json({ 
        success: false,
        referral_code: "",
        referral_count: 0,
        referral_balance: 0 
      })
    }
    
    const supabase = await createClient()

    // Fetch the user's referral code from users table
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("referral_code")
      .eq("id", userId)
      .maybeSingle()

    if (userError) throw userError

    const { referralCount, referralBalance } = await getProcessedReferralStats(supabase, userId)

    // Also compute pending referrals count (not processed)
    const { count: pendingCount, error: pendingError } = await supabase
      .from("referrals")
      .select("id", { count: "exact", head: true })
      .eq("referrer_id", userId)
      .eq("processed", false)

    if (pendingError) throw pendingError

    // ── Approved vs Pending gate: approved only when referred user reached Beginner (Trust 30+) ──
    let approvedCount = referralCount || 0
    let computedPending = pendingCount || 0
    try {
      const { data: allRefs } = await supabase.from("referrals").select("referred_id, processed, amount").eq("referrer_id", userId).limit(2000)
      if (allRefs && allRefs.length > 0) {
        const ids = allRefs.map((r: any) => r.referred_id).filter(Boolean)
        if (ids.length > 0) {
          const { data: referredUsers } = await supabase.from("users").select("id, trust_score").in("id", ids)
          const scoreMap = new Map((referredUsers || []).map((u: any) => [u.id, Number(u.trust_score || 0)]))
          let approved = 0
          let pending2 = 0
          for (const r of allRefs as any[]) {
            const sc = scoreMap.get(r.referred_id) ?? 0
            if (sc >= 30) approved++
            else pending2++
          }
          approvedCount = approved
          computedPending = pending2
        }
      }
    } catch {}

    return NextResponse.json({
      success: true,
      referral_code: user?.referral_code || "",
      referral_count: referralCount,
      referral_balance: referralBalance,
      pending_count: computedPending,
      approved_count: approvedCount
    })
  } catch (error) {
    console.error("Error:", error)
    return NextResponse.json({ 
      success: false,
      referral_code: "",
      referral_count: 0,
      referral_balance: 0 
    })
  }
}