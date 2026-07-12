-- ========================================================
-- PER-USER DATA LIMITS
-- Migration 0278: hard caps on user-generated rows
--
-- Context: migration 0275 added time-based retention for the
-- operational log tables that once tripped the free-tier db
-- size quota (exceed_db_size_quota). What was still missing is
-- a bound on *user-generated* content: every insert path
-- (journal, vision board, habits, AI chat, gamification logs)
-- was open-ended, so a single account — e.g. a script or an AI
-- agent looping on the public API — could grow the database
-- without limit.
--
-- Design:
--   * public.user_data_limits is a config table mapping a table
--     name to (max_rows per user, max_row_bytes per row). Limits
--     are data, not code: ops can raise/lower a cap from the
--     dashboard without a deploy.
--   * public.enforce_user_data_limit() is one generic BEFORE
--     INSERT OR UPDATE trigger. On INSERT it counts the user's
--     existing rows (index-backed) and rejects at the cap; on
--     both INSERT and UPDATE it rejects rows larger than
--     max_row_bytes, so a row cannot be created small and then
--     bloated by updates.
--   * public.attach_user_data_limit_triggers() attaches the
--     trigger (and a supporting user-column index) to every
--     configured table that exists. Missing tables/columns are
--     skipped with a NOTICE, so this migration is safe on
--     environments that lag behind.
--
-- Failure contract (client depends on this exact prefix):
--   USER_DATA_LIMIT_EXCEEDED: ...
-- The service-resilience error translator classifies it as the
-- non-retryable `user_limit_reached` category, so rejected
-- writes surface to the user immediately and are never parked
-- on the offline queue.
--
-- The caps and their worst-case math are documented in
-- docs/DATA_LIMITS.md.
-- ========================================================

-- ── 1. Config table ─────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.user_data_limits (
  table_name text PRIMARY KEY,
  user_column text NOT NULL DEFAULT 'user_id',
  -- NULL disables the row-count cap for that table.
  max_rows integer CHECK (max_rows IS NULL OR max_rows > 0),
  -- NULL disables the per-row size cap for that table.
  max_row_bytes integer CHECK (max_row_bytes IS NULL OR max_row_bytes > 0),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.user_data_limits IS
  'Per-user caps on user-generated tables, enforced by enforce_user_data_limit(). Tune values here (service role / dashboard); re-run attach_user_data_limit_triggers() after adding a new table.';

ALTER TABLE public.user_data_limits ENABLE ROW LEVEL SECURITY;

-- Signed-in clients may read the caps (to show "37 of 50 used"
-- style UI); nobody below service role may change them.
DROP POLICY IF EXISTS user_data_limits_select ON public.user_data_limits;
CREATE POLICY user_data_limits_select ON public.user_data_limits
  FOR SELECT TO authenticated USING (true);

-- ── 2. Generic enforcement trigger ──────────────────────────

CREATE OR REPLACE FUNCTION public.enforce_user_data_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  cfg public.user_data_limits%ROWTYPE;
  owner_id uuid;
  existing_rows bigint;
  row_bytes integer;
BEGIN
  SELECT * INTO cfg FROM public.user_data_limits WHERE table_name = TG_TABLE_NAME;
  IF NOT FOUND THEN
    RETURN NEW;
  END IF;

  -- Size cap: applies to inserts and updates alike, so rows
  -- cannot grow past the cap after creation. A row that already
  -- exceeded the cap before limits existed stays editable as
  -- long as the update does not grow it further.
  -- The grow check compares NEW and OLD as serialized text because
  -- pg_column_size(OLD) sees the stored (TOAST-compressed) row while
  -- pg_column_size(NEW) sees the uncompressed in-memory row — those
  -- two numbers are not comparable.
  IF cfg.max_row_bytes IS NOT NULL THEN
    row_bytes := pg_column_size(NEW);
    IF row_bytes > cfg.max_row_bytes
       AND (TG_OP = 'INSERT' OR octet_length(NEW::text) > octet_length(OLD::text)) THEN
      RAISE EXCEPTION
        'USER_DATA_LIMIT_EXCEEDED: item too large for % (% bytes, limit % bytes)',
        TG_TABLE_NAME, row_bytes, cfg.max_row_bytes
        USING HINT = 'Shorten the content and try again.';
    END IF;
  END IF;

  -- Row-count cap: inserts only.
  IF TG_OP = 'INSERT' AND cfg.max_rows IS NOT NULL THEN
    EXECUTE format('SELECT ($1).%I', cfg.user_column) INTO owner_id USING NEW;
    IF owner_id IS NOT NULL THEN
      EXECUTE format(
        'SELECT count(*) FROM %I.%I WHERE %I = $1',
        TG_TABLE_SCHEMA, TG_TABLE_NAME, cfg.user_column
      ) INTO existing_rows USING owner_id;
      IF existing_rows >= cfg.max_rows THEN
        RAISE EXCEPTION
          'USER_DATA_LIMIT_EXCEEDED: % is limited to % items per account',
          TG_TABLE_NAME, cfg.max_rows
          USING HINT = 'Delete items you no longer need, then try again.';
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- ── 3. Trigger/index attachment helper ──────────────────────

CREATE OR REPLACE FUNCTION public.attach_user_data_limit_triggers()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  cfg record;
BEGIN
  FOR cfg IN SELECT table_name, user_column FROM public.user_data_limits LOOP
    IF to_regclass(format('public.%I', cfg.table_name)) IS NULL THEN
      RAISE NOTICE 'user_data_limits: table public.% does not exist; skipping', cfg.table_name;
      CONTINUE;
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = cfg.table_name
        AND column_name = cfg.user_column
    ) THEN
      RAISE NOTICE 'user_data_limits: %.% has no column %; skipping', 'public', cfg.table_name, cfg.user_column;
      CONTINUE;
    END IF;

    -- The count in the trigger must stay an index scan.
    EXECUTE format(
      'CREATE INDEX IF NOT EXISTS %I ON public.%I (%I)',
      'idx_' || cfg.table_name || '_' || cfg.user_column || '_limit',
      cfg.table_name, cfg.user_column
    );

    EXECUTE format('DROP TRIGGER IF EXISTS trg_user_data_limit ON public.%I', cfg.table_name);
    EXECUTE format(
      'CREATE TRIGGER trg_user_data_limit
         BEFORE INSERT OR UPDATE ON public.%I
         FOR EACH ROW EXECUTE FUNCTION public.enforce_user_data_limit()',
      cfg.table_name
    );
  END LOOP;
END;
$$;

-- ── 4. Seed the caps ─────────────────────────────────────────
-- ON CONFLICT DO NOTHING: re-running this migration never
-- clobbers values ops has tuned since. Rationale and worst-case
-- math for every number: docs/DATA_LIMITS.md.

INSERT INTO public.user_data_limits (table_name, user_column, max_rows, max_row_bytes) VALUES
  -- Core content
  ('journal_entries',          'user_id',  10000,  10240),
  ('habits',                   'user_id',    200,  10240),
  ('habit_logs',               'user_id',  50000,   2048),
  ('habit_completions',        'user_id',  50000,   2048),
  ('habit_analysis_sessions',  'user_id',   1000,  51200),
  ('vb_boards',                'user_id',     20,  10240),
  ('vb_cards',                 'user_id',    500,  10240),
  ('vision_board_image_tags',  'user_id',   2000,   2048),
  ('actions',                  'user_id',   2000,  10240),
  ('projects',                 'user_id',    200,  10240),
  ('project_tasks',            'user_id',   5000,  10240),
  ('today_todos',              'user_id',   1000,  10240),
  ('routines',                 'user_id',    100,  10240),
  ('routine_logs',             'user_id',  20000,   2048),
  ('annual_reviews',           'user_id',    100, 102400),
  ('goal_snapshots',           'user_id',   2000,  25600),
  ('compass_books',            'user_id',    100, 102400),
  ('environment_audits',       'user_id',   1000,  25600),
  -- Health / activity tracking
  ('meditation_sessions',      'user_id',  20000,   2048),
  ('workout_sessions',         'user_id',  10000,   5120),
  ('exercise_logs',            'user_id',  50000,   2048),
  ('personal_records',         'user_id',   2000,   2048),
  -- AI coach chat
  ('ai_coach_threads',         'user_id',    500,   5120),
  ('ai_coach_messages',        'user_id',  10000,   8192),
  -- Reminders / device state
  ('scheduled_reminders',      'user_id',    500,   5120),
  ('push_subscriptions',       'user_id',     20,   5120),
  ('feature_votes',            'user_id',    500,   2048),
  -- Gamification / operational logs (telemetry_events and
  -- island_run_action_log also have time-based retention, 0275)
  ('telemetry_events',         'user_id',  25000,   2048),
  ('xp_transactions',          'user_id',  50000,   1024),
  ('spin_history',             'user_id',  10000,   1024),
  ('power_up_transactions',    'user_id',  10000,   1024),
  ('task_tower_sessions',      'user_id',  10000,   5120),
  -- Row size deliberately uncapped: rows carry full runtime
  -- snapshots by design; 48h retention (0275) bounds total size.
  ('island_run_action_log',    'user_id',   5000,   NULL)
ON CONFLICT (table_name) DO NOTHING;

-- ── 5. Attach ────────────────────────────────────────────────

SELECT public.attach_user_data_limit_triggers();
