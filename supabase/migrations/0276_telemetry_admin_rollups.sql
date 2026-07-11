-- ========================================================
-- TELEMETRY ADMIN ROLLUPS
-- Migration 0276: Daily aggregation of telemetry_events for the
-- admin-only telemetry dashboard.
--
-- Raw telemetry_events are pruned after 30 days (migration 0275).
-- This table preserves the statistical value forever at a few KB
-- per day: one row per (day, event_type) with counts and unique
-- users. A nightly pg_cron job re-aggregates the trailing days so
-- late-arriving events are captured before the raw rows expire.
-- ========================================================

CREATE TABLE IF NOT EXISTS public.telemetry_daily_rollups (
  day DATE NOT NULL,
  event_type TEXT NOT NULL,
  event_count INTEGER NOT NULL DEFAULT 0,
  unique_users INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (day, event_type)
);

COMMENT ON TABLE public.telemetry_daily_rollups
IS 'Daily per-event-type aggregates of telemetry_events; admin-only. Survives raw event pruning.';

ALTER TABLE public.telemetry_daily_rollups ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.telemetry_daily_rollups FROM PUBLIC;
GRANT SELECT ON TABLE public.telemetry_daily_rollups TO authenticated;
GRANT ALL ON TABLE public.telemetry_daily_rollups TO service_role;

DROP POLICY IF EXISTS "telemetry_daily_rollups_admin_select" ON public.telemetry_daily_rollups;
CREATE POLICY "telemetry_daily_rollups_admin_select"
  ON public.telemetry_daily_rollups
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.admin_users admin_row
      WHERE admin_row.user_id = auth.uid()
        AND admin_row.active = TRUE
    )
  );

-- Admins can also read raw events (recent-activity feed in the
-- dashboard). Users could previously only read their own.
DROP POLICY IF EXISTS "telemetry_events_admin_select_all" ON public.telemetry_events;
CREATE POLICY "telemetry_events_admin_select_all"
  ON public.telemetry_events
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.admin_users admin_row
      WHERE admin_row.user_id = auth.uid()
        AND admin_row.active = TRUE
    )
  );

-- Re-aggregates the trailing p_lookback_days of raw events into the
-- rollup table. Idempotent: recomputed days are overwritten.
CREATE OR REPLACE FUNCTION public.rollup_telemetry_daily(p_lookback_days INTEGER DEFAULT 3)
RETURNS VOID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  INSERT INTO public.telemetry_daily_rollups (day, event_type, event_count, unique_users, updated_at)
  SELECT
    (occurred_at AT TIME ZONE 'utc')::date AS day,
    event_type,
    COUNT(*)::integer,
    COUNT(DISTINCT user_id)::integer,
    NOW()
  FROM public.telemetry_events
  WHERE occurred_at >= NOW() - MAKE_INTERVAL(days => GREATEST(COALESCE(p_lookback_days, 3), 1))
  GROUP BY 1, 2
  ON CONFLICT (day, event_type) DO UPDATE
    SET event_count = EXCLUDED.event_count,
        unique_users = EXCLUDED.unique_users,
        updated_at = EXCLUDED.updated_at;
$$;

REVOKE ALL ON FUNCTION public.rollup_telemetry_daily(INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rollup_telemetry_daily(INTEGER) TO service_role;

COMMENT ON FUNCTION public.rollup_telemetry_daily(INTEGER)
IS 'Upserts daily telemetry_events aggregates into telemetry_daily_rollups; intended for scheduled cron execution.';

-- Backfill everything still present in telemetry_events at migration
-- time (raw retention starts pruning at 30 days, but older rows may
-- still exist when this first runs).
SELECT public.rollup_telemetry_daily(365);

-- Nightly at 02:45, before the 03:15 telemetry retention delete from
-- migration 0275, so no raw day expires without being rolled up.
DO $$
BEGIN
  IF to_regnamespace('cron') IS NOT NULL THEN
    PERFORM cron.unschedule(jobid)
    FROM cron.job
    WHERE jobname = 'telemetry-daily-rollup';

    PERFORM cron.schedule(
      'telemetry-daily-rollup',
      '45 2 * * *',
      $job$SELECT public.rollup_telemetry_daily(3);$job$
    );
  ELSE
    RAISE NOTICE 'cron extension is not enabled; skipping telemetry-daily-rollup schedule setup.';
  END IF;
END;
$$;
