import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { buyAirtime } from "@/lib/vtugate";

const VALID_NETWORKS = ["MTN", "GLO", "AIRTEL", "9MOBILE"] as const;
const VIP_AMOUNT = 500;

// POST /api/airtime { userId, phone, network, amount:500 }
// One-time VIP welcome airtime, paid via VTUgate.
// Provider FIRST: vip_redeemed is set ONLY after VTUgate confirms.

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { phone, network, amount } = body || {};
    let userId = String(body?.userId || body?.user_id || "").trim();
    try {
      const { createClient } = await import("@/lib/supabase/server");
      const supabaseAuth = await createClient();
      const { data } = await supabaseAuth.auth.getUser();
      const authId = (data?.user as any)?.id || "";
      if (authId) {
        if (userId && userId !== authId) return NextResponse.json({ error: "User mismatch" }, { status: 401 });
        userId = authId;
      }
    } catch {}
    if (!userId || !phone || !network) return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    if (Number(amount) !== VIP_AMOUNT) return NextResponse.json({ error: "VIP airtime is exactly ₦500" }, { status: 400 });

    const digits = String(phone).replace(/\D/g, "");
    if (!/^0[789][01][0-9]{8}$/.test(digits)) return NextResponse.json({ error: "Invalid Nigerian phone (11 digits, starts 070/080/081/090)" }, { status: 400 });
    if (!VALID_NETWORKS.includes(String(network).toUpperCase() as any)) return NextResponse.json({ error: "Invalid network" }, { status: 400 });

    const supabase: any = (() => { try { return getSupabaseAdmin?.(); } catch { return null; } })();

    if (supabase) {
      try {
        const { data: userRow } = await supabase.from("users").select("vip_redeemed, referral_vip_balance").eq("id", userId).maybeSingle();
        if (userRow?.vip_redeemed === true) return NextResponse.json({ error: "VIP already redeemed" }, { status: 400 });
      } catch {}
      // One phone number per account: reject numbers already paid to another user.
      try {
        const { data: used } = await supabase
          .from("referral_withdraws")
          .select("user_id, meta")
          .in("type", ["vip_airtime", "referral_airtime"])
          .neq("user_id", userId)
          .limit(2000);
        const clash = ((used || []) as any[]).find(
          (r: any) => String(r?.meta?.phone || "").replace(/\D/g, "") === digits,
        );
        if (clash) return NextResponse.json({ error: "This phone number is already used on another account (one number per account)." }, { status: 400 });
      } catch {}
    }

    // --- REAL VTUGATE CALL — debits your VTUgate wallet ---
    const vt = await buyAirtime({ phone: digits, network: String(network), amount: VIP_AMOUNT });
    if (!vt.ok) {
      const vtf: any = vt;
      return NextResponse.json({ error: `${vtf.error} (nothing was deducted from your balance)`, provider: vtf.raw || null }, { status: 400 });
    }

    // --- ONLY on verified provider success do we mark redeemed and track ---
    try {
      if (supabase) {
        await supabase.from("users").update({ vip_redeemed: true, referral_vip_balance: 0 }).eq("id", userId);
        await supabase.from("referral_withdraws").insert({
          user_id: userId,
          amount: VIP_AMOUNT,
          type: "vip_airtime",
          status: "success",
          meta: { phone: digits, network: String(network).toUpperCase(), providerRef: vt.externalRef, transactionId: vt.transactionId, provider: "vtugate", providerResponse: vt.raw },
        } as any);
      }
    } catch (e) {
      console.error("[airtime] post-success DB log failed", e);
    }

    return NextResponse.json({
      success: true,
      reference: vt.externalRef,
      transactionId: vt.transactionId,
      status: "success",
      message: "Airtime sent via VTUgate. Reference tracked.",
      provider: "vtugate",
    });
  } catch (e: any) {
    console.error("[airtime] exception", e);
    return NextResponse.json({ error: e.message || "Server error" }, { status: 500 });
  }
}
