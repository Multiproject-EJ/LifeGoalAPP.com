-- Migration 0178: Add goal_strategy_type column to goals table
-- Additive only: nullable with default 'standard' so all existing goals are unaffected.

ALTER TABLE public.goals
  ADD COLUMN IF NOT EXISTS goal_strategy_type text NOT NULL DEFAULT 'standard';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'goals_strategy_type_check'
      AND conrelid = 'public.goals'::regclass
  ) THEN
    ALTER TABLE public.goals
      ADD CONSTRAINT goals_strategy_type_check
      CHECK (goal_strategy_type IN (
        'standard', 'micro', 'anti_goal', 'process', 'experiment',
        'identity', 'friction_removal', 'hero_quest', 'reverse',
        'chaos', 'energy_based', 'constraint'
      ));
  END IF;
END$$;

COMMENT ON COLUMN public.goals.goal_strategy_type IS
  'The psychological pursuit strategy chosen for this goal. Defaults to standard. Used by the Goal Strategy Engine to render strategy-specific card modes and apply XP multipliers.';
