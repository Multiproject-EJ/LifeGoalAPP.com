-- Migration 0270: Add canonical Island Run Companion Feast progress ledger.
--
-- Stores per-timed-event Companion Feast campaign state keyed by the runtime
-- event id: level ladder position (Level 1 clears on the first Cheese Moon),
-- rewards-bar feast points, highest dish tier forged, best run score, total
-- fruit drops (one event ticket each), and claimed rewards-bar milestone ids.

ALTER TABLE public.island_run_runtime_state
  ADD COLUMN IF NOT EXISTS companion_feast_progress_by_event jsonb NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.island_run_runtime_state.companion_feast_progress_by_event IS
  'Canonical Companion Feast progress ledger keyed by timed-event runtime event id. Stores levelIndex, feastPoints, highestTierReached, bestScore, totalFruitDropped, claimedMilestoneIds, and updatedAtMs for resume.';
