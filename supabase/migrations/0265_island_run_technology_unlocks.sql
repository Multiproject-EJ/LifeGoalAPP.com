alter table if exists public.island_run_runtime_state
  add column if not exists technology_unlocks_by_id jsonb not null default '{}'::jsonb;

comment on column public.island_run_runtime_state.technology_unlocks_by_id is
  'Global durable Island Run expedition technology unlocks keyed by technology id (for example the-concord).';
