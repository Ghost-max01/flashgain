import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getSupabaseAdmin } from "@/lib/supabase/admin"
import { saveNotificationSubscription } from "@/lib/notifications/server"
import { verifyNotifyToken } from "@/lib/notifications/notify-auth"
import type { NotificationSubscribePayload } from "@/lib/notifications/types"

async function isOwner(req: NextRequest, uid: string, notifyToken?: unknown): Promise<boolean> {
  // Primary: Supabase JWT uid match (unchanged legacy behavior).
  try {
    const supaAuth = await createClient();
    const { data: { user } } = await supaAuth.auth.getUser();
    if (user && user.id === uid) return true;
  } catch {}
  // Fallback: HMAC offline-push token issued at login/signup (the app has
  // no Supabase Auth session in the browser, so JWT alone would 401 everyone).
  try {
    if (verifyNotifyToken(notifyToken, uid)) return true;
  } catch {}
  return false;
}

export async function POST(req: NextRequest) {
  try {
    const payload = (await req.json()) as NotificationSubscribePayload
    const uid = (payload as any)?.uid ? String((payload as any).uid) : "";
    if (!uid) return NextResponse.json({ success: false, error: "Missing uid" }, { status: 400 });
    // require ownership: Supabase JWT match OR login-issued notify token.
    // The auth branch is echoed back (no secrets) so the device can tell
    // "no token sent" apart from "token rejected" without guessing.
    const presentedToken = typeof (payload as any)?.notifyToken === "string" && (payload as any).notifyToken ? true : false;
    if (!(await isOwner(req, uid, (payload as any)?.notifyToken))) {
      return NextResponse.json(
        { success: false, error: "Unauthorized", auth: presentedToken ? "token-invalid" : "no-token-sent" },
        { status: 401 },
      );
    }
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

    // Save proof: re-read what was just written so the device can verify
    // the row exists under its own uid (catches write/read divergence).
    // Only non-sensitive identifiers are echoed back — never tokens/keys.
    let proof: { savedUserId: string | null; rowId: number | string | null } = { savedUserId: null, rowId: null }
    try {
      const admin: any = getSupabaseAdmin()
      if ((payload as any).type === "fcm") {
        const token = String((payload as any).token || "")
        const { data } = await admin
          .from("notification_fcm_tokens")
          .select("id,user_id")
          .eq("token", token)
          .maybeSingle()
        if (data) proof = { savedUserId: String((data as any).user_id ?? ""), rowId: (data as any).id ?? null }
      } else {
        const endpoint = String((payload as any)?.subscription?.endpoint || "")
        const { data } = await admin
          .from("notification_webpush_subscriptions")
          .select("id,user_id")
          .eq("endpoint", endpoint)
          .maybeSingle()
        if (data) proof = { savedUserId: String((data as any).user_id ?? ""), rowId: (data as any).id ?? null }
      }
    } catch {}

    return NextResponse.json({
      success: true,
      ...result,
      proof,
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
