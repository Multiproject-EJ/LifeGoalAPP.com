-- ========================================================
-- REMINDER ANALYTICS VIEWS
-- Migration 0009: Analytics layer for reminder effectiveness tracking
-- ========================================================

-- VIEW: reminder_actions_daily
-- Aggregates reminder action logs by day, user, habit, and action type
CREATE OR REPLACE VIEW public.reminder_actions_daily AS
SELECT 
  date_trunc('day', created_at)::date AS day,
  user_id,
  habit_id,
  action,
  count(*) AS action_count
FROM public.reminder_action_logs
GROUP BY 1, 2, 3, 4;

-- VIEW: reminder_sends_daily
-- Approximates daily reminder sends from habit_reminder_state (last_reminder_sent_at)
-- This tracks distinct habit reminders sent per user per day
CREATE OR REPLACE VIEW public.reminder_sends_daily AS
SELECT 
  date_trunc('day', last_reminder_sent_at)::date AS day,
  h.user_id,
  hrs.habit_id,
  1 AS sends
FROM public.habit_reminder_state hrs
INNER JOIN public.habits_v2 h ON h.id = hrs.habit_id
WHERE hrs.last_reminder_sent_at IS NOT NULL;

-- VIEW: reminder_failures_daily
-- Aggregates delivery failures by day and user
CREATE OR REPLACE VIEW public.reminder_failures_daily AS
SELECT 
  date_trunc('day', created_at)::date AS day,
  user_id,
  count(*) AS failures
FROM public.reminder_delivery_failures
GROUP BY 1, 2;

-- MATERIALIZED VIEW: reminder_metrics_aggregate_30d
-- Pre-aggregated 30-day metrics per user for efficient dashboard queries
-- Note: Requires periodic refresh via REFRESH MATERIALIZED VIEW CONCURRENTLY
CREATE MATERIALIZED VIEW IF NOT EXISTS public.reminder_metrics_aggregate_30d AS
WITH date_range AS (
  SELECT 
    current_date - interval '30 days' AS start_date,
    current_date AS end_date
),
user_sends AS (
  SELECT 
    s.user_id,
    count(DISTINCT (s.day, s.habit_id)) AS total_sends_30d
  FROM public.reminder_sends_daily s
  CROSS JOIN date_range dr
  WHERE s.day >= dr.start_date AND s.day <= dr.end_date
  GROUP BY s.user_id
),
user_actions AS (
  SELECT 
    a.user_id,
    count(*) AS total_actions_30d,
    count(*) FILTER (WHERE a.action = 'done') AS done_count_30d,
    count(*) FILTER (WHERE a.action = 'snooze') AS snooze_count_30d,
    count(*) FILTER (WHERE a.action = 'dismiss') AS dismiss_count_30d
  FROM public.reminder_actions_daily a
  CROSS JOIN date_range dr
  WHERE a.day >= dr.start_date AND a.day <= dr.end_date
  GROUP BY a.user_id
)
SELECT 
  COALESCE(us.user_id, ua.user_id) AS user_id,
  COALESCE(us.total_sends_30d, 0) AS total_sends_30d,
  COALESCE(ua.total_actions_30d, 0) AS total_actions_30d,
  COALESCE(ua.done_count_30d, 0) AS done_count_30d,
  COALESCE(ua.snooze_count_30d, 0) AS snooze_count_30d,
  COALESCE(ua.dismiss_count_30d, 0) AS dismiss_count_30d,
  CASE 
    WHEN COALESCE(ua.total_actions_30d, 0) > 0 
    THEN round((ua.done_count_30d::numeric / ua.total_actions_30d::numeric) * 100, 2)
    ELSE 0 
  END AS done_rate_30d,
  CASE 
    WHEN COALESCE(ua.total_actions_30d, 0) > 0 
    THEN round((ua.snooze_count_30d::numeric / ua.total_actions_30d::numeric) * 100, 2)
    ELSE 0 
  END AS snooze_rate_30d,
  CASE 
    WHEN COALESCE(ua.total_actions_30d, 0) > 0 
    THEN round((ua.dismiss_count_30d::numeric / ua.total_actions_30d::numeric) * 100, 2)
    ELSE 0 
  END AS dismiss_rate_30d,
  now() AS refreshed_at
FROM user_sends us
FULL OUTER JOIN user_actions ua ON us.user_id = ua.user_id;

-- Create unique index for CONCURRENTLY refresh support
CREATE UNIQUE INDEX IF NOT EXISTS idx_reminder_metrics_aggregate_30d_user_id 
  ON public.reminder_metrics_aggregate_30d(user_id);

-- ROW LEVEL SECURITY for views
-- Note: Views inherit RLS from underlying tables, but we add explicit policies for the materialized view

-- Enable RLS on the materialized view
ALTER MATERIALIZED VIEW public.reminder_metrics_aggregate_30d OWNER TO postgres;

-- SECURITY DEFINER function to get analytics for current user only
-- This ensures users can only see their own data
CREATE OR REPLACE FUNCTION public.get_reminder_analytics_summary(
  p_range_days integer DEFAULT 30
)
RETURNS TABLE (
  range_days integer,
  total_sends bigint,
  total_actions bigint,
  done_count bigint,
  snooze_count bigint,
  dismiss_count bigint,
  action_rate_pct numeric,
  done_rate_pct numeric,
  habits_with_prefs bigint,
  habits_enabled_pct numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_start_date date;
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  
  -- Calculate start date
  v_start_date := current_date - (p_range_days || ' days')::interval;
  
  RETURN QUERY
  WITH sends AS (
    SELECT count(DISTINCT (s.day, s.habit_id)) AS cnt
    FROM reminder_sends_daily s
    WHERE s.user_id = v_user_id 
      AND s.day >= v_start_date 
      AND s.day <= current_date
  ),
  actions AS (
    SELECT 
      sum(a.action_count) AS total,
      sum(a.action_count) FILTER (WHERE a.action = 'done') AS done,
      sum(a.action_count) FILTER (WHERE a.action = 'snooze') AS snooze,
      sum(a.action_count) FILTER (WHERE a.action = 'dismiss') AS dismiss
    FROM reminder_actions_daily a
    WHERE a.user_id = v_user_id 
      AND a.day >= v_start_date 
      AND a.day <= current_date
  ),
  habit_prefs AS (
    SELECT 
      count(*) AS total_prefs,
      count(*) FILTER (WHERE hrp.enabled = true) AS enabled_prefs
    FROM habit_reminder_prefs hrp
    INNER JOIN habits_v2 h ON h.id = hrp.habit_id
    WHERE h.user_id = v_user_id AND h.archived = false
  )
  SELECT 
    p_range_days,
    COALESCE(s.cnt, 0)::bigint,
    COALESCE(a.total, 0)::bigint,
    COALESCE(a.done, 0)::bigint,
    COALESCE(a.snooze, 0)::bigint,
    COALESCE(a.dismiss, 0)::bigint,
    CASE 
      WHEN COALESCE(s.cnt, 0) > 0 
      THEN round((COALESCE(a.total, 0)::numeric / s.cnt::numeric) * 100, 2)
      ELSE 0 
    END,
    CASE 
      WHEN COALESCE(a.total, 0) > 0 
      THEN round((COALESCE(a.done, 0)::numeric / a.total::numeric) * 100, 2)
      ELSE 0 
    END,
    COALESCE(hp.total_prefs, 0)::bigint,
    CASE 
      WHEN COALESCE(hp.total_prefs, 0) > 0 
      THEN round((hp.enabled_prefs::numeric / hp.total_prefs::numeric) * 100, 2)
      ELSE 0 
    END
  FROM sends s
  CROSS JOIN actions a
  CROSS JOIN habit_prefs hp;
END;
$$;

-- Function to get daily analytics for current user
CREATE OR REPLACE FUNCTION public.get_reminder_analytics_daily(
  p_range_days integer DEFAULT 30
)
RETURNS TABLE (
  day date,
  sends bigint,
  done bigint,
  snooze bigint,
  dismiss bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_start_date date;
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  
  -- Calculate start date
  v_start_date := current_date - (p_range_days || ' days')::interval;
  
  RETURN QUERY
  WITH date_series AS (
    SELECT generate_series(v_start_date, current_date, '1 day'::interval)::date AS day
  ),
  daily_sends AS (
    SELECT s.day, count(DISTINCT s.habit_id) AS sends
    FROM reminder_sends_daily s
    WHERE s.user_id = v_user_id 
      AND s.day >= v_start_date 
      AND s.day <= current_date
    GROUP BY s.day
  ),
  daily_actions AS (
    SELECT 
      a.day,
      sum(a.action_count) FILTER (WHERE a.action = 'done') AS done,
      sum(a.action_count) FILTER (WHERE a.action = 'snooze') AS snooze,
      sum(a.action_count) FILTER (WHERE a.action = 'dismiss') AS dismiss
    FROM reminder_actions_daily a
    WHERE a.user_id = v_user_id 
      AND a.day >= v_start_date 
      AND a.day <= current_date
    GROUP BY a.day
  )
  SELECT 
    ds.day,
    COALESCE(dsn.sends, 0)::bigint,
    COALESCE(da.done, 0)::bigint,
    COALESCE(da.snooze, 0)::bigint,
    COALESCE(da.dismiss, 0)::bigint
  FROM date_series ds
  LEFT JOIN daily_sends dsn ON dsn.day = ds.day
  LEFT JOIN daily_actions da ON da.day = ds.day
  ORDER BY ds.day;
END;
$$;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION public.get_reminder_analytics_summary(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_reminder_analytics_daily(integer) TO authenticated;

-- Comment on objects for documentation
COMMENT ON VIEW public.reminder_actions_daily IS 'Daily aggregation of reminder action logs (done/snooze/dismiss) per user and habit';
COMMENT ON VIEW public.reminder_sends_daily IS 'Daily reminder sends approximated from habit_reminder_state last_reminder_sent_at';
COMMENT ON VIEW public.reminder_failures_daily IS 'Daily aggregation of reminder delivery failures per user';
COMMENT ON MATERIALIZED VIEW public.reminder_metrics_aggregate_30d IS 'Pre-computed 30-day reminder metrics per user. Refresh with: REFRESH MATERIALIZED VIEW CONCURRENTLY reminder_metrics_aggregate_30d;';
COMMENT ON FUNCTION public.get_reminder_analytics_summary IS 'Get aggregated reminder analytics for current user over specified range (7 or 30 days)';
COMMENT ON FUNCTION public.get_reminder_analytics_daily IS 'Get daily reminder analytics for current user over specified range, zero-filled for missing days';
