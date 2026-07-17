-- Migration ledger version 01650001
-- Migration 0165: add guided gratitude as an allowed journal entry type

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'journal_entries_type_allowed_values'
      AND conrelid = 'public.journal_entries'::regclass
  ) THEN
    ALTER TABLE public.journal_entries
      DROP CONSTRAINT journal_entries_type_allowed_values;
  END IF;
END $$;

ALTER TABLE public.journal_entries
ADD CONSTRAINT journal_entries_type_allowed_values
CHECK (type IN (
  'quick',
  'deep',
  'brain_dump',
  'life_wheel',
  'secret',
  'goal',
  'time_capsule',
  'standard',
  'problem',
  'gratitude'
));

COMMENT ON COLUMN public.journal_entries.type IS
'Journal entry mode: quick, deep, brain_dump, life_wheel, secret, goal, time_capsule, standard, problem, or gratitude';

-- Consolidated companion migration (shared historical version).

-- Migration ledger version 01650002
-- Migration 0165: Add stage tracking for scaled habit logging

ALTER TABLE public.habit_logs_v2
ADD COLUMN IF NOT EXISTS logged_stage TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'habit_logs_v2_logged_stage_check'
  ) THEN
    ALTER TABLE public.habit_logs_v2
    ADD CONSTRAINT habit_logs_v2_logged_stage_check
    CHECK (logged_stage IS NULL OR logged_stage IN ('seed', 'minimum', 'standard'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_habit_logs_v2_logged_stage ON public.habit_logs_v2(logged_stage);
