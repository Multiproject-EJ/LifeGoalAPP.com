-- M21A: Persist Perfect Companion recommendation set in runtime state for cross-device hydration.

alter table if exists island_run_runtime_state
  add column if not exists perfect_companion_ids jsonb not null default '[]'::jsonb;

alter table if exists island_run_runtime_state
  add column if not exists perfect_companion_reasons jsonb not null default '{}'::jsonb;

alter table if exists island_run_runtime_state
  add column if not exists perfect_companion_computed_at_ms bigint;

alter table if exists island_run_runtime_state
  add column if not exists perfect_companion_model_version text;

alter table if exists island_run_runtime_state
  add column if not exists perfect_companion_computed_cycle_index integer;

comment on column island_run_runtime_state.perfect_companion_ids is
  'Deterministically selected 1-3 creature ids that best fit the player''s archetype hand for the active cycle.';

comment on column island_run_runtime_state.perfect_companion_reasons is
  'Per-creature explainability payload for Perfect Companion picks: strengths, weakness support, and zone affinity signal.';

comment on column island_run_runtime_state.perfect_companion_computed_at_ms is
  'Epoch ms when the current perfect_companion_ids payload was computed.';

comment on column island_run_runtime_state.perfect_companion_model_version is
  'Model version tag used to compute the current perfect companion payload (for invalidation/backfill).';

comment on column island_run_runtime_state.perfect_companion_computed_cycle_index is
  'Cycle index the current perfect companion payload was computed for.';
