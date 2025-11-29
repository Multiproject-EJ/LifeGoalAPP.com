-- ========================================================
-- MIGRATION 0010: Timezone Quiet Hours & Weekend Skip
-- Purpose: Add quiet hours and weekend skip to user reminder preferences
-- ========================================================

-- Add new columns to user_reminder_prefs table
ALTER TABLE public.user_reminder_prefs
  ADD COLUMN IF NOT EXISTS quiet_hours_start TIME NULL,
  ADD COLUMN IF NOT EXISTS quiet_hours_end TIME NULL,
  ADD COLUMN IF NOT EXISTS skip_weekends BOOLEAN DEFAULT FALSE;

-- Add CHECK constraints for valid time values (00:00:00 to 23:59:59)
-- Quiet hours can have overnight ranges (e.g., 22:00 to 06:00)
-- Both start and end must be provided together, or both null

ALTER TABLE public.user_reminder_prefs
  DROP CONSTRAINT IF EXISTS chk_quiet_hours_both_or_neither;

ALTER TABLE public.user_reminder_prefs
  ADD CONSTRAINT chk_quiet_hours_both_or_neither
  CHECK (
    (quiet_hours_start IS NULL AND quiet_hours_end IS NULL) OR
    (quiet_hours_start IS NOT NULL AND quiet_hours_end IS NOT NULL)
  );

-- Note: We allow overnight ranges (e.g., 22:00 to 06:00) where start > end
-- The application logic handles this case by checking if current time is
-- either >= start OR <= end when start > end

-- Add comment explaining the quiet hours logic
COMMENT ON COLUMN public.user_reminder_prefs.quiet_hours_start IS 
  'Start time for quiet hours (no reminders). Supports overnight ranges where start > end (e.g., 22:00-06:00).';

COMMENT ON COLUMN public.user_reminder_prefs.quiet_hours_end IS 
  'End time for quiet hours (no reminders). Supports overnight ranges where start > end (e.g., 22:00-06:00).';

COMMENT ON COLUMN public.user_reminder_prefs.skip_weekends IS 
  'When true, reminders are not sent on Saturday (6) or Sunday (0).';

-- RLS policies already exist for user_reminder_prefs from migration 0007
-- The existing "own_reminder_prefs" policy covers all columns:
--   FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id)
-- No additional RLS changes needed.
