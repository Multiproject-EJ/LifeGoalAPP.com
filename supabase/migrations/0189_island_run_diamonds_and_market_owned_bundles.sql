-- M19A: Cross-device persistence for Island Run diamonds wallet and market owned bundles.

alter table if exists island_run_runtime_state
  add column if not exists diamonds int not null default 3;

alter table if exists island_run_runtime_state
  add column if not exists market_owned_bundles_by_island jsonb not null default '{}'::jsonb;

comment on column island_run_runtime_state.diamonds is
  'Island Run diamonds wallet (cross-island and cross-device).';

comment on column island_run_runtime_state.market_owned_bundles_by_island is
  'Per-island owned bundle ledger for market stop. Key = island number string, value = {dice_bundle,heart_bundle,heart_boost_bundle} booleans.';
