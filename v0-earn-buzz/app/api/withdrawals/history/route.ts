import { NextResponse } from "next/server"
import { getSupabaseAdmin } from "@/lib/supabase/admin"

export const runtime = "nodejs"

// GET /api/withdrawals/history?userId= — recent withdrawals for History.
// Same open pattern as /api/referral-stats (uid-scoped read of own rows).
export async function GET(request: Request) {
  try {
    const userId = new URL(request.url).searchParams.get("userId")?.trim() || ""
    if (!userId) return NextResponse.json({ success: false, withdrawals: [] })

    let supabase: any
    try {
      supabase = getSupabaseAdmin()
    } catch {
      return NextResponse.json({ success: false, withdrawals: [] })
    }

    let rows: any[] = []
    try {
      const [withdrawalsRes, referralRes] = await Promise.all([
        supabase
          .from("withdrawals")
          .select("id,reference,amount,status,created_at")
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(50),
        supabase
          .from("referral_withdraws")
          .select("id,amount,status,created_at,type")
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(50),
      ])

      const withdrawalRows = Array.isArray(withdrawalsRes?.data) ? withdrawalsRes.data : []
      const referralRows = Array.isArray(referralRes?.data) ? referralRes.data : []

      const mappedWithdrawals = withdrawalRows.map((w: any, i: number) => ({
        reference: String(w?.reference || w?.id || `row-${i}`),
        id: String(w?.id || w?.reference || `row-${i}`),
        amount: Number(w?.amount || 0),
        status: String(w?.status || ""),
        created_at: w?.created_at || null,
        label: "Withdrawal",
      }))

      const mappedReferrals = referralRows.map((w: any, i: number) => {
        const type = String(w?.type || "")
        const label = type === "vip_airtime" ? "VIP Airtime" : type === "referral_airtime" ? "Referral Airtime" : "Referral Withdrawal"
        return {
          reference: String(w?.id || `referral-${i}`),
          id: String(w?.id || `referral-${i}`),
          amount: Number(w?.amount || 0),
          status: String(w?.status || "success"),
          created_at: w?.created_at || null,
          label,
        }
      })

      rows = [...mappedWithdrawals, ...mappedReferrals].sort((a, b) => {
        const ta = new Date(a.created_at || Date.now()).getTime()
        const tb = new Date(b.created_at || Date.now()).getTime()
        return tb - ta
      }).slice(0, 100)
    } catch {
      return NextResponse.json({ success: true, withdrawals: [] })
    }

    return NextResponse.json({
      success: true,
      withdrawals: rows.map((w: any, i: number) => ({
        reference: String(w?.reference || w?.id || `row-${i}`),
        id: String(w?.id || w?.reference || `row-${i}`),
        amount: Number(w?.amount || 0),
        status: String(w?.status || ""),
        created_at: w?.created_at || null,
        label: String(w?.label || "Withdrawal"),
      })),
    })
  } catch (e: any) {
    console.error("[withdrawals/history]", e)
    return NextResponse.json({ success: false, withdrawals: [] })
  }
}
