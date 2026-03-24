-- M20B: Persist creature treat inventory and companion visit dedupe markers in runtime state.

alter table if exists island_run_runtime_state
  add column if not exists creature_treat_inventory jsonb not null default '{"basic":3,"favorite":1,"rare":0}'::jsonb;

alter table if exists island_run_runtime_state
  add column if not exists companion_bonus_last_visit_key text;

comment on column island_run_runtime_state.creature_treat_inventory is
  'Creature treat inventory wallet for Island Run sanctuary feeding (basic/favorite/rare) synced cross-device.';

comment on column island_run_runtime_state.companion_bonus_last_visit_key is
  'Most recent visit key (<cycleIndex>:<islandNumber>) that received active companion start-of-island bonus.';
