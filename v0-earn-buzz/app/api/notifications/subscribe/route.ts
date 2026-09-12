import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getSupabaseAdmin } from "@/lib/supabase/admin"
import { saveNotificationSubscription } from "@/lib/notifications/server"
import type { NotificationSubscribePayload } from "@/lib/notifications/types"

export async function POST(req: NextRequest) {
  try {
    const payload = (await req.json()) as NotificationSubscribePayload
    const uid = (payload as any)?.uid ? String((payload as any).uid) : "";
    if (!uid) return NextResponse.json({ success: false, error: "Missing uid" }, { status: 400 });
    // require JWT uid match
    try {
      const supaAuth = await createClient();
      const { data: { user } } = await supaAuth.auth.getUser();
      if (!user || user.id !== uid) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    } catch { return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 }); }
    // validate endpoint/token length
    if ((payload as any).type === "fcm") {
      const token = String((payload as any).token || "");
      if (!token || token.length > 4096) return NextResponse.json({ success: false, error: "Invalid token" }, { status: 400 });
    } else {
      const endpoint = String((payload as any)?.subscription?.endpoint || "");
      if (!endpoint || endpoint.length > 2048) return NextResponse.json({ success: false, error: "Invalid endpoint" }, { status: 400 });
      const p256dh = String((payload as any)?.subscription?.keys?.p256dh || "");
      const auth = String((payload as any)?.subscription?.keys?.auth || "");
      if (p256dh.length > 1024 || auth.length > 1024) return NextResponse.json({ success: false, error: "Invalid keys" }, { status: 400 });
    }
    // rate-limit: max 5 subs/hour per uid via count query best-effort
    try {
      const admin: any = getSupabaseAdmin();
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      const [{ count: c1 }, { count: c2 }] = await Promise.all([
        admin.from("notification_fcm_tokens").select("id", { count: "exact", head: true }).eq("user_id", uid).gte("created_at", oneHourAgo),
        admin.from("notification_webpush_subscriptions").select("id", { count: "exact", head: true }).eq("user_id", uid).gte("created_at", oneHourAgo),
      ]);
      if (Number(c1 || 0) + Number(c2 || 0) >= 5) return NextResponse.json({ success: false, error: "Rate limited" }, { status: 429 });
    } catch {}
    const result = await saveNotificationSubscription(payload)

    return NextResponse.json({
      success: true,
      ...result,
    })
  } catch (error) {
    console.error("[api/subscribe]", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "subscribe failed",
      },
      { status: 500 },
    )
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 })
}
