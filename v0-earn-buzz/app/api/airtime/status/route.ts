import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const ref = req.nextUrl.searchParams.get("reference") || req.nextUrl.searchParams.get("id");
  if (!ref) return NextResponse.json({ error: "reference required" }, { status: 400 });
  const PAYSTACK_KEY = process.env.PAYSTACK_SECRET_KEY || process.env.NEXT_PUBLIC_PAYSTACK_SECRET_KEY || process.env.PAYSTACK_SECRET || "";
  if (!PAYSTACK_KEY) return NextResponse.json({ error: "PAYSTACK_SECRET_KEY missing" }, { status: 500 });

  // Try both singular and plural bill status endpoints
  for (const path of [`https://api.paystack.co/bill/${encodeURIComponent(ref)}`, `https://api.paystack.co/bills/${encodeURIComponent(ref)}`]) {
    try {
      const res = await fetch(path, { headers: { Authorization: `Bearer ${PAYSTACK_KEY}` } });
      const j: any = await res.json().catch(() => null);
      if (res.ok && j) return NextResponse.json({ success: true, status: j?.data?.status || j?.status, data: j?.data || j });
    } catch {}
  }
  return NextResponse.json({ success: false, error: "Could not verify reference on Paystack" }, { status: 404 });
}
