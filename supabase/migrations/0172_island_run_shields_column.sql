-- Migration: 0172_island_run_shields_column
-- Adds shields wallet field to island_run_runtime_state for the Body Habit Shield currency (M17A)

ALTER TABLE island_run_runtime_state
  ADD COLUMN IF NOT EXISTS shields int not null default 0;
