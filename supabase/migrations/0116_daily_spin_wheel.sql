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

CREATE POLICY "Users can view their own spin state"
  ON public.daily_spin_state FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own spin state"
  ON public.daily_spin_state FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own spin state"
  ON public.daily_spin_state FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own spin history"
  ON public.spin_history FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own spin history"
  ON public.spin_history FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Add trigger for updated_at
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
