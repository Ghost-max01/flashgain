import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get("userId")

    if (!userId) {
      return NextResponse.json({ success: false, balance: 100000, referral_balance: 0, referral_count: 0, pending_count: 0, approved_count: 0 })
    }

    const supabase = await createClient()

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
    return NextResponse.json({ success: false, balance: 100000, referral_balance: 0, referral_count: 0, pending_count: 0, approved_count: 0 })
  }
}

export async function POST(request: Request) {
  try {
    const { userId, balance } = await request.json()
    if (!userId || typeof balance !== "number") return NextResponse.json({ error: "Invalid data" }, { status: 400 })
    const supabase = await createClient()
    const { error } = await supabase.from("users").update({ balance }).eq("id", userId)
    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Update error:", error)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}
