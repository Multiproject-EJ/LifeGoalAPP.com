-- ========================================================
-- ADVENT CALENDAR HOLIDAY KEY
-- Migration 0177: Add holiday_key to daily_calendar_seasons
-- so each advent/countdown calendar can be tied to a specific
-- holiday from the user's holiday preference settings.
-- ========================================================

ALTER TABLE public.daily_calendar_seasons
  ADD COLUMN IF NOT EXISTS holiday_key text;

-- Index for filtering active seasons by holiday
CREATE INDEX IF NOT EXISTS idx_daily_calendar_seasons_holiday_key
  ON public.daily_calendar_seasons (holiday_key)
  WHERE holiday_key IS NOT NULL;

COMMENT ON COLUMN public.daily_calendar_seasons.holiday_key IS
  'Identifies the holiday this advent calendar belongs to (e.g. ''christmas'', ''halloween''). Matches the keys in holiday_preferences.holidays.';
