-- Migration 0225: Fix incorrect dice_pool column DEFAULT (20 → 30)
--
-- Root cause: Migration 0188 added `dice_pool INTEGER NOT NULL DEFAULT 20`.
-- The correct value is 30, which matches:
--   - ISLAND_RUN_DEFAULT_STARTING_DICE = 30 (islandRunEconomy.ts)
--   - DICE_REGEN_TIERS[0].minDice = 30 (level-1 passive regen threshold)
--
-- Impact of the wrong default:
--   1. All rows created by migration 0188 received dice_pool = 20.
--   2. On game open the UI briefly showed 30 (React useState initial value)
--      before the hydration sync snapped it to 20, causing a visible 20/30 flicker.
--   3. With dice_pool at 20 (below the regen minimum of 30) passive regen
--      should have topped the pool back to 30, but regen is applied on the
--      client side — so affected players were stuck at 20 indefinitely.
--
-- Fix:
--   1. Bring every row below the level-1 minimum (30) up to 30.
--      This is the same corrective action the passive regen system would apply.
--   2. Change the column DEFAULT to 30 so future rows are created correctly.

-- 1) Correct all rows that are still below the level-1 regen minimum of 30.
UPDATE island_run_runtime_state
SET dice_pool = 30
WHERE dice_pool < 30;

-- 2) Fix the column default for future inserts.
ALTER TABLE island_run_runtime_state
  ALTER COLUMN dice_pool SET DEFAULT 30;

COMMENT ON COLUMN island_run_runtime_state.dice_pool IS
  'Current Island Run dice pool available for rolls on the active island. '
  'Minimum level-1 regeneration threshold is 30 (DICE_REGEN_TIERS[0].minDice).';
