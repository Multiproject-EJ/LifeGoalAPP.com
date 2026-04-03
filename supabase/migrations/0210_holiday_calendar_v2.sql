-- ========================================================
-- HOLIDAY CALENDAR V2.0
-- Migration 0210: Enhanced calendar schema for two-door system,
-- personal quest calendars, and improved reward structure.
-- ========================================================

-- Add season_type to distinguish holiday vs personal quest calendars
ALTER TABLE public.daily_calendar_seasons
  ADD COLUMN IF NOT EXISTS season_type text NOT NULL DEFAULT 'holiday'
    CHECK (season_type IN ('holiday', 'personal_quest', 'birthday', 'special_event'));

-- Add user_id_owner for personal quest / birthday calendars
-- NULL = admin-seeded holiday; set = personal/birthday calendar owned by user
ALTER TABLE public.daily_calendar_seasons
  ADD COLUMN IF NOT EXISTS user_id_owner uuid REFERENCES auth.users(id) ON DELETE CASCADE;

-- Add door_type to distinguish free vs bonus doors
ALTER TABLE public.daily_calendar_hatches
  ADD COLUMN IF NOT EXISTS door_type text NOT NULL DEFAULT 'free'
    CHECK (door_type IN ('free', 'bonus'));

-- Add reward_currency to specify gold or diamond
ALTER TABLE public.daily_calendar_hatches
  ADD COLUMN IF NOT EXISTS reward_currency text
    CHECK (reward_currency IN ('gold', 'diamond') OR reward_currency IS NULL);

-- Add reward_amount for numeric reward value
ALTER TABLE public.daily_calendar_hatches
  ADD COLUMN IF NOT EXISTS reward_amount integer;

-- Add reward_tier (1=empty, 2=small_gold, 3=medium_gold, 4=large_gold, 5=diamond)
ALTER TABLE public.daily_calendar_hatches
  ADD COLUMN IF NOT EXISTS reward_tier integer
    CHECK (reward_tier BETWEEN 1 AND 5 OR reward_tier IS NULL);

-- Add reveal_mechanic to control animation type
ALTER TABLE public.daily_calendar_hatches
  ADD COLUMN IF NOT EXISTS reveal_mechanic text NOT NULL DEFAULT 'flip'
    CHECK (reveal_mechanic IN ('flip', 'scratch', 'unwrap'));

-- Update the unique constraint to allow both free and bonus doors per day
-- First drop the existing constraint
ALTER TABLE public.daily_calendar_hatches
  DROP CONSTRAINT IF EXISTS daily_calendar_hatches_season_id_day_index_key;

-- Add new composite unique constraint including door_type
ALTER TABLE public.daily_calendar_hatches
  ADD CONSTRAINT daily_calendar_hatches_season_day_door_unique
    UNIQUE (season_id, day_index, door_type);

-- Index for filtering personal quest seasons by owner
CREATE INDEX IF NOT EXISTS idx_daily_calendar_seasons_user_owner
  ON public.daily_calendar_seasons (user_id_owner)
  WHERE user_id_owner IS NOT NULL;

-- Index for filtering by season_type
CREATE INDEX IF NOT EXISTS idx_daily_calendar_seasons_type
  ON public.daily_calendar_seasons (season_type);

-- Update RLS policies for personal quest calendars
-- Users can view their own personal quest seasons
DROP POLICY IF EXISTS "Users can view their personal calendar seasons" ON public.daily_calendar_seasons;
CREATE POLICY "Users can view their personal calendar seasons"
  ON public.daily_calendar_seasons FOR SELECT
  USING (user_id_owner IS NULL OR auth.uid() = user_id_owner);

-- Users can insert their own personal quest seasons
DROP POLICY IF EXISTS "Users can insert personal calendar seasons" ON public.daily_calendar_seasons;
CREATE POLICY "Users can insert personal calendar seasons"
  ON public.daily_calendar_seasons FOR INSERT
  WITH CHECK (auth.uid() = user_id_owner);

-- Users can update their own personal quest seasons
DROP POLICY IF EXISTS "Users can update personal calendar seasons" ON public.daily_calendar_seasons;
CREATE POLICY "Users can update personal calendar seasons"
  ON public.daily_calendar_seasons FOR UPDATE
  USING (auth.uid() = user_id_owner)
  WITH CHECK (auth.uid() = user_id_owner);

-- Comments
COMMENT ON COLUMN public.daily_calendar_seasons.season_type IS
  'Type of calendar: holiday (admin-seeded), personal_quest (user-generated), birthday (user birthday week), special_event (admin special events)';

COMMENT ON COLUMN public.daily_calendar_seasons.user_id_owner IS
  'Owner user ID for personal quest and birthday calendars. NULL for admin-seeded holiday/special event calendars.';

COMMENT ON COLUMN public.daily_calendar_hatches.door_type IS
  'Door type: free (always openable) or bonus (requires habit completion)';

COMMENT ON COLUMN public.daily_calendar_hatches.reward_currency IS
  'Currency type for reward: gold or diamond. NULL for empty doors.';

COMMENT ON COLUMN public.daily_calendar_hatches.reward_amount IS
  'Numeric amount of reward. NULL for empty doors.';

COMMENT ON COLUMN public.daily_calendar_hatches.reward_tier IS
  'Reward tier: 1=empty, 2=small_gold (50-150), 3=medium_gold (200-500), 4=large_gold (600-900), 5=diamond (1-3)';

COMMENT ON COLUMN public.daily_calendar_hatches.reveal_mechanic IS
  'Animation type for revealing door: flip (3D card flip), scratch (canvas scratch), unwrap (gift/envelope unwrap)';
