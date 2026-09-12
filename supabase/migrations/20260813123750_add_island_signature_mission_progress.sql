alter table public.island_run_runtime_state
  add column if not exists signature_mission_progress_by_island jsonb not null default '{}'::jsonb;

comment on column public.island_run_runtime_state.signature_mission_progress_by_island is
  'Cycle-scoped canonical progress for ordinary-island signature missions such as Island 003 Frostwell Iceworks.';
