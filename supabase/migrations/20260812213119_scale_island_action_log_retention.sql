-- Scale Island Run's idempotency-log cleanup without introducing large delete
-- transactions. Rows remain available for 48 hours; each run deletes at most
-- 5,000 expired rows, and the same job never has overlapping executions.
--
-- Production already has ops.delete_old_rows(...), installed by the earlier
-- retention repair. The bounded inline command keeps this migration safe for a
-- fresh environment where that helper is not present.
--
-- Rollback (cadence only; keeps the bounded command and does not delete data):
--   select cron.alter_job(
--     job_id := (
--       select jobid
--       from cron.job
--       where jobname = 'island-run-action-log-retention'
--     ),
--     schedule := '10 3 * * *',
--     active := true
--   );

DO $migration$
DECLARE
  v_job_id bigint;
  v_cleanup_command text;
BEGIN
  IF to_regnamespace('cron') IS NULL THEN
    RAISE NOTICE 'cron extension is not enabled; skipping Island Run retention schedule update.';
  ELSE
    IF to_regclass('public.island_run_action_log') IS NULL THEN
      RAISE EXCEPTION 'public.island_run_action_log is required for its retention job';
    END IF;

    IF to_regprocedure(
      'ops.delete_old_rows(regclass,name,timestamptz,integer)'
    ) IS NOT NULL THEN
      v_cleanup_command := $job$
        select ops.delete_old_rows(
          'public.island_run_action_log'::regclass,
          'created_at',
          clock_timestamp() - interval '48 hours',
          5000
        );
      $job$;
    ELSE
      v_cleanup_command := $job$
        with victims as (
          select ctid
          from public.island_run_action_log
          where created_at < clock_timestamp() - interval '48 hours'
          order by created_at
          limit 5000
        )
        delete from public.island_run_action_log as target
        using victims
        where target.ctid = victims.ctid;
      $job$;
    END IF;

    SELECT jobid
      INTO v_job_id
    FROM cron.job
    WHERE jobname = 'island-run-action-log-retention';

    IF v_job_id IS NULL THEN
      PERFORM cron.schedule(
        'island-run-action-log-retention',
        '*/5 * * * *',
        v_cleanup_command
      );
    ELSE
      PERFORM cron.alter_job(
        job_id := v_job_id,
        schedule := '*/5 * * * *',
        command := v_cleanup_command,
        active := true
      );
    END IF;
  END IF;
END;
$migration$;
