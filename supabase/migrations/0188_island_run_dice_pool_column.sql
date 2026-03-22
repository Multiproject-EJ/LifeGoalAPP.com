-- Migration 0188: Add dice_pool to island_run_runtime_state
-- Persists the active dice inventory for in-flight Island Run sessions.

ALTER TABLE IF EXISTS island_run_runtime_state
  ADD COLUMN IF NOT EXISTS dice_pool INTEGER NOT NULL DEFAULT 20;

COMMENT ON COLUMN island_run_runtime_state.dice_pool IS
  'Current Island Run dice pool available for rolls on the active island.';
