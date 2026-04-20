-- Fix: Change client_action_id from uuid to text in island_run_action_log
-- and in the island_run_commit_action RPC.
--
-- The client generates descriptive action IDs of the form
-- "runtime-<userId>-<counter>-<version>-<hash>" which are not valid UUIDs.
-- Passing these to the RPC caused:
--   "invalid input syntax for type uuid: ..."
-- breaking reset-progress and every other runtime snapshot commit.

-- ─── 1. Drop the existing unique constraint (depends on the uuid column) ────
ALTER TABLE public.island_run_action_log
  DROP CONSTRAINT IF EXISTS island_run_action_log_client_action_unique;

-- ─── 2. Alter the column type from uuid to text ────────────────────────────
ALTER TABLE public.island_run_action_log
  ALTER COLUMN client_action_id TYPE text USING client_action_id::text;

-- ─── 3. Re-create the unique constraint on the text column ─────────────────
ALTER TABLE public.island_run_action_log
  ADD CONSTRAINT island_run_action_log_client_action_unique
    UNIQUE (user_id, client_action_id);

-- ─── 4. Drop old RPC signature (uuid) and recreate with text ───────────────
-- Must drop all grants/comments that reference the old signature first.
DROP FUNCTION IF EXISTS public.island_run_commit_action(text, bigint, text, jsonb, uuid);

CREATE OR REPLACE FUNCTION public.island_run_commit_action(
  p_device_session_id text,
  p_expected_runtime_version bigint,
  p_action_type text,
  p_action_payload jsonb,
  p_client_action_id text default null
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
  -- Scalar extraction variables — avoids 42P01 errors from composite
  -- variable field access inside RETURN QUERY SELECT (PG parser resolves
  -- the composite var name as a relation reference even with parens).
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
GRANT EXECUTE ON FUNCTION public.island_run_commit_action(text, bigint, text, jsonb, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.island_run_commit_action(text, bigint, text, jsonb, text) TO service_role;

COMMENT ON FUNCTION public.island_run_commit_action(text, bigint, text, jsonb, text) IS
  'Island Run server-authoritative action commit entrypoint with optimistic version checks and idempotency key support.';
