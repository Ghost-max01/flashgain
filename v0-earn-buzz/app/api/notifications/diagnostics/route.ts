import { NextResponse } from "next/server"

export const runtime = "nodejs"

export async function GET() {
  const diagnostics = {
    supabaseUrl: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
    supabaseServiceRole: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
    firebaseProjectId: Boolean(process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID),
    firebaseClientEmail: Boolean(process.env.FIREBASE_CLIENT_EMAIL),
    firebasePrivateKey: Boolean(process.env.FIREBASE_PRIVATE_KEY && !process.env.FIREBASE_PRIVATE_KEY.includes("REPLACE_THIS_AFTER_ROTATING_KEY")),
    vapidPublicKey: Boolean(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY),
    vapidPrivateKey: Boolean(process.env.VAPID_PRIVATE_KEY),
    cronSecret: Boolean(process.env.CRON_SECRET),
  }

  const backgroundReady =
    diagnostics.supabaseUrl &&
    diagnostics.supabaseServiceRole &&
    ((diagnostics.firebaseProjectId && diagnostics.firebaseClientEmail && diagnostics.firebasePrivateKey) ||
      (diagnostics.vapidPublicKey && diagnostics.vapidPrivateKey))

  return NextResponse.json({
    success: true,
    backgroundReady,
    diagnostics,
    message: backgroundReady
      ? "Background notification prerequisites are configured"
      : "Background notification prerequisites are incomplete",
  })
}
