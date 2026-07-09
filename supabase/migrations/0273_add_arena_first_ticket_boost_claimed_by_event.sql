alter table public.island_run_runtime_state
  add column if not exists arena_first_ticket_boost_claimed_by_event jsonb not null default '{}'::jsonb;
