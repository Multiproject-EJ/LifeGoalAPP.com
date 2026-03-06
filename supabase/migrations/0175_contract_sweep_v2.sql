-- ========================================================
-- Contract sweep v2 — adds type-aware evaluation logic
-- ========================================================
-- Replaces evaluate_due_commitment_contracts with a v2 that
-- handles all 11 contract types introduced in migration 0174.

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
  v_is_server_context BOOLEAN := auth.uid() IS NULL AND current_user = 'postgres';
  -- v2 locals
  v_is_completing BOOLEAN;
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

      -- -------------------------------------------------------
      -- Determine whether this window also completes the contract
      -- -------------------------------------------------------
      v_is_completing := (
        v_contract.end_at IS NOT NULL
        AND v_window_end >= v_contract.end_at
        AND v_result = 'success'
      );

      -- -------------------------------------------------------
      -- TYPE-SPECIFIC stake / bonus calculation
      -- -------------------------------------------------------

      -- Default (classic / identity / reputation / reverse / future_self / cascading)
      v_stake_forfeited := CASE WHEN v_result = 'miss' THEN v_contract.stake_amount ELSE 0 END;
      v_bonus_awarded := CASE
        WHEN v_result = 'success' THEN GREATEST(1, FLOOR(v_contract.stake_amount * 0.1 * v_multiplier)::INTEGER)
        ELSE 0
      END;

      -- Sacred contracts: apply sacred_penalty_multiplier (default 3.0) to both forfeit and bonus
      IF v_contract.is_sacred THEN
        v_stake_forfeited := CASE
          WHEN v_result = 'miss'
          THEN ROUND(v_contract.stake_amount * COALESCE(v_contract.sacred_penalty_multiplier, 3.0))::INTEGER
          ELSE 0
        END;
        v_bonus_awarded := CASE
          WHEN v_result = 'success'
          THEN GREATEST(1, FLOOR(v_contract.stake_amount * 0.1 * v_multiplier * COALESCE(v_contract.sacred_penalty_multiplier, 3.0))::INTEGER)
          ELSE 0
        END;
      END IF;

      -- Escalation contracts: scale forfeit by escalation_multiplier; update level on miss / reset on success
      IF v_contract.contract_type = 'escalation' THEN
        IF v_result = 'miss' THEN
          v_stake_forfeited := ROUND(v_contract.stake_amount * COALESCE(v_contract.escalation_multiplier, 1.0))::INTEGER;
          -- Compute updated escalation level/multiplier for the UPDATE below
          v_new_escalation_level := LEAST(4, COALESCE(v_contract.escalation_level, 0) + 1);
          v_new_escalation_multiplier := LEAST(3.0, 1.0 + v_new_escalation_level * 0.5);
        ELSE
          -- Success: reset escalation
          v_new_escalation_level := 0;
          v_new_escalation_multiplier := 1.0;
        END IF;
      END IF;

      -- Redemption contracts: no forfeit on miss; assign a redemption quest instead
      IF v_contract.contract_type = 'redemption' AND v_result = 'miss' THEN
        v_stake_forfeited := 0;
      END IF;

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

      -- -------------------------------------------------------
      -- Main contract UPDATE — includes all new type-specific columns
      -- -------------------------------------------------------
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
          -- ---- Escalation type ----
          escalation_level = CASE
            WHEN v_contract.contract_type = 'escalation' THEN v_new_escalation_level
            ELSE escalation_level
          END,
          escalation_multiplier = CASE
            WHEN v_contract.contract_type = 'escalation' THEN v_new_escalation_multiplier
            ELSE escalation_multiplier
          END,
          -- ---- Narrative type: increment rank on success ----
          narrative_rank = CASE
            WHEN v_contract.contract_type = 'narrative' AND v_result = 'success'
            THEN COALESCE(narrative_rank, 0) + 1
            ELSE narrative_rank
          END,
          -- ---- Redemption type: assign quest on miss ----
          redemption_quest_id = CASE
            WHEN v_contract.contract_type = 'redemption' AND v_result = 'miss'
            THEN 'quest-' || gen_random_uuid()::TEXT
            ELSE redemption_quest_id
          END,
          redemption_quest_completed = CASE
            WHEN v_contract.contract_type = 'redemption' AND v_result = 'miss' THEN FALSE
            ELSE redemption_quest_completed
          END,
          -- ---- Future Self: unlock message on completion ----
          future_message_unlocked_at = CASE
            WHEN v_contract.contract_type = 'future_self'
              AND v_is_completing
              AND v_contract.future_message IS NOT NULL
              AND future_message_unlocked_at IS NULL
            THEN NOW()
            ELSE future_message_unlocked_at
          END,
          -- ---- End-date auto-complete ----
          status = CASE
            WHEN v_contract.end_at IS NOT NULL AND v_window_end >= v_contract.end_at
            THEN 'completed'
            ELSE status
          END,
          updated_at = NOW()
      WHERE id = v_contract.id;

      -- -------------------------------------------------------
      -- Cascading contracts: unlock the next contract on completion
      -- -------------------------------------------------------
      IF v_is_completing AND v_contract.unlocks_contract_id IS NOT NULL THEN
        UPDATE public.commitment_contracts
        SET status = 'draft',
            updated_at = NOW()
        WHERE id = v_contract.unlocks_contract_id
          AND status = 'locked';
      END IF;

      -- -------------------------------------------------------
      -- Reputation update (upsert)
      -- -------------------------------------------------------
      -- Reputation update: upsert counts, then recalculate rating + tier
      -- -------------------------------------------------------

      -- Step 1: upsert the contract count increments
      INSERT INTO public.user_reputation_scores (
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
        CASE WHEN v_result = 'miss'    THEN 1 ELSE 0 END,
        CASE WHEN v_result = 'success' THEN 1.0 ELSE 0.0 END,
        NOW()
      )
      ON CONFLICT (user_id) DO UPDATE SET
        contracts_completed = user_reputation_scores.contracts_completed
          + CASE WHEN v_result = 'success' THEN 1 ELSE 0 END,
        contracts_failed = user_reputation_scores.contracts_failed
          + CASE WHEN v_result = 'miss' THEN 1 ELSE 0 END,
        sacred_contracts_kept = user_reputation_scores.sacred_contracts_kept
          + CASE WHEN v_contract.is_sacred AND v_result = 'success' THEN 1 ELSE 0 END,
        updated_at = NOW();

      -- Step 2: recalculate reliability_rating and reliability_tier from updated counts
      -- Computing the ratio once avoids repeating the expression across tier WHEN clauses.
      UPDATE public.user_reputation_scores
      SET reliability_rating = CASE
            WHEN (contracts_completed + contracts_failed) > 0
            THEN contracts_completed::NUMERIC / (contracts_completed + contracts_failed)::NUMERIC
            ELSE 0.0
          END,
          reliability_tier = CASE
            WHEN (contracts_completed + contracts_failed) = 0 THEN 'untested'
            WHEN contracts_completed::NUMERIC / (contracts_completed + contracts_failed)::NUMERIC < 0.3  THEN 'untested'
            WHEN contracts_completed::NUMERIC / (contracts_completed + contracts_failed)::NUMERIC < 0.5  THEN 'apprentice'
            WHEN contracts_completed::NUMERIC / (contracts_completed + contracts_failed)::NUMERIC < 0.7  THEN 'dependable'
            WHEN contracts_completed::NUMERIC / (contracts_completed + contracts_failed)::NUMERIC < 0.85 THEN 'reliable'
            WHEN contracts_completed::NUMERIC / (contracts_completed + contracts_failed)::NUMERIC < 0.95 THEN 'steadfast'
            ELSE 'unbreakable'
          END,
          updated_at = NOW()
      WHERE user_id = p_user_id;

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
