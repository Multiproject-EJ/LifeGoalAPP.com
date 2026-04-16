-- Migration: Add dice regeneration state columns
-- This migration adds the dice_regen_state JSONB column to support level-based
-- passive dice regeneration (Monopoly GO style minimum-roll system).
--
-- The regeneration system:
-- - Player level determines a minimum dice threshold (e.g. level 1 = 30 dice)
-- - If the player has fewer dice than the threshold, dice regenerate passively
-- - Full regeneration from 0 to threshold takes 2 hours
-- - If the player already has dice above the threshold, no regeneration occurs
-- - Hearts are fully retired as a currency

-- Add dice_regen_state column to island_run_runtime_state
ALTER TABLE island_run_runtime_state
ADD COLUMN IF NOT EXISTS dice_regen_state jsonb DEFAULT NULL;

-- Set hearts to 0 for all existing rows (hearts retired)
UPDATE island_run_runtime_state
SET runtime_state = jsonb_set(
  runtime_state,
  '{hearts}',
  '0'::jsonb
)
WHERE runtime_state->>'hearts' IS NOT NULL
  AND (runtime_state->>'hearts')::int > 0;

-- Initialize dice_regen_state for existing rows that don't have it
-- Default: level 1 tier (maxDice=30, regenRatePerHour=15)
UPDATE island_run_runtime_state
SET dice_regen_state = jsonb_build_object(
  'maxDice', 30,
  'regenRatePerHour', 15,
  'lastRegenAtMs', extract(epoch from now()) * 1000
)
WHERE dice_regen_state IS NULL;

-- Add comment documenting the column
COMMENT ON COLUMN island_run_runtime_state.dice_regen_state IS
  'Level-based dice regeneration state: {maxDice, regenRatePerHour, lastRegenAtMs}. '
  'Used by the minimum-roll passive regeneration system. '
  'Hearts are fully retired; dice is the sole board energy.';
