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
        paid_count: 0,
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
          paid_count: 0,
          pending_balance: 0,
        })
      }
    }

    const user = { referral_code: userCode }

    // Per-plan count for Tiered Referral pages (?plan=24h|2d|3d|1w): counts
    // ONLY referrals stamped with that plan at signup — normal referrals
    // never leak in, and each plan starts from zero on its own.
    const planFilter = searchParams.get("plan")
    if (planFilter) {
      if (!["24h", "2d", "3d", "1w"].includes(planFilter)) {
        return NextResponse.json({ success: true, plan: planFilter, plan_count: 0 })
      }
      try {
        const { data: planRows, error: planErr } = await supabase
          .from("referrals")
          .select("id")
          .eq("referrer_id", userId)
          .eq("plan", planFilter)
          .limit(2000)
        if (planErr) throw planErr
        return NextResponse.json({ success: true, plan: planFilter, plan_count: (planRows || []).length })
      } catch {
        // plan column predates some DBs (or no rows yet) → honest zero.
        return NextResponse.json({ success: true, plan: planFilter, plan_count: 0 })
      }
    }

    // Fetch all referrals for this referrer (paginate up to 2000 for now).
    // Consumed (already-paid) rows are EXCLUDED from counts/balance so a
    // withdrawal isn't undone by the next recompute — but they are RETURNED
    // as paid rows so History can show each one as Paid instead of Pending.
    // Fall back if the 008 migration isn't applied yet.
    let allRefs: any[] | null = null
    let paidRefs: any[] = []
    try {
      const r = await supabase
        .from("referrals")
        .select("id, referred_id, amount, processed, consumed, created_at")
        .eq("referrer_id", userId)
        .limit(2000)
      if (r.error) throw r.error
      paidRefs = (r.data ?? []).filter((x: any) => x.consumed === true)
      allRefs = (r.data ?? []).filter((x: any) => x.consumed !== true)
    } catch {
      const r2 = await supabase
        .from("referrals")
        .select("id, referred_id, amount, processed, created_at")
        .eq("referrer_id", userId)
        .limit(2000)
      if (r2.error) throw r2.error
      paidRefs = []
      allRefs = r2.data ?? []
    }

    const totalCount = allRefs?.length ?? 0

    // No referrals -> early return
    if (totalCount === 0 && paidRefs.length === 0) {
      return NextResponse.json({
        success: true,
        referral_code: user?.referral_code || "",
        referral_count: 0, // total
        referral_balance: 0, // withdrawable: approved only
        pending_count: 0,
        approved_count: 0,
        paid_count: 0,
        pending_balance: 0,
        recent: [],
      })
    }

    const ids = (allRefs as any[]).map((r) => r.referred_id).filter(Boolean)
    let approvedCount = 0
    let pendingCount = totalCount
    let referralBalance = 0
    // Individual dated rows for History (latest 50, newest first).
    // paid rows (already withdrawn) are included with paid:true so each one
    // renders as Paid — they never count toward approved/pending/balance.
    let recent: { id: string; amount: number; date: number; approved: boolean; paid: boolean }[] = []
    const toMs = (v: any) => {
      const t = new Date(v || 0).getTime()
      return Number.isFinite(t) ? t : 0
    }
    const paidRows = (paidRefs as any[]).map((r: any) => ({
      id: String(r.id || r.referred_id || ""),
      amount: Math.min(Number(r.amount || 500), 500),
      date: toMs((r as any).created_at),
      approved: true,
      paid: true,
    }))

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
      const list: typeof recent = []
      for (const r of allRefs as any[]) {
        const sc = scoreMap.get(r.referred_id) ?? 0
        const isApproved = sc >= 30
        if (isApproved) {
          approved++
          // Normalize legacy ₦10,000 rows down to the ₦500 tier.
          approvedSum += Math.min(Number(r.amount || 500), 500)
        } else {
          pending++
        }
        list.push({
          id: String(r.id || r.referred_id || ""),
          amount: isApproved ? Math.min(Number(r.amount || 500), 500) : 0,
          date: toMs((r as any).created_at),
          approved: isApproved,
          paid: false,
        })
      }
      approvedCount = approved
      pendingCount = pending
      referralBalance = approvedSum
      recent = [...list, ...paidRows].sort((a, b) => b.date - a.date).slice(0, 50)
    } catch {
      // Fallback to processed flag if trust lookup fails
      const approvedRows = (allRefs as any[]).filter((r) => r.processed === true)
      approvedCount = approvedRows.length
      pendingCount = totalCount - approvedCount
      referralBalance = approvedRows.reduce((s, r) => s + Number(r.amount || 500), 0)
      recent = [...(allRefs as any[])
        .map((r: any) => ({
          id: String(r.id || r.referred_id || ""),
          amount: r.processed === true ? Math.min(Number(r.amount || 500), 500) : 0,
          date: toMs(r.created_at),
          approved: r.processed === true,
          paid: false,
        })), ...paidRows]
        .sort((a, b) => b.date - a.date)
        .slice(0, 50)
    }

    // referral_count = total (immediate count), referral_balance = approved only
    return NextResponse.json({
      success: true,
      referral_code: user?.referral_code || "",
      referral_count: totalCount,
      referral_balance: referralBalance,
      pending_count: pendingCount,
      approved_count: approvedCount,
      paid_count: paidRefs.length,
      pending_balance: pendingCount * 500,
      recent,
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
      paid_count: 0,
      pending_balance: 0,
      recent: [],
    })
  }
}
