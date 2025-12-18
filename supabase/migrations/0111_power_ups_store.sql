-- ========================================================
-- POWER-UPS STORE SYSTEM
-- Migration 0111: Points economy and power-ups
-- ========================================================

-- Add missing columns to achievements table if they don't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' 
                 AND table_name = 'achievements' 
                 AND column_name = 'points_reward') THEN
    ALTER TABLE public.achievements ADD COLUMN points_reward INT NOT NULL DEFAULT 0;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' 
                 AND table_name = 'achievements' 
                 AND column_name = 'sort_order') THEN
    ALTER TABLE public.achievements ADD COLUMN sort_order INT NOT NULL DEFAULT 0;
  END IF;
END $$;

-- Power-ups catalog table
CREATE TABLE IF NOT EXISTS public.power_ups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  power_up_key TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT NOT NULL,
  cost_points INTEGER NOT NULL,
  effect_type TEXT NOT NULL, -- 'xp_multiplier', 'streak_freeze', 'instant_xp', 'extra_life', 'spin_token', 'mystery'
  effect_value NUMERIC NOT NULL,
  duration_minutes INTEGER, -- NULL for instant/permanent effects
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- User power-ups (purchases and active items)
CREATE TABLE IF NOT EXISTS public.user_power_ups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  power_up_id UUID NOT NULL REFERENCES public.power_ups(id) ON DELETE CASCADE,
  purchased_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  activated_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT false,
  is_consumed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Power-up transaction log
CREATE TABLE IF NOT EXISTS public.power_up_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  power_up_id UUID NOT NULL REFERENCES public.power_ups(id) ON DELETE CASCADE,
  action TEXT NOT NULL, -- 'purchase', 'activate', 'expire', 'consume'
  points_spent INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_power_ups_key ON public.power_ups(power_up_key);
CREATE INDEX IF NOT EXISTS idx_power_ups_active ON public.power_ups(is_active);
CREATE INDEX IF NOT EXISTS idx_user_power_ups_user_id ON public.user_power_ups(user_id);
CREATE INDEX IF NOT EXISTS idx_user_power_ups_active ON public.user_power_ups(user_id, is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_user_power_ups_expires ON public.user_power_ups(expires_at) WHERE expires_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_power_up_transactions_user_id ON public.power_up_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_power_up_transactions_created_at ON public.power_up_transactions(created_at DESC);

-- RLS Policies
ALTER TABLE public.power_ups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_power_ups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.power_up_transactions ENABLE ROW LEVEL SECURITY;

-- Power-ups: Anyone can view active power-ups
CREATE POLICY "Anyone can view active power-ups"
  ON public.power_ups FOR SELECT
  USING (is_active = true);

-- User power-ups: Users can view their own
CREATE POLICY "Users can view their own power-ups"
  ON public.user_power_ups FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own power-ups"
  ON public.user_power_ups FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own power-ups"
  ON public.user_power_ups FOR UPDATE
  USING (auth.uid() = user_id);

-- Transactions: Users can view their own
CREATE POLICY "Users can view their own transactions"
  ON public.power_up_transactions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own transactions"
  ON public.power_up_transactions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Seed power-ups catalog
INSERT INTO public.power_ups (power_up_key, name, description, icon, cost_points, effect_type, effect_value, duration_minutes, sort_order)
VALUES
  -- XP Boosts
  ('xp_boost_1h_2x', '2X XP Boost (1 hour)', 'Double XP from all activities for 1 hour', '⚡', 50, 'xp_multiplier', 2.0, 60, 1),
  ('xp_boost_24h_2x', '2X XP Boost (24 hours)', 'Double XP from all activities for 24 hours', '🌟', 150, 'xp_multiplier', 2.0, 1440, 2),
  ('xp_boost_1h_3x', '3X XP Boost (1 hour)', 'Triple XP from all activities for 1 hour', '💫', 100, 'xp_multiplier', 3.0, 60, 3),
  
  -- Protection Items
  ('streak_shield', 'Streak Shield', 'Protects your streak once when you miss a day', '🛡️', 100, 'streak_freeze', 1, NULL, 10),
  ('extra_life', 'Extra Life', 'Adds one life to your total', '❤️', 75, 'extra_life', 1, NULL, 11),
  
  -- Instant Rewards
  ('xp_pack_small', 'XP Pack (Small)', 'Instant 100 XP boost', '✨', 40, 'instant_xp', 100, NULL, 20),
  ('xp_pack_large', 'XP Pack (Large)', 'Instant 500 XP boost', '💫', 150, 'instant_xp', 500, NULL, 21),
  
  -- Special Items
  ('extra_spin', 'Extra Spin Token', 'Spin the wheel again today', '🎟️', 80, 'spin_token', 1, NULL, 30),
  ('mystery_chest', 'Mystery Chest', 'Random mega reward - could be anything!', '🔮', 200, 'mystery', 1, NULL, 40)
ON CONFLICT (power_up_key) DO NOTHING;

-- Add power-up achievements
INSERT INTO public.achievements (achievement_key, name, description, icon, xp_reward, points_reward, requirement_type, requirement_value, tier, sort_order)
VALUES
  ('shopaholic', 'Shopaholic', 'Purchase 10 power-ups from the store', '🛍️', 150, 75, 'powerups_purchased', 10, 'bronze', 70),
  ('power_user', 'Power User', 'Activate a 3X XP boost', '💫', 200, 100, 'triple_boost_used', 1, 'silver', 71),
  ('mystery_hunter', 'Mystery Hunter', 'Purchase 3 mystery chests', '🔮', 300, 150, 'mystery_chests', 3, 'gold', 72)
ON CONFLICT (achievement_key) DO NOTHING;

-- Comments
COMMENT ON TABLE public.power_ups IS 'Catalog of available power-ups in the store';
COMMENT ON TABLE public.user_power_ups IS 'User purchases and active power-ups';
COMMENT ON TABLE public.power_up_transactions IS 'Transaction log for all power-up purchases and activations';
COMMENT ON COLUMN public.power_ups.effect_type IS 'Type of effect: xp_multiplier, streak_freeze, instant_xp, extra_life, spin_token, mystery';
COMMENT ON COLUMN public.power_ups.duration_minutes IS 'Duration in minutes for timed effects, NULL for instant/permanent';
