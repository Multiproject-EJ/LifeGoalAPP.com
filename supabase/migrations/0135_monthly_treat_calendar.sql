-- ========================================================
-- MONTHLY TREAT CALENDAR SYSTEM
-- Migration 0135: Monthly scratch-card calendar backend
-- ========================================================

-- Calendar seasons define monthly cycles + themes
CREATE TABLE IF NOT EXISTS public.daily_calendar_seasons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  theme_name TEXT NOT NULL,
  starts_on DATE NOT NULL,
  ends_on DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived', 'draft')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Daily hatch definitions per season (optional preseeded rewards)
CREATE TABLE IF NOT EXISTS public.daily_calendar_hatches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  season_id UUID NOT NULL REFERENCES public.daily_calendar_seasons(id) ON DELETE CASCADE,
  day_index INTEGER NOT NULL,
  symbol_name TEXT,
  symbol_emoji TEXT,
  numbers INTEGER[],
  number_reward INTEGER,
  symbol_reward TEXT,
  reward_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (season_id, day_index)
);

-- Per-user progress for each season
CREATE TABLE IF NOT EXISTS public.daily_calendar_progress (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  season_id UUID NOT NULL REFERENCES public.daily_calendar_seasons(id) ON DELETE CASCADE,
  last_opened_date DATE,
  last_opened_day INTEGER,
  opened_days INTEGER[] NOT NULL DEFAULT '{}'::INTEGER[],
  symbol_counts JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, season_id)
);

-- Reward audit trail
CREATE TABLE IF NOT EXISTS public.daily_calendar_rewards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  season_id UUID NOT NULL REFERENCES public.daily_calendar_seasons(id) ON DELETE CASCADE,
  day_index INTEGER NOT NULL,
  reward_type TEXT NOT NULL,
  reward_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_daily_calendar_seasons_status ON public.daily_calendar_seasons(status);
CREATE INDEX IF NOT EXISTS idx_daily_calendar_seasons_dates ON public.daily_calendar_seasons(starts_on, ends_on);
CREATE INDEX IF NOT EXISTS idx_daily_calendar_hatches_season ON public.daily_calendar_hatches(season_id, day_index);
CREATE INDEX IF NOT EXISTS idx_daily_calendar_progress_user ON public.daily_calendar_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_daily_calendar_progress_season ON public.daily_calendar_progress(season_id);
CREATE INDEX IF NOT EXISTS idx_daily_calendar_rewards_user ON public.daily_calendar_rewards(user_id);
CREATE INDEX IF NOT EXISTS idx_daily_calendar_rewards_season ON public.daily_calendar_rewards(season_id);
CREATE INDEX IF NOT EXISTS idx_daily_calendar_rewards_created_at ON public.daily_calendar_rewards(created_at DESC);

-- RLS Policies
ALTER TABLE public.daily_calendar_seasons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_calendar_hatches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_calendar_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_calendar_rewards ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view daily calendar seasons" ON public.daily_calendar_seasons;
CREATE POLICY "Anyone can view daily calendar seasons"
  ON public.daily_calendar_seasons FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Anyone can view daily calendar hatches" ON public.daily_calendar_hatches;
CREATE POLICY "Anyone can view daily calendar hatches"
  ON public.daily_calendar_hatches FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Users can view their daily calendar progress" ON public.daily_calendar_progress;
CREATE POLICY "Users can view their daily calendar progress"
  ON public.daily_calendar_progress FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their daily calendar progress" ON public.daily_calendar_progress;
CREATE POLICY "Users can insert their daily calendar progress"
  ON public.daily_calendar_progress FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their daily calendar progress" ON public.daily_calendar_progress;
CREATE POLICY "Users can update their daily calendar progress"
  ON public.daily_calendar_progress FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view their daily calendar rewards" ON public.daily_calendar_rewards;
CREATE POLICY "Users can view their daily calendar rewards"
  ON public.daily_calendar_rewards FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their daily calendar rewards" ON public.daily_calendar_rewards;
CREATE POLICY "Users can insert their daily calendar rewards"
  ON public.daily_calendar_rewards FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Add trigger for updated_at
CREATE TRIGGER update_daily_calendar_seasons_updated_at
  BEFORE UPDATE ON public.daily_calendar_seasons
  FOR EACH ROW
  EXECUTE FUNCTION update_gamification_updated_at();

CREATE TRIGGER update_daily_calendar_progress_updated_at
  BEFORE UPDATE ON public.daily_calendar_progress
  FOR EACH ROW
  EXECUTE FUNCTION update_gamification_updated_at();

-- Comments
COMMENT ON TABLE public.daily_calendar_seasons IS 'Defines monthly treat calendar cycles and themes';
COMMENT ON TABLE public.daily_calendar_hatches IS 'Optional preseeded reward data per day in a season';
COMMENT ON TABLE public.daily_calendar_progress IS 'Tracks per-user treat calendar progress and symbol counts';
COMMENT ON TABLE public.daily_calendar_rewards IS 'Audit log of rewards granted from daily treat hatches';
