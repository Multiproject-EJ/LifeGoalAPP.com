-- Migration 0168: Add egg state columns to island_run_runtime_state
-- Supports persistent egg tracking across sessions and page refreshes

alter table if exists island_run_runtime_state
  add column if not exists active_egg_tier text
    check (active_egg_tier in ('common', 'rare', 'mythic'))
    default null,
  add column if not exists active_egg_set_at_ms bigint
    default null,
  add column if not exists active_egg_hatch_duration_ms bigint
    default null,
  add column if not exists active_egg_is_dormant boolean
    not null default false;
