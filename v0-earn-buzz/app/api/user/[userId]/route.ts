import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"
export const revalidate = 0

export async function GET(request: NextRequest, { params }: { params: { userId: string } }) {
  try {
    const { userId } = params
    const supabase = await createClient()

    const { data: user, error } = await supabase
      .from("users")
      .select("id, name, email, referral_code, password, referred_by, created_at")
      .eq("id", userId)
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // referral_count = total immediate, referral_balance = approved (Beginner 30+) only
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
      return NextResponse.json({
        success: true,
        user: { ...user, referral_count: 0, referral_balance: 0, pending_count: 0, approved_count: 0 },
      })
    }

    return NextResponse.json(
      {
        success: true,
        user: {
          ...user,
          referral_count: referralCount,
          referral_balance: referralBalance,
          pending_count: pendingCount,
          approved_count: approvedCount,
          pending_balance: pendingCount * 500,
        },
      },
      { headers: { "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0" } }
    )
  } catch (error) {
    console.error("[v0] Get user error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
