-- Migration: 0171_island_run_shard_fields
-- Adds three shard fields to island_run_runtime_state for the Collectible Progress Bar (M16)

ALTER TABLE island_run_runtime_state
  ADD COLUMN IF NOT EXISTS island_shards INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS shard_tier_index INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS shard_claim_count INTEGER NOT NULL DEFAULT 0;
