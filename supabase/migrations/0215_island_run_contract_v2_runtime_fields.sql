-- Migration 0215: Add additive Island Run contract-v2 runtime fields.
-- Phase 1 only: schema/state plumbing, no gameplay behavior changes.

alter table if exists public.island_run_runtime_state
  add column if not exists active_stop_index integer not null default 0,
  add column if not exists active_stop_type text not null default 'hatchery',
  add column if not exists stop_states_by_index jsonb not null default '[]'::jsonb,
  add column if not exists stop_build_state_by_index jsonb not null default '[]'::jsonb,
  add column if not exists boss_state jsonb not null default '{"unlocked":false,"objectiveComplete":false,"buildComplete":false}'::jsonb,
  add column if not exists essence integer not null default 0,
  add column if not exists essence_lifetime_earned integer not null default 0,
  add column if not exists essence_lifetime_spent integer not null default 0,
  add column if not exists dice_regen_state jsonb,
  add column if not exists reward_bar_progress integer not null default 0,
  add column if not exists reward_bar_threshold integer not null default 10,
  add column if not exists reward_bar_claim_count_in_event integer not null default 0,
  add column if not exists reward_bar_escalation_tier integer not null default 0,
  add column if not exists reward_bar_last_claim_at_ms bigint,
  add column if not exists reward_bar_bound_event_id text,
  add column if not exists reward_bar_ladder_id text,
  add column if not exists active_timed_event jsonb,
  add column if not exists active_timed_event_progress jsonb not null default '{"feedingActions":0,"tokensEarned":0,"milestonesClaimed":0}'::jsonb,
  add column if not exists sticker_progress jsonb not null default '{"fragments":0}'::jsonb,
  add column if not exists sticker_inventory jsonb not null default '{}'::jsonb;

alter table if exists public.island_run_runtime_state
  drop constraint if exists island_run_runtime_state_active_stop_index_check,
  add constraint island_run_runtime_state_active_stop_index_check
    check (active_stop_index >= 0 and active_stop_index <= 4),
  drop constraint if exists island_run_runtime_state_active_stop_type_check,
  add constraint island_run_runtime_state_active_stop_type_check
    check (active_stop_type in ('hatchery', 'habit', 'breathing', 'wisdom', 'boss')),
  drop constraint if exists island_run_runtime_state_essence_check,
  add constraint island_run_runtime_state_essence_check check (essence >= 0),
  drop constraint if exists island_run_runtime_state_essence_lifetime_earned_check,
  add constraint island_run_runtime_state_essence_lifetime_earned_check check (essence_lifetime_earned >= 0),
  drop constraint if exists island_run_runtime_state_essence_lifetime_spent_check,
  add constraint island_run_runtime_state_essence_lifetime_spent_check check (essence_lifetime_spent >= 0),
  drop constraint if exists island_run_runtime_state_reward_bar_progress_check,
  add constraint island_run_runtime_state_reward_bar_progress_check check (reward_bar_progress >= 0),
  drop constraint if exists island_run_runtime_state_reward_bar_threshold_check,
  add constraint island_run_runtime_state_reward_bar_threshold_check check (reward_bar_threshold >= 1),
  drop constraint if exists island_run_runtime_state_reward_bar_claim_count_check,
  add constraint island_run_runtime_state_reward_bar_claim_count_check check (reward_bar_claim_count_in_event >= 0),
  drop constraint if exists island_run_runtime_state_reward_bar_escalation_tier_check,
  add constraint island_run_runtime_state_reward_bar_escalation_tier_check check (reward_bar_escalation_tier >= 0);

comment on column public.island_run_runtime_state.active_stop_index is
  'Contract-v2 stop progression pointer (0..4). Additive migration field.';
comment on column public.island_run_runtime_state.active_stop_type is
  'Contract-v2 active stop semantic type. Additive migration field.';
comment on column public.island_run_runtime_state.stop_states_by_index is
  'Contract-v2 stop completion states; placeholder defaults for phase-1 migration.';
comment on column public.island_run_runtime_state.stop_build_state_by_index is
  'Contract-v2 stop build states with placeholder requiredEssence values (phase-2 tuning).';
comment on column public.island_run_runtime_state.reward_bar_threshold is
  'Contract-v2 reward bar threshold; default 10 is a conservative placeholder for later tuning.';
