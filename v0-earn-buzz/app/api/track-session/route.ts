import { NextRequest, NextResponse } from 'next/server'

// Track when users log into their accounts (not just authentication attempts)
export async function POST(request: NextRequest) {
  try {
    const { userId, email, action } = await request.json()

    // Log to browser storage via response
    const log = {
      id: `${Date.now()}-${Math.random()}`,
      userId: userId || email,
      email,
      action, // 'session_start' | 'login'
      timestamp: new Date().toISOString(),
      date: new Date().toDateString(),
    }

    return NextResponse.json({ success: true, log })
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    // Return user login history (implement based on your DB)
    return NextResponse.json({
      success: true,
      message: 'Use POST to log user sessions',
    })
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 })
  }
}
