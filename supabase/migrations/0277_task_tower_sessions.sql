-- ========================================================
-- TASK TOWER SESSIONS
-- Migration 0277: Server-side session telemetry for the
-- Task Tower mini-game (docs/gameplay/TASK_TOWER_V2_PLAN.md).
--
-- Context: the habit-game reward ledger (gold/dice/tokens) is
-- client-side localStorage by design, but Task Tower graduates
-- to public access in this release and needs durable, per-user
-- session records: one row per open, updated with final stats
-- when the player leaves through the rewards screen. Rows with
-- a NULL completed_at are abandoned sessions — useful signal on
-- their own. The game treats these writes as best-effort: an
-- offline or failed insert never blocks play (the local session
-- log remains the fallback).
--
-- Idempotent: safe to re-run.
-- ========================================================

CREATE TABLE IF NOT EXISTS public.task_tower_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  entered_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  tower_size integer NOT NULL DEFAULT 0,
  queued_count integer NOT NULL DEFAULT 0,
  blocks_cleared integer NOT NULL DEFAULT 0,
  storeys_cleared integer NOT NULL DEFAULT 0,
  coins_earned integer NOT NULL DEFAULT 0,
  dice_earned integer NOT NULL DEFAULT 0,
  tokens_earned integer NOT NULL DEFAULT 0,
  max_combo integer NOT NULL DEFAULT 0,
  duration_seconds integer NOT NULL DEFAULT 0,
  all_clear boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS task_tower_sessions_user_entered_idx
  ON public.task_tower_sessions (user_id, entered_at DESC);

ALTER TABLE public.task_tower_sessions ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'task_tower_sessions'
      AND policyname = 'task_tower_sessions_select_own'
  ) THEN
    CREATE POLICY task_tower_sessions_select_own
      ON public.task_tower_sessions
      FOR SELECT
      USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'task_tower_sessions'
      AND policyname = 'task_tower_sessions_insert_own'
  ) THEN
    CREATE POLICY task_tower_sessions_insert_own
      ON public.task_tower_sessions
      FOR INSERT
      WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'task_tower_sessions'
      AND policyname = 'task_tower_sessions_update_own'
  ) THEN
    CREATE POLICY task_tower_sessions_update_own
      ON public.task_tower_sessions
      FOR UPDATE
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END
$$;

-- Sessions are lightweight telemetry; keep a year of history at most so the
-- table can't quietly eat the db quota (see 0275 for the cron pattern).
DO $$
BEGIN
  IF to_regnamespace('cron') IS NOT NULL THEN
    PERFORM cron.unschedule(jobid)
    FROM cron.job
    WHERE jobname = 'task-tower-sessions-retention';

    PERFORM cron.schedule(
      'task-tower-sessions-retention',
      '20 3 * * *',
      $job$DELETE FROM public.task_tower_sessions WHERE entered_at < now() - interval '365 days';$job$
    );
  END IF;
END
$$;
