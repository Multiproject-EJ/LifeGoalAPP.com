-- Migration: 0222_contract_due_eval_ambiguity_fix
-- Purpose: fix ambiguous column references (Postgres 42702) in
-- public.evaluate_due_commitment_contracts(p_user_id uuid, p_max_windows integer).
-- Note: function logic is intentionally unchanged.
-- Note: performance/timing behavior is intentionally NOT addressed in this migration.

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
AS $function$
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
  v_is_server_context BOOLEAN := auth.uid() IS NULL AND current_user = 'postgres';
  v_is_completing BOOLEAN;
  v_actual_count INTEGER;
  v_new_escalation_level INTEGER;
  v_new_escalation_multiplier NUMERIC;
BEGIN
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'p_user_id is required';
  END IF;

  IF NOT v_is_server_context
     AND auth.uid() IS DISTINCT FROM p_user_id
     AND auth.role() <> 'service_role' THEN
    RAISE EXCEPTION 'Not authorized to evaluate contracts for this user';
  END IF;

  FOR v_contract IN
    SELECT cc.*
    FROM public.commitment_contracts AS cc
    WHERE cc.user_id = p_user_id
      AND cc.status = 'active'
    ORDER BY cc.updated_at ASC
  LOOP
    v_windows_processed := 0;
    v_window_start := v_contract.current_window_start;

    LOOP
      EXIT WHEN v_windows_processed >= GREATEST(1, p_max_windows);

      v_window_end := CASE
        WHEN v_contract.cadence = 'daily' THEN (date_trunc('day', v_window_start) + INTERVAL '1 day' - INTERVAL '1 millisecond')
        ELSE (date_trunc('day', v_window_start) + INTERVAL '7 day' - INTERVAL '1 millisecond')
      END;

      IF v_contract.tracking_mode = 'outcome_only' THEN
        EXIT WHEN v_contract.end_at IS NULL OR v_now < v_contract.end_at;
      ELSE
        EXIT WHEN v_now <= v_window_end;
      END IF;

      IF v_contract.tracking_mode = 'outcome_only' THEN
        v_target_with_grace := v_contract.target_count;
        IF v_contract.self_reported_outcome = 'miss' THEN
          v_result := 'miss';
          v_actual_count := 0;
        ELSE
          v_result := 'success';
          v_actual_count := v_contract.target_count;
        END IF;
      ELSE
        v_target_with_grace := CASE
          WHEN v_contract.contract_type = 'reverse'
            THEN v_contract.target_count + v_contract.grace_days
          ELSE GREATEST(v_contract.target_count - v_contract.grace_days, 0)
        END;

        v_result := CASE
          WHEN v_contract.contract_type = 'reverse'
            THEN CASE WHEN v_contract.current_progress <= v_target_with_grace THEN 'success' ELSE 'miss' END
          ELSE CASE WHEN v_contract.current_progress >= v_target_with_grace THEN 'success' ELSE 'miss' END
        END;

        v_actual_count := v_contract.current_progress;
      END IF;

      v_success_streak := 0;
      FOR v_recent_eval IN
        SELECT cce.result
        FROM public.commitment_contract_evaluations AS cce
        WHERE cce.contract_id = v_contract.id
        ORDER BY cce.evaluated_at DESC
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

      v_is_completing := (
        v_contract.end_at IS NOT NULL
        AND v_window_end >= v_contract.end_at
        AND v_result = 'success'
      );

      v_stake_forfeited := CASE WHEN v_result = 'miss' THEN v_contract.stake_amount ELSE 0 END;

      v_bonus_awarded := CASE
        WHEN v_result = 'success'
        THEN GREATEST(1, FLOOR(v_contract.stake_amount * 0.1 * v_multiplier)::INTEGER)
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
        v_actual_count,
        0,
        v_result,
        v_stake_forfeited,
        v_bonus_awarded,
        v_now
      );

      INSERT INTO public.user_reputation_scores AS urs (
        user_id,
        contracts_started,
        contracts_completed,
        contracts_failed,
        reliability_rating,
        updated_at
      )
      VALUES (
        p_user_id,
        0,
        CASE WHEN v_result = 'success' THEN 1 ELSE 0 END,
        CASE WHEN v_result = 'miss' THEN 1 ELSE 0 END,
        CASE WHEN v_result = 'success' THEN 1.0 ELSE 0.0 END,
        NOW()
      )
      ON CONFLICT ON CONSTRAINT user_reputation_scores_pkey DO UPDATE SET
        contracts_completed = urs.contracts_completed
          + CASE WHEN v_result = 'success' THEN 1 ELSE 0 END,
        contracts_failed = urs.contracts_failed
          + CASE WHEN v_result = 'miss' THEN 1 ELSE 0 END,
        sacred_contracts_kept = urs.sacred_contracts_kept
          + CASE WHEN v_contract.is_sacred AND v_result = 'success' THEN 1 ELSE 0 END,
        updated_at = NOW();

      RETURN QUERY
      SELECT
        v_eval_id,
        v_contract.id,
        p_user_id,
        v_window_start,
        v_window_end,
        v_contract.target_count,
        v_actual_count,
        0,
        v_result,
        v_stake_forfeited,
        v_bonus_awarded,
        v_now;

    END LOOP;
  END LOOP;
END;
$function$;
