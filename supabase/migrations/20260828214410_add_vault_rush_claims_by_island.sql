alter table public.island_run_runtime_state
  add column if not exists vault_rush_claims_by_island jsonb not null default '{}'::jsonb;

comment on column public.island_run_runtime_state.vault_rush_claims_by_island is
  'Vault Rush reward claims keyed by effective island number; each value is clamped to 0..5.';
