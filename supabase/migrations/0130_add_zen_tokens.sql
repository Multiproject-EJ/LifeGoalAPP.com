-- Migration: add zen token balance to gamification profiles
-- Description: persist zen tokens earned from meditation and breathing sessions

ALTER TABLE public.gamification_profiles
  ADD COLUMN IF NOT EXISTS zen_tokens INT NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.gamification_profiles.zen_tokens IS 'Zen token balance earned primarily from meditation activities';
