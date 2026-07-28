-- Admin operations alerts: a private, durable inbox plus delivery outbox.
-- Alert summaries intentionally never include account email addresses, habit text,
-- journal content, or support message bodies.

CREATE TABLE IF NOT EXISTS public.admin_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_key text NOT NULL UNIQUE,
  alert_type text NOT NULL CHECK (alert_type IN ('user_signup', 'purchase_completed', 'subscription_changed', 'support_message', 'telemetry_report_ready')),
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

CREATE TABLE IF NOT EXISTS public.admin_alert_deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_id uuid NOT NULL REFERENCES public.admin_alerts(id) ON DELETE CASCADE,
  channel text NOT NULL CHECK (channel IN ('email', 'support_webhook')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'sent', 'blocked', 'failed')),
  attempts integer NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  last_error text,
  delivered_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (alert_id, channel)
);

CREATE INDEX IF NOT EXISTS admin_alerts_created_at_idx ON public.admin_alerts(created_at DESC);
CREATE INDEX IF NOT EXISTS admin_alerts_unread_idx ON public.admin_alerts(created_at DESC) WHERE read_at IS NULL;
CREATE INDEX IF NOT EXISTS admin_alert_deliveries_pending_idx ON public.admin_alert_deliveries(created_at ASC) WHERE status IN ('pending', 'failed');

ALTER TABLE public.admin_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_alert_deliveries ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.admin_alerts, public.admin_alert_deliveries FROM PUBLIC;
GRANT SELECT, UPDATE ON TABLE public.admin_alerts TO authenticated;
GRANT ALL ON TABLE public.admin_alerts, public.admin_alert_deliveries TO service_role;

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
  FOR UPDATE TO authenticated USING (public.is_active_admin()) WITH CHECK (public.is_active_admin());

CREATE OR REPLACE FUNCTION public.queue_admin_alert(
  p_event_key text,
  p_alert_type text,
  p_severity text,
  p_title text,
  p_summary text,
  p_resource_type text,
  p_resource_id text DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'::jsonb,
  p_queue_support_webhook boolean DEFAULT false
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_alert_id uuid;
BEGIN
  INSERT INTO public.admin_alerts (event_key, alert_type, severity, title, summary, resource_type, resource_id, metadata)
  VALUES (p_event_key, p_alert_type, p_severity, p_title, p_summary, p_resource_type, p_resource_id, COALESCE(p_metadata, '{}'::jsonb))
  ON CONFLICT (event_key) DO NOTHING
  RETURNING id INTO v_alert_id;

  IF v_alert_id IS NULL THEN
    SELECT id INTO v_alert_id FROM public.admin_alerts WHERE event_key = p_event_key;
    RETURN v_alert_id;
  END IF;

  INSERT INTO public.admin_alert_deliveries (alert_id, channel)
  VALUES (v_alert_id, 'email')
  ON CONFLICT DO NOTHING;
  IF p_queue_support_webhook THEN
    INSERT INTO public.admin_alert_deliveries (alert_id, channel)
    VALUES (v_alert_id, 'support_webhook')
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN v_alert_id;
END;
$$;

REVOKE ALL ON FUNCTION public.queue_admin_alert(text, text, text, text, text, text, text, jsonb, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.queue_admin_alert(text, text, text, text, text, text, text, jsonb, boolean) TO service_role;

CREATE OR REPLACE FUNCTION public.queue_signup_admin_alert()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.queue_admin_alert('signup:' || NEW.id::text, 'user_signup', 'info', 'New saved account', 'A new account was created.', 'auth_user', NEW.id::text);
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.queue_signup_admin_alert() FROM PUBLIC;

DROP TRIGGER IF EXISTS admin_alert_on_signup ON auth.users;
CREATE TRIGGER admin_alert_on_signup AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.queue_signup_admin_alert();

CREATE OR REPLACE FUNCTION public.queue_case_message_admin_alert()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.author_role = 'user' AND NEW.message_type IN ('submission', 'user_reply') THEN
    PERFORM public.queue_admin_alert(
      'support-message:' || NEW.id::text,
      'support_message', 'warning', 'New customer-support message',
      'A customer has sent a support message. Open the admin inbox to review it.',
      'case_message', NEW.id::text,
      jsonb_build_object('case_thread_id', NEW.thread_id, 'message_type', NEW.message_type), true
    );
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.queue_case_message_admin_alert() FROM PUBLIC;
DROP TRIGGER IF EXISTS admin_alert_on_case_message ON public.case_messages;
CREATE TRIGGER admin_alert_on_case_message AFTER INSERT ON public.case_messages
FOR EACH ROW EXECUTE FUNCTION public.queue_case_message_admin_alert();

CREATE OR REPLACE FUNCTION public.queue_billing_admin_alert()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_type text; v_title text; v_summary text;
BEGIN
  IF NEW.status <> 'processed' OR NEW.event_type NOT IN ('checkout.session.completed', 'customer.subscription.created', 'customer.subscription.updated', 'customer.subscription.deleted') THEN
    RETURN NEW;
  END IF;
  v_type := CASE WHEN NEW.event_type = 'checkout.session.completed' THEN 'purchase_completed' ELSE 'subscription_changed' END;
  v_title := CASE WHEN v_type = 'purchase_completed' THEN 'Purchase completed' ELSE 'Pro subscription changed' END;
  v_summary := CASE WHEN v_type = 'purchase_completed' THEN 'A purchase was processed successfully.' ELSE 'A subscription lifecycle event was processed successfully.' END;
  PERFORM public.queue_admin_alert('billing:' || NEW.stripe_event_id, v_type, 'info', v_title, v_summary, 'billing_webhook_event', NEW.stripe_event_id, jsonb_build_object('event_type', NEW.event_type, 'object_id', NEW.object_id));
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.queue_billing_admin_alert() FROM PUBLIC;
DROP TRIGGER IF EXISTS admin_alert_on_billing_event ON public.billing_webhook_events;
CREATE TRIGGER admin_alert_on_billing_event AFTER INSERT OR UPDATE OF status ON public.billing_webhook_events
FOR EACH ROW EXECUTE FUNCTION public.queue_billing_admin_alert();

-- Replace the nightly rollup with the same idempotent aggregation plus one
-- privacy-safe alert for the previous completed UTC day.
CREATE OR REPLACE FUNCTION public.rollup_telemetry_daily(p_lookback_days integer DEFAULT 3)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_report_day date := (now() AT TIME ZONE 'utc')::date - 1; v_event_count integer;
BEGIN
  INSERT INTO public.telemetry_daily_rollups (day, event_type, event_count, unique_users, updated_at)
  SELECT (occurred_at AT TIME ZONE 'utc')::date, event_type, COUNT(*)::integer, COUNT(DISTINCT user_id)::integer, now()
  FROM public.telemetry_events
  WHERE occurred_at >= now() - make_interval(days => greatest(coalesce(p_lookback_days, 3), 1))
  GROUP BY 1, 2
  ON CONFLICT (day, event_type) DO UPDATE SET event_count = excluded.event_count, unique_users = excluded.unique_users, updated_at = excluded.updated_at;

  SELECT coalesce(sum(event_count), 0)::integer INTO v_event_count FROM public.telemetry_daily_rollups WHERE day = v_report_day;
  PERFORM public.queue_admin_alert('telemetry-report:' || v_report_day::text, 'telemetry_report_ready', 'info', 'Daily telemetry report ready', 'The completed UTC-day telemetry rollup is ready (' || v_event_count::text || ' events).', 'telemetry_daily_rollup', v_report_day::text, jsonb_build_object('report_day', v_report_day, 'event_count', v_event_count));
END;
$$;
REVOKE ALL ON FUNCTION public.rollup_telemetry_daily(integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rollup_telemetry_daily(integer) TO service_role;

-- Make the private inbox live for already-authenticated admin sessions.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime' AND puballtables = false)
     AND NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'admin_alerts') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.admin_alerts;
  END IF;
END;
$$;

COMMENT ON TABLE public.admin_alerts IS 'Admin-only operational alert inbox. No personal content or email addresses are stored in summaries.';
COMMENT ON TABLE public.admin_alert_deliveries IS 'Retryable email and optional support-webhook delivery queue. Delivery is disabled until Edge Function secrets are configured.';
