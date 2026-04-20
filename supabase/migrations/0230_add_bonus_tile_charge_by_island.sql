-- Migration 0230: Add bonus_tile_charge_by_island column to
-- island_run_runtime_state so the 9-hit accumulator ledger persists across
-- devices. Unblocks the bonus-tile renderer wiring (contract §5E) and the
-- `resetBonusTileChargeForIsland` call in `performIslandTravel`.
--
-- Shape (client-side `BonusTileChargeByIsland`, see `islandRunBonusTile.ts`):
--   {
--     "<islandNumber>": {
--       "<tileIndex>": <charge in 0..8>
--     },
--     ...
--   }
-- Outer key: island number as string (matches the rest of the per-island maps
-- — `completed_stops_by_island`, `stop_tickets_paid_by_island`,
-- `market_owned_bundles_by_island`). Inner key: ring tile index. Value: the
-- current charge count; zero entries are pruned on write.

ALTER TABLE public.island_run_runtime_state
  ADD COLUMN IF NOT EXISTS bonus_tile_charge_by_island jsonb NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.island_run_runtime_state.bonus_tile_charge_by_island IS
  'Per-(island, tileIndex) charge ledger for the glowing bonus tile. 1..8 charges; cleared to 0 on the 9th landing (release). See islandRunBonusTile.ts BONUS_CHARGE_TARGET.';
