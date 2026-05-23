alter table public.island_run_runtime_state
  add column if not exists welcome_pack_reward_bundle_claimed boolean not null default false;
