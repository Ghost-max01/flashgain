import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'

const ACTION_ALLOWLIST = ['session_start', 'login', 'admin_login', 'logout'] as const;
const MAX_LIMIT = 50;

function getAdminOrNull(): any {
  try {
    return getSupabaseAdmin();
  } catch {
    return null;
  }
}

async function getRequestUid(request: NextRequest): Promise<string | null> {
  try {
    const auth = request.headers.get("authorization") || "";
    const m = auth.match(/^Bearer\s+(.+)$/i);
    const token = m ? m[1].trim() : null;
    if (token) {
      try {
        const admin = getAdminOrNull();
        if (admin) {
          const { data } = await admin.auth.getUser(token);
          const uid = (data as any)?.user?.id as string | undefined;
          if (uid) return uid;
        }
      } catch {}
    }
  } catch {}
  try {
    const { createClient } = await import("@/lib/supabase/server");
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    const uid = (data as any)?.user?.id as string | undefined;
    if (uid) return uid;
  } catch {}
  return null;
}

// Track when users log into their accounts (not just authentication attempts)
export async function POST(request: NextRequest) {
  try {
    const { userId, email, action } = await request.json()

    if (!userId && !email) {
      return NextResponse.json({ success: false, error: "Missing userId/email" }, { status: 400 })
    }
    if (typeof action !== "string" || !(ACTION_ALLOWLIST as readonly string[]).includes(action)) {
      return NextResponse.json({ success: false, error: "Invalid action" }, { status: 400 })
    }

    const supabase = getAdminOrNull();
    if (!supabase) {
      return NextResponse.json({ success: false, error: "Server not configured" }, { status: 500 })
    }

    // Require JWT for IP logging: without a valid JWT matching the subject,
    // drop IP logging (privacy) and store a redacted placeholder.
    const requestUid = await getRequestUid(request);
    const claimed = typeof userId === "string" ? userId : null;
    const authed = requestUid !== null && (claimed === null || requestUid === claimed);

    const userAgent = request.headers.get('user-agent') || 'unknown'
    const ip = authed
      ? (request.headers.get('x-forwarded-for') ||
         request.headers.get('x-real-ip') ||
         'unknown')
      : 'redacted';

    // Store session in Supabase
    const { data, error } = await supabase
      .from('user_sessions')
      .insert({
        user_id: userId || email,
        email,
        action,
        ip_address: ip,
        user_agent: userAgent,
        timestamp: new Date().toISOString(),
        date: new Date().toISOString().split('T')[0]
      })
      .select()

    if (error) {
      console.error('Session tracking error:', error)
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, session: data[0] })
  } catch (error) {
    console.error('Session tracking error:', error)
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const days = parseInt(searchParams.get('days') || '7')
    const limitRaw = parseInt(searchParams.get('limit') || '50')
    const limit = Math.max(1, Math.min(MAX_LIMIT, Number.isFinite(limitRaw) ? limitRaw : MAX_LIMIT))

    const supabase = getAdminOrNull();
    if (!supabase) {
      return NextResponse.json({ success: false, error: "Server not configured" }, { status: 500 })
    }

    const requestUid = await getRequestUid(request);

    if (userId) {
      // Require JWT ownership of the queried userId.
      if (!requestUid || requestUid !== userId) {
        return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
      }
      // Return user login history
      const { data, error } = await supabase
        .from('user_sessions')
        .select('*')
        .eq('user_id', userId)
        .order('timestamp', { ascending: false })
        .limit(limit)

      if (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
      }

      return NextResponse.json({ success: true, sessions: data })
    } else {
      // Daily analytics summary requires an authenticated caller.
      if (!requestUid) {
        return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
      }
      // Return daily analytics summary
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - days)

      const { data, error } = await supabase
        .from('user_sessions')
        .select('*')
        .gte('date', startDate.toISOString().split('T')[0])
        .order('date', { ascending: true })
        .limit(limit)

      if (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
      }

      // Group by date and calculate daily metrics
      const dailyStats = data.reduce((acc: any, session: any) => {
        const date = session.date
        if (!acc[date]) {
          acc[date] = {
            date,
            logins: 0,
            uniqueUsers: new Set()
          }
        }
        acc[date].logins++
        acc[date].uniqueUsers.add(session.user_id)
        return acc
      }, {})

      const result = Object.values(dailyStats).map((day: any) => ({
        date: day.date,
        activeUsers: day.uniqueUsers.size,
        totalLogins: day.logins
      }))

      return NextResponse.json({ success: true, analytics: result })
    }
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 })
  }
}
