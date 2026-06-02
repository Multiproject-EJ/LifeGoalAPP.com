-- ========================================================
-- DAILY SPIN HABIT BONUS CLAIMS
-- Migration 0247: Server-idempotent habit bonus spin gate
-- ========================================================

CREATE TABLE IF NOT EXISTS public.daily_spin_habit_bonus_claims (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  claim_date DATE NOT NULL,
  spins_awarded INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, claim_date)
);

CREATE INDEX IF NOT EXISTS idx_daily_spin_habit_bonus_claims_created_at
  ON public.daily_spin_habit_bonus_claims(created_at DESC);

ALTER TABLE public.daily_spin_habit_bonus_claims ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "own_daily_spin_habit_bonus_claims_select" ON public.daily_spin_habit_bonus_claims;
CREATE POLICY "own_daily_spin_habit_bonus_claims_select" ON public.daily_spin_habit_bonus_claims
  FOR SELECT USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.claim_daily_spin_habit_bonus(p_claim_date DATE DEFAULT CURRENT_DATE)
RETURNS TABLE(claimed BOOLEAN, spins_available INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_inserted BOOLEAN := false;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  INSERT INTO public.daily_spin_habit_bonus_claims (user_id, claim_date, spins_awarded)
  VALUES (v_user_id, p_claim_date, 1)
  ON CONFLICT (user_id, claim_date) DO NOTHING
  RETURNING true INTO v_inserted;

  IF COALESCE(v_inserted, false) THEN
    INSERT INTO public.daily_spin_state (user_id, spins_available, total_spins_used)
    VALUES (v_user_id, 1, 0)
    ON CONFLICT (user_id) DO UPDATE
      SET spins_available = LEAST(
            2,
            (CASE
              WHEN (public.daily_spin_state.updated_at AT TIME ZONE 'UTC')::date <> p_claim_date
                THEN 1
              ELSE public.daily_spin_state.spins_available
            END) + 1
          ),
          updated_at = now()
    RETURNING public.daily_spin_state.spins_available INTO spins_available;

    RETURN QUERY SELECT true, spins_available;
    RETURN;
  END IF;

  SELECT public.daily_spin_state.spins_available
    INTO spins_available
    FROM public.daily_spin_state
    WHERE public.daily_spin_state.user_id = v_user_id;

  RETURN QUERY SELECT false, COALESCE(spins_available, 0);
END;
$$;

REVOKE ALL ON FUNCTION public.claim_daily_spin_habit_bonus(DATE) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.claim_daily_spin_habit_bonus(DATE) TO authenticated;

COMMENT ON TABLE public.daily_spin_habit_bonus_claims IS 'Idempotency ledger for the once-per-day habit completion bonus spin.';
COMMENT ON FUNCTION public.claim_daily_spin_habit_bonus(DATE) IS 'Claims the habit bonus spin once per user/date and updates daily_spin_state atomically.';
