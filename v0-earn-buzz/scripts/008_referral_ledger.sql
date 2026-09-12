-- 008_referral_ledger: consumption ledger + amount scale normalization
-- Per-referral reward is ₦500. Legacy rows may carry amount=10000; code normalizes via min(amount,500).
ALTER TABLE public.referrals ADD COLUMN IF NOT EXISTS consumed boolean DEFAULT false;
ALTER TABLE public.referrals ALTER COLUMN amount SET DEFAULT 500;
CREATE INDEX IF NOT EXISTS idx_referrals_referrer_consumed ON public.referrals(referrer_id, consumed);
