-- Migration 0170: Add island timer timestamp columns to island_run_runtime_state
alter table if exists island_run_runtime_state
  add column if not exists island_started_at_ms bigint default null,
  add column if not exists island_expires_at_ms bigint default null;
