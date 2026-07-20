-- Incident guardrails after the July 2026 runaway-write investigation.
--
-- 1. Runtime snapshots that only change server bookkeeping are true no-ops.
-- 2. Action-log rows contain only changed gameplay fields, not two full state copies.
-- 3. Contract evaluations cannot duplicate one contract window.
-- 4. Retention/engagement insights are aggregated into a bounded daily table.

CREATE UNIQUE INDEX IF NOT EXISTS commitment_contract_evaluations_window_unique
  ON public.commitment_contract_evaluations (contract_id, window_start, window_end);


-- Restore the complete evaluator body that migration 0222 accidentally
-- truncated. The missing contract advance/counter caused an unbounded loop.
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
#variable_conflict use_column
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
  -- v3 locals
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

  -- Serialise evaluators per user. Together with the unique window index this
  -- makes an accidental concurrent sweep unable to double-award a window.
  PERFORM pg_advisory_xact_lock(hashtextextended(p_user_id::TEXT, 0));

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
        -- Reverse contracts: lower/equal is better and grace expands the ceiling.
        -- Normal contracts: higher/equal is better and grace lowers required count.
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
        v_actual_count,
        CASE
          WHEN v_contract.tracking_mode = 'outcome_only' THEN 0
          WHEN v_contract.contract_type = 'reverse'
            THEN LEAST(v_contract.grace_days, GREATEST(v_actual_count - v_contract.target_count, 0))
          ELSE LEAST(v_actual_count, v_contract.grace_days)
        END,
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
        v_actual_count,
        CASE
          WHEN v_contract.tracking_mode = 'outcome_only' THEN 0
          WHEN v_contract.contract_type = 'reverse'
            THEN LEAST(v_contract.grace_days, GREATEST(v_actual_count - v_contract.target_count, 0))
          ELSE LEAST(v_actual_count, v_contract.grace_days)
        END,
        v_result,
        v_stake_forfeited,
        v_bonus_awarded,
        v_now;

      SELECT *
      INTO v_contract
      FROM public.commitment_contracts
      WHERE id = v_contract.id;

      v_windows_processed := v_windows_processed + 1;
      EXIT WHEN v_contract.status <> 'active';
      v_window_start := v_contract.current_window_start;
    END LOOP;
  END LOOP;
END;
$$;


-- Remove the obsolete UUID overload. The action-log column and browser client
-- both use text idempotency keys; leaving both overloads also makes PostgREST
-- function resolution ambiguous.
DROP FUNCTION IF EXISTS public.island_run_commit_action(TEXT, BIGINT, TEXT, JSONB, UUID);

CREATE OR REPLACE FUNCTION public.island_run_commit_action(
  p_device_session_id TEXT,
  p_expected_runtime_version BIGINT,
  p_action_type TEXT,
  p_action_payload JSONB,
  p_client_action_id TEXT DEFAULT NULL
)
RETURNS TABLE (
  status TEXT,
  runtime_version BIGINT,
  latest_state JSONB,
  server_message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_existing public.island_run_runtime_state%ROWTYPE;
  v_next public.island_run_runtime_state%ROWTYPE;
  v_now TIMESTAMPTZ := NOW();
  v_expected BIGINT := GREATEST(0, COALESCE(p_expected_runtime_version, 0));
  v_existing_log public.island_run_action_log%ROWTYPE;
  v_existing_gameplay JSONB;
  v_next_gameplay JSONB;
  v_changed_payload JSONB := '{}'::JSONB;
  v_tmp_status TEXT;
  v_tmp_version BIGINT;
  v_tmp_state JSONB;
BEGIN
  IF v_user_id IS NULL AND auth.role() <> 'service_role' THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF p_device_session_id IS NULL OR CHAR_LENGTH(TRIM(p_device_session_id)) = 0 THEN
    RETURN QUERY SELECT 'invalid'::TEXT, 0::BIGINT, NULL::JSONB, 'device_session_id is required'::TEXT;
    RETURN;
  END IF;

  IF COALESCE(NULLIF(TRIM(p_action_type), ''), 'runtime_snapshot_upsert') <> 'runtime_snapshot_upsert' THEN
    RETURN QUERY SELECT 'invalid'::TEXT, 0::BIGINT, NULL::JSONB, 'Unsupported action_type'::TEXT;
    RETURN;
  END IF;

  IF p_client_action_id IS NOT NULL THEN
    SELECT log_row.*
      INTO v_existing_log
      FROM public.island_run_action_log AS log_row
     WHERE log_row.user_id = v_user_id
       AND log_row.client_action_id = p_client_action_id
     LIMIT 1;

    IF FOUND THEN
      SELECT state_row.*
        INTO v_existing
        FROM public.island_run_runtime_state AS state_row
       WHERE state_row.user_id = v_user_id;

      v_tmp_status := COALESCE(v_existing_log.status, 'duplicate');
      v_tmp_version := COALESCE(v_existing.runtime_version, v_existing_log.applied_runtime_version, 0);
      v_tmp_state := CASE WHEN v_existing.user_id IS NULL THEN NULL ELSE TO_JSONB(v_existing) END;
      RETURN QUERY SELECT
        v_tmp_status,
        v_tmp_version,
        v_tmp_state,
        'Duplicate action id; returning current state.'::TEXT;
      RETURN;
    END IF;
  END IF;

  SELECT state_row.*
    INTO v_existing
    FROM public.island_run_runtime_state AS state_row
   WHERE state_row.user_id = v_user_id
   FOR UPDATE;

  IF NOT FOUND THEN
    IF v_expected <> 0 THEN
      RETURN QUERY SELECT 'conflict'::TEXT, 0::BIGINT, NULL::JSONB, 'Runtime row missing for expected version.'::TEXT;
      RETURN;
    END IF;
    v_next := JSONB_POPULATE_RECORD(NULL::public.island_run_runtime_state, COALESCE(p_action_payload, '{}'::JSONB));
  ELSE
    IF COALESCE(v_existing.runtime_version, 0) <> v_expected THEN
      RETURN QUERY SELECT
        'conflict'::TEXT,
        COALESCE(v_existing.runtime_version, 0),
        TO_JSONB(v_existing),
        'Runtime version mismatch.'::TEXT;
      RETURN;
    END IF;

    v_next := JSONB_POPULATE_RECORD(v_existing, COALESCE(p_action_payload, '{}'::JSONB));
    v_existing_gameplay := TO_JSONB(v_existing) - ARRAY[
      'user_id', 'runtime_version', 'last_writer_device_session_id', 'created_at', 'updated_at'
    ];
    v_next_gameplay := TO_JSONB(v_next) - ARRAY[
      'user_id', 'runtime_version', 'last_writer_device_session_id', 'created_at', 'updated_at'
    ];

    IF v_existing_gameplay = v_next_gameplay THEN
      RETURN QUERY SELECT
        'applied'::TEXT,
        COALESCE(v_existing.runtime_version, 0),
        TO_JSONB(v_existing),
        'No gameplay state changed; snapshot skipped.'::TEXT;
      RETURN;
    END IF;

    SELECT COALESCE(JSONB_OBJECT_AGG(changed.key, changed.value), '{}'::JSONB)
      INTO v_changed_payload
      FROM JSONB_EACH(v_next_gameplay) AS changed(key, value)
     WHERE v_existing_gameplay -> changed.key IS DISTINCT FROM changed.value;
  END IF;

  v_next.user_id := v_user_id;
  v_next.runtime_version := v_expected + 1;
  v_next.last_writer_device_session_id := TRIM(p_device_session_id);
  v_next.updated_at := v_now;

  -- The historical implementation deleted/reinserted on every snapshot. Keep
  -- that schema-flexible write only for real gameplay changes; the no-op guard
  -- above removes the high-frequency churn without hard-coding every evolving
  -- runtime column into this function.
  IF v_existing.user_id IS NOT NULL THEN
    DELETE FROM public.island_run_runtime_state WHERE user_id = v_user_id;
  END IF;

  INSERT INTO public.island_run_runtime_state
  SELECT (v_next).*;

  IF v_existing.user_id IS NULL THEN
    v_changed_payload := TO_JSONB(v_next) - ARRAY[
      'user_id', 'runtime_version', 'last_writer_device_session_id', 'created_at', 'updated_at'
    ];
  END IF;

  INSERT INTO public.island_run_action_log (
    user_id, device_session_id, client_action_id, action_type,
    expected_runtime_version, applied_runtime_version, status,
    payload_json, response_json
  ) VALUES (
    v_user_id, TRIM(p_device_session_id), p_client_action_id, 'runtime_snapshot_upsert',
    v_expected, v_next.runtime_version, 'applied', v_changed_payload,
    JSONB_BUILD_OBJECT(
      'status', 'applied',
      'runtime_version', v_next.runtime_version,
      'changed_fields', COALESCE(
        (SELECT JSONB_AGG(keys.key) FROM JSONB_OBJECT_KEYS(v_changed_payload) AS keys(key)),
        '[]'::JSONB
      )
    )
  );

  RETURN QUERY SELECT 'applied'::TEXT, v_next.runtime_version, TO_JSONB(v_next), 'Action applied.'::TEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.island_run_commit_action(TEXT, BIGINT, TEXT, JSONB, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.island_run_commit_action(TEXT, BIGINT, TEXT, JSONB, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.island_run_commit_action(TEXT, BIGINT, TEXT, JSONB, TEXT) TO service_role;

CREATE TABLE IF NOT EXISTS public.telemetry_user_activity_daily (
  day DATE NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_count INTEGER NOT NULL DEFAULT 0,
  first_seen_at TIMESTAMPTZ NOT NULL,
  last_seen_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (day, user_id)
);

ALTER TABLE public.telemetry_user_activity_daily ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.telemetry_user_activity_daily FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.telemetry_user_activity_daily TO service_role;

CREATE OR REPLACE FUNCTION public.rollup_telemetry_user_activity(p_lookback_days INTEGER DEFAULT 3)
RETURNS VOID
LANGUAGE SQL
SECURITY DEFINER
SET search_path = ''
AS $$
  INSERT INTO public.telemetry_user_activity_daily (
    day, user_id, event_count, first_seen_at, last_seen_at, updated_at
  )
  SELECT
    (events.occurred_at AT TIME ZONE 'utc')::DATE,
    events.user_id,
    COUNT(*)::INTEGER,
    MIN(events.occurred_at),
    MAX(events.occurred_at),
    NOW()
  FROM public.telemetry_events AS events
  WHERE events.occurred_at >= NOW() - MAKE_INTERVAL(days => GREATEST(COALESCE(p_lookback_days, 3), 1))
  GROUP BY 1, 2
  ON CONFLICT (day, user_id) DO UPDATE
  SET event_count = EXCLUDED.event_count,
      first_seen_at = EXCLUDED.first_seen_at,
      last_seen_at = EXCLUDED.last_seen_at,
      updated_at = EXCLUDED.updated_at;
$$;

REVOKE ALL ON FUNCTION public.rollup_telemetry_user_activity(INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rollup_telemetry_user_activity(INTEGER) TO service_role;

CREATE OR REPLACE FUNCTION public.get_admin_telemetry_insights(p_lookback_days INTEGER DEFAULT 30)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_days INTEGER := LEAST(180, GREATEST(7, COALESCE(p_lookback_days, 30)));
  v_result JSONB;
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.admin_users AS admin_row
    WHERE admin_row.user_id = auth.uid()
      AND admin_row.active = TRUE
  ) THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;

  WITH activity AS (
    SELECT daily.user_id, COUNT(DISTINCT daily.day)::INTEGER AS active_days
    FROM public.telemetry_user_activity_daily AS daily
    WHERE daily.day >= CURRENT_DATE - (v_days - 1)
    GROUP BY daily.user_id
  ), last_seen AS (
    SELECT daily.user_id, MAX(daily.day) AS last_active_day
    FROM public.telemetry_user_activity_daily AS daily
    WHERE daily.day >= CURRENT_DATE - 30
    GROUP BY daily.user_id
  ), counts AS (
    SELECT rollup.event_type, COALESCE(SUM(rollup.event_count), 0)::BIGINT AS event_count
    FROM public.telemetry_daily_rollups AS rollup
    WHERE rollup.day >= CURRENT_DATE - (v_days - 1)
    GROUP BY rollup.event_type
  ), scalar AS (
    SELECT
      (SELECT COUNT(*) FROM activity)::INTEGER AS active_users,
      (SELECT COUNT(*) FROM activity WHERE active_days >= 2)::INTEGER AS returning_users,
      (SELECT COUNT(*) FROM last_seen WHERE last_active_day < CURRENT_DATE - 6)::INTEGER AS lapsed_users,
      COALESCE((SELECT event_count FROM counts WHERE event_type = 'habit_done_ish_completed'), 0) AS habit_successes,
      COALESCE((SELECT SUM(event_count) FROM counts WHERE event_type IN ('habit_skipped', 'habit_missed')), 0) AS habit_struggles,
      COALESCE((SELECT event_count FROM counts WHERE event_type = 'habit_time_limited_offer_scheduled'), 0) AS offers_scheduled,
      COALESCE((SELECT event_count FROM counts WHERE event_type = 'habit_time_limited_offer_claimed'), 0) AS offers_claimed,
      COALESCE((SELECT event_count FROM counts WHERE event_type = 'runtime_state_hydrated'), 0) AS hydrations,
      COALESCE((SELECT event_count FROM counts WHERE event_type = 'runtime_state_hydration_failed'), 0) AS hydration_failures,
      COALESCE((SELECT event_count FROM counts WHERE event_type = 'island_run_roll_completed'), 0) AS island_rolls,
      COALESCE((SELECT event_count FROM counts WHERE event_type = 'island_run_roll_blocked'), 0) AS island_roll_blocks
  )
  SELECT JSONB_BUILD_OBJECT(
    'lookback_days', v_days,
    'active_users', scalar.active_users,
    'returning_users', scalar.returning_users,
    'lapsed_users', scalar.lapsed_users,
    'habit_successes', scalar.habit_successes,
    'habit_struggles', scalar.habit_struggles,
    'offers_scheduled', scalar.offers_scheduled,
    'offers_claimed', scalar.offers_claimed,
    'hydrations', scalar.hydrations,
    'hydration_failures', scalar.hydration_failures,
    'island_rolls', scalar.island_rolls,
    'island_roll_blocks', scalar.island_roll_blocks
  ) INTO v_result
  FROM scalar;

  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.get_admin_telemetry_insights(INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_admin_telemetry_insights(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_admin_telemetry_insights(INTEGER) TO service_role;

SELECT public.rollup_telemetry_user_activity(365);

DO $$
BEGIN
  IF TO_REGNAMESPACE('cron') IS NOT NULL THEN
    PERFORM cron.unschedule(jobid)
    FROM cron.job
    WHERE jobname IN ('telemetry-user-activity-rollup', 'telemetry-user-activity-retention');

    PERFORM cron.schedule(
      'telemetry-user-activity-rollup',
      '50 2 * * *',
      $job$SELECT public.rollup_telemetry_user_activity(3);$job$
    );

    PERFORM cron.schedule(
      'telemetry-user-activity-retention',
      '25 3 * * *',
      $job$DELETE FROM public.telemetry_user_activity_daily WHERE day < CURRENT_DATE - 180;$job$
    );
  END IF;
END;
$$;
