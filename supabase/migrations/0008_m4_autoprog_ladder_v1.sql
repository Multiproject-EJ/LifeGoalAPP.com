-- Migration: Add M4 Auto-progress ladder v1 fields
-- Adds habit_environment (mandatory context field) and done_ish_config (partial completion settings)

-- Add habit_environment field to habits_v2
ALTER TABLE habits_v2
ADD COLUMN habit_environment TEXT;

-- Add done_ish_config field to habits_v2 (stores DoneIshConfig as JSON)
ALTER TABLE habits_v2
ADD COLUMN done_ish_config JSONB DEFAULT '{
  "booleanPartialEnabled": true,
  "quantityThresholdPercent": 80,
  "durationThresholdPercent": 80
}'::jsonb;

-- Add progress_state field to habit_logs_v2
-- This tracks done/doneIsh/skipped/missed for each completion
ALTER TABLE habit_logs_v2
ADD COLUMN progress_state TEXT DEFAULT 'done';

-- Add completion_percentage field to habit_logs_v2
-- This stores the calculated completion percentage (0-100)
ALTER TABLE habit_logs_v2
ADD COLUMN completion_percentage INTEGER DEFAULT 100;

-- Add constraint to ensure progress_state is valid
ALTER TABLE habit_logs_v2
ADD CONSTRAINT habit_logs_v2_progress_state_check 
CHECK (progress_state IN ('done', 'doneIsh', 'skipped', 'missed'));

-- Add constraint to ensure completion_percentage is 0-100
ALTER TABLE habit_logs_v2
ADD CONSTRAINT habit_logs_v2_completion_percentage_check 
CHECK (completion_percentage >= 0 AND completion_percentage <= 100);

-- Create index on progress_state for efficient filtering
CREATE INDEX idx_habit_logs_v2_progress_state ON habit_logs_v2(progress_state);

-- Create index on habit_environment for search (if needed later)
CREATE INDEX idx_habits_v2_habit_environment ON habits_v2 USING gin(to_tsvector('english', habit_environment));
