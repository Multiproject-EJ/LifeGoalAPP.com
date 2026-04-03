-- Migration: Add sequential day tracking for treat (personal_quest) calendars
--
-- Personal Quest calendars now use sequential day progression instead of
-- date-based countdown. Day 1 = first open, Day 2 = next open (no matter
-- how many real days pass between opens). Holiday calendars still use
-- date-based tracking and allow catch-up on missed days.
--
-- This column stores the next sequential day the user should open.
-- For holiday calendars this column is unused (NULL).

ALTER TABLE daily_calendar_progress
  ADD COLUMN IF NOT EXISTS next_sequential_day integer DEFAULT 1;

-- Add a comment for documentation
COMMENT ON COLUMN daily_calendar_progress.next_sequential_day IS
  'Next sequential day to open for personal_quest calendars. NULL/unused for holiday calendars.';
