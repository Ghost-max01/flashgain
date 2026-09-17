import { NextResponse } from "next/server"

export const runtime = "nodejs"

// GET /api/notify/env-check — public push-readiness booleans for the in-app
// diagnostics checklist. Exposes ONLY whether each piece is configured
// (never values, keys, or secrets).
export async function GET() {
  try {
    const vapid =
      Boolean(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY) &&
      Boolean(process.env.VAPID_PRIVATE_KEY) &&
      Boolean(process.env.VAPID_SUBJECT)
    const fcm = Boolean(
      process.env.NEXT_PUBLIC_FIREBASE_API_KEY &&
        process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID &&
        process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID &&
        process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    )
    return NextResponse.json({ success: true, vapid, fcm })
  } catch {
    return NextResponse.json({ success: false, vapid: false, fcm: false })
  }
}
