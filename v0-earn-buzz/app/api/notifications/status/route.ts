import { NextRequest, NextResponse } from "next/server"
import { hasNotificationSubscription } from "@/lib/notifications/server.js"

export async function POST(req: NextRequest) {
  try {
    const { uid } = await req.json()

    if (!uid) {
      return NextResponse.json({ success: false, error: "Missing uid" }, { status: 400 })
    }

    const status = await hasNotificationSubscription(uid)

    return NextResponse.json({
      success: true,
      ...status,
    })
  } catch (error) {
    console.error("[api/notifications/status]", error)
    return NextResponse.json(
      {
        success: true,
        hasAny: false,
        hasFcm: false,
        hasWebpush: false,
        message: "Status check fallback",
      },
      { status: 200 },
    )
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 })
}
