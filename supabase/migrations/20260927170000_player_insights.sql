-- ============================================================
-- PLAYER INSIGHTS: where players stop, and where the fun drops
--
-- 1. player_activity_days: one small row per player per local day
--    (island, sessions, active seconds, rolls, builds, islands
--    completed). Counts only; no content. Written exclusively through
--    record_player_activity, which clamps every delta so a client can
--    not inflate the numbers.
-- 2. get_admin_player_insights: admin-only aggregate for the dev
--    dashboard: island funnel (reached / here / lost), the fun curve
--    (minutes, rolls, sessions per active day by island), weekly
--    retention cohorts and daily actives.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.player_activity_days (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  day DATE NOT NULL,
  first_island INTEGER NOT NULL CHECK (first_island >= 1),
  last_island INTEGER NOT NULL CHECK (last_island >= 1),
  cycle_index INTEGER NOT NULL DEFAULT 0 CHECK (cycle_index >= 0),
  sessions INTEGER NOT NULL DEFAULT 0 CHECK (sessions >= 0),
  active_seconds INTEGER NOT NULL DEFAULT 0 CHECK (active_seconds BETWEEN 0 AND 86400),
  rolls INTEGER NOT NULL DEFAULT 0 CHECK (rolls >= 0),
  builds INTEGER NOT NULL DEFAULT 0 CHECK (builds >= 0),
  islands_completed INTEGER NOT NULL DEFAULT 0 CHECK (islands_completed >= 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, day)
);

CREATE INDEX IF NOT EXISTS player_activity_days_day_idx ON public.player_activity_days (day);

ALTER TABLE public.player_activity_days ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.player_activity_days FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.player_activity_days TO service_role;

CREATE OR REPLACE FUNCTION public.record_player_activity(
  p_day DATE,
  p_island INTEGER,
  p_cycle INTEGER,
  p_sessions INTEGER,
  p_active_seconds INTEGER,
  p_rolls INTEGER,
  p_builds INTEGER,
  p_islands_completed INTEGER
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_island INTEGER := LEAST(GREATEST(COALESCE(p_island, 1), 1), 1000);
  v_cycle INTEGER := LEAST(GREATEST(COALESCE(p_cycle, 0), 0), 1000);
  -- One flush covers at most a few minutes of play; clamp every delta.
  v_sessions INTEGER := LEAST(GREATEST(COALESCE(p_sessions, 0), 0), 5);
  v_seconds INTEGER := LEAST(GREATEST(COALESCE(p_active_seconds, 0), 0), 900);
  v_rolls INTEGER := LEAST(GREATEST(COALESCE(p_rolls, 0), 0), 600);
  v_builds INTEGER := LEAST(GREATEST(COALESCE(p_builds, 0), 0), 200);
  v_completed INTEGER := LEAST(GREATEST(COALESCE(p_islands_completed, 0), 0), 3);
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  -- The client sends its local calendar day; allow timezone skew only.
  IF p_day IS NULL OR ABS(p_day - (now() AT TIME ZONE 'utc')::DATE) > 1 THEN
    RAISE EXCEPTION 'activity day out of range';
  END IF;

  INSERT INTO public.player_activity_days AS days (
    user_id, day, first_island, last_island, cycle_index,
    sessions, active_seconds, rolls, builds, islands_completed, updated_at
  )
  VALUES (
    v_user_id, p_day, v_island, v_island, v_cycle,
    v_sessions, v_seconds, v_rolls, v_builds, v_completed, now()
  )
  ON CONFLICT (user_id, day) DO UPDATE
  SET last_island = GREATEST(days.last_island, EXCLUDED.last_island),
      cycle_index = GREATEST(days.cycle_index, EXCLUDED.cycle_index),
      sessions = LEAST(days.sessions + EXCLUDED.sessions, 200),
      active_seconds = LEAST(days.active_seconds + EXCLUDED.active_seconds, 86400),
      rolls = LEAST(days.rolls + EXCLUDED.rolls, 20000),
      builds = LEAST(days.builds + EXCLUDED.builds, 5000),
      islands_completed = LEAST(days.islands_completed + EXCLUDED.islands_completed, 50),
      updated_at = now();
END;
$$;

REVOKE ALL ON FUNCTION public.record_player_activity(DATE, INTEGER, INTEGER, INTEGER, INTEGER, INTEGER, INTEGER, INTEGER) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_player_activity(DATE, INTEGER, INTEGER, INTEGER, INTEGER, INTEGER, INTEGER, INTEGER) TO authenticated;

COMMENT ON FUNCTION public.record_player_activity(DATE, INTEGER, INTEGER, INTEGER, INTEGER, INTEGER, INTEGER, INTEGER) IS
  'Adds clamped play-activity deltas to the caller''s row for one local day. Counts only.';

-- Keep a bit over a year of daily rows for retention cohorts.
DO $cleanup$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.unschedule(jobid) FROM cron.job WHERE jobname = 'player_activity_days_retention';
    PERFORM cron.schedule(
      'player_activity_days_retention',
      '17 3 * * *',
      $job$DELETE FROM public.player_activity_days WHERE day < current_date - 400;$job$
    );
  END IF;
END;
$cleanup$;

CREATE OR REPLACE FUNCTION public.get_admin_player_insights(p_days INTEGER DEFAULT 30)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_days INTEGER := LEAST(365, GREATEST(7, COALESCE(p_days, 30)));
  v_since DATE := (now() AT TIME ZONE 'utc')::DATE - (v_days - 1);
  v_lost_after INTERVAL := INTERVAL '7 days';
  v_result JSONB;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.admin_users AS admin_row
    WHERE admin_row.user_id = auth.uid() AND admin_row.active = TRUE
  ) THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;

  WITH players AS (
    SELECT
      state.user_id,
      state.current_island_number AS island,
      COALESCE(state.cycle_index, 0) AS cycle,
      state.created_at,
      state.updated_at,
      state.island_started_at_ms
    FROM public.island_run_runtime_state AS state
  ),
  max_island AS (
    SELECT LEAST(120, GREATEST(1, COALESCE(MAX(CASE WHEN cycle > 0 THEN 120 ELSE island END), 1))) AS n FROM players
  ),
  funnel AS (
    SELECT
      series.n AS island,
      COUNT(*) FILTER (WHERE players.cycle > 0 OR players.island >= series.n) AS reached,
      COUNT(*) FILTER (WHERE players.cycle = 0 AND players.island = series.n) AS here,
      COUNT(*) FILTER (
        WHERE players.cycle = 0 AND players.island = series.n AND players.updated_at < now() - v_lost_after
      ) AS lost,
      PERCENTILE_CONT(0.5) WITHIN GROUP (
        ORDER BY EXTRACT(EPOCH FROM (now() - TO_TIMESTAMP(players.island_started_at_ms / 1000.0))) / 86400.0
      ) FILTER (
        WHERE players.cycle = 0 AND players.island = series.n
          AND players.updated_at >= now() - v_lost_after
          AND players.island_started_at_ms IS NOT NULL
      ) AS median_days_here
    FROM max_island
    CROSS JOIN LATERAL generate_series(1, max_island.n) AS series(n)
    LEFT JOIN players ON TRUE
    GROUP BY series.n
  ),
  window_days AS (
    SELECT * FROM public.player_activity_days AS days WHERE days.day >= v_since
  ),
  fun AS (
    SELECT
      window_days.last_island AS island,
      COUNT(*) AS player_days,
      COUNT(DISTINCT window_days.user_id) AS players,
      ROUND(AVG(window_days.active_seconds) / 60.0, 1) AS avg_minutes,
      ROUND(AVG(window_days.rolls), 1) AS avg_rolls,
      ROUND(AVG(window_days.sessions), 2) AS avg_sessions,
      ROUND(AVG(window_days.builds), 1) AS avg_builds
    FROM window_days
    GROUP BY window_days.last_island
  ),
  first_days AS (
    SELECT days.user_id, MIN(days.day) AS first_day
    FROM public.player_activity_days AS days
    GROUP BY days.user_id
  ),
  cohorts AS (
    SELECT
      DATE_TRUNC('week', first_days.first_day)::DATE AS week,
      COUNT(*) AS size,
      COUNT(*) FILTER (WHERE EXISTS (
        SELECT 1 FROM public.player_activity_days AS d
        WHERE d.user_id = first_days.user_id AND d.day = first_days.first_day + 1
      )) AS d1,
      COUNT(*) FILTER (WHERE EXISTS (
        SELECT 1 FROM public.player_activity_days AS d
        WHERE d.user_id = first_days.user_id AND d.day >= first_days.first_day + 7
      )) AS d7,
      COUNT(*) FILTER (WHERE EXISTS (
        SELECT 1 FROM public.player_activity_days AS d
        WHERE d.user_id = first_days.user_id AND d.day >= first_days.first_day + 30
      )) AS d30,
      MAX((now() AT TIME ZONE 'utc')::DATE - first_days.first_day) AS age_days
    FROM first_days
    WHERE first_days.first_day >= v_since - 56
    GROUP BY 1
  ),
  daily AS (
    SELECT
      series.day::DATE AS day,
      COUNT(DISTINCT window_days.user_id) AS active,
      COUNT(DISTINCT first_days.user_id) AS new_players
    FROM generate_series(v_since, (now() AT TIME ZONE 'utc')::DATE, INTERVAL '1 day') AS series(day)
    LEFT JOIN window_days ON window_days.day = series.day::DATE
    LEFT JOIN first_days ON first_days.first_day = series.day::DATE
    GROUP BY series.day
  )
  SELECT JSONB_BUILD_OBJECT(
    'lookback_days', v_days,
    'generated_at', now(),
    'summary', (
      SELECT JSONB_BUILD_OBJECT(
        'players', COUNT(*),
        'active_1d', COUNT(*) FILTER (WHERE updated_at >= now() - INTERVAL '1 day'),
        'active_7d', COUNT(*) FILTER (WHERE updated_at >= now() - INTERVAL '7 days'),
        'active_30d', COUNT(*) FILTER (WHERE updated_at >= now() - INTERVAL '30 days'),
        'new_7d', COUNT(*) FILTER (WHERE created_at >= now() - INTERVAL '7 days'),
        'finished_all', COUNT(*) FILTER (WHERE cycle > 0)
      )
      FROM players
    ),
    'funnel', COALESCE((
      SELECT JSONB_AGG(JSONB_BUILD_OBJECT(
        'island', island, 'reached', reached, 'here', here, 'lost', lost,
        'median_days_here', ROUND(median_days_here::NUMERIC, 1)
      ) ORDER BY island) FROM funnel
    ), '[]'::JSONB),
    'fun', COALESCE((
      SELECT JSONB_AGG(JSONB_BUILD_OBJECT(
        'island', island, 'player_days', player_days, 'players', players,
        'avg_minutes', avg_minutes, 'avg_rolls', avg_rolls,
        'avg_sessions', avg_sessions, 'avg_builds', avg_builds
      ) ORDER BY island) FROM fun
    ), '[]'::JSONB),
    'cohorts', COALESCE((
      SELECT JSONB_AGG(JSONB_BUILD_OBJECT(
        'week', week, 'size', size, 'd1', d1, 'd7', d7, 'd30', d30, 'age_days', age_days
      ) ORDER BY week DESC) FROM cohorts
    ), '[]'::JSONB),
    'daily', COALESCE((
      SELECT JSONB_AGG(JSONB_BUILD_OBJECT(
        'day', day, 'active', active, 'new_players', new_players
      ) ORDER BY day) FROM daily
    ), '[]'::JSONB)
  ) INTO v_result;

  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.get_admin_player_insights(INTEGER) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_admin_player_insights(INTEGER) TO authenticated;

COMMENT ON FUNCTION public.get_admin_player_insights(INTEGER) IS
  'Admin-only aggregate player insights: island funnel, fun curve, retention cohorts, daily actives.';
