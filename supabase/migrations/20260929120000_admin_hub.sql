-- ============================================================
-- ADMIN HUB: overview numbers, waitlist viewer, phone alerts
--
-- 1. get_admin_overview: admin-only headline numbers for the Admin
--    screen (waitlist, accounts, active players, unread alerts) plus
--    the five most recent waitlist joins.
-- 2. get_admin_waitlist: admin-only, paged list of waitlist entries,
--    including email addresses. The table itself stays insert-only for
--    public roles; only these functions can read it, and only for rows
--    in admin_users.
-- 3. admin_alerts.pushed_at: marks alerts already sent as a phone push
--    by the notify-admin-alerts edge function, so each alert is pushed
--    once.
-- ============================================================

ALTER TABLE public.admin_alerts
  ADD COLUMN IF NOT EXISTS pushed_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS admin_alerts_unpushed_idx
  ON public.admin_alerts (created_at ASC)
  WHERE pushed_at IS NULL;

-- Existing alerts predate phone pushes; do not replay them to devices.
UPDATE public.admin_alerts SET pushed_at = created_at WHERE pushed_at IS NULL;

CREATE OR REPLACE FUNCTION public.get_admin_overview()
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_week_ago TIMESTAMPTZ := now() - INTERVAL '7 days';
  v_active_players INTEGER := NULL;
  v_result JSONB;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.admin_users AS admin_row
    WHERE admin_row.user_id = auth.uid() AND admin_row.active = TRUE
  ) THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;

  IF to_regclass('public.player_activity_days') IS NOT NULL THEN
    EXECUTE
      'SELECT count(DISTINCT user_id)::INTEGER FROM public.player_activity_days WHERE day >= $1'
      INTO v_active_players
      USING (v_week_ago AT TIME ZONE 'utc')::DATE;
  END IF;

  SELECT jsonb_build_object(
    'generated_at', now(),
    'waitlist_total', (SELECT count(*) FROM public.public_launch_waitlist),
    'waitlist_7d', (SELECT count(*) FROM public.public_launch_waitlist WHERE created_at >= v_week_ago),
    'accounts_total', (SELECT count(*) FROM auth.users),
    'accounts_7d', (SELECT count(*) FROM auth.users WHERE created_at >= v_week_ago),
    'active_players_7d', v_active_players,
    'unread_alerts', (SELECT count(*) FROM public.admin_alerts WHERE read_at IS NULL),
    'latest_waitlist', COALESCE((
      SELECT jsonb_agg(entry ORDER BY entry_created DESC)
      FROM (
        SELECT
          jsonb_build_object(
            'email', waitlist.email_normalized,
            'source', waitlist.source,
            'created_at', waitlist.created_at
          ) AS entry,
          waitlist.created_at AS entry_created
        FROM public.public_launch_waitlist AS waitlist
        ORDER BY waitlist.created_at DESC
        LIMIT 5
      ) AS latest
    ), '[]'::JSONB)
  ) INTO v_result;

  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.get_admin_overview() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_admin_overview() TO authenticated;

CREATE OR REPLACE FUNCTION public.get_admin_waitlist(
  p_limit INTEGER DEFAULT 50,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  id BIGINT,
  email TEXT,
  source TEXT,
  channel TEXT,
  created_at TIMESTAMPTZ,
  total_count BIGINT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_limit INTEGER := LEAST(500, GREATEST(1, COALESCE(p_limit, 50)));
  v_offset INTEGER := GREATEST(0, COALESCE(p_offset, 0));
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.admin_users AS admin_row
    WHERE admin_row.user_id = auth.uid() AND admin_row.active = TRUE
  ) THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;

  RETURN QUERY
  SELECT
    waitlist.id,
    waitlist.email_normalized,
    waitlist.source,
    waitlist.channel,
    waitlist.created_at,
    count(*) OVER ()
  FROM public.public_launch_waitlist AS waitlist
  ORDER BY waitlist.created_at DESC, waitlist.id DESC
  LIMIT v_limit
  OFFSET v_offset;
END;
$$;

REVOKE ALL ON FUNCTION public.get_admin_waitlist(INTEGER, INTEGER) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_admin_waitlist(INTEGER, INTEGER) TO authenticated;

COMMENT ON FUNCTION public.get_admin_overview() IS
  'Admin-only headline numbers and the latest waitlist joins for the in-app Admin screen.';
COMMENT ON FUNCTION public.get_admin_waitlist(INTEGER, INTEGER) IS
  'Admin-only, paged waitlist entries including email addresses.';
COMMENT ON COLUMN public.admin_alerts.pushed_at IS
  'When notify-admin-alerts sent this alert as a phone push; NULL means not yet sent.';
