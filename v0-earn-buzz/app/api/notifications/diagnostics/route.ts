import { NextResponse } from "next/server"

export const runtime = "nodejs"

async function checkSupabaseTable(tableName: string, url: string, serviceRoleKey: string) {
  try {
    const response = await fetch(`${url}/rest/v1/${tableName}?select=*&limit=1`, {
      method: "GET",
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
        "Content-Type": "application/json",
      },
      cache: "no-store",
    })

    const text = await response.text()
    let parsed: any = null
    try {
      parsed = text ? JSON.parse(text) : null
    } catch {
      parsed = text
    }

    if (!response.ok) {
      return {
        exists: false,
        error: parsed?.message || parsed?.error || response.statusText,
      }
    }

    return { exists: true, error: null }
  } catch (error) {
    return {
      exists: false,
      error: error instanceof Error ? error.message : "Unknown error",
    }
  }
}

export async function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ""
  const supabaseServiceRole = process.env.SUPABASE_SERVICE_ROLE_KEY || ""

  const diagnostics = {
    supabaseUrl: Boolean(supabaseUrl),
    supabaseServiceRole: Boolean(supabaseServiceRole),
    firebaseProjectId: Boolean(process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID),
    firebaseClientEmail: Boolean(process.env.FIREBASE_CLIENT_EMAIL),
    firebasePrivateKey: Boolean(process.env.FIREBASE_PRIVATE_KEY && !process.env.FIREBASE_PRIVATE_KEY.includes("REPLACE_THIS_AFTER_ROTATING_KEY")),
    vapidPublicKey: Boolean(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY),
    vapidPrivateKey: Boolean(process.env.VAPID_PRIVATE_KEY),
    cronSecret: Boolean(process.env.CRON_SECRET),
  }

  let tables = {
    notificationFcmTokens: { exists: false, error: "Supabase not configured" },
    notificationWebpushSubscriptions: { exists: false, error: "Supabase not configured" },
    userTimers: { exists: false, error: "Supabase not configured" },
  }

  if (diagnostics.supabaseUrl && diagnostics.supabaseServiceRole) {
    const [fcmTable, webpushTable, timersTable] = await Promise.all([
      checkSupabaseTable("notification_fcm_tokens", supabaseUrl, supabaseServiceRole),
      checkSupabaseTable("notification_webpush_subscriptions", supabaseUrl, supabaseServiceRole),
      checkSupabaseTable("user_timers", supabaseUrl, supabaseServiceRole),
    ])

    tables = {
      notificationFcmTokens: fcmTable,
      notificationWebpushSubscriptions: webpushTable,
      userTimers: timersTable,
    }
  }

  const tablesReady =
    tables.notificationFcmTokens.exists &&
    tables.notificationWebpushSubscriptions.exists &&
    tables.userTimers.exists

  const backgroundReady =
    diagnostics.supabaseUrl &&
    diagnostics.supabaseServiceRole &&
    tablesReady &&
    ((diagnostics.firebaseProjectId && diagnostics.firebaseClientEmail && diagnostics.firebasePrivateKey) ||
      (diagnostics.vapidPublicKey && diagnostics.vapidPrivateKey))

  const actions: string[] = []

  if (!diagnostics.supabaseUrl) actions.push("Set NEXT_PUBLIC_SUPABASE_URL in Vercel")
  if (!diagnostics.supabaseServiceRole) actions.push("Set SUPABASE_SERVICE_ROLE_KEY in Vercel")
  if (!tables.notificationFcmTokens.exists) actions.push("Create table: notification_fcm_tokens in Supabase SQL editor")
  if (!tables.notificationWebpushSubscriptions.exists) actions.push("Create table: notification_webpush_subscriptions in Supabase SQL editor")
  if (!tables.userTimers.exists) actions.push("Create table: user_timers in Supabase SQL editor")
  if (!(diagnostics.firebaseProjectId && diagnostics.firebaseClientEmail && diagnostics.firebasePrivateKey)) {
    actions.push("Set Firebase Admin env vars: FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY")
  }
  if (!diagnostics.cronSecret) actions.push("Set CRON_SECRET in Vercel")

  return NextResponse.json({
    success: true,
    backgroundReady,
    diagnostics,
    tables,
    actions,
    message: backgroundReady
      ? "Background notification prerequisites are configured"
      : "Background notification prerequisites are incomplete",
  })
}
