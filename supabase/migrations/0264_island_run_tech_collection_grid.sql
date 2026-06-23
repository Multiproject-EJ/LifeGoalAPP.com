-- Cross-device persistence for the Island Run "tech build" pickup grid.
-- Items picked up from board tiles snap into a per-island 3×3 grid; completing
-- a row/column/diagonal (or the full board) pays out dice. Persist both the
-- collected slots and the already-rewarded line indices so the grid survives
-- reloads and syncs across devices without double-paying line rewards.

alter table if exists island_run_runtime_state
  add column if not exists tech_collection_by_island jsonb not null default '{}'::jsonb;

alter table if exists island_run_runtime_state
  add column if not exists tech_collection_rewarded_lines_by_island jsonb not null default '{}'::jsonb;

comment on column island_run_runtime_state.tech_collection_by_island is
  'Per-island picked-up tech grid. Key = island number string, value = array of collected 3x3 slot indices (0-8).';

comment on column island_run_runtime_state.tech_collection_rewarded_lines_by_island is
  'Per-island ledger of tech-grid line indices (0-7) that already paid a row/column/diagonal completion reward.';
