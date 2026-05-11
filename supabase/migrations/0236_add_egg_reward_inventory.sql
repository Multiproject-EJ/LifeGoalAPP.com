-- Migration 0236: Add canonical Island Run egg reward inventory ledger.
--
-- This is state/schema foundation only. It does not add Treasure Path egg
-- rewards, bank eggs, open eggs, mutate active hatchery slots, or grant
-- creatures.
--
-- Shape (client-side `EggRewardInventoryEntry[]`):
--   [
--     {
--       "eggRewardId": "<stable voucher id>",
--       "source": "treasure_path",
--       "sourceSessionKey": "<source session key>",
--       "sourceRunId": "<source run id>",
--       "sourceRewardId": "<source reward id>",
--       "tileId": 0,
--       "cycleIndex": 0,
--       "targetIslandNumber": 30,
--       "eggTier": "common" | "rare",
--       "eggSeed": 0,
--       "rarityRoll": 0,
--       "rarityRollDenominator": 500,
--       "rarityThreshold": 5,
--       "resolverVersion": "treasure_path_egg_v1",
--       "status": "unopened" | "opened",
--       "grantedAtMs": 0,
--       "openedAtMs": null,
--       "openedCreatureId": "<optional creature id>"
--     }
--   ]

ALTER TABLE public.island_run_runtime_state
  ADD COLUMN IF NOT EXISTS egg_reward_inventory jsonb NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.island_run_runtime_state.egg_reward_inventory IS
  'Canonical Island Run egg reward voucher inventory. PR1 state/schema foundation only; not wired to Treasure Path rewards, Hatchery slots, opening, or creature granting.';
