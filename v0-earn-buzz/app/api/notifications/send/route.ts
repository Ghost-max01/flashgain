import { NextRequest, NextResponse } from "next/server"
import { sendNotificationToUser } from "@/lib/notifications/server.js"
import type { NotificationSendPayload } from "@/lib/notifications/types"

export const runtime = "nodejs"

export async function POST(req: NextRequest) {
  try {
    const payload = (await req.json()) as NotificationSendPayload
    const stats = await sendNotificationToUser(payload)

    return NextResponse.json({
      success: true,
      stats,
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Notification send failed",
      },
      { status: 400 },
    )
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 })
}
