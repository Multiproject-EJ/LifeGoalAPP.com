-- Migration: Meditation Goals Tracking System
-- Description: Create tables for meditation goal tracking with countdown, daily completions, and progress

-- =====================================================
-- 1. MEDITATION GOALS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS meditation_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  target_days INTEGER NOT NULL DEFAULT 5,
  completed_days INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  reminder_time TIME,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- 2. DAILY COMPLETIONS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS daily_completions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id UUID NOT NULL REFERENCES meditation_goals(id) ON DELETE CASCADE,
  completion_date DATE NOT NULL,
  duration_minutes INTEGER,
  activity_type VARCHAR(50) NOT NULL CHECK (activity_type IN ('meditation', 'breathing', 'body')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(goal_id, completion_date)
);

-- =====================================================
-- 3. USER SKILLS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS user_skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  skill_name VARCHAR(100) NOT NULL,
  skill_level INTEGER NOT NULL DEFAULT 1,
  experience_points INTEGER NOT NULL DEFAULT 0,
  unlocked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, skill_name)
);

-- =====================================================
-- 4. DAILY CHALLENGES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS daily_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  challenge_date DATE NOT NULL,
  challenge_type VARCHAR(50) NOT NULL CHECK (challenge_type IN ('duration', 'frequency', 'variety')),
  description TEXT NOT NULL,
  target_value INTEGER NOT NULL,
  current_progress INTEGER NOT NULL DEFAULT 0,
  bonus_xp INTEGER NOT NULL DEFAULT 50,
  is_completed BOOLEAN NOT NULL DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, challenge_date)
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_meditation_goals_user_id ON meditation_goals(user_id);
CREATE INDEX IF NOT EXISTS idx_meditation_goals_active ON meditation_goals(user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_daily_completions_goal_id ON daily_completions(goal_id);
CREATE INDEX IF NOT EXISTS idx_daily_completions_date ON daily_completions(completion_date DESC);
CREATE INDEX IF NOT EXISTS idx_user_skills_user_id ON user_skills(user_id);
CREATE INDEX IF NOT EXISTS idx_daily_challenges_user_date ON daily_challenges(user_id, challenge_date);

-- =====================================================
-- ROW LEVEL SECURITY POLICIES
-- =====================================================

-- Enable RLS
ALTER TABLE meditation_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_completions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_challenges ENABLE ROW LEVEL SECURITY;

-- Meditation Goals Policies
CREATE POLICY "Users can view their own meditation goals"
  ON meditation_goals FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own meditation goals"
  ON meditation_goals FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own meditation goals"
  ON meditation_goals FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own meditation goals"
  ON meditation_goals FOR DELETE
  USING (auth.uid() = user_id);

-- Daily Completions Policies
CREATE POLICY "Users can view their own daily completions"
  ON daily_completions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM meditation_goals
      WHERE meditation_goals.id = daily_completions.goal_id
      AND meditation_goals.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert their own daily completions"
  ON daily_completions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM meditation_goals
      WHERE meditation_goals.id = daily_completions.goal_id
      AND meditation_goals.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own daily completions"
  ON daily_completions FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM meditation_goals
      WHERE meditation_goals.id = daily_completions.goal_id
      AND meditation_goals.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM meditation_goals
      WHERE meditation_goals.id = daily_completions.goal_id
      AND meditation_goals.user_id = auth.uid()
    )
  );

-- User Skills Policies
CREATE POLICY "Users can view their own skills"
  ON user_skills FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own skills"
  ON user_skills FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own skills"
  ON user_skills FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Daily Challenges Policies
CREATE POLICY "Users can view their own daily challenges"
  ON daily_challenges FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own daily challenges"
  ON daily_challenges FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own daily challenges"
  ON daily_challenges FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- =====================================================
-- TRIGGERS FOR UPDATED_AT
-- =====================================================

-- Trigger for meditation_goals
CREATE TRIGGER update_meditation_goals_updated_at
  BEFORE UPDATE ON meditation_goals
  FOR EACH ROW
  EXECUTE FUNCTION update_gamification_updated_at();

-- =====================================================
-- COMMENTS FOR DOCUMENTATION
-- =====================================================

COMMENT ON TABLE meditation_goals IS 'User meditation goals with target days and progress tracking';
COMMENT ON TABLE daily_completions IS 'Daily meditation/breathing/body practice completions';
COMMENT ON TABLE user_skills IS 'User skills progression in different meditation and mindfulness areas';
COMMENT ON TABLE daily_challenges IS 'Daily challenges for users to complete for bonus XP';

COMMENT ON COLUMN meditation_goals.target_days IS 'Number of days to complete the goal';
COMMENT ON COLUMN meditation_goals.completed_days IS 'Number of days completed so far';
COMMENT ON COLUMN daily_completions.activity_type IS 'Type of activity: meditation, breathing, or body';
COMMENT ON COLUMN user_skills.skill_level IS 'Current level of the skill (1-10)';
COMMENT ON COLUMN daily_challenges.challenge_type IS 'Type of challenge: duration, frequency, or variety';
