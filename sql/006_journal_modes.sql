-- Migration: Add support for multiple journal modes
-- This migration extends the journal_entries table to support different journaling modes
-- (quick, deep, brain_dump, life_wheel, secret, goal, time_capsule, standard)

-- Add new columns to journal_entries table
ALTER TABLE public.journal_entries
ADD COLUMN IF NOT EXISTS type text NOT NULL DEFAULT 'standard';

-- Numeric mood score on a 0-10 scale
-- Note: Using integer type to enforce whole numbers only (no fractional scores)
ALTER TABLE public.journal_entries
ADD COLUMN IF NOT EXISTS mood_score integer;

ALTER TABLE public.journal_entries
ADD COLUMN IF NOT EXISTS category text;

ALTER TABLE public.journal_entries
ADD COLUMN IF NOT EXISTS unlock_date timestamptz;

ALTER TABLE public.journal_entries
ADD COLUMN IF NOT EXISTS goal_id uuid REFERENCES public.goals(id) ON DELETE SET NULL;

-- Add constraints for data validation
-- Mood score should be between 0 and 10 if provided
ALTER TABLE public.journal_entries
ADD CONSTRAINT IF NOT EXISTS mood_score_range
CHECK (mood_score IS NULL OR (mood_score >= 0 AND mood_score <= 10));

-- Type should be one of the valid journal modes
ALTER TABLE public.journal_entries
ADD CONSTRAINT IF NOT EXISTS valid_journal_type
CHECK (type IN ('quick', 'deep', 'brain_dump', 'life_wheel', 'secret', 'goal', 'time_capsule', 'standard'));

-- Create an index on type for better query performance
CREATE INDEX IF NOT EXISTS idx_journal_entries_type ON public.journal_entries(type);

-- Create an index on goal_id for better query performance when filtering by goal
CREATE INDEX IF NOT EXISTS idx_journal_entries_goal_id ON public.journal_entries(goal_id);

-- Create an index on unlock_date for time capsule entries
CREATE INDEX IF NOT EXISTS idx_journal_entries_unlock_date ON public.journal_entries(unlock_date)
WHERE unlock_date IS NOT NULL;

-- Add comment to document the new fields
COMMENT ON COLUMN public.journal_entries.type IS 'Journal entry mode: quick, deep, brain_dump, life_wheel, secret, goal, time_capsule, or standard';
COMMENT ON COLUMN public.journal_entries.mood_score IS 'Numeric mood score on a 0-10 scale (separate from the string mood field)';
COMMENT ON COLUMN public.journal_entries.category IS 'Life Wheel category for life_wheel journal mode';
COMMENT ON COLUMN public.journal_entries.unlock_date IS 'Date when a time capsule entry becomes visible';
COMMENT ON COLUMN public.journal_entries.goal_id IS 'Primary goal reference for goal-specific journal entries. Use this for entries focused on a single goal. For entries that reference multiple goals, use the linked_goal_ids array instead.';
