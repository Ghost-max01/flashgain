import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase/client'

// Track task completions for analytics
export async function POST(request: NextRequest) {
  try {
    const { userId, taskId, taskName, reward } = await request.json()

    // Store task completion in Supabase
    const { data, error } = await supabase
      .from('task_completions')
      .insert({
        user_id: userId,
        task_id: taskId,
        task_name: taskName,
        reward: reward || 0,
        completed_at: new Date().toISOString(),
        date: new Date().toISOString().split('T')[0]
      })
      .select()

    if (error) {
      console.error('Task tracking error:', error)
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, completion: data[0] })
  } catch (error) {
    console.error('Task tracking error:', error)
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 })
  }
}
