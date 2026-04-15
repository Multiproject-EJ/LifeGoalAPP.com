-- ============================================================================
-- Fix 1-arg evaluate_due_commitment_contracts wrapper user_id ambiguity
-- ============================================================================
-- Replaces the app-facing auth.uid() wrapper with explicit delegated column
-- projection to avoid ambiguous `user_id` binding in overloaded RPC contexts.

CREATE OR REPLACE FUNCTION public.evaluate_due_commitment_contracts(
  p_max_windows INTEGER DEFAULT 12
)
RETURNS TABLE (
  id TEXT,
  contract_id TEXT,
  user_id UUID,
  window_start TIMESTAMPTZ,
  window_end TIMESTAMPTZ,
  target_count INTEGER,
  actual_count INTEGER,
  grace_days_used INTEGER,
  result TEXT,
  stake_forfeited INTEGER,
  bonus_awarded INTEGER,
  evaluated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_auth_uid UUID := auth.uid();
BEGIN
  IF v_auth_uid IS NULL THEN
    IF auth.role() = 'service_role' THEN
      RAISE EXCEPTION 'Service role must call evaluate_due_commitment_contracts(p_user_id, p_max_windows)';
    END IF;
    RAISE EXCEPTION 'Authentication required';
  END IF;

  RETURN QUERY
  SELECT
    delegated.id,
    delegated.contract_id,
    delegated.user_id,
    delegated.window_start,
    delegated.window_end,
    delegated.target_count,
    delegated.actual_count,
    delegated.grace_days_used,
    delegated.result,
    delegated.stake_forfeited,
    delegated.bonus_awarded,
    delegated.evaluated_at
  FROM public.evaluate_due_commitment_contracts(v_auth_uid, p_max_windows) AS delegated;
END;
$$;

REVOKE ALL ON FUNCTION public.evaluate_due_commitment_contracts(INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.evaluate_due_commitment_contracts(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.evaluate_due_commitment_contracts(INTEGER) TO service_role;

COMMENT ON FUNCTION public.evaluate_due_commitment_contracts(INTEGER)
IS 'Authenticated app wrapper for due contract evaluation. Resolves user identity from auth.uid() and delegates to the two-argument evaluator.';
