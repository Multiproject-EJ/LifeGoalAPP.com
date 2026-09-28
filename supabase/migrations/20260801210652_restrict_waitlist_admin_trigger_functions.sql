-- Trigger functions are invoked by Postgres, never through the Data API.
-- Supabase may grant function execution directly to API roles by default, so
-- revoke both the inherited PUBLIC grant and any direct role grants.

REVOKE ALL ON FUNCTION public.queue_signup_admin_alert() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.queue_signup_admin_alert() FROM anon, authenticated;

REVOKE ALL ON FUNCTION public.queue_waitlist_admin_alert() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.queue_waitlist_admin_alert() FROM anon, authenticated;
