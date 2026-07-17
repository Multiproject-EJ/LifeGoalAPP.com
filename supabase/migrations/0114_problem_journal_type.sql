-- Migration ledger version 01140001
-- Migration 0114: Add 'problem' journal type with dedicated sections
-- This migration adds support for the Problem journal mode which includes:
-- 1. Brain dump section (uses existing content field with self-destruct in UI)
-- 2. Irrational fears section (preserved)
-- 3. Training on solutions section (preserved)
-- 4. Concrete steps section (preserved)

-- Add new columns for Problem journal sections
ALTER TABLE public.journal_entries
ADD COLUMN IF NOT EXISTS irrational_fears text;

ALTER TABLE public.journal_entries
ADD COLUMN IF NOT EXISTS training_solutions text;

ALTER TABLE public.journal_entries
ADD COLUMN IF NOT EXISTS concrete_steps text;

-- Update the type constraint to include 'problem'
-- First, drop the existing constraint
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'journal_entries_type_allowed_values'
    AND conrelid = 'public.journal_entries'::regclass
  ) THEN
    ALTER TABLE public.journal_entries
    DROP CONSTRAINT journal_entries_type_allowed_values;
  END IF;
END $$;

-- Add the updated constraint with 'problem' included
ALTER TABLE public.journal_entries
ADD CONSTRAINT journal_entries_type_allowed_values
CHECK (type IN ('quick', 'deep', 'brain_dump', 'life_wheel', 'secret', 'goal', 'time_capsule', 'standard', 'problem'));

-- Add comments to document the new fields
COMMENT ON COLUMN public.journal_entries.irrational_fears IS 'Problem journal mode: Section for identifying and acknowledging potential irrational fears';
COMMENT ON COLUMN public.journal_entries.training_solutions IS 'Problem journal mode: Section for writing dialogues, visualizing solutions, or practicing resolutions';
COMMENT ON COLUMN public.journal_entries.concrete_steps IS 'Problem journal mode: Section for actionable steps based on personality types (alarms, appointments, hints)';

-- Consolidated companion migration (shared historical version).

-- Migration ledger version 01140002
-- Migration 0114: Add metadata + review loop fields to vision_images

ALTER TABLE public.vision_images
  ADD COLUMN IF NOT EXISTS vision_type TEXT;

ALTER TABLE public.vision_images
  ADD COLUMN IF NOT EXISTS review_interval_days INTEGER DEFAULT 30;

ALTER TABLE public.vision_images
  ADD COLUMN IF NOT EXISTS last_reviewed_at TIMESTAMPTZ;

ALTER TABLE public.vision_images
  ADD COLUMN IF NOT EXISTS linked_goal_ids TEXT[];

ALTER TABLE public.vision_images
  ADD COLUMN IF NOT EXISTS linked_habit_ids TEXT[];

COMMENT ON COLUMN public.vision_images.vision_type IS 'Classification for the vision board entry (goal, habit, identity, experience, environment).';
COMMENT ON COLUMN public.vision_images.review_interval_days IS 'Number of days between review check-ins for a vision board item.';
COMMENT ON COLUMN public.vision_images.last_reviewed_at IS 'Timestamp of the most recent review check-in.';
COMMENT ON COLUMN public.vision_images.linked_goal_ids IS 'Goal IDs linked to this vision board entry.';
COMMENT ON COLUMN public.vision_images.linked_habit_ids IS 'Habit IDs linked to this vision board entry.';
