// ── Referral approved-balance (SINGLE SOURCE OF TRUTH, server-only) ──
// Approved = unconsumed referrals whose friend reached Beginner (trust 30+).
// Used by /api/referral-withdraw (cash) and /api/referral-airtime so both
// pay from the same honest balance. Legacy ₦10,000 rows normalize to ₦500.
export const PER_REFERRAL = 500;

export type ApprovedRow = { id: string };

export async function computeApproved(
  supabase: any,
  userId: string,
): Promise<{ approvedCount: number; approvedBalance: number; approvedRows: ApprovedRow[] }> {
  const { data: allRefs } = await supabase
    .from("referrals")
    .select("id, referred_id, amount, consumed, created_at")
    .eq("referrer_id", userId)
    .order("created_at", { ascending: true })
    .limit(2000);
  const rows = ((allRefs as any[]) || []).filter((r: any) => r?.consumed !== true);
  if (rows.length === 0) return { approvedCount: 0, approvedBalance: 0, approvedRows: [] };
  const ids = rows.map((r: any) => r.referred_id).filter(Boolean);
  let scoreMap = new Map<string, number>();
  if (ids.length > 0) {
    const { data: referredUsers } = await supabase.from("users").select("id, trust_score").in("id", ids);
    scoreMap = new Map(((referredUsers || []) as any[]).map((u: any) => [u.id, Number(u.trust_score || 0)]));
  }
  const approvedRows: ApprovedRow[] = [];
  for (const r of rows) {
    if ((scoreMap.get(r.referred_id) ?? 0) >= 30) approvedRows.push({ id: r.id });
  }
  return {
    approvedCount: approvedRows.length,
    approvedBalance: approvedRows.length * PER_REFERRAL,
    approvedRows,
  };
}
