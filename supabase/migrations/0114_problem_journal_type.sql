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
