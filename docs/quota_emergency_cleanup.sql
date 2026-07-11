-- ========================================================
-- EMERGENCY: reclaim database space after exceed_db_size_quota
--
-- Run this in the Supabase Dashboard > SQL Editor when the
-- project is restricted for exceeding the db size quota.
--
-- As of 2026-07-11 the database was 2,151 MB, of which:
--   island_run_action_log   1,895 MB  (full state snapshot per action)
--   cron.job_run_details      172 MB  (pg_cron run history, never pruned)
--   telemetry_events           46 MB
-- Everything else (real app data) was ~40 MB.
--
-- TRUNCATE returns disk to the OS immediately — no VACUUM needed.
-- Safe to run: none of these tables hold user-facing app state.
-- island_run_action_log is only read to replay a duplicate
-- client_action_id retried within seconds, so wiping it at rest
-- is harmless.
-- ========================================================

TRUNCATE public.island_run_action_log;
TRUNCATE public.telemetry_events;
TRUNCATE cron.job_run_details;

-- Verify: should report well under 500 MB afterwards.
SELECT pg_size_pretty(pg_database_size(current_database())) AS total_db_size;

-- Note: Supabase lifts the restriction automatically after the
-- next usage check detects the project is back under quota (can
-- take up to ~1 hour). Migration 0275 schedules nightly cleanup
-- jobs so this never happens again.
