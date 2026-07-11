-- ========================================================
-- LOG RETENTION AUTO-CLEANUP
-- Migration 0275: Scheduled cleanup of operational log tables
--
-- Context: island_run_action_log stores a full runtime-state
-- snapshot in payload_json AND response_json for every game
-- action (see 0217). The log's only read path is idempotent
-- replay of a recently retried client_action_id, so rows older
-- than a couple of days are dead weight. Left unchecked it grew
-- to ~1.9 GB and tripped the free-tier db size quota
-- (exceed_db_size_quota), taking the whole project down.
-- telemetry_events and pg_cron's own job_run_details history
-- (the due-sweep in 0144 runs every 15 minutes) grow unbounded
-- for the same reason.
-- ========================================================

DO $$
BEGIN
  IF to_regnamespace('cron') IS NOT NULL THEN
    -- Island Run action log: only needed for short-window idempotent
    -- retries; 48 hours is generous.
    PERFORM cron.unschedule(jobid)
    FROM cron.job
    WHERE jobname = 'island-run-action-log-retention';

    PERFORM cron.schedule(
      'island-run-action-log-retention',
      '10 3 * * *',
      $job$DELETE FROM public.island_run_action_log WHERE created_at < now() - interval '48 hours';$job$
    );

    -- Telemetry events: keep 30 days of raw events for stats/rollups.
    PERFORM cron.unschedule(jobid)
    FROM cron.job
    WHERE jobname = 'telemetry-events-retention';

    PERFORM cron.schedule(
      'telemetry-events-retention',
      '15 3 * * *',
      $job$DELETE FROM public.telemetry_events WHERE occurred_at < now() - interval '30 days';$job$
    );

    -- pg_cron run history: with a job every 15 minutes this table
    -- accumulates ~35k rows/year and is never pruned by pg_cron itself.
    PERFORM cron.unschedule(jobid)
    FROM cron.job
    WHERE jobname = 'cron-job-run-details-retention';

    PERFORM cron.schedule(
      'cron-job-run-details-retention',
      '20 3 * * *',
      $job$DELETE FROM cron.job_run_details WHERE end_time < now() - interval '3 days';$job$
    );
  ELSE
    RAISE NOTICE 'cron extension is not enabled; skipping log retention schedule setup.';
  END IF;
END;
$$;
