import { NextRequest, NextResponse } from "next/server";
import { requeryTransaction } from "@/lib/vtugate";

// GET /api/airtime/status?reference=<transaction_id>
// Requeries a VTUgate airtime purchase.
export async function GET(req: NextRequest) {
  const ref = req.nextUrl.searchParams.get("reference") || req.nextUrl.searchParams.get("id");
  if (!ref) return NextResponse.json({ error: "reference required" }, { status: 400 });
  const r = await requeryTransaction(ref);
  if (!r.found) return NextResponse.json({ success: false, error: "Could not verify reference on VTUgate" }, { status: 404 });
  return NextResponse.json({ success: true, ok: r.ok ?? null, status: r.ok === true ? "success" : r.ok === false ? "failed" : "pending", data: r.raw });
}
