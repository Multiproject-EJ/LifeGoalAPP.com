-- Migration 0240: Add persisted Island Run Welcome Pack claim marker.
--
-- Foundation only. This adds the durable one-time claim state marker and does
-- not grant rewards or wire first-launch onboarding flow.

ALTER TABLE public.island_run_runtime_state
  ADD COLUMN IF NOT EXISTS welcome_pack_claimed boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.island_run_runtime_state.welcome_pack_claimed IS
  'Canonical one-time Welcome Pack claim marker. State plumbing only; no rewards or onboarding auto-trigger wiring.';
