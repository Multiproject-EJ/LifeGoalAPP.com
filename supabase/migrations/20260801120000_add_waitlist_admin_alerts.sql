-- Public launch waitlist plus a private in-app admin inbox for waitlist joins
-- and new account registrations. Alert text intentionally excludes emails.

CREATE TABLE IF NOT EXISTS public.public_launch_waitlist (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  email text NOT NULL,
  email_normalized text GENERATED ALWAYS AS (lower(btrim(email))) STORED,
  source text NOT NULL DEFAULT 'world_home',
  landing_variant text NOT NULL DEFAULT 'split_light_dark',
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT public_launch_waitlist_email_length
    CHECK (char_length(email) BETWEEN 3 AND 320),
  CONSTRAINT public_launch_waitlist_email_shape
    CHECK (email ~* '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$'),
  CONSTRAINT public_launch_waitlist_source CHECK (source = 'world_home'),
  CONSTRAINT public_launch_waitlist_variant CHECK (landing_variant = 'split_light_dark'),
  CONSTRAINT public_launch_waitlist_email_unique UNIQUE (email_normalized)
);

ALTER TABLE public.public_launch_waitlist ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.public_launch_waitlist FROM anon, authenticated;
GRANT INSERT ON TABLE public.public_launch_waitlist TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.public_launch_waitlist TO service_role;
REVOKE ALL ON SEQUENCE public.public_launch_waitlist_id_seq FROM anon, authenticated;
GRANT USAGE ON SEQUENCE public.public_launch_waitlist_id_seq TO anon, authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.public_launch_waitlist_id_seq TO service_role;

DROP POLICY IF EXISTS "public_launch_waitlist_insert" ON public.public_launch_waitlist;
CREATE POLICY "public_launch_waitlist_insert"
  ON public.public_launch_waitlist
  FOR INSERT TO anon, authenticated
  WITH CHECK (
    source = 'world_home'
    AND landing_variant = 'split_light_dark'
    AND char_length(email) BETWEEN 3 AND 320
  );

CREATE TABLE IF NOT EXISTS public.admin_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_key text NOT NULL UNIQUE,
  alert_type text NOT NULL,
  severity text NOT NULL DEFAULT 'info' CHECK (severity IN ('info', 'warning', 'critical')),
  title text NOT NULL,
  summary text NOT NULL,
  resource_type text NOT NULL,
  resource_id text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  read_at timestamptz,
  read_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

ALTER TABLE public.admin_alerts
  DROP CONSTRAINT IF EXISTS admin_alerts_alert_type_check;
ALTER TABLE public.admin_alerts
  ADD CONSTRAINT admin_alerts_alert_type_check
  CHECK (
    alert_type IN (
      'user_signup', 'waitlist_joined', 'purchase_completed',
      'subscription_changed', 'support_message', 'telemetry_report_ready'
    )
  );

CREATE INDEX IF NOT EXISTS admin_alerts_created_at_idx
  ON public.admin_alerts(created_at DESC);
CREATE INDEX IF NOT EXISTS admin_alerts_unread_idx
  ON public.admin_alerts(created_at DESC) WHERE read_at IS NULL;

ALTER TABLE public.admin_alerts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.admin_alerts FROM PUBLIC;
GRANT SELECT, UPDATE ON TABLE public.admin_alerts TO authenticated;
GRANT ALL ON TABLE public.admin_alerts TO service_role;

CREATE OR REPLACE FUNCTION public.is_active_admin(p_user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admin_users
    WHERE user_id = p_user_id AND active = true
  );
$$;

REVOKE ALL ON FUNCTION public.is_active_admin(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_active_admin(uuid) TO authenticated, service_role;

DROP POLICY IF EXISTS "admin_alerts_active_admin_select" ON public.admin_alerts;
CREATE POLICY "admin_alerts_active_admin_select" ON public.admin_alerts
  FOR SELECT TO authenticated USING (public.is_active_admin());
DROP POLICY IF EXISTS "admin_alerts_active_admin_update" ON public.admin_alerts;
CREATE POLICY "admin_alerts_active_admin_update" ON public.admin_alerts
  FOR UPDATE TO authenticated
  USING (public.is_active_admin())
  WITH CHECK (public.is_active_admin());

CREATE OR REPLACE FUNCTION public.queue_signup_admin_alert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.admin_alerts (
    event_key, alert_type, severity, title, summary, resource_type, resource_id
  ) VALUES (
    'signup:' || NEW.id::text,
    'user_signup',
    'info',
    'New saved account',
    'A new account was created.',
    'auth_user',
    NEW.id::text
  ) ON CONFLICT (event_key) DO NOTHING;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not queue signup admin alert: %', SQLERRM;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.queue_signup_admin_alert() FROM PUBLIC;
DROP TRIGGER IF EXISTS admin_alert_on_signup ON auth.users;
CREATE TRIGGER admin_alert_on_signup
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.queue_signup_admin_alert();

CREATE OR REPLACE FUNCTION public.queue_waitlist_admin_alert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.admin_alerts (
    event_key, alert_type, severity, title, summary, resource_type, resource_id
  ) VALUES (
    'waitlist:' || NEW.id::text,
    'waitlist_joined',
    'info',
    'New launch waitlist signup',
    'Someone joined the HabitGame launch waitlist.',
    'public_launch_waitlist',
    NEW.id::text
  ) ON CONFLICT (event_key) DO NOTHING;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not queue waitlist admin alert: %', SQLERRM;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.queue_waitlist_admin_alert() FROM PUBLIC;
DROP TRIGGER IF EXISTS admin_alert_on_waitlist_join ON public.public_launch_waitlist;
CREATE TRIGGER admin_alert_on_waitlist_join
AFTER INSERT ON public.public_launch_waitlist
FOR EACH ROW EXECUTE FUNCTION public.queue_waitlist_admin_alert();

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_publication
    WHERE pubname = 'supabase_realtime' AND puballtables = false
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'admin_alerts'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.admin_alerts;
  END IF;
END;
$$;

COMMENT ON TABLE public.public_launch_waitlist IS
  'Email-only launch waitlist submitted from the public HabitGame landing page.';
COMMENT ON TABLE public.admin_alerts IS
  'Admin-only operational inbox. Alert summaries exclude visitor email addresses.';
