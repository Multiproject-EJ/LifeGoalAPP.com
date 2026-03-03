-- Migration 0169: Add per_island_eggs JSONB ledger to island_run_runtime_state
-- Each entry in the map: island_number (integer key as text) -> egg record

alter table if exists island_run_runtime_state
  add column if not exists per_island_eggs jsonb not null default '{}'::jsonb;

comment on column island_run_runtime_state.per_island_eggs is
  'Per-island egg ledger. Key = island number as text. Value = {tier, set_at_ms, hatch_at_ms, status: "incubating"|"ready"|"collected"|"sold"}. One entry per island, never overwritten after status reaches collected/sold.';
