import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { hasNotificationSubscription } from "@/lib/notifications/server"
import { verifyNotifyToken } from "@/lib/notifications/notify-auth"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { uid } = body

    if (!uid) {
      return NextResponse.json({ success: false, error: "Missing uid" }, { status: 400 })
    }

    // requires ownership: Supabase JWT match OR login-issued notify token
    // (the app has no Supabase Auth session in the browser).
    let owner = false;
    try {
      const supaAuth = await createClient();
      const { data: { user } } = await supaAuth.auth.getUser();
      if (user && user.id === String(uid)) owner = true;
    } catch {}
    if (!owner) {
      try { if (verifyNotifyToken((body as any)?.notifyToken, uid)) owner = true; } catch {}
    }
    if (!owner) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

    const status = await hasNotificationSubscription(uid)

    return NextResponse.json({
      success: true,
      ...status,
    })
  } catch (error) {
    console.error("[api/notifications/status]", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "status failed",
      },
      { status: 500 },
    )
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 })
}
