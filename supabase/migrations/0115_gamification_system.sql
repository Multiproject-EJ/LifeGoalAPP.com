-- Migration: Gamification System (Phase 1)
-- Description: Create comprehensive gamification system with XP, levels, achievements, streaks
-- Inspired by: Duolingo, Monopoly GO, Angry Birds

-- =====================================================
-- 1. GAMIFICATION PROFILES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS gamification_profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  total_xp INT NOT NULL DEFAULT 0,
  current_level INT NOT NULL DEFAULT 1,
  current_streak INT NOT NULL DEFAULT 0,
  longest_streak INT NOT NULL DEFAULT 0,
  last_activity_date DATE,
  lives INT NOT NULL DEFAULT 5,
  max_lives INT NOT NULL DEFAULT 5,
  last_life_refill TIMESTAMPTZ,
  streak_freezes INT NOT NULL DEFAULT 0,
  total_points INT NOT NULL DEFAULT 0,
  gamification_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- 2. ACHIEVEMENTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  achievement_key TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT NOT NULL,
  tier TEXT NOT NULL CHECK (tier IN ('bronze', 'silver', 'gold', 'diamond')),
  category TEXT NOT NULL CHECK (category IN ('streak', 'habit', 'goal', 'journal', 'general')),
  xp_reward INT NOT NULL DEFAULT 0,
  requirement_type TEXT NOT NULL,
  requirement_value INT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- 3. USER ACHIEVEMENTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS user_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  achievement_id UUID NOT NULL REFERENCES achievements(id) ON DELETE CASCADE,
  progress INT NOT NULL DEFAULT 0,
  unlocked BOOLEAN NOT NULL DEFAULT FALSE,
  unlocked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, achievement_id)
);

-- =====================================================
-- 4. XP TRANSACTIONS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS xp_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  xp_amount INT NOT NULL,
  source_type TEXT NOT NULL,
  source_id TEXT,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- 5. GAMIFICATION NOTIFICATIONS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS gamification_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL CHECK (notification_type IN ('level_up', 'achievement_unlock', 'streak_milestone', 'life_refill')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  icon TEXT,
  xp_reward INT DEFAULT 0,
  achievement_id UUID REFERENCES achievements(id) ON DELETE SET NULL,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  is_dismissed BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_gamification_profiles_user_id ON gamification_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_achievements_category ON achievements(category);
CREATE INDEX IF NOT EXISTS idx_achievements_tier ON achievements(tier);
CREATE INDEX IF NOT EXISTS idx_user_achievements_user_id ON user_achievements(user_id);
CREATE INDEX IF NOT EXISTS idx_user_achievements_unlocked ON user_achievements(user_id, unlocked);
CREATE INDEX IF NOT EXISTS idx_xp_transactions_user_id ON xp_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_xp_transactions_created_at ON xp_transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_gamification_notifications_user_id ON gamification_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_gamification_notifications_unread ON gamification_notifications(user_id, is_read, is_dismissed);

-- =====================================================
-- ROW LEVEL SECURITY POLICIES
-- =====================================================

-- Enable RLS
ALTER TABLE gamification_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE xp_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE gamification_notifications ENABLE ROW LEVEL SECURITY;

-- Gamification Profiles Policies
CREATE POLICY "Users can view their own gamification profile"
  ON gamification_profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own gamification profile"
  ON gamification_profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own gamification profile"
  ON gamification_profiles FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Achievements Policies (public read, no write)
CREATE POLICY "Anyone can view achievements"
  ON achievements FOR SELECT
  USING (true);

-- User Achievements Policies
CREATE POLICY "Users can view their own achievements"
  ON user_achievements FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own achievements"
  ON user_achievements FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own achievements"
  ON user_achievements FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- XP Transactions Policies
CREATE POLICY "Users can view their own XP transactions"
  ON xp_transactions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own XP transactions"
  ON xp_transactions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Gamification Notifications Policies
CREATE POLICY "Users can view their own notifications"
  ON gamification_notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own notifications"
  ON gamification_notifications FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications"
  ON gamification_notifications FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own notifications"
  ON gamification_notifications FOR DELETE
  USING (auth.uid() = user_id);

-- =====================================================
-- TRIGGERS FOR UPDATED_AT
-- =====================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_gamification_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers
CREATE TRIGGER update_gamification_profiles_updated_at
  BEFORE UPDATE ON gamification_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_gamification_updated_at();

CREATE TRIGGER update_user_achievements_updated_at
  BEFORE UPDATE ON user_achievements
  FOR EACH ROW
  EXECUTE FUNCTION update_gamification_updated_at();

-- =====================================================
-- SEED DATA: 10 STARTER ACHIEVEMENTS
-- =====================================================

INSERT INTO achievements (achievement_key, name, description, icon, tier, category, xp_reward, requirement_type, requirement_value)
VALUES
  -- Streak Achievements
  ('week_warrior', 'Week Warrior', 'Maintain a 7-day streak', '🔥', 'bronze', 'streak', 100, 'streak', 7),
  ('fortnight_fighter', 'Fortnight Fighter', 'Maintain a 14-day streak', '💪', 'bronze', 'streak', 200, 'streak', 14),
  ('consistency_king', 'Consistency King', 'Maintain a 30-day streak', '👑', 'gold', 'streak', 500, 'streak', 30),
  ('century_streak', 'Century Streak', 'Maintain a 100-day streak', '💯', 'diamond', 'streak', 1000, 'streak', 100),
  
  -- Habit Achievements
  ('getting_started', 'Getting Started', 'Complete your first habit', '✅', 'bronze', 'habit', 10, 'habits_completed', 1),
  ('habit_builder', 'Habit Builder', 'Complete 10 habits', '📋', 'bronze', 'habit', 50, 'habits_completed', 10),
  ('consistency_pro', 'Consistency Pro', 'Complete 50 habits', '⭐', 'silver', 'habit', 150, 'habits_completed', 50),
  ('century_club', 'Century Club', 'Complete 100 habits', '💯', 'silver', 'habit', 300, 'habits_completed', 100),
  
  -- Goal Achievements
  ('visionary', 'Visionary', 'Achieve your first goal', '🎯', 'bronze', 'goal', 50, 'goals_achieved', 1),
  ('goal_crusher', 'Goal Crusher', 'Achieve 5 goals', '🏆', 'gold', 'goal', 400, 'goals_achieved', 5),
  
  -- Journal-based achievements
  ('reflection_master', 'Reflection Master', 'Write 30 journal entries', '📝', 'silver', 'journal', 200, 'journal_entries', 30),
  ('wordsmith', 'Wordsmith', 'Write 10 journal entries with 500+ words', '✍️', 'gold', 'journal', 300, 'journal_long_entries', 10),
  
  -- Check-in achievements  
  ('self_aware', 'Self-Aware', 'Complete your first life wheel check-in', '🧘', 'bronze', 'general', 30, 'checkins_completed', 1),
  ('balanced_life', 'Balanced Life', 'Complete 10 life wheel check-ins', '⚖️', 'silver', 'general', 150, 'checkins_completed', 10),
  
  -- Vision board achievements
  ('inspired', 'Inspired', 'Upload your first vision board image', '✨', 'bronze', 'general', 20, 'vision_uploads', 1),
  ('visionary_board', 'Vision Board Master', 'Upload 20 vision board images', '🖼️', 'silver', 'general', 200, 'vision_uploads', 20)
ON CONFLICT (achievement_key) DO NOTHING;

-- =====================================================
-- COMMENTS FOR DOCUMENTATION
-- =====================================================

COMMENT ON TABLE gamification_profiles IS 'User gamification data including XP, level, streaks, and preferences';
COMMENT ON TABLE achievements IS 'Available achievements/badges that users can unlock';
COMMENT ON TABLE user_achievements IS 'Tracks user progress and unlocked achievements';
COMMENT ON TABLE xp_transactions IS 'Audit log of all XP earned by users';
COMMENT ON TABLE gamification_notifications IS 'Notifications for achievements, level-ups, and milestones';

COMMENT ON COLUMN gamification_profiles.gamification_enabled IS 'Whether gamification features are shown to the user';
COMMENT ON COLUMN gamification_profiles.streak_freezes IS 'Number of streak freeze items available';
COMMENT ON COLUMN gamification_profiles.lives IS 'Current number of lives (for future features)';
COMMENT ON COLUMN achievements.tier IS 'Achievement tier: bronze, silver, gold, or diamond';
COMMENT ON COLUMN achievements.category IS 'Achievement category: streak, habit, goal, journal, or general';
