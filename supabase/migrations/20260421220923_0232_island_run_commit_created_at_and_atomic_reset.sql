-- Fix first-time Island Run runtime-row creation and provide an atomic reset RPC.

CREATE OR REPLACE FUNCTION public.island_run_commit_action(
  p_device_session_id text,
  p_expected_runtime_version bigint,
  p_action_type text,
  p_action_payload jsonb,
  p_client_action_id text DEFAULT NULL::text
)
RETURNS TABLE (
  status text,
  runtime_version bigint,
  latest_state jsonb,
  server_message text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_existing public.island_run_runtime_state%rowtype;
  v_next public.island_run_runtime_state%rowtype;
  v_now timestamptz := now();
  v_expected bigint := greatest(0, coalesce(p_expected_runtime_version, 0));
  v_existing_log public.island_run_action_log%rowtype;
  v_response jsonb;
  v_tmp_status text;
  v_tmp_version bigint;
  v_tmp_state jsonb;
BEGIN
  IF v_user_id IS NULL AND auth.role() <> 'service_role' THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF p_device_session_id IS NULL OR char_length(trim(p_device_session_id)) = 0 THEN
    RETURN QUERY SELECT 'invalid'::text, 0::bigint, NULL::jsonb, 'device_session_id is required'::text;
    RETURN;
  END IF;

  IF coalesce(nullif(trim(p_action_type), ''), 'runtime_snapshot_upsert') <> 'runtime_snapshot_upsert' THEN
    RETURN QUERY SELECT 'invalid'::text, 0::bigint, NULL::jsonb, 'Unsupported action_type'::text;
    RETURN;
  END IF;

  IF p_client_action_id IS NOT NULL AND char_length(trim(p_client_action_id)) > 0 THEN
    SELECT *
      INTO v_existing_log
      FROM public.island_run_action_log
     WHERE user_id = v_user_id
       AND client_action_id = p_client_action_id
     LIMIT 1;

    IF FOUND THEN
      v_tmp_status  := coalesce((v_existing_log).status, 'duplicate');
      v_tmp_version := coalesce((v_existing_log).applied_runtime_version, 0);
      v_tmp_state   := (v_existing_log).response_json -> 'latest_state';
      RETURN QUERY
      SELECT
        v_tmp_status::text,
        v_tmp_version::bigint,
        v_tmp_state::jsonb,
        'Duplicate action id; returning cached response.'::text;
      RETURN;
    END IF;
  END IF;

  SELECT *
    INTO v_existing
    FROM public.island_run_runtime_state
   WHERE user_id = v_user_id
   FOR UPDATE;

  IF NOT FOUND THEN
    IF v_expected <> 0 THEN
      RETURN QUERY SELECT 'conflict'::text, 0::bigint, NULL::jsonb, 'Runtime row missing for expected version.'::text;
      RETURN;
    END IF;

    v_next := jsonb_populate_record(NULL::public.island_run_runtime_state, coalesce(p_action_payload, '{}'::jsonb));
  ELSE
    IF coalesce(v_existing.runtime_version, 0) <> v_expected THEN
      v_tmp_version := coalesce((v_existing).runtime_version, 0);
      v_tmp_state   := to_jsonb(v_existing);
      RETURN QUERY
      SELECT
        'conflict'::text,
        v_tmp_version::bigint,
        v_tmp_state,
        'Runtime version mismatch.'::text;
      RETURN;
    END IF;

    v_next := jsonb_populate_record(v_existing, coalesce(p_action_payload, '{}'::jsonb));
    DELETE FROM public.island_run_runtime_state WHERE user_id = v_user_id;
  END IF;

  v_next.user_id := v_user_id;
  v_next.runtime_version := v_expected + 1;
  v_next.created_at := coalesce(v_next.created_at, v_now);
  v_next.last_writer_device_session_id := trim(p_device_session_id);
  v_next.updated_at := v_now;

  INSERT INTO public.island_run_runtime_state
  SELECT (v_next).*;

  v_response := jsonb_build_object(
    'status', 'applied',
    'runtime_version', v_next.runtime_version,
    'latest_state', to_jsonb(v_next),
    'server_message', 'Action applied.'
  );

  INSERT INTO public.island_run_action_log (
    user_id,
    device_session_id,
    client_action_id,
    action_type,
    expected_runtime_version,
    applied_runtime_version,
    status,
    payload_json,
    response_json
  ) VALUES (
    v_user_id,
    trim(p_device_session_id),
    p_client_action_id,
    'runtime_snapshot_upsert',
    v_expected,
    v_next.runtime_version,
    'applied',
    coalesce(p_action_payload, '{}'::jsonb),
    v_response
  );

  v_tmp_version := v_next.runtime_version;
  v_tmp_state   := to_jsonb(v_next);

  RETURN QUERY
  SELECT
    'applied'::text,
    v_tmp_version::bigint,
    v_tmp_state,
    'Action applied.'::text;
END;
$$;

REVOKE ALL ON FUNCTION public.island_run_commit_action(text, bigint, text, jsonb, text) FROM public;
REVOKE EXECUTE ON FUNCTION public.island_run_commit_action(text, bigint, text, jsonb, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.island_run_commit_action(text, bigint, text, jsonb, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.island_run_commit_action(text, bigint, text, jsonb, text) TO service_role;

CREATE OR REPLACE FUNCTION public.island_run_reset_progress(
  p_device_session_id text,
  p_expected_runtime_version bigint,
  p_reset_payload jsonb,
  p_client_action_id text DEFAULT NULL::text
)
RETURNS TABLE (
  status text,
  runtime_version bigint,
  latest_state jsonb,
  server_message text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_commit record;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT *
    INTO v_commit
    FROM public.island_run_commit_action(
      p_device_session_id,
      p_expected_runtime_version,
      'runtime_snapshot_upsert',
      p_reset_payload,
      p_client_action_id
    );

  IF v_commit.status <> 'applied' THEN
    RETURN QUERY
    SELECT
      v_commit.status::text,
      v_commit.runtime_version::bigint,
      v_commit.latest_state::jsonb,
      v_commit.server_message::text;
    RETURN;
  END IF;

  UPDATE public.gamification_profiles
     SET total_xp = 0,
         current_level = 1,
         updated_at = now()
   WHERE user_id = auth.uid();

  RETURN QUERY
  SELECT
    v_commit.status::text,
    v_commit.runtime_version::bigint,
    v_commit.latest_state::jsonb,
    'Island Run progress and XP reset atomically.'::text;
END;
$$;

REVOKE ALL ON FUNCTION public.island_run_reset_progress(text, bigint, jsonb, text) FROM public;
GRANT EXECUTE ON FUNCTION public.island_run_reset_progress(text, bigint, jsonb, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.island_run_reset_progress(text, bigint, jsonb, text) TO service_role;

COMMENT ON FUNCTION public.island_run_reset_progress(text, bigint, jsonb, text) IS
  'Atomically commits a fresh Island Run runtime snapshot and resets XP/current level for the authenticated user.';
