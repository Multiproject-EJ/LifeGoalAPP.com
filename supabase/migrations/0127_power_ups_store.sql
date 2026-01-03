-- ========================================================
-- PHASE 2 POWER-UPS STORE SYSTEM
-- Migration 0127: Enhanced power-ups with types and categories
-- ========================================================

-- This migration enhances the power-ups system from migration 0111
-- Adding type (temporary/permanent) and category (boosts/protection/upgrades)
-- for Phase 2 of gamification

-- Add type and category columns to power_ups table if they don't exist
DO $$ 
BEGIN
  -- Add type column (temporary vs permanent)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' 
                 AND table_name = 'power_ups' 
                 AND column_name = 'type') THEN
    ALTER TABLE public.power_ups ADD COLUMN type TEXT NOT NULL DEFAULT 'temporary'
      CHECK (type IN ('temporary', 'permanent'));
  END IF;
  
  -- Add category column (boosts, protection, upgrades)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' 
                 AND table_name = 'power_ups' 
                 AND column_name = 'category') THEN
    ALTER TABLE public.power_ups ADD COLUMN category TEXT NOT NULL DEFAULT 'boosts'
      CHECK (category IN ('boosts', 'protection', 'upgrades'));
  END IF;
END $$;

-- Update effect_type CHECK constraint to include Phase 2 effect types
-- Note: PostgreSQL requires dropping and recreating constraints
DO $$
BEGIN
  -- Drop old constraint if it exists
  IF EXISTS (SELECT 1 FROM information_schema.table_constraints 
             WHERE constraint_name = 'power_ups_effect_type_check' 
             AND table_name = 'power_ups') THEN
    ALTER TABLE public.power_ups DROP CONSTRAINT power_ups_effect_type_check;
  END IF;
  
  -- Add new constraint with Phase 2 effect types
  ALTER TABLE public.power_ups ADD CONSTRAINT power_ups_effect_type_check 
    CHECK (effect_type IN (
      'xp_multiplier', 
      'streak_freeze', 
      'instant_xp', 
      'extra_life', 
      'spin_token', 
      'mystery',
      'max_lives_increase',
      'freeze_bank_increase',
      'daily_spin_increase'
    ));
END $$;

-- Add indexes for new columns
CREATE INDEX IF NOT EXISTS idx_power_ups_type ON public.power_ups(type);
CREATE INDEX IF NOT EXISTS idx_power_ups_category ON public.power_ups(category);

-- Clear existing power-ups and insert Phase 2 catalog
-- This ensures we have the correct power-ups for Phase 2
TRUNCATE TABLE public.power_ups CASCADE;

-- Insert Phase 2 Power-ups Catalog
INSERT INTO public.power_ups (power_up_key, name, description, icon, type, cost_points, duration_minutes, effect_type, effect_value, category, sort_order)
VALUES
  -- ===== TEMPORARY POWER-UPS: BOOSTS =====
  ('xp_boost_1h_2x', '2x XP Boost (1 hour)', 'Double all XP gains for 1 hour', '⚡', 'temporary', 50, 60, 'xp_multiplier', 2, 'boosts', 1),
  ('xp_boost_1h_5x', '5x XP Boost (1 hour)', 'Quintuple all XP gains for 1 hour', '🚀', 'temporary', 200, 60, 'xp_multiplier', 5, 'boosts', 2),
  ('perfect_day', 'Perfect Day Guarantee', 'Ensures all habits count as completed today', '✨', 'temporary', 300, NULL, 'instant_xp', 100, 'boosts', 3),
  
  -- ===== TEMPORARY POWER-UPS: PROTECTION =====
  ('streak_freeze_1', 'Streak Freeze (1 use)', 'Protects your streak for one missed day', '🛡️', 'temporary', 100, NULL, 'streak_freeze', 1, 'protection', 10),
  ('extra_life_1', 'Extra Life (1 heart)', 'Adds one life to your total', '❤️', 'temporary', 75, NULL, 'extra_life', 1, 'protection', 11),
  
  -- ===== PERMANENT UPGRADES =====
  ('max_lives_plus_1', 'Max Lives +1', 'Permanently increase maximum lives by 1', '💪', 'permanent', 500, NULL, 'max_lives_increase', 1, 'upgrades', 20),
  ('freeze_bank_plus_1', 'Streak Freeze Bank +1', 'Permanently increase freeze capacity by 1', '🏦', 'permanent', 750, NULL, 'freeze_bank_increase', 1, 'upgrades', 21),
  ('daily_spin_plus_1', 'Daily Spin +1', 'Add one extra daily spin permanently', '🎰', 'permanent', 1000, NULL, 'daily_spin_increase', 1, 'upgrades', 22)
ON CONFLICT (power_up_key) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  icon = EXCLUDED.icon,
  type = EXCLUDED.type,
  cost_points = EXCLUDED.cost_points,
  duration_minutes = EXCLUDED.duration_minutes,
  effect_type = EXCLUDED.effect_type,
  effect_value = EXCLUDED.effect_value,
  category = EXCLUDED.category,
  sort_order = EXCLUDED.sort_order;

-- Update Phase 2 achievements for power-ups
INSERT INTO public.achievements (achievement_key, name, description, icon, tier, category, xp_reward, requirement_type, requirement_value, points_reward, sort_order)
VALUES
  ('power_shopper', 'Power Shopper', 'Purchase 10 power-ups from the store', '🛍️', 'bronze', 'general', 150, 'powerups_purchased', 10, 75, 70),
  ('power_user_5x', 'Power User', 'Activate a 5X XP boost', '🚀', 'silver', 'general', 200, 'triple_boost_used', 1, 100, 71),
  ('permanent_upgrade', 'Permanent Upgrade', 'Purchase your first permanent upgrade', '💎', 'gold', 'general', 300, 'powerups_purchased', 1, 150, 72)
ON CONFLICT (achievement_key) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  icon = EXCLUDED.icon,
  tier = EXCLUDED.tier,
  category = EXCLUDED.category,
  xp_reward = EXCLUDED.xp_reward,
  requirement_type = EXCLUDED.requirement_type,
  requirement_value = EXCLUDED.requirement_value,
  points_reward = EXCLUDED.points_reward,
  sort_order = EXCLUDED.sort_order;

-- Add column to gamification_profiles for freeze bank capacity if not exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' 
                 AND table_name = 'gamification_profiles' 
                 AND column_name = 'freeze_bank_capacity') THEN
    ALTER TABLE public.gamification_profiles 
      ADD COLUMN freeze_bank_capacity INT NOT NULL DEFAULT 3;
  END IF;
END $$;

-- Comments for documentation
COMMENT ON COLUMN public.power_ups.type IS 'temporary: Time-limited or consumable, permanent: Lasting upgrades';
COMMENT ON COLUMN public.power_ups.category IS 'boosts: XP multipliers and bonuses, protection: Lives and freezes, upgrades: Permanent improvements';
COMMENT ON COLUMN public.gamification_profiles.freeze_bank_capacity IS 'Maximum number of streak freezes user can hold';

-- Create function to apply permanent upgrade
CREATE OR REPLACE FUNCTION apply_permanent_upgrade(
  p_user_id UUID,
  p_effect_type TEXT,
  p_effect_value INT
) RETURNS VOID AS $$
BEGIN
  CASE p_effect_type
    WHEN 'max_lives_increase' THEN
      UPDATE public.gamification_profiles
      SET max_lives = max_lives + p_effect_value
      WHERE user_id = p_user_id;
      
    WHEN 'freeze_bank_increase' THEN
      UPDATE public.gamification_profiles
      SET freeze_bank_capacity = freeze_bank_capacity + p_effect_value
      WHERE user_id = p_user_id;
      
    WHEN 'daily_spin_increase' THEN
      -- Add bonus spin to daily spin state
      INSERT INTO public.daily_spin_state (user_id, spins_available, total_spins_used)
      VALUES (p_user_id, 1, 0)
      ON CONFLICT (user_id) DO UPDATE
      SET spins_available = daily_spin_state.spins_available + p_effect_value;
      
    ELSE
      RAISE EXCEPTION 'Unknown permanent effect type: %', p_effect_type;
  END CASE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION apply_permanent_upgrade IS 'Applies permanent power-up upgrades to user profile';
