-- Corrective migration for dice regeneration rollout
-- Previous migration partially applied: dice_regen_state column already exists.
-- This migration finishes the rollout against the real table schema.

-- 1) Retire hearts as a real integer column
UPDATE island_run_runtime_state
SET hearts = 0
WHERE hearts IS NOT NULL
  AND hearts > 0;

-- 2) Initialize dice_regen_state where still missing
UPDATE island_run_runtime_state
SET dice_regen_state = jsonb_build_object(
  'maxDice', 30,
  'regenRatePerHour', 15,
  'lastRegenAtMs', (extract(epoch from now()) * 1000)::bigint
)
WHERE dice_regen_state IS NULL;

-- 3) Add / refresh comment
COMMENT ON COLUMN island_run_runtime_state.dice_regen_state IS
  'Level-based dice regeneration state: {maxDice, regenRatePerHour, lastRegenAtMs}. Used by the minimum-roll passive regeneration system. Hearts are fully retired; dice is the sole board energy.';
