import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { flushDueNotifications } from "@/lib/notifications/notify-due"

export const runtime = "nodejs"

async function runCron(req: NextRequest) {
  const authHeader = req.headers.get("authorization")
  const expectedKey = process.env.CRON_SECRET || ""

  const hasSecret = Boolean(authHeader && expectedKey && authHeader === `Bearer ${expectedKey}`)

  // Foreground expedite: a logged-in app may ping its OWN due rows without
  // the cron secret (covers users while any session is open). With a valid
  // secret (Vercel Cron / scheduler) all due rows are processed as before.
  let scopeUid: string | null = null
  if (!hasSecret) {
    if (expectedKey) {
      let bodyUid = ""
      try {
        const b = await req.json().catch(() => ({} as any))
        bodyUid = String((b as any)?.userId || "")
      } catch {}
      if (!bodyUid) {
        return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
      }
      scopeUid = bodyUid
    }
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || ""
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || ""

  if (!url || !key) {
    console.log("[timer/cron] Supabase not configured")
    return NextResponse.json(
      { success: true, message: "Supabase not configured" },
      { status: 200 },
    )
  }

  const supabase = createClient(url, key)
  const { processed, failed } = await flushDueNotifications(supabase, {
    limit: 100,
    scopeUid,
    logTag: "timer/cron",
  })
  return NextResponse.json({
    success: true,
    processed,
    failed,
    message: `Processed ${processed} timers, ${failed} failed`,
  })
}

export async function GET(req: NextRequest) {
  return runCron(req)
}

export async function POST(req: NextRequest) {
  return runCron(req)
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 })
}
