-- ============================================================
-- ADMIN ALERT PUSH DISPATCH: the database calls notify-admin-alerts itself
--
-- The GitHub "Send Habit Reminders" workflow that was meant to call
-- notify-admin-alerts every minute is disabled, so the database now does it:
--
-- 1. A random access token lives in Vault (never in this file or the repo).
-- 2. AFTER INSERT on admin_alerts: pg_net POSTs to notify-admin-alerts with
--    that token, so a waitlist join or new account reaches admins' phones
--    within seconds. Failures never block the insert.
-- 3. A pg_cron sweep every 10 minutes retries while unpushed alerts remain
--    (e.g. no admin device registered yet, or a failed delivery).
-- 4. verify_notify_admin_alerts_token() lets the edge function (service role
--    only) check the token without ever seeing it.
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;
CREATE SCHEMA IF NOT EXISTS private;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM vault.secrets WHERE name = 'notify_admin_alerts_token') THEN
    PERFORM vault.create_secret(
      encode(extensions.gen_random_bytes(32), 'hex'),
      'notify_admin_alerts_token',
      'Shared secret the database sends to the notify-admin-alerts edge function.'
    );
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.verify_notify_admin_alerts_token(p_token TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT coalesce(length(p_token), 0) >= 32 AND EXISTS (
    SELECT 1 FROM vault.decrypted_secrets
    WHERE name = 'notify_admin_alerts_token' AND decrypted_secret = p_token
  );
$$;

REVOKE ALL ON FUNCTION public.verify_notify_admin_alerts_token(TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.verify_notify_admin_alerts_token(TEXT) TO service_role;

-- Fire-and-forget call to the edge function. With p_only_if_pending, it only
-- calls when unpushed alerts exist (used by the sweep to avoid idle calls).
CREATE OR REPLACE FUNCTION private.dispatch_admin_alert_push(p_only_if_pending BOOLEAN DEFAULT FALSE)
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_token TEXT;
  v_request_id BIGINT;
BEGIN
  IF p_only_if_pending AND NOT EXISTS (
    SELECT 1 FROM public.admin_alerts WHERE pushed_at IS NULL
  ) THEN
    RETURN NULL;
  END IF;

  SELECT decrypted_secret INTO v_token
  FROM vault.decrypted_secrets
  WHERE name = 'notify_admin_alerts_token';
  IF v_token IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT net.http_post(
    url := 'https://muanayogiboxooftkyny.supabase.co/functions/v1/notify-admin-alerts',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-admin-alerts-token', v_token
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 10000
  ) INTO v_request_id;
  RETURN v_request_id;
END;
$$;

REVOKE ALL ON FUNCTION private.dispatch_admin_alert_push(BOOLEAN) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION private.dispatch_admin_alert_push_on_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  PERFORM private.dispatch_admin_alert_push(FALSE);
  RETURN NULL;
EXCEPTION WHEN OTHERS THEN
  -- A push problem must never block a waitlist join or a signup.
  RAISE WARNING 'Could not dispatch admin alert push: %', SQLERRM;
  RETURN NULL;
END;
$$;

REVOKE ALL ON FUNCTION private.dispatch_admin_alert_push_on_insert() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS admin_alerts_dispatch_push ON public.admin_alerts;
CREATE TRIGGER admin_alerts_dispatch_push
  AFTER INSERT ON public.admin_alerts
  FOR EACH STATEMENT
  EXECUTE FUNCTION private.dispatch_admin_alert_push_on_insert();

-- Named cron.schedule is an upsert, so re-running this migration is safe.
SELECT cron.schedule(
  'notify-admin-alerts-sweep',
  '*/10 * * * *',
  $$SELECT private.dispatch_admin_alert_push(TRUE);$$
);

COMMENT ON FUNCTION public.verify_notify_admin_alerts_token(TEXT) IS
  'Service-role only: checks the token notify-admin-alerts receives from the database.';
COMMENT ON FUNCTION private.dispatch_admin_alert_push(BOOLEAN) IS
  'POSTs to the notify-admin-alerts edge function via pg_net (token from Vault).';
