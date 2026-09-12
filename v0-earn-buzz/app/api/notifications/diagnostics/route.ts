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

export async function GET(req: Request) {
  const auth = (req as any)?.headers?.get?.("authorization") || "";
  const secret = process.env.ADMIN_NOTIFY_SECRET;
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ""
  const supabaseServiceRole = process.env.SUPABASE_SERVICE_ROLE_KEY || ""

  const hasSupabase = Boolean(supabaseUrl && supabaseServiceRole);

  let tables = {
    notificationFcmTokens: { exists: false, error: "Supabase not configured" },
    notificationWebpushSubscriptions: { exists: false, error: "Supabase not configured" },
    userTimers: { exists: false, error: "Supabase not configured" },
  }

  if (hasSupabase) {
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

  // Return only counts — never env booleans
  let counts = { fcmTokens: 0, webpushSubs: 0, timers: 0 };
  if (hasSupabase && tablesReady) {
    try {
      const headers = { apikey: supabaseServiceRole, Authorization: `Bearer ${supabaseServiceRole}`, "Content-Type": "application/json", Prefer: "count=exact" };
      const [a, b, c] = await Promise.all([
        fetch(`${supabaseUrl}/rest/v1/notification_fcm_tokens?select=id`, { method: "HEAD", headers, cache: "no-store" }),
        fetch(`${supabaseUrl}/rest/v1/notification_webpush_subscriptions?select=id`, { method: "HEAD", headers, cache: "no-store" }),
        fetch(`${supabaseUrl}/rest/v1/user_timers?select=id`, { method: "HEAD", headers, cache: "no-store" }),
      ]);
      const parseCount = (r: Response) => {
        const cr = r.headers.get("content-range") || "";
        const m = cr.split("/").pop();
        const n = m ? parseInt(m, 10) : 0;
        return Number.isFinite(n) ? n : 0;
      };
      counts = { fcmTokens: parseCount(a), webpushSubs: parseCount(b), timers: parseCount(c) };
    } catch {}
  }

  return NextResponse.json({
    success: true,
    tablesReady,
    counts,
    tables,
  })
}
