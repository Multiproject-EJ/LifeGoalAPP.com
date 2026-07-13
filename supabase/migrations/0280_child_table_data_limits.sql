-- ========================================================
-- CHILD-TABLE DATA LIMITS
-- Migration 0280: extend the 0278 caps to parent-scoped tables
--
-- Context: migration 0278 caps tables that carry a user_id.
-- Several user-writable tables instead hang off a parent by a
-- foreign key and have no user_id column, so 0278 skipped them:
--   annual_goals          -> review_id  (annual_reviews)
--   vb_sections           -> board_id   (vb_boards)
--   habit_experiment_days -> session_id (habit_analysis_sessions)
--   life_goal_steps       -> goal_id    (goals)
--   life_goal_substeps    -> step_id    (life_goal_steps)
-- They were only bounded indirectly by their parents' caps.
--
-- The 0278 trigger already counts rows grouped by whatever
-- column `user_column` names, so a *per-parent* cap needs no new
-- trigger logic — pointing `user_column` at the parent FK counts
-- siblings sharing that parent. Total per user is then bounded by
-- (parent cap) x (per-parent child cap). `goals` itself carries a
-- user_id, so it is capped per account directly (it was defined
-- in the legacy reference schema and missed by 0278).
--
-- The only gap was messaging: the count-cap error hard-coded
-- "per account". This migration adds a scope_label column and
-- teaches the trigger to use it, so a rejection reads e.g.
-- "vb_sections is limited to 100 items per board".
--
-- Tables that do not exist in a given environment are skipped by
-- attach_user_data_limit_triggers() with a NOTICE, so seeding
-- rows here is safe regardless of which features are deployed.
-- Worst-case math: docs/DATA_LIMITS.md.
-- ========================================================

-- ── 1. Per-scope labelling ──────────────────────────────────

ALTER TABLE public.user_data_limits
  ADD COLUMN IF NOT EXISTS scope_label text NOT NULL DEFAULT 'account';

COMMENT ON COLUMN public.user_data_limits.user_column IS
  'Column the row-count cap groups by: user_id for per-account caps, or a parent FK (e.g. board_id) for per-parent caps.';
COMMENT ON COLUMN public.user_data_limits.scope_label IS
  'Human label for the counting scope, used in the rejection message (e.g. account, board, review).';

-- ── 2. Teach the trigger to report the scope ────────────────
-- Identical to 0278 except the count-cap message uses scope_label.

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

  -- Row-count cap: inserts only, grouped by the configured scope.
  IF TG_OP = 'INSERT' AND cfg.max_rows IS NOT NULL THEN
    EXECUTE format('SELECT ($1).%I', cfg.user_column) INTO owner_id USING NEW;
    IF owner_id IS NOT NULL THEN
      EXECUTE format(
        'SELECT count(*) FROM %I.%I WHERE %I = $1',
        TG_TABLE_SCHEMA, TG_TABLE_NAME, cfg.user_column
      ) INTO existing_rows USING owner_id;
      IF existing_rows >= cfg.max_rows THEN
        RAISE EXCEPTION
          'USER_DATA_LIMIT_EXCEEDED: % is limited to % items per %',
          TG_TABLE_NAME, cfg.max_rows, cfg.scope_label
          USING HINT = 'Delete items you no longer need, then try again.';
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- ── 3. Seed the child-table caps ─────────────────────────────

INSERT INTO public.user_data_limits (table_name, user_column, scope_label, max_rows, max_row_bytes) VALUES
  -- Directly user-owned but missed by 0278 (legacy reference schema).
  ('goals',                 'user_id',    'account', 500, 10240),
  -- Parent-scoped children (total per user = parent cap x these).
  ('annual_goals',          'review_id',  'review',            100,  4096),
  ('vb_sections',           'board_id',   'board',             100,  4096),
  ('habit_experiment_days', 'session_id', 'analysis session',  100,  4096),
  ('life_goal_steps',       'goal_id',    'goal',              100,  5120),
  ('life_goal_substeps',    'step_id',    'step',               50,  5120)
ON CONFLICT (table_name) DO NOTHING;

-- ── 4. Attach (skips absent tables/columns with a NOTICE) ────

SELECT public.attach_user_data_limit_triggers();
