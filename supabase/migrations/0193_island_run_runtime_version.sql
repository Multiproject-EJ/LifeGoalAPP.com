-- M20A: Add optimistic concurrency versioning for Island Run runtime state writes.

alter table if exists island_run_runtime_state
  add column if not exists runtime_version bigint not null default 0;

comment on column island_run_runtime_state.runtime_version is
  'Monotonic version used for optimistic concurrency compare-and-swap updates.';
