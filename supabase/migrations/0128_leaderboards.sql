-- ========================================================
-- PHASE 2 LEADERBOARDS SYSTEM
-- Migration 0128: Leaderboards with rankings and rewards
-- ========================================================

-- This migration adds leaderboard functionality for Phase 2 gamification
-- Users can compete globally across different categories and time periods

-- ========================================================
-- TABLE: leaderboard_entries
-- Stores user rankings across different categories and time periods
-- ========================================================

CREATE TABLE IF NOT EXISTS public.leaderboard_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT NOT NULL, -- Cached for performance
  scope TEXT NOT NULL CHECK (scope IN ('all_time', 'weekly', 'monthly')),
  category TEXT NOT NULL CHECK (category IN ('level', 'xp', 'streak', 'achievements', 'points')),
  score BIGINT NOT NULL,
  rank INT,
  period_key TEXT NOT NULL, -- e.g., '2024-W01', '2024-01', 'all_time'
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, scope, category, period_key)
);

-- Indexes for fast leaderboard queries
CREATE INDEX IF NOT EXISTS idx_leaderboard_entries_ranking 
  ON public.leaderboard_entries(scope, category, period_key, rank);

CREATE INDEX IF NOT EXISTS idx_leaderboard_entries_user_lookup 
  ON public.leaderboard_entries(user_id, scope, category);

CREATE INDEX IF NOT EXISTS idx_leaderboard_entries_updated 
  ON public.leaderboard_entries(updated_at);

-- ========================================================
-- TABLE: leaderboard_rewards
-- Tracks prizes awarded to top performers
-- ========================================================

CREATE TABLE IF NOT EXISTS public.leaderboard_rewards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  scope TEXT NOT NULL,
  category TEXT NOT NULL,
  period_key TEXT NOT NULL,
  rank INT NOT NULL,
  xp_reward INT NOT NULL,
  badge_key TEXT,
  awarded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, scope, category, period_key)
);

-- Index for user reward lookups
CREATE INDEX IF NOT EXISTS idx_leaderboard_rewards_user 
  ON public.leaderboard_rewards(user_id, awarded_at);

-- ========================================================
-- RLS POLICIES
-- ========================================================

-- Enable RLS
ALTER TABLE public.leaderboard_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leaderboard_rewards ENABLE ROW LEVEL SECURITY;

-- Leaderboard entries: Public read (anyone can view leaderboards)
CREATE POLICY "leaderboard_entries_public_read" 
  ON public.leaderboard_entries
  FOR SELECT
  USING (true);

-- Leaderboard entries: No direct user writes (managed by functions/admin)
-- Future: Add admin-only write policy if needed

-- Leaderboard rewards: Users can view their own rewards
CREATE POLICY "leaderboard_rewards_user_read" 
  ON public.leaderboard_rewards
  FOR SELECT
  USING (auth.uid() = user_id);

-- ========================================================
-- FUNCTION: refresh_leaderboard_entries
-- Recalculates rankings for a given scope and period
-- ========================================================

CREATE OR REPLACE FUNCTION public.refresh_leaderboard_entries(
  target_scope TEXT,
  target_period TEXT
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  category_name TEXT;
  rank_counter INT;
  prev_score BIGINT;
  prev_rank INT;
BEGIN
  -- Loop through each category
  FOR category_name IN 
    SELECT unnest(ARRAY['level', 'xp', 'streak', 'achievements', 'points'])
  LOOP
    -- Delete old entries for this scope/period/category
    DELETE FROM public.leaderboard_entries
    WHERE scope = target_scope
      AND period_key = target_period
      AND category = category_name;
    
    -- Insert new entries based on category
    IF category_name = 'level' THEN
      -- Level leaderboard
      INSERT INTO public.leaderboard_entries (user_id, username, scope, category, score, rank, period_key)
      SELECT 
        gp.user_id,
        COALESCE(u.raw_user_meta_data->>'full_name', u.email, 'User') as username,
        target_scope,
        'level',
        gp.current_level,
        ROW_NUMBER() OVER (ORDER BY gp.current_level DESC, gp.total_xp DESC) as rank,
        target_period
      FROM public.gamification_profiles gp
      LEFT JOIN auth.users u ON u.id = gp.user_id
      WHERE gp.gamification_enabled = true
      ORDER BY gp.current_level DESC, gp.total_xp DESC
      LIMIT 1000; -- Limit to top 1000
      
    ELSIF category_name = 'xp' THEN
      -- XP leaderboard
      INSERT INTO public.leaderboard_entries (user_id, username, scope, category, score, rank, period_key)
      SELECT 
        gp.user_id,
        COALESCE(u.raw_user_meta_data->>'full_name', u.email, 'User') as username,
        target_scope,
        'xp',
        gp.total_xp,
        ROW_NUMBER() OVER (ORDER BY gp.total_xp DESC) as rank,
        target_period
      FROM public.gamification_profiles gp
      LEFT JOIN auth.users u ON u.id = gp.user_id
      WHERE gp.gamification_enabled = true
      ORDER BY gp.total_xp DESC
      LIMIT 1000;
      
    ELSIF category_name = 'streak' THEN
      -- Streak leaderboard
      INSERT INTO public.leaderboard_entries (user_id, username, scope, category, score, rank, period_key)
      SELECT 
        gp.user_id,
        COALESCE(u.raw_user_meta_data->>'full_name', u.email, 'User') as username,
        target_scope,
        'streak',
        gp.current_streak,
        ROW_NUMBER() OVER (ORDER BY gp.current_streak DESC, gp.longest_streak DESC) as rank,
        target_period
      FROM public.gamification_profiles gp
      LEFT JOIN auth.users u ON u.id = gp.user_id
      WHERE gp.gamification_enabled = true
      ORDER BY gp.current_streak DESC, gp.longest_streak DESC
      LIMIT 1000;
      
    ELSIF category_name = 'achievements' THEN
      -- Achievements leaderboard (count unlocked achievements per user)
      INSERT INTO public.leaderboard_entries (user_id, username, scope, category, score, rank, period_key)
      SELECT 
        ua.user_id,
        COALESCE(u.raw_user_meta_data->>'full_name', u.email, 'User') as username,
        target_scope,
        'achievements',
        COUNT(*) as achievement_count,
        ROW_NUMBER() OVER (ORDER BY COUNT(*) DESC) as rank,
        target_period
      FROM public.user_achievements ua
      LEFT JOIN auth.users u ON u.id = ua.user_id
      WHERE ua.unlocked = true
      GROUP BY ua.user_id, u.raw_user_meta_data, u.email
      ORDER BY COUNT(*) DESC
      LIMIT 1000;
      
    ELSIF category_name = 'points' THEN
      -- Points leaderboard
      INSERT INTO public.leaderboard_entries (user_id, username, scope, category, score, rank, period_key)
      SELECT 
        gp.user_id,
        COALESCE(u.raw_user_meta_data->>'full_name', u.email, 'User') as username,
        target_scope,
        'points',
        gp.total_points,
        ROW_NUMBER() OVER (ORDER BY gp.total_points DESC) as rank,
        target_period
      FROM public.gamification_profiles gp
      LEFT JOIN auth.users u ON u.id = gp.user_id
      WHERE gp.gamification_enabled = true
      ORDER BY gp.total_points DESC
      LIMIT 1000;
    END IF;
  END LOOP;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.refresh_leaderboard_entries(TEXT, TEXT) TO authenticated;

-- ========================================================
-- INITIAL DATA POPULATION
-- Populate all-time leaderboards on migration
-- ========================================================

-- Refresh all-time leaderboards
SELECT public.refresh_leaderboard_entries('all_time', 'all_time');
