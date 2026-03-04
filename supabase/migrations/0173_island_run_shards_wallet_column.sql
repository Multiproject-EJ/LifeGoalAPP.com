-- Migration: 0173_island_run_shards_wallet_column
-- Adds shards wallet field to island_run_runtime_state for the persistent Shards currency (M17C)

ALTER TABLE island_run_runtime_state
  ADD COLUMN IF NOT EXISTS shards int not null default 0;
