import { NextRequest, NextResponse } from "next/server"
import { sendNotificationToUser } from "@/lib/notifications/server"
import type { NotificationSendPayload } from "@/lib/notifications/types"

export const runtime = "nodejs"

function isAdmin(req: NextRequest) {
  const secret = process.env.ADMIN_NOTIFY_SECRET;
  if (!secret) return false;
  const auth = req.headers.get("authorization") || "";
  return auth === `Bearer ${secret}`;
}

function sanitizeClickUrl(clickUrl?: string): string {
  const fallback = "/";
  if (!clickUrl) return fallback;
  const v = String(clickUrl).trim();
  if (v.startsWith("/")) return v.slice(0, 500);
  try {
    const u = new URL(v);
    if (u.hostname === "flashgain9ja.money" || u.hostname.endsWith(".flashgain9ja.money")) {
      return v.slice(0, 500);
    }
  } catch {}
  return fallback;
}

export async function POST(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  try {
    const payload = (await req.json()) as NotificationSendPayload
    const title = String((payload as any)?.title ?? "");
    const body = String((payload as any)?.body ?? "");
    if (title.length > 120) return NextResponse.json({ success: false, error: "title too long" }, { status: 400 });
    if (body.length > 500) return NextResponse.json({ success: false, error: "body too long" }, { status: 400 });
    const clean: NotificationSendPayload = { ...payload, title, body, clickUrl: sanitizeClickUrl((payload as any)?.clickUrl) };
    const stats = await sendNotificationToUser(clean)

    return NextResponse.json({
      success: true,
      stats,
    })
  } catch (error) {
    console.error("[api/send]", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "send failed",
      },
      { status: 500 },
    )
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 })
}
