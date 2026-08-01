-- Extend the public launch waitlist to support the in-demo gate and add a
-- privacy-preserving, database-enforced write budget. The public roles remain
-- insert-only and never receive access to stored email addresses.

ALTER TABLE public.public_launch_waitlist
  ADD COLUMN IF NOT EXISTS channel TEXT NOT NULL DEFAULT 'email';

ALTER TABLE public.public_launch_waitlist
  DROP CONSTRAINT IF EXISTS public_launch_waitlist_source;
ALTER TABLE public.public_launch_waitlist
  ADD CONSTRAINT public_launch_waitlist_source
  CHECK (source IN ('world_home', 'island_3_gate'));

ALTER TABLE public.public_launch_waitlist
  DROP CONSTRAINT IF EXISTS public_launch_waitlist_channel;
ALTER TABLE public.public_launch_waitlist
  ADD CONSTRAINT public_launch_waitlist_channel
  CHECK (channel IN ('email', 'push'));

DROP POLICY IF EXISTS "public_launch_waitlist_insert" ON public.public_launch_waitlist;
CREATE POLICY "public_launch_waitlist_insert"
  ON public.public_launch_waitlist
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    source IN ('world_home', 'island_3_gate')
    AND channel IN ('email', 'push')
    AND landing_variant = 'split_light_dark'
    AND char_length(email) BETWEEN 3 AND 320
  );

CREATE SCHEMA IF NOT EXISTS private;

CREATE TABLE IF NOT EXISTS private.public_launch_waitlist_rate_limits (
  fingerprint BIGINT NOT NULL,
  window_started_at TIMESTAMPTZ NOT NULL,
  attempts INTEGER NOT NULL CHECK (attempts > 0),
  PRIMARY KEY (fingerprint, window_started_at)
);

CREATE INDEX IF NOT EXISTS public_launch_waitlist_rate_limits_window_idx
  ON private.public_launch_waitlist_rate_limits (window_started_at);

REVOKE ALL ON TABLE private.public_launch_waitlist_rate_limits
  FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION private.enforce_public_launch_waitlist_rate_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  request_headers_text TEXT := current_setting('request.headers', true);
  request_headers JSONB := '{}';
  client_ip TEXT;
  fingerprint_input TEXT;
  fingerprint_value BIGINT;
  current_window TIMESTAMPTZ;
  current_attempts INTEGER;
BEGIN
  IF nullif(request_headers_text, '') IS NOT NULL THEN
    request_headers := request_headers_text::jsonb;
  END IF;

  client_ip := nullif(btrim(split_part(request_headers ->> 'x-forwarded-for', ',', 1)), '');
  fingerprint_input := coalesce(client_ip, 'email:' || lower(btrim(NEW.email)));
  fingerprint_value := pg_catalog.hashtextextended(
    fingerprint_input,
    extract(epoch FROM current_date::timestamp)::bigint
  );
  current_window := pg_catalog.date_bin(
    interval '10 minutes',
    statement_timestamp(),
    timestamptz '2000-01-01 00:00:00+00'
  );

  DELETE FROM private.public_launch_waitlist_rate_limits
  WHERE window_started_at < statement_timestamp() - interval '2 days';

  INSERT INTO private.public_launch_waitlist_rate_limits (
    fingerprint,
    window_started_at,
    attempts
  ) VALUES (
    fingerprint_value,
    current_window,
    1
  )
  ON CONFLICT (fingerprint, window_started_at)
  DO UPDATE SET attempts = private.public_launch_waitlist_rate_limits.attempts + 1
  RETURNING attempts INTO current_attempts;

  IF current_attempts > 5 THEN
    RAISE sqlstate 'PGRST' USING
      message = json_build_object(
        'code', 'WAITLIST_RATE_LIMIT',
        'message', 'Too many waitlist attempts. Please try again shortly.',
        'details', null,
        'hint', 'Retry after ten minutes.'
      )::text,
      detail = json_build_object(
        'status', 429,
        'headers', json_build_object('Retry-After', '600')
      )::text;
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION private.enforce_public_launch_waitlist_rate_limit()
  FROM PUBLIC, anon, authenticated, service_role;

DROP TRIGGER IF EXISTS public_launch_waitlist_rate_limit
  ON public.public_launch_waitlist;
CREATE TRIGGER public_launch_waitlist_rate_limit
  BEFORE INSERT ON public.public_launch_waitlist
  FOR EACH ROW
  EXECUTE FUNCTION private.enforce_public_launch_waitlist_rate_limit();
