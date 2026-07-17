-- Migration ledger version 01160001
-- ========================================================
-- ANNUAL REVIEWS & GOALS - NEW YEAR'S MANIFEST FEATURE
-- Migration 0116: Annual Reviews, Goals, and Stats Function
-- ========================================================

-- Ensure pgcrypto for gen_random_uuid
DO $$
BEGIN
  PERFORM gen_random_uuid();
EXCEPTION
  WHEN undefined_function THEN
    CREATE EXTENSION IF NOT EXISTS pgcrypto;
END$$;

-- ========================================================
-- ANNUAL REVIEWS TABLE
-- Stores year-end reflections and overall ratings
-- ========================================================

CREATE TABLE IF NOT EXISTS public.annual_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  year int NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  reflection_text text,
  overall_rating int CHECK (overall_rating IS NULL OR (overall_rating >= 1 AND overall_rating <= 10)),
  UNIQUE (user_id, year)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_annual_reviews_user_id ON public.annual_reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_annual_reviews_year ON public.annual_reviews(year);

-- Enable RLS
ALTER TABLE public.annual_reviews ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only access their own annual reviews
DROP POLICY IF EXISTS "own annual reviews" ON public.annual_reviews;
CREATE POLICY "own annual reviews" ON public.annual_reviews
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Add helpful comments
COMMENT ON TABLE public.annual_reviews IS 'Stores year-end reflections and ratings for the New Year Manifest feature';
COMMENT ON COLUMN public.annual_reviews.year IS 'The year being reviewed (e.g., 2024)';
COMMENT ON COLUMN public.annual_reviews.reflection_text IS 'User reflection text about the year';
COMMENT ON COLUMN public.annual_reviews.overall_rating IS 'Overall rating of the year from 1 to 10';

-- ========================================================
-- ANNUAL GOALS TABLE
-- Stores goals linked to annual reviews and Life Wheel categories
-- ========================================================

CREATE TABLE IF NOT EXISTS public.annual_goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id uuid NOT NULL REFERENCES public.annual_reviews(id) ON DELETE CASCADE,
  category text NOT NULL,
  goal_statement text NOT NULL,
  vision_image_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_annual_goals_review_id ON public.annual_goals(review_id);
CREATE INDEX IF NOT EXISTS idx_annual_goals_category ON public.annual_goals(category);

-- Enable RLS
ALTER TABLE public.annual_goals ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only access annual goals for reviews they own
DROP POLICY IF EXISTS "own annual goals" ON public.annual_goals;
CREATE POLICY "own annual goals" ON public.annual_goals
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.annual_reviews
      WHERE annual_reviews.id = annual_goals.review_id
      AND annual_reviews.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.annual_reviews
      WHERE annual_reviews.id = annual_goals.review_id
      AND annual_reviews.user_id = auth.uid()
    )
  );

-- Add helpful comments
COMMENT ON TABLE public.annual_goals IS 'Stores goals for each annual review, linked to Life Wheel categories';
COMMENT ON COLUMN public.annual_goals.category IS 'Life Wheel category (e.g., health, career, relationships, etc.)';
COMMENT ON COLUMN public.annual_goals.goal_statement IS 'The goal statement for this category';
COMMENT ON COLUMN public.annual_goals.vision_image_url IS 'Optional URL to vision board image for this goal';

-- ========================================================
-- GET_YEAR_IN_REVIEW_STATS RPC FUNCTION
-- Returns aggregated stats for a given year:
--   - Total habits completed: Count of habit completions within the year
--   - Longest streak: Overall best streak across all habits (not year-specific,
--     as streaks can span years; provides context on user consistency)
--   - Most active category: The Life Wheel category with most completions in the year
-- ========================================================

CREATE OR REPLACE FUNCTION public.get_year_in_review_stats(year_input int)
RETURNS TABLE (
  total_habits_completed bigint,
  longest_streak int,
  most_active_category text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_start_date date;
  v_end_date date;
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  
  -- Calculate date range for the year
  v_start_date := make_date(year_input, 1, 1);
  v_end_date := make_date(year_input, 12, 31);
  
  RETURN QUERY
  WITH habit_completions_count AS (
    -- Count total habits completed in the year from habit_logs_v2
    SELECT COUNT(*) AS total_completed
    FROM public.habit_logs_v2
    WHERE user_id = v_user_id
      AND done = true
      AND date >= v_start_date
      AND date <= v_end_date
  ),
  streak_data AS (
    -- Get the longest streak from v_habit_streaks for user's habits
    SELECT COALESCE(MAX(vs.best_streak), 0) AS max_streak
    FROM public.v_habit_streaks vs
    INNER JOIN public.habits_v2 h ON h.id = vs.habit_id
    WHERE h.user_id = v_user_id
  ),
  category_activity AS (
    -- Find the most active category (domain_key) based on completed habits
    SELECT h.domain_key, COUNT(*) AS completion_count
    FROM public.habit_logs_v2 l
    INNER JOIN public.habits_v2 h ON h.id = l.habit_id
    WHERE l.user_id = v_user_id
      AND l.done = true
      AND l.date >= v_start_date
      AND l.date <= v_end_date
      AND h.domain_key IS NOT NULL
    GROUP BY h.domain_key
    ORDER BY completion_count DESC
    LIMIT 1
  )
  SELECT 
    hc.total_completed,
    sd.max_streak,
    ca.domain_key
  FROM habit_completions_count hc
  CROSS JOIN streak_data sd
  LEFT JOIN category_activity ca ON true;
END;
$$;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION public.get_year_in_review_stats(int) TO authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION public.get_year_in_review_stats IS 'Returns aggregated stats for a given year: total habits completed (in-year), longest streak (overall best across all habits), and most active category (in-year)';

-- Consolidated companion migration (shared historical version).

-- Migration ledger version 01160002
-- ========================================================
-- DAILY SPIN WHEEL SYSTEM
-- Migration 0116: Daily reward spin mechanism
-- ========================================================

-- Daily spin state table
CREATE TABLE IF NOT EXISTS public.daily_spin_state (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  last_spin_date DATE,
  spins_available INTEGER NOT NULL DEFAULT 0,
  total_spins_used INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Spin history log
CREATE TABLE IF NOT EXISTS public.spin_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  prize_type TEXT NOT NULL, -- 'xp', 'points', 'streak_freeze', 'life', 'mystery'
  prize_value INTEGER NOT NULL,
  prize_details JSONB DEFAULT '{}'::jsonb, -- Extra data for mystery prizes
  spun_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_daily_spin_state_user_id ON public.daily_spin_state(user_id);
CREATE INDEX IF NOT EXISTS idx_daily_spin_state_last_spin ON public.daily_spin_state(last_spin_date);
CREATE INDEX IF NOT EXISTS idx_spin_history_user_id ON public.spin_history(user_id);
CREATE INDEX IF NOT EXISTS idx_spin_history_spun_at ON public.spin_history(spun_at DESC);

-- RLS Policies
ALTER TABLE public.daily_spin_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.spin_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own spin state" ON public.daily_spin_state;
CREATE POLICY "Users can view their own spin state"
  ON public.daily_spin_state FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own spin state" ON public.daily_spin_state;
CREATE POLICY "Users can insert their own spin state"
  ON public.daily_spin_state FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own spin state" ON public.daily_spin_state;
CREATE POLICY "Users can update their own spin state"
  ON public.daily_spin_state FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view their own spin history" ON public.spin_history;
CREATE POLICY "Users can view their own spin history"
  ON public.spin_history FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own spin history" ON public.spin_history;
CREATE POLICY "Users can insert their own spin history"
  ON public.spin_history FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Add trigger for updated_at
DROP TRIGGER IF EXISTS update_daily_spin_state_updated_at
  ON public.daily_spin_state;
CREATE TRIGGER update_daily_spin_state_updated_at
  BEFORE UPDATE ON public.daily_spin_state
  FOR EACH ROW
  EXECUTE FUNCTION update_gamification_updated_at();

-- Add new spin-based achievements
INSERT INTO public.achievements (achievement_key, name, description, icon, xp_reward, tier, category, requirement_type, requirement_value)
VALUES
  ('lucky_spinner', 'Lucky Spinner', 'Use the daily spin 7 times', '🎰', 100, 'bronze', 'general', 'spins_used', 7),
  ('spin_master', 'Spin Master', 'Use the daily spin 30 times', '🎯', 300, 'silver', 'general', 'spins_used', 30),
  ('jackpot', 'Jackpot!', 'Win the mystery prize from daily spin', '🎁', 200, 'gold', 'general', 'mystery_wins', 1)
ON CONFLICT (achievement_key) DO NOTHING;

-- Comments
COMMENT ON TABLE public.daily_spin_state IS 'Tracks daily spin availability and usage per user';
COMMENT ON TABLE public.spin_history IS 'Logs all spin results for analytics and achievement tracking';
