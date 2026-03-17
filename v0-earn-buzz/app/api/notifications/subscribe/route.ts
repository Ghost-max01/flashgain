import { NextRequest, NextResponse } from "next/server"
import { saveNotificationSubscription } from "@/lib/notifications/server.js"
import type { NotificationSubscribePayload } from "@/lib/notifications/types"

export async function POST(req: NextRequest) {
  try {
    const payload = (await req.json()) as NotificationSubscribePayload
    const result = await saveNotificationSubscription(payload)

    return NextResponse.json({
      success: true,
      ...result,
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Subscription save failed",
      },
      { status: 400 },
    )
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 })
}
