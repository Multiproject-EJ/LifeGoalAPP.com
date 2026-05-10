-- Migration 0235: Add persisted Island Run Lucky Roll session ledger.
--
-- This is state/schema foundation only. It does not launch Lucky Roll, wire
-- island travel, migrate legacy Lucky Roll localStorage, or change island rarity
-- schedules.
--
-- Shape (client-side `IslandRunLuckyRollSessionsByMilestone`):
--   {
--     "<cycleIndex>:<targetIslandNumber>": {
--       "status": "active" | "completed" | "banked" | "expired",
--       "runId": "<session id>",
--       "targetIslandNumber": 30,
--       "cycleIndex": 0,
--       "position": 0,
--       "rollsUsed": 0,
--       "claimedTileIds": [],
--       "pendingRewards": [],
--       "bankedRewards": [],
--       "startedAtMs": 0,
--       "bankedAtMs": null,
--       "updatedAtMs": 0
--     }
--   }

ALTER TABLE public.island_run_runtime_state
  ADD COLUMN IF NOT EXISTS lucky_roll_sessions_by_milestone jsonb NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.island_run_runtime_state.lucky_roll_sessions_by_milestone IS
  'Canonical Island Run Lucky Roll session ledger keyed by "cycleIndex:targetIslandNumber". State/schema foundation only; not wired to UI or island travel.';
