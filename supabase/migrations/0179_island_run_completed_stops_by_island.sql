-- Migration 0179: Persist per-island completed stops in island_run_runtime_state
-- Key = island number as text, value = string[] of completed stop ids for that island

alter table if exists island_run_runtime_state
  add column if not exists completed_stops_by_island jsonb not null default '{}'::jsonb;

comment on column island_run_runtime_state.completed_stops_by_island is
  'Per-island stop-completion ledger. Key = island number as text. Value = string[] of completed stop ids for that island.';
