-- Migration 0233: Add Today reflection journal types
-- Enables lightweight simple reflections and habit investigation entries to be stored
-- in journal_entries with their own type values.

ALTER TABLE public.journal_entries
  DROP CONSTRAINT IF EXISTS journal_entries_type_allowed_values;

ALTER TABLE public.journal_entries
ADD CONSTRAINT journal_entries_type_allowed_values
CHECK (type IN (
  'quick', 'deep', 'brain_dump', 'life_wheel', 'secret', 'goal', 'time_capsule',
  'standard', 'problem', 'gratitude', 'dream', 'quick_simple', 'habit_investigation'
));

COMMENT ON COLUMN public.journal_entries.type IS 'Journal entry mode: quick, deep, brain_dump, life_wheel, secret, goal, time_capsule, standard, problem, gratitude, dream, quick_simple, or habit_investigation';
