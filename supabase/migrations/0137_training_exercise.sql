-- Migration: Training / Exercise Feature
-- Description: Create tables for exercise logging and training strategies with RLS policies

-- =====================================================
-- 1. EXERCISE LOGS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.exercise_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  exercise_name TEXT NOT NULL,
  muscle_groups TEXT[] DEFAULT '{}',
  reps INTEGER,
  sets INTEGER,
  weight_kg NUMERIC,
  duration_minutes NUMERIC,
  notes TEXT,
  logged_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 2. TRAINING STRATEGIES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.training_strategies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  strategy_type TEXT NOT NULL CHECK (strategy_type IN (
    'weekly_target', 'monthly_target', 'rolling_window',
    'duration', 'focus_muscle', 'streak', 'variety',
    'progressive_load', 'micro_goal', 'recovery'
  )),
  exercise_name TEXT,
  target_value NUMERIC NOT NULL,
  target_unit TEXT NOT NULL DEFAULT 'reps',
  time_window_days INTEGER NOT NULL DEFAULT 7,
  focus_muscles TEXT[] DEFAULT '{}',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_exercise_logs_user_id ON exercise_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_exercise_logs_logged_at ON exercise_logs(logged_at DESC);
CREATE INDEX IF NOT EXISTS idx_exercise_logs_user_logged ON exercise_logs(user_id, logged_at DESC);
CREATE INDEX IF NOT EXISTS idx_training_strategies_user_id ON training_strategies(user_id);
CREATE INDEX IF NOT EXISTS idx_training_strategies_active ON training_strategies(user_id, is_active);

-- =====================================================
-- ROW LEVEL SECURITY POLICIES
-- =====================================================

-- Enable RLS
ALTER TABLE exercise_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_strategies ENABLE ROW LEVEL SECURITY;

-- Exercise Logs Policies
CREATE POLICY "Users can view their own exercise logs"
  ON exercise_logs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own exercise logs"
  ON exercise_logs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own exercise logs"
  ON exercise_logs FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own exercise logs"
  ON exercise_logs FOR DELETE
  USING (auth.uid() = user_id);

-- Training Strategies Policies
CREATE POLICY "Users can view their own training strategies"
  ON training_strategies FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own training strategies"
  ON training_strategies FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own training strategies"
  ON training_strategies FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own training strategies"
  ON training_strategies FOR DELETE
  USING (auth.uid() = user_id);

-- =====================================================
-- COMMENTS FOR DOCUMENTATION
-- =====================================================

COMMENT ON TABLE exercise_logs IS 'User exercise tracking logs with optional muscle groups, reps, sets, weight, and duration';
COMMENT ON TABLE training_strategies IS 'User-defined training strategies with various types and targets';

COMMENT ON COLUMN exercise_logs.muscle_groups IS 'Array of muscle groups targeted by the exercise';
COMMENT ON COLUMN exercise_logs.logged_at IS 'When the exercise was performed';
COMMENT ON COLUMN training_strategies.strategy_type IS 'Type of strategy: weekly_target, monthly_target, rolling_window, duration, focus_muscle, streak, variety, progressive_load, micro_goal, recovery';
COMMENT ON COLUMN training_strategies.time_window_days IS 'Time window in days for rolling strategies';
COMMENT ON COLUMN training_strategies.focus_muscles IS 'Specific muscle groups to focus on for focus_muscle strategy';
