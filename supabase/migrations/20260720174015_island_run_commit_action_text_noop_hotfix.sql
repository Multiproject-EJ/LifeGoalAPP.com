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
