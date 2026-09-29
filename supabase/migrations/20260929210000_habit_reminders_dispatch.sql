-- ============================================================
-- HABIT REMINDERS DISPATCH: pg_cron calls send-reminders/cron with a Vault token
--
-- The previous "send-habit-reminders" pg_cron job (inactive) called the
-- function with a plain-text x-cron-secret embedded in the job command, and
-- pg_net was not installed, so it never ran. The GitHub workflow that called
-- the same endpoint has been disabled since March.
--
-- 1. A random access token lives in Vault (never in this file or the repo).
-- 2. private.dispatch_send_reminders() POSTs to send-reminders/cron with it.
-- 3. The "send-habit-reminders" job is replaced (same name, so the old
--    command and its embedded secret are gone) and runs every 5 minutes.
--    The function sends each habit's reminder at most once per day, at or
--    after the user's preferred time, so 5 minutes is the worst-case delay.
-- 4. verify_send_reminders_token() lets the edge function (service role
--    only) check the token without ever seeing it.
-- Requires pg_net (enabled in 20260929200000_admin_alert_push_dispatch.sql).
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;
CREATE SCHEMA IF NOT EXISTS private;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM vault.secrets WHERE name = 'send_reminders_token') THEN
    PERFORM vault.create_secret(
      encode(extensions.gen_random_bytes(32), 'hex'),
      'send_reminders_token',
      'Shared secret pg_cron sends to the send-reminders edge function.'
    );
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.verify_send_reminders_token(p_token TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT coalesce(length(p_token), 0) >= 32 AND EXISTS (
    SELECT 1 FROM vault.decrypted_secrets
    WHERE name = 'send_reminders_token' AND decrypted_secret = p_token
  );
$$;

REVOKE ALL ON FUNCTION public.verify_send_reminders_token(TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.verify_send_reminders_token(TEXT) TO service_role;

CREATE OR REPLACE FUNCTION private.dispatch_send_reminders()
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_token TEXT;
  v_request_id BIGINT;
BEGIN
  SELECT decrypted_secret INTO v_token
  FROM vault.decrypted_secrets
  WHERE name = 'send_reminders_token';
  IF v_token IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT net.http_post(
    url := 'https://muanayogiboxooftkyny.supabase.co/functions/v1/send-reminders/cron',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-reminders-token', v_token
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 25000
  ) INTO v_request_id;
  RETURN v_request_id;
END;
$$;

REVOKE ALL ON FUNCTION private.dispatch_send_reminders() FROM PUBLIC, anon, authenticated;

-- Same job name: cron.schedule upserts, replacing the old command (and the
-- plain-text secret it contained).
SELECT cron.schedule(
  'send-habit-reminders',
  '*/5 * * * *',
  $$SELECT private.dispatch_send_reminders();$$
);

DO $$
DECLARE
  v_job_id BIGINT;
BEGIN
  SELECT jobid INTO v_job_id FROM cron.job WHERE jobname = 'send-habit-reminders';
  IF v_job_id IS NOT NULL THEN
    PERFORM cron.alter_job(v_job_id, active := TRUE);
  END IF;
END;
$$;

COMMENT ON FUNCTION public.verify_send_reminders_token(TEXT) IS
  'Service-role only: checks the token send-reminders/cron receives from pg_cron.';
COMMENT ON FUNCTION private.dispatch_send_reminders() IS
  'POSTs to send-reminders/cron via pg_net (token from Vault); scheduled every 5 minutes.';
