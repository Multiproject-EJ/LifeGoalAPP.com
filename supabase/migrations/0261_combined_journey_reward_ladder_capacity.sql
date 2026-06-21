-- ============================================================
-- COMBINED JOURNEY REWARD LADDER — ADD REROLL CAPACITY
-- Migration 0261: completes the reward ladder with reroll-capacity
--   upgrades (feature slice R7). Replaces the 0259 resolver.
--
-- Mirrors combinedJourneyRewardLadder.ts exactly, in priority order:
--   level % 5 == 0  -> reroll_capacity, amount = 5
--   else level % 3  -> egg,             amount = 1
--   else even       -> dice,            amount = 10 + 5 * floor(level / 5)
--   else odd        -> essence,         amount =  5 + 3 * floor(level / 5)
--
-- Idempotency, auth, and the ledger insert are unchanged. Safe to re-map: the
-- rewards feature is still flag-gated off, so no production claims exist yet.
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
  IF p_threshold_level % 5 = 0 THEN
    v_kind := 'reroll_capacity';
    v_amount := 5;
  ELSIF p_threshold_level % 3 = 0 THEN
    v_kind := 'egg';
    v_amount := 1;
  ELSIF p_threshold_level % 2 = 0 THEN
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
