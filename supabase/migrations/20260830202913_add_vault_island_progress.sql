alter table public.island_run_runtime_state
  add column if not exists vault_island_progress jsonb not null
  default '{"purchasedUpgradeIds":[]}'::jsonb;

comment on column public.island_run_runtime_state.vault_island_progress is
  'Idempotent ledger of unique spend-driven Vault Island construction and security upgrades.';
