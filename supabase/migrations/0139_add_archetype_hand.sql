-- Add archetype_hand column to personality_tests table
-- This stores the 5-card archetype hand derived from personality scores

ALTER TABLE public.personality_tests
ADD COLUMN IF NOT EXISTS archetype_hand JSONB DEFAULT NULL;

COMMENT ON COLUMN public.personality_tests.archetype_hand IS 'Stores the 5-card archetype hand (dominant, secondary, 2 supports, shadow) derived from personality scores';
