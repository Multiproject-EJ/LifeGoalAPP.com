-- Migration 0178: Holiday Treats Calendar v2 columns
-- Adds two-door system, reward tiers, reveal mechanics, and season type to calendar tables.

-- daily_calendar_seasons: season type + personal/birthday calendar owner
ALTER TABLE daily_calendar_seasons
  ADD COLUMN IF NOT EXISTS season_type   text NOT NULL DEFAULT 'holiday'
    CHECK (season_type IN ('holiday', 'personal_quest', 'birthday', 'special_event')),
  ADD COLUMN IF NOT EXISTS user_id_owner uuid REFERENCES auth.users(id) ON DELETE CASCADE;

COMMENT ON COLUMN daily_calendar_seasons.season_type IS
  'holiday = admin-seeded holiday calendar; personal_quest = user weekly sprint; birthday = birthday week calendar; special_event = app milestone';
COMMENT ON COLUMN daily_calendar_seasons.user_id_owner IS
  'NULL for admin-seeded holiday seasons. Set to user id for personal_quest and birthday seasons.';

-- daily_calendar_hatches: two-door system + reward structure + reveal mechanic
ALTER TABLE daily_calendar_hatches
  ADD COLUMN IF NOT EXISTS door_type       text NOT NULL DEFAULT 'free'
    CHECK (door_type IN ('free', 'bonus')),
  ADD COLUMN IF NOT EXISTS reward_currency text
    CHECK (reward_currency IN ('gold', 'diamond') OR reward_currency IS NULL),
  ADD COLUMN IF NOT EXISTS reward_amount   integer,
  ADD COLUMN IF NOT EXISTS reward_tier     integer
    CHECK (reward_tier BETWEEN 1 AND 5 OR reward_tier IS NULL),
  ADD COLUMN IF NOT EXISTS reveal_mechanic text NOT NULL DEFAULT 'flip'
    CHECK (reveal_mechanic IN ('flip', 'scratch', 'unwrap'));

COMMENT ON COLUMN daily_calendar_hatches.door_type IS
  'free = always available; bonus = requires habit completion that day';
COMMENT ON COLUMN daily_calendar_hatches.reward_currency IS
  'gold | diamond | NULL (empty door / Type 1)';
COMMENT ON COLUMN daily_calendar_hatches.reward_amount IS
  'Gold coins (50–900) or diamond count (1–3). NULL for empty doors.';
COMMENT ON COLUMN daily_calendar_hatches.reward_tier IS
  '1=empty, 2=small_gold (50-150), 3=medium_gold (200-500), 4=large_gold (600-900), 5=diamond';
COMMENT ON COLUMN daily_calendar_hatches.reveal_mechanic IS
  'flip = CSS card flip; scratch = canvas scratch card; unwrap = gift/envelope CSS animation';

-- Unique constraint: one free door and one bonus door per (season, day)
ALTER TABLE daily_calendar_hatches
  DROP CONSTRAINT IF EXISTS daily_calendar_hatches_season_day_doortype_unique;
ALTER TABLE daily_calendar_hatches
  ADD CONSTRAINT daily_calendar_hatches_season_day_doortype_unique
    UNIQUE (season_id, day_index, door_type);
