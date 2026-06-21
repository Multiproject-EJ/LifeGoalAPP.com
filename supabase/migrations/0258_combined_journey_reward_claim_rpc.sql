-- ============================================================
-- COMBINED JOURNEY REWARD CLAIM RPC
-- Migration 0258: Server-authoritative, idempotent claim of a
--   Combined Journey Level threshold chest (feature slice R4).
--
-- Builds on 0257 (the claims ledger). The reward kind/amount is
-- resolved here in SQL from the threshold level alone, so clients
-- cannot choose their own reward — they only say which threshold
-- they are claiming. Idempotency is enforced by the ledger's
-- PRIMARY KEY (user_id, threshold_level) via ON CONFLICT DO NOTHING.
--
-- This mirrors combinedJourneyRewardLadder.ts exactly:
--   even threshold -> dice,    amount = 10 + 5 * floor(level / 5)
--   odd  threshold -> essence, amount =  5 + 3 * floor(level / 5)
-- Keep the two in lockstep when the ladder changes.
-- ============================================================

CREATE OR REPLACE FUNCTION public.claim_combined_journey_reward(p_threshold_level INTEGER)
RETURNS TABLE(claimed BOOLEAN, reward_kind TEXT, reward_amount INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_band INTEGER;
  v_kind TEXT;
  v_amount INTEGER;
  v_inserted BOOLEAN := false;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF p_threshold_level IS NULL OR p_threshold_level < 1 THEN
    RAISE EXCEPTION 'threshold_level must be >= 1';
  END IF;

  -- Deterministic reward resolution (mirror of combinedJourneyRewardLadder.ts).
  v_band := p_threshold_level / 5; -- integer floor division for positive values
  IF p_threshold_level % 2 = 0 THEN
    v_kind := 'dice';
    v_amount := 10 + 5 * v_band;
  ELSE
    v_kind := 'essence';
    v_amount := 5 + 3 * v_band;
  END IF;

  INSERT INTO public.combined_journey_reward_claims (user_id, threshold_level, reward_kind, reward_amount)
  VALUES (v_user_id, p_threshold_level, v_kind, v_amount)
  ON CONFLICT (user_id, threshold_level) DO NOTHING
  RETURNING true INTO v_inserted;

  IF COALESCE(v_inserted, false) THEN
    RETURN QUERY SELECT true, v_kind, v_amount;
    RETURN;
  END IF;

  -- Already claimed: return the previously granted reward so callers stay idempotent.
  RETURN QUERY
    SELECT false, c.reward_kind, c.reward_amount
    FROM public.combined_journey_reward_claims c
    WHERE c.user_id = v_user_id
      AND c.threshold_level = p_threshold_level;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_combined_journey_reward(INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.claim_combined_journey_reward(INTEGER) TO authenticated;

COMMENT ON FUNCTION public.claim_combined_journey_reward(INTEGER) IS
  'Idempotently claims one Combined Journey Level threshold chest. Resolves the reward server-side from the threshold level and records it once per (user, threshold_level). Returns claimed=false with the existing reward when already claimed.';
