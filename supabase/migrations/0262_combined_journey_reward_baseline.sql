-- ============================================================
-- COMBINED JOURNEY REWARD BASELINE
-- Migration 0262: per-user launch baseline so existing players
--   only receive chests for levels reached AFTER the feature
--   goes live (feature slice R8).
--
-- The baseline is the player's Combined Journey Level the first
-- time they open the overlay post-launch. Claimable thresholds
-- are then restricted to levels strictly above the baseline, so
-- accumulated pre-launch progress does not dump a pile of chests.
--
-- Set once and never changed (ON CONFLICT DO NOTHING). RLS lets a
-- user read their own baseline; writes happen only via the
-- SECURITY DEFINER ensure RPC.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.combined_journey_reward_baseline (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  baseline_level INTEGER NOT NULL DEFAULT 0 CHECK (baseline_level >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.combined_journey_reward_baseline ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "own_combined_journey_reward_baseline_select" ON public.combined_journey_reward_baseline;
CREATE POLICY "own_combined_journey_reward_baseline_select" ON public.combined_journey_reward_baseline
  FOR SELECT USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.ensure_combined_journey_baseline(p_level INTEGER)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_baseline INTEGER;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  INSERT INTO public.combined_journey_reward_baseline (user_id, baseline_level)
  VALUES (v_user_id, GREATEST(0, COALESCE(p_level, 0)))
  ON CONFLICT (user_id) DO NOTHING;

  SELECT baseline_level INTO v_baseline
    FROM public.combined_journey_reward_baseline
   WHERE user_id = v_user_id;

  RETURN COALESCE(v_baseline, 0);
END;
$$;

REVOKE ALL ON FUNCTION public.ensure_combined_journey_baseline(INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ensure_combined_journey_baseline(INTEGER) TO authenticated;

COMMENT ON TABLE public.combined_journey_reward_baseline IS
  'Per-user Combined Journey Level baseline captured at first post-launch overlay open. Chests are only offered for thresholds above this level.';
COMMENT ON FUNCTION public.ensure_combined_journey_baseline(INTEGER) IS
  'Idempotently records (once) the caller''s journey-level baseline and returns the effective baseline level.';
