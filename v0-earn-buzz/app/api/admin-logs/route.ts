import { NextRequest, NextResponse } from 'next/server'

// In-memory storage for logs (replace with database in production)
let logs: any[] = []

export async function POST(request: NextRequest) {
  try {
    const { userId, eventType, taskId } = await request.json()

    const log = {
      id: `${Date.now()}-${Math.random()}`,
      userId,
      eventType, // 'login' | 'task_complete' | 'admin_access'
      taskId: taskId || null,
      timestamp: new Date().toISOString(),
      date: new Date().toDateString(),
      ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
    }

    logs.push(log)

    // Keep only last 10000 logs
    if (logs.length > 10000) {
      logs = logs.slice(-10000)
    }

    return NextResponse.json({ success: true, log })
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const filter = searchParams.get('filter') // 'date', 'eventType', 'userId'
    const value = searchParams.get('value')
    const limit = parseInt(searchParams.get('limit') || '100', 10)

    let result = logs

    if (filter && value) {
      result = logs.filter((log) => log[filter as keyof typeof log] == value)
    }

    // Return latest logs first
    result = result.slice(-limit).reverse()

    // Calculate stats
    const uniqueUsers = new Set(logs.map((l) => l.userId)).size
    const totalLogins = logs.filter((l) => l.eventType === 'login').length
    const totalTasksCompleted = logs.filter((l) => l.eventType === 'task_complete').length

    return NextResponse.json({
      success: true,
      logs: result,
      stats: {
        totalLogs: logs.length,
        uniqueUsers,
        totalLogins,
        totalTasksCompleted,
      },
    })
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 })
  }
}
