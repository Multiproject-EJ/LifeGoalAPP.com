-- Migration 0187: Add in-flight per-run state columns to island_run_runtime_state
-- Persists reload-sensitive Island Run board values across devices and refreshes.

ALTER TABLE IF EXISTS island_run_runtime_state
  ADD COLUMN IF NOT EXISTS token_index INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS hearts INTEGER NOT NULL DEFAULT 5,
  ADD COLUMN IF NOT EXISTS coins INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS spin_tokens INTEGER NOT NULL DEFAULT 0;

COMMENT ON COLUMN island_run_runtime_state.token_index IS
  'Current token tile index on the 17-tile Island Run board.';

COMMENT ON COLUMN island_run_runtime_state.hearts IS
  'Current Island Run heart count for the active in-flight island session.';

COMMENT ON COLUMN island_run_runtime_state.coins IS
  'Current Island Run coin balance for the active in-flight island session.';

COMMENT ON COLUMN island_run_runtime_state.spin_tokens IS
  'Current Island Run spin token count for the active in-flight island session.';
