import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { hasNotificationSubscription } from "@/lib/notifications/server"

export async function POST(req: NextRequest) {
  try {
    const { uid } = await req.json()

    if (!uid) {
      return NextResponse.json({ success: false, error: "Missing uid" }, { status: 400 })
    }

    // requires JWT ownership
    try {
      const supaAuth = await createClient();
      const { data: { user } } = await supaAuth.auth.getUser();
      if (!user || user.id !== String(uid)) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    } catch { return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 }); }

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
