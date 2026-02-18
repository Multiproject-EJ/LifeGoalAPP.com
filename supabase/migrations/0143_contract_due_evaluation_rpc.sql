-- ========================================================
-- Commitment Contracts due-window RPC evaluation (Slice P)
-- ========================================================

CREATE OR REPLACE FUNCTION public.evaluate_due_commitment_contracts(
  p_user_id UUID,
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
  v_now TIMESTAMPTZ := NOW();
  v_contract RECORD;
  v_window_start TIMESTAMPTZ;
  v_window_end TIMESTAMPTZ;
  v_windows_processed INTEGER;
  v_target_with_grace INTEGER;
  v_result TEXT;
  v_stake_forfeited INTEGER;
  v_bonus_awarded INTEGER;
  v_profile RECORD;
  v_success_streak INTEGER;
  v_success_streak_after INTEGER;
  v_multiplier NUMERIC;
  v_eval_id TEXT;
  v_recent_eval RECORD;
BEGIN
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'p_user_id is required';
  END IF;

  IF auth.uid() IS DISTINCT FROM p_user_id AND auth.role() <> 'service_role' THEN
    RAISE EXCEPTION 'Not authorized to evaluate contracts for this user';
  END IF;

  FOR v_contract IN
    SELECT *
    FROM public.commitment_contracts
    WHERE user_id = p_user_id
      AND status = 'active'
    ORDER BY updated_at ASC
  LOOP
    v_windows_processed := 0;
    v_window_start := v_contract.current_window_start;

    LOOP
      EXIT WHEN v_windows_processed >= GREATEST(1, p_max_windows);

      v_window_end := CASE
        WHEN v_contract.cadence = 'daily' THEN (date_trunc('day', v_window_start) + INTERVAL '1 day' - INTERVAL '1 millisecond')
        ELSE (date_trunc('day', v_window_start) + INTERVAL '7 day' - INTERVAL '1 millisecond')
      END;

      EXIT WHEN v_now <= v_window_end;

      v_target_with_grace := GREATEST(v_contract.target_count - v_contract.grace_days, 0);
      v_result := CASE WHEN v_contract.current_progress >= v_target_with_grace THEN 'success' ELSE 'miss' END;

      v_success_streak := 0;
      FOR v_recent_eval IN
        SELECT result
        FROM public.commitment_contract_evaluations
        WHERE contract_id = v_contract.id
        ORDER BY evaluated_at DESC
      LOOP
        EXIT WHEN v_recent_eval.result <> 'success';
        v_success_streak := v_success_streak + 1;
      END LOOP;

      v_success_streak_after := CASE WHEN v_result = 'success' THEN v_success_streak + 1 ELSE 0 END;
      v_multiplier := CASE
        WHEN v_success_streak_after >= 8 THEN 2
        WHEN v_success_streak_after >= 5 THEN 1.5
        WHEN v_success_streak_after >= 3 THEN 1.25
        ELSE 1
      END;

      v_stake_forfeited := CASE WHEN v_result = 'miss' THEN v_contract.stake_amount ELSE 0 END;
      v_bonus_awarded := CASE
        WHEN v_result = 'success' THEN GREATEST(1, FLOOR(v_contract.stake_amount * 0.1 * v_multiplier)::INTEGER)
        ELSE 0
      END;

      v_eval_id := 'evaluation-' || gen_random_uuid()::TEXT;

      INSERT INTO public.commitment_contract_evaluations (
        id,
        contract_id,
        user_id,
        window_start,
        window_end,
        target_count,
        actual_count,
        grace_days_used,
        result,
        stake_forfeited,
        bonus_awarded,
        evaluated_at
      ) VALUES (
        v_eval_id,
        v_contract.id,
        p_user_id,
        v_window_start,
        v_window_end,
        v_contract.target_count,
        v_contract.current_progress,
        LEAST(v_contract.current_progress, v_contract.grace_days),
        v_result,
        v_stake_forfeited,
        v_bonus_awarded,
        v_now
      );

      SELECT total_points, COALESCE(zen_tokens, 0) AS zen_tokens
      INTO v_profile
      FROM public.gamification_profiles
      WHERE user_id = p_user_id
      FOR UPDATE;

      IF FOUND THEN
        IF v_contract.stake_type = 'gold' THEN
          UPDATE public.gamification_profiles
          SET total_points = GREATEST(0, v_profile.total_points - v_stake_forfeited) + v_bonus_awarded,
              updated_at = NOW()
          WHERE user_id = p_user_id;
        ELSE
          UPDATE public.gamification_profiles
          SET zen_tokens = GREATEST(0, v_profile.zen_tokens - v_stake_forfeited) + v_bonus_awarded,
              updated_at = NOW()
          WHERE user_id = p_user_id;
        END IF;
      END IF;

      UPDATE public.commitment_contracts
      SET current_progress = 0,
          target_count = CASE
            WHEN recovery_mode = 'gentle_ramp' AND v_result = 'success' THEN COALESCE(recovery_original_target_count, target_count)
            ELSE target_count
          END,
          recovery_mode = CASE
            WHEN recovery_mode = 'gentle_ramp' AND v_result = 'success' THEN NULL
            ELSE recovery_mode
          END,
          recovery_original_target_count = CASE
            WHEN recovery_mode = 'gentle_ramp' AND v_result = 'success' THEN NULL
            ELSE recovery_original_target_count
          END,
          recovery_activated_at = CASE
            WHEN recovery_mode = 'gentle_ramp' AND v_result = 'success' THEN NULL
            ELSE recovery_activated_at
          END,
          current_window_start = CASE
            WHEN v_contract.cadence = 'daily' THEN date_trunc('day', v_window_end + INTERVAL '1 second')
            ELSE date_trunc('week', v_window_end + INTERVAL '1 second')
          END,
          miss_count = miss_count + CASE WHEN v_result = 'miss' THEN 1 ELSE 0 END,
          success_count = success_count + CASE WHEN v_result = 'success' THEN 1 ELSE 0 END,
          last_evaluated_at = v_now,
          updated_at = NOW()
      WHERE id = v_contract.id;

      RETURN QUERY
      SELECT
        v_eval_id,
        v_contract.id,
        p_user_id,
        v_window_start,
        v_window_end,
        v_contract.target_count,
        v_contract.current_progress,
        LEAST(v_contract.current_progress, v_contract.grace_days),
        v_result,
        v_stake_forfeited,
        v_bonus_awarded,
        v_now;

      SELECT *
      INTO v_contract
      FROM public.commitment_contracts
      WHERE id = v_contract.id;

      v_window_start := v_contract.current_window_start;
      v_windows_processed := v_windows_processed + 1;
    END LOOP;
  END LOOP;
END;
$$;

REVOKE ALL ON FUNCTION public.evaluate_due_commitment_contracts(UUID, INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.evaluate_due_commitment_contracts(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.evaluate_due_commitment_contracts(UUID, INTEGER) TO service_role;

COMMENT ON FUNCTION public.evaluate_due_commitment_contracts(UUID, INTEGER)
IS 'Evaluates all due active commitment contract windows for a user with catch-up support; safe for app heartbeat and server-side schedulers.';
