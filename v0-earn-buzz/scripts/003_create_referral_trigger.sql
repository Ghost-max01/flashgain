-- ============================================
-- REFERRAL SYSTEM: count immediately, pay on Beginner (trust_score >=30)
-- ============================================
-- referrals.amount = 500 per referral
-- referral_count = total referrals (immediate)
-- referral_balance = approved only (pending stays in referrals.processed=false)
-- potential/pending earnings = pending_count * 500  (shown separately, not withdrawable)

-- 1) Handle new referral: increment count only; credit balance ONLY if referred user already >=30
CREATE OR REPLACE FUNCTION public.handle_new_referral()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  referred_trust INT;
BEGIN
  -- Always increment referral_count immediately
  UPDATE public.users
  SET referral_count = COALESCE(referral_count, 0) + 1
  WHERE id = NEW.referrer_id;

  -- Check referred user's current trust_score
  SELECT COALESCE(trust_score, 0) INTO referred_trust
  FROM public.users WHERE id = NEW.referred_id;

  IF COALESCE(referred_trust, 0) >= 30 THEN
    -- Already Beginner+ -> approved immediately
    UPDATE public.users
    SET referral_balance = COALESCE(referral_balance, 0) + COALESCE(NEW.amount, 500)
    WHERE id = NEW.referrer_id;

    UPDATE public.referrals
    SET processed = TRUE, processed_at = NOW()
    WHERE id = NEW.id;
  ELSE
    -- Pending: stays not withdrawable
    UPDATE public.referrals
    SET processed = FALSE, processed_at = NULL
    WHERE id = NEW.id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_referral_created ON public.referrals;
CREATE TRIGGER on_referral_created
  AFTER INSERT ON public.referrals
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_referral();

-- 2) When a referred user reaches Beginner (trust_score 0-29 -> 30+), promote all his pending referrals
CREATE OR REPLACE FUNCTION public.handle_trust_promotion()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  pending RECORD;
BEGIN
  -- Only when crossing 30 threshold
  IF COALESCE(NEW.trust_score,0) >= 30 AND COALESCE(OLD.trust_score,0) < 30 THEN
    FOR pending IN
      SELECT id, referrer_id, amount FROM public.referrals
      WHERE referred_id = NEW.id AND COALESCE(processed,false) = false
    LOOP
      UPDATE public.users
      SET referral_balance = COALESCE(referral_balance,0) + COALESCE(pending.amount,500)
      WHERE id = pending.referrer_id;

      UPDATE public.referrals
      SET processed = TRUE, processed_at = NOW()
      WHERE id = pending.id;
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_user_trust_promotion ON public.users;
CREATE TRIGGER on_user_trust_promotion
  AFTER UPDATE OF trust_score ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_trust_promotion();

-- 3) Legacy no-op kept for compatibility
CREATE OR REPLACE FUNCTION public.process_pending_referrals_on_balance_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS on_user_balance_update ON public.users;
CREATE TRIGGER on_user_balance_update
  AFTER UPDATE OF balance ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.process_pending_referrals_on_balance_update();
