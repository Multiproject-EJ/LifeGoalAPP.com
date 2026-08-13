-- Canonical mobile Journey Disc Arena sub-track for each active timed event.
-- The existing owner-scoped RLS policies on island_run_runtime_state apply.

ALTER TABLE public.island_run_runtime_state
  ADD COLUMN IF NOT EXISTS journey_disc_arena_progress_by_event jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS journey_disc_armory jsonb NOT NULL DEFAULT '{"version":1,"rank":1,"weaponLevels":{"ram_fin":1,"aegis_ring":0,"pulse_vane":0},"highestGuardianTierDefeated":0,"updatedAtMs":0}'::jsonb;

COMMENT ON COLUMN public.island_run_runtime_state.journey_disc_arena_progress_by_event IS
  'Canonical Journey Disc Arena score, reward-track, rank, deployment, and bounded round-idempotency ledgers keyed by timed-event runtime id.';

COMMENT ON COLUMN public.island_run_runtime_state.journey_disc_armory IS
  'Permanent owner-scoped Journey Disc rank, weapon levels and highest Guardian tier, shared across eligible HabitGame islands.';
