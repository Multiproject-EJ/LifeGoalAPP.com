-- Migration 0186: Add cycle_index to island_run_runtime_state
-- Tracks completed wraps from island 120 back to island 1.

ALTER TABLE IF EXISTS island_run_runtime_state
  ADD COLUMN IF NOT EXISTS cycle_index INTEGER NOT NULL DEFAULT 0;

COMMENT ON COLUMN island_run_runtime_state.cycle_index IS
  'Counts full Island Run wraps (island 120 -> island 1).';
