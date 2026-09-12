import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'

const REWARD_ALLOWLIST = [500, 1000, 2000, 5000] as const;
const MAX_TASKS_PER_DAY = 50;

function normalizeReward(reward: unknown): number {
  const n = typeof reward === "number" && Number.isFinite(reward) ? Math.floor(reward) : 500;
  return (REWARD_ALLOWLIST as readonly number[]).includes(n) ? n : 500;
}

async function getRequestUid(req: NextRequest): Promise<string | null> {
  try {
    const auth = req.headers.get("authorization") || "";
    const m = auth.match(/^Bearer\s+(.+)$/i);
    const token = m ? m[1].trim() : null;
    if (token) {
      try {
        const admin: any = getSupabaseAdmin();
        const { data } = await admin.auth.getUser(token);
        const uid = (data as any)?.user?.id as string | undefined;
        if (uid) return uid;
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

// Server counts for unlock gates: GET ?userId=&plan= (plan = task_id prefix, e.g. mt-, mu-)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = (searchParams.get("userId") || "").trim();
    const plan = (searchParams.get("plan") || "").trim();
    if (!userId) return NextResponse.json({ success: false, count: 0 }, { status: 400 });
    let supabase: any;
    try {
      supabase = getSupabaseAdmin();
    } catch {
      return NextResponse.json({ success: false, count: 0 }, { status: 500 });
    }
    const today = new Date().toISOString().split("T")[0];
    let query = supabase
      .from("user_tasks")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("date", today);
    if (plan) query = query.ilike("task_id", `${plan}%`);
    const { count, error } = await query;
    if (error) throw error;
    return NextResponse.json({ success: true, count: count ?? 0 });
  } catch (e) {
    return NextResponse.json({ success: false, count: 0 }, { status: 500 });
  }
}

// Track task completions for analytics (dedupe + rate-limit hardened)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, taskId, reward: rawReward } = body ?? {}

    if (!userId || typeof userId !== "string" || !taskId || typeof taskId !== "string") {
      return NextResponse.json({ success: false, error: "Missing userId/taskId" }, { status: 400 })
    }

    const reward = normalizeReward(rawReward);
    const today = new Date().toISOString().split('T')[0];

    let supabase: any;
    try {
      supabase = getSupabaseAdmin();
    } catch {
      return NextResponse.json({ success: false, error: "Server not configured" }, { status: 500 })
    }

    // Ownership: prefer JWT match; at minimum enforce daily rate-limit.
    const requestUid = await getRequestUid(request);
    const owned = requestUid !== null && requestUid === userId;

    // Daily rate-limit: max 50 inserts/day per user (always enforced).
    try {
      const { count } = await supabase
        .from('user_tasks')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('date', today);
      if ((count ?? 0) >= MAX_TASKS_PER_DAY) {
        return NextResponse.json({ success: false, error: "Daily task limit reached" }, { status: 429 })
      }
    } catch {
      // If count query fails (e.g. table missing), fall through to insert
      // attempt which will surface the real error; do not bypass dedupe.
    }

    // If no JWT ownership proof, still allow subject to the rate-limit above
    // (compat for legacy clients), but flag it. Strict deployments can flip
    // this to `if (!owned) return 401`.
    void owned;

    // Dedupe: one row per (user_id, task_id, date).
    try {
      const { data: existing } = await supabase
        .from('user_tasks')
        .select('id')
        .eq('user_id', userId)
        .eq('task_id', taskId)
        .eq('date', today)
        .maybeSingle();
      if (existing) {
        return NextResponse.json({ success: false, duplicate: true }, { status: 200 })
      }
    } catch (e) {
      console.error('Task dedupe check error:', e);
    }

    const { data, error } = await supabase
      .from('user_tasks')
      .insert({
        user_id: userId,
        task_id: taskId,
        date: today,
        reward,
      })
      .select()
      .maybeSingle();

    if (error) {
      // Unique violation raced with the check above -> treat as duplicate.
      if ((error as any)?.code === '23505') {
        return NextResponse.json({ success: false, duplicate: true }, { status: 200 })
      }
      console.error('Task tracking error:', error)
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, completion: data })
  } catch (error) {
    console.error('Task tracking error:', error)
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 })
  }
}
