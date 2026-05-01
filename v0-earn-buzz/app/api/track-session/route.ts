import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase/client'

// Track when users log into their accounts (not just authentication attempts)
export async function POST(request: NextRequest) {
  try {
    const { userId, email, action } = await request.json()

    // Get client IP and user agent
    const ip = request.headers.get('x-forwarded-for') ||
               request.headers.get('x-real-ip') ||
               'unknown'
    const userAgent = request.headers.get('user-agent') || 'unknown'

    // Store session in Supabase
    const { data, error } = await supabase
      .from('user_sessions')
      .insert({
        user_id: userId || email,
        email,
        action, // 'session_start' | 'login' | 'admin_login'
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

    if (userId) {
      // Return user login history
      const { data, error } = await supabase
        .from('user_sessions')
        .select('*')
        .eq('user_id', userId)
        .order('timestamp', { ascending: false })
        .limit(50)

      if (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
      }

      return NextResponse.json({ success: true, sessions: data })
    } else {
      // Return daily analytics summary
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - days)

      const { data, error } = await supabase
        .from('user_sessions')
        .select('*')
        .gte('date', startDate.toISOString().split('T')[0])
        .order('date', { ascending: true })

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
