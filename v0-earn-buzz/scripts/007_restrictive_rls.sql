-- ============================================================================
-- 007_restrictive_rls.sql — Replace permissive USING(true) policies with
-- owner-only RLS.
--
-- WHY THIS FILE EXISTS:
--   - 004_add_insert_policy.sql opened users to anon INSERT/SELECT/UPDATE
--     with WITH CHECK (true) / USING (true) for onboarding convenience.
--   - 006_setup_notification_system.sql created "Service role can manage ..."
--     FOR ALL USING (true) policies on notification + timer tables.
--   - 005_create_user_timers_table.sql created "Users can view their own
--     timers" FOR SELECT USING (TRUE) and "Service role can manage timers"
--     FOR ALL USING (TRUE).
--
-- KEY SUPABASE PRINCIPLE (do NOT re-add USING(true) to "allow service_role"):
--   service_role BYPASSES RLS entirely (it is the table owner / superuser
--   path). No policy row is ever needed for service_role writes. Permissive
--   USING(true) policies instead open the table to anon/authenticated
--   (public) JWTs, which is the vulnerability being closed here. All writes
--   from server code MUST use getSupabaseAdmin() (service_role) and all
--   direct client access is restricted to owner-only policies below.
--
-- This file DROPS the permissive policies and creates restrictive
-- replacements. It does NOT modify 004/005/006 (history preserved).
-- ============================================================================

-- --------------------------------------------------------------------------
-- 0) Harden user_timers schema for server-issued timers (timer_type support)
-- --------------------------------------------------------------------------
ALTER TABLE public.user_timers ADD COLUMN IF NOT EXISTS timer_type TEXT DEFAULT 'claim';
-- Backfill nulls before any unique constraint.
UPDATE public.user_timers SET timer_type = 'claim' WHERE timer_type IS NULL;
-- Composite uniqueness for (user_id, timer_type) so each timer slot is 1 row.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'uq_user_timers_user_timer_type') THEN
    CREATE UNIQUE INDEX uq_user_timers_user_timer_type ON public.user_timers(user_id, timer_type);
  END IF;
END $$;

-- --------------------------------------------------------------------------
-- 1) users — DROP permissive policies from 004
-- --------------------------------------------------------------------------
DROP POLICY IF EXISTS "Allow public user registration" ON public.users;
DROP POLICY IF EXISTS "Allow reading referral codes for validation" ON public.users;
DROP POLICY IF EXISTS "Allow balance updates" ON public.users;
-- Also drop the original permissive SELECT if it was re-added anywhere else.
-- (Keep the restrictive originals from 001; recreate them idempotently below.)

-- Restrictive replacements: SELECT/UPDATE own row only via auth.uid() = id.
-- No INSERT policy is created on purpose: with RLS enabled and no INSERT
-- policy, anon/authenticated cannot insert; service_role bypasses RLS so
-- server-side registration via getSupabaseAdmin() still works.
DROP POLICY IF EXISTS "Users can view own row" ON public.users;
CREATE POLICY "Users can view own row"
  ON public.users FOR SELECT
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own row" ON public.users;
CREATE POLICY "Users can update own row"
  ON public.users FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Remove any legacy duplicates from 001 if they exist under old names, then
-- recreate them under canonical names is already done above; drop old names
-- only if they are permissive — the 001 originals are already restrictive so
-- keep them if present (both can coexist safely).
-- (No-op if 001 policies still exist; they match the same predicate.)

-- --------------------------------------------------------------------------
-- 2) referrals — SELECT own only; INSERT service_role only (no anon insert)
-- --------------------------------------------------------------------------
-- 002 created "System can insert referrals" WITH CHECK (true) which allows
-- anyone to mint referral payouts. Drop it: service_role bypasses RLS.
DROP POLICY IF EXISTS "System can insert referrals" ON public.referrals;

-- Ensure restrictive SELECT own exists (referrer OR referred).
DROP POLICY IF EXISTS "Users can view their own referrals" ON public.referrals;
CREATE POLICY "Users can view their own referrals"
  ON public.referrals FOR SELECT
  USING (auth.uid() = referrer_id OR auth.uid() = referred_id);

-- No INSERT/UPDATE/DELETE policies for referrals: only service_role
-- (RLS bypass) may write. DB triggers (handle_new_referral /
-- handle_trust_promotion, SECURITY DEFINER) still fire on service_role writes.

-- --------------------------------------------------------------------------
-- 3) notification + timer tables — DROP permissive 006 / 005 policies
-- --------------------------------------------------------------------------
DROP POLICY IF EXISTS "Service role can manage notification_fcm_tokens" ON public.notification_fcm_tokens;
DROP POLICY IF EXISTS "Service role can manage notification_webpush_subscriptions" ON public.notification_webpush_subscriptions;
DROP POLICY IF EXISTS "Service role can manage user_timers" ON public.user_timers;
DROP POLICY IF EXISTS "Service role can manage timers" ON public.user_timers;
DROP POLICY IF EXISTS "Users can view their own timers" ON public.user_timers;

-- Restrictive owner-only replacements. user_id is TEXT holding the auth user
-- id, so compare with auth.uid()::text. service_role bypasses RLS so no
-- USING(true) policy is needed for server writes.
DROP POLICY IF EXISTS "Users manage own fcm tokens" ON public.notification_fcm_tokens;
CREATE POLICY "Users manage own fcm tokens"
  ON public.notification_fcm_tokens FOR ALL
  USING (user_id = auth.uid()::text)
  WITH CHECK (user_id = auth.uid()::text);

DROP POLICY IF EXISTS "Users manage own webpush subscriptions" ON public.notification_webpush_subscriptions;
CREATE POLICY "Users manage own webpush subscriptions"
  ON public.notification_webpush_subscriptions FOR ALL
  USING (user_id = auth.uid()::text)
  WITH CHECK (user_id = auth.uid()::text);

DROP POLICY IF EXISTS "Users manage own timers" ON public.user_timers;
CREATE POLICY "Users manage own timers"
  ON public.user_timers FOR ALL
  USING (user_id = auth.uid()::text)
  WITH CHECK (user_id = auth.uid()::text);

-- --------------------------------------------------------------------------
-- 4) user_tasks — dedupe table for track-task (owner-only, service writes)
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_tasks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  task_id TEXT NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  reward INTEGER NOT NULL DEFAULT 500,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, task_id, date)
);
ALTER TABLE public.user_tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own tasks" ON public.user_tasks;
CREATE POLICY "Users manage own tasks"
  ON public.user_tasks FOR ALL
  USING (user_id = auth.uid()::text)
  WITH CHECK (user_id = auth.uid()::text);

CREATE INDEX IF NOT EXISTS idx_user_tasks_user_date ON public.user_tasks(user_id, date);
