-- Migration 0211: Calendar progress bonus door tracking
-- Adds opened_bonus_days column to daily_calendar_progress so bonus door
-- opens are tracked separately from free door opens, consistent with the
-- two-door system introduced in migration 0210.

ALTER TABLE daily_calendar_progress
  ADD COLUMN IF NOT EXISTS opened_bonus_days integer[] NOT NULL DEFAULT '{}';

COMMENT ON COLUMN daily_calendar_progress.opened_bonus_days IS
  'Array of day_index values where the user has opened the bonus door. '
  'Mirrors opened_days but for bonus (habit-gated) doors.';
