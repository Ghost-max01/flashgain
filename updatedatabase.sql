-- ============================================
-- COPY/PASTE ENTIRE FILE INTO SUPABASE SQL EDITOR AND RUN
-- Implements: referral counts immediately, earnings pending until Beginner (trust_score >=30)
-- referral_count = total referrals (withdrawable + pending)
-- referral_balance = approved only (Beginner 30+), pending shows as potential earnings
-- ============================================

-- 0) Ensure required columns exist
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS trust_score integer DEFAULT 0;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS vip_redeemed boolean DEFAULT false;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS referral_vip_balance numeric DEFAULT 0;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS referral_count integer DEFAULT 0;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS referral_balance numeric DEFAULT 0;
ALTER TABLE public.referrals ADD COLUMN IF NOT EXISTS amount numeric DEFAULT 500;
ALTER TABLE public.referrals ADD COLUMN IF NOT EXISTS processed boolean DEFAULT false;
ALTER TABLE public.referrals ADD COLUMN IF NOT EXISTS processed_at timestamp with time zone;

-- 1) Fix defaults (signup 5k, referral 500)
ALTER TABLE public.users ALTER COLUMN balance SET DEFAULT 5000;
ALTER TABLE public.referrals ALTER COLUMN amount SET DEFAULT 500;

-- 2) Backfill NULLs
UPDATE public.users SET trust_score = 0 WHERE trust_score IS NULL;
UPDATE public.users SET referral_count = 0 WHERE referral_count IS NULL;
UPDATE public.users SET referral_balance = 0 WHERE referral_balance IS NULL;
UPDATE public.users SET vip_redeemed = false WHERE vip_redeemed IS NULL;
UPDATE public.users SET referral_vip_balance = 0 WHERE referral_vip_balance IS NULL;

-- 3) Helpful indexes
CREATE INDEX IF NOT EXISTS idx_users_trust_score ON public.users(trust_score);
CREATE INDEX IF NOT EXISTS idx_referrals_referrer_id ON public.referrals(referrer_id);
CREATE INDEX IF NOT EXISTS idx_referrals_referred_id ON public.referrals(referred_id);
CREATE INDEX IF NOT EXISTS idx_referrals_processed ON public.referrals(processed);

-- 4) Referral trigger: count immediately, pay only if Beginner 30+
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

-- 5) Trust promotion: when user hits Beginner 30, convert all pending referrals to approved
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

-- 6) Legacy no-op (kept for compatibility)
CREATE OR REPLACE FUNCTION public.process_pending_referrals_on_balance_update() RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN RETURN NEW; END; $$;
DROP TRIGGER IF EXISTS on_user_balance_update ON public.users;
CREATE TRIGGER on_user_balance_update AFTER UPDATE OF balance ON public.users FOR EACH ROW EXECUTE FUNCTION public.process_pending_referrals_on_balance_update();

-- 7) BACKFILL: Fix historical data (recompute processed flag + balances from trust_score truth)
-- 7a) Reset processed flags based on current trust_score (>=30 = approved)
UPDATE public.referrals r SET processed = (COALESCE(u.trust_score,0) >= 30), processed_at = CASE WHEN COALESCE(u.trust_score,0) >= 30 THEN COALESCE(r.processed_at, NOW()) ELSE NULL END
FROM public.users u WHERE r.referred_id = u.id;

-- 7b) Recalculate referral_count = total referrals per referrer
UPDATE public.users u SET referral_count = COALESCE(c.cnt,0)
FROM (SELECT referrer_id, COUNT(*)::int as cnt FROM public.referrals GROUP BY referrer_id) c
WHERE u.id = c.referrer_id;
-- users with zero referrals
UPDATE public.users SET referral_count = 0 WHERE id NOT IN (SELECT referrer_id FROM public.referrals);

-- 7c) Recalculate referral_balance = sum of approved (processed=true) amounts only
UPDATE public.users u SET referral_balance = COALESCE(s.total,0)
FROM (SELECT referrer_id, SUM(COALESCE(amount,500)) as total FROM public.referrals WHERE COALESCE(processed,false)=true GROUP BY referrer_id) s
WHERE u.id = s.referrer_id;
UPDATE public.users SET referral_balance = 0 WHERE id NOT IN (SELECT referrer_id FROM public.referrals WHERE COALESCE(processed,false)=true);

-- 8) referral_withdraws ledger (if not exists) - tracks VIP airtime + referral withdraws
CREATE TABLE IF NOT EXISTS public.referral_withdraws (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  amount numeric NOT NULL,
  type text NOT NULL,
  status text NOT NULL DEFAULT 'success',
  meta jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT referral_withdraws_pkey PRIMARY KEY (id)
);
CREATE INDEX IF NOT EXISTS idx_referral_withdraws_user_id ON public.referral_withdraws(user_id);
CREATE INDEX IF NOT EXISTS idx_referral_withdraws_type ON public.referral_withdraws(type);
