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
