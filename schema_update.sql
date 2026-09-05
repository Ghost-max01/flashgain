-- COPY/PASTE THIS ENTIRE FILE INTO SUPABASE SQL EDITOR AND RUN
-- Fixes your schema for: VIP 500 airtime (real Paystack debit + tracked), Approved/Pending referrals (Beginner 30), Trust Score sync

-- 1) Users table: add missing columns for VIP + trust
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS vip_redeemed boolean DEFAULT false;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS referral_vip_balance numeric DEFAULT 0;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS trust_score integer DEFAULT 0;

-- 2) Fix defaults to match app (signup 5k not 20k, referral 500 not 10000)
ALTER TABLE public.users ALTER COLUMN balance SET DEFAULT 5000;
ALTER TABLE public.referrals ALTER COLUMN amount SET DEFAULT 500;

-- 3) Backfill existing rows so old users don't have NULLs
UPDATE public.users SET vip_redeemed = false WHERE vip_redeemed IS NULL;
UPDATE public.users SET referral_vip_balance = 0 WHERE referral_vip_balance IS NULL;
UPDATE public.users SET trust_score = 0 WHERE trust_score IS NULL;

-- 4) Referral withdrawals + VIP airtime log (tracked only on Paystack success)
CREATE TABLE IF NOT EXISTS public.referral_withdraws (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  amount numeric NOT NULL,
  type text NOT NULL, -- 'vip_airtime' or 'referral_withdraw'
  status text NOT NULL DEFAULT 'success', -- success | pending | failed
  meta jsonb DEFAULT '{}'::jsonb, -- { phone, network, providerRef, providerStatus, paystackResponse }
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT referral_withdraws_pkey PRIMARY KEY (id)
);
CREATE INDEX IF NOT EXISTS idx_referral_withdraws_user_id ON public.referral_withdraws(user_id);
CREATE INDEX IF NOT EXISTS idx_referral_withdraws_type ON public.referral_withdraws(type);

-- 5) Helpful indexes for Approved count (Beginner 30) lookup
CREATE INDEX IF NOT EXISTS idx_users_trust_score ON public.users(trust_score);
CREATE INDEX IF NOT EXISTS idx_referrals_referrer_id ON public.referrals(referrer_id);
CREATE INDEX IF NOT EXISTS idx_referrals_referred_id ON public.referrals(referred_id);

-- 6) Optional: ensure referral_balance + referral_count are in sync helpers (no change, just safety)
-- referral_withdraws is the source of truth for VIP tracking; referral_balance stays as Approved*500
