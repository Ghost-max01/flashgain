-- ============================================================
-- FlashGain9ja — SCHEMA REMNANTS (copy/paste into Supabase SQL Editor)
-- Fills ONLY the gaps between the app code and the live database.
-- Everything is IF NOT EXISTS / guarded, so it is safe to run even if
-- some (or all) of these already exist. Run top to bottom, once.
-- ============================================================

-- ------------------------------------------------------------
-- 0) users.trust_meta — lets the trust score persist across logins
--    and devices exactly like balance (server snapshot of the
--    counters; the app max-merges it with local activity).
-- ------------------------------------------------------------
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS trust_meta jsonb DEFAULT '{}'::jsonb;

-- ------------------------------------------------------------
-- 1) user_timers: per-type rows (claim / auto_<plan> / tap_refill)
--    The app stores claim timers AND push-reminder timers in this table,
--    one row per (user, type). Today the table only allows ONE row per
--    user, which breaks both.
-- ------------------------------------------------------------
ALTER TABLE public.user_timers ADD COLUMN IF NOT EXISTS timer_type text DEFAULT 'claim';
ALTER TABLE public.user_timers ADD COLUMN IF NOT EXISTS claim_count integer DEFAULT 0;
ALTER TABLE public.user_timers ADD COLUMN IF NOT EXISTS pause_until timestamp with time zone;
UPDATE public.user_timers SET timer_type = 'claim' WHERE timer_type IS NULL;

-- Drop the single-column UNIQUE(user_id) if present (whatever it is named).
DO $$ DECLARE c text; BEGIN
  SELECT con.conname INTO c
  FROM pg_constraint con
  JOIN pg_class rel ON rel.oid = con.conrelid
  JOIN pg_attribute a ON a.attrelid = rel.oid AND a.attnum = ANY (con.conkey)
  WHERE rel.relname = 'user_timers' AND con.contype = 'u'
  GROUP BY con.conname
  HAVING array_agg(a.attname::text ORDER BY a.attname) = ARRAY['user_id'];
  IF c IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.user_timers DROP CONSTRAINT %I', c);
    RAISE NOTICE 'dropped single-column unique: %', c;
  END IF;
END $$;

-- Composite unique for per-type upserts.
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'user_timers_user_type_unique') THEN
    ALTER TABLE public.user_timers ADD CONSTRAINT user_timers_user_type_unique UNIQUE (user_id, timer_type);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_user_timers_due ON public.user_timers(notified, timer_ends_at);

-- ------------------------------------------------------------
-- 2) referrals.consumed (referral-withdraw flow marks consumed rows;
--    stats routes already fall back when it is missing)
-- ------------------------------------------------------------
ALTER TABLE public.referrals ADD COLUMN IF NOT EXISTS consumed boolean DEFAULT false;

-- ------------------------------------------------------------
-- 3) transactions ledger (tap/spin/paystack/deposit rows).
--    reference MUST be unique — replay protection depends on it.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.transactions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  type text NOT NULL DEFAULT '',
  amount numeric NOT NULL DEFAULT 0,
  reference text NOT NULL,
  status text NOT NULL DEFAULT 'success',
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT transactions_pkey PRIMARY KEY (id)
);
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS user_id text;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS type text;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS amount numeric;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS reference text;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS status text;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS metadata jsonb;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS created_at timestamp with time zone;
DO $$ BEGIN
  ALTER TABLE public.transactions ADD CONSTRAINT transactions_reference_unique UNIQUE (reference);
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'transactions.reference unique skipped: %', SQLERRM;
END $$;
CREATE INDEX IF NOT EXISTS idx_transactions_user ON public.transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_user_type ON public.transactions(user_id, type);
CREATE INDEX IF NOT EXISTS idx_transactions_created ON public.transactions(created_at);

-- ------------------------------------------------------------
-- 4) withdrawals (bank + referral withdrawals; History reads these)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.withdrawals (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  method text NOT NULL DEFAULT 'Bank Transfer',
  status text NOT NULL DEFAULT 'pending',
  reference text,
  source text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT withdrawals_pkey PRIMARY KEY (id)
);
ALTER TABLE public.withdrawals ADD COLUMN IF NOT EXISTS user_id text;
ALTER TABLE public.withdrawals ADD COLUMN IF NOT EXISTS amount numeric;
ALTER TABLE public.withdrawals ADD COLUMN IF NOT EXISTS method text;
ALTER TABLE public.withdrawals ADD COLUMN IF NOT EXISTS status text;
ALTER TABLE public.withdrawals ADD COLUMN IF NOT EXISTS reference text;
ALTER TABLE public.withdrawals ADD COLUMN IF NOT EXISTS source text;
ALTER TABLE public.withdrawals ADD COLUMN IF NOT EXISTS created_at timestamp with time zone;
DO $$ BEGIN
  ALTER TABLE public.withdrawals ADD CONSTRAINT withdrawals_reference_unique UNIQUE (reference);
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'withdrawals.reference unique skipped: %', SQLERRM;
END $$;
CREATE INDEX IF NOT EXISTS idx_withdrawals_user ON public.withdrawals(user_id);
CREATE INDEX IF NOT EXISTS idx_withdrawals_reference ON public.withdrawals(reference);

-- ------------------------------------------------------------
-- 5) user_tasks (daily task completions; dedupe needs the unique key)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_tasks (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  task_id text NOT NULL,
  date date NOT NULL,
  reward integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT user_tasks_pkey PRIMARY KEY (id)
);
ALTER TABLE public.user_tasks ADD COLUMN IF NOT EXISTS user_id text;
ALTER TABLE public.user_tasks ADD COLUMN IF NOT EXISTS task_id text;
ALTER TABLE public.user_tasks ADD COLUMN IF NOT EXISTS date date;
ALTER TABLE public.user_tasks ADD COLUMN IF NOT EXISTS reward integer;
ALTER TABLE public.user_tasks ADD COLUMN IF NOT EXISTS created_at timestamp with time zone;
DO $$ BEGIN
  ALTER TABLE public.user_tasks ADD CONSTRAINT user_tasks_user_task_date_unique UNIQUE (user_id, task_id, date);
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'user_tasks dedupe key skipped: %', SQLERRM;
END $$;
CREATE INDEX IF NOT EXISTS idx_user_tasks_user_date ON public.user_tasks(user_id, date);

-- ------------------------------------------------------------
-- 6) loans (loan requests)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.loans (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT loans_pkey PRIMARY KEY (id)
);
ALTER TABLE public.loans ADD COLUMN IF NOT EXISTS user_id text;
ALTER TABLE public.loans ADD COLUMN IF NOT EXISTS amount numeric;
ALTER TABLE public.loans ADD COLUMN IF NOT EXISTS status text;
ALTER TABLE public.loans ADD COLUMN IF NOT EXISTS created_at timestamp with time zone;
CREATE INDEX IF NOT EXISTS idx_loans_user ON public.loans(user_id);

-- ------------------------------------------------------------
-- 7) spins (legacy spin-page plays)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.spins (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  win_index integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT spins_pkey PRIMARY KEY (id)
);
ALTER TABLE public.spins ADD COLUMN IF NOT EXISTS user_id text;
ALTER TABLE public.spins ADD COLUMN IF NOT EXISTS win_index integer;
ALTER TABLE public.spins ADD COLUMN IF NOT EXISTS status text;
ALTER TABLE public.spins ADD COLUMN IF NOT EXISTS created_at timestamp with time zone;
CREATE INDEX IF NOT EXISTS idx_spins_user ON public.spins(user_id);

-- ------------------------------------------------------------
-- 8) Referral triggers (canonical versions — safe to re-apply):
--    count immediately + pay on Beginner(30); promote pendings on crossing.
--    NOTE: no balance backfill here on purpose. The historical backfill
--    queries from updatedatabase.sql §7 REWRITE referral balances from the
--    trust_score truth — do NOT run those while trust scores are still
--    syncing, or approved balances can be zeroed.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_referral()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE referred_trust INT;
BEGIN
  UPDATE public.users SET referral_count = COALESCE(referral_count,0)+1 WHERE id = NEW.referrer_id;
  SELECT COALESCE(trust_score,0) INTO referred_trust FROM public.users WHERE id = NEW.referred_id;
  IF COALESCE(referred_trust,0) >= 30 THEN
    UPDATE public.users SET referral_balance = COALESCE(referral_balance,0)+COALESCE(NEW.amount,500) WHERE id = NEW.referrer_id;
    UPDATE public.referrals SET processed = TRUE, processed_at = NOW() WHERE id = NEW.id;
  ELSE
    UPDATE public.referrals SET processed = FALSE, processed_at = NULL WHERE id = NEW.id;
  END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS on_referral_created ON public.referrals;
CREATE TRIGGER on_referral_created AFTER INSERT ON public.referrals FOR EACH ROW EXECUTE FUNCTION public.handle_new_referral();

CREATE OR REPLACE FUNCTION public.handle_trust_promotion()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE pending RECORD;
BEGIN
  IF COALESCE(NEW.trust_score,0) >= 30 AND COALESCE(OLD.trust_score,0) < 30 THEN
    FOR pending IN SELECT id, referrer_id, amount FROM public.referrals WHERE referred_id = NEW.id AND COALESCE(processed,false)=false LOOP
      UPDATE public.users SET referral_balance = COALESCE(referral_balance,0)+COALESCE(pending.amount,500) WHERE id = pending.referrer_id;
      UPDATE public.referrals SET processed = TRUE, processed_at = NOW() WHERE id = pending.id;
    END LOOP;
  END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS on_user_trust_promotion ON public.users;
CREATE TRIGGER on_user_trust_promotion AFTER UPDATE OF trust_score ON public.users FOR EACH ROW EXECUTE FUNCTION public.handle_trust_promotion();

-- ============================================================
-- DONE. Verify with: SELECT conname FROM pg_constraint WHERE conrelid =
-- 'public.user_timers'::regclass;  (expect user_timers_user_type_unique,
-- and NO single-column user_id unique)
-- ============================================================
