ALTER TABLE IF EXISTS public.island_run_runtime_state
  ADD COLUMN IF NOT EXISTS skybound_academy_progress_by_event jsonb NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.island_run_runtime_state.skybound_academy_progress_by_event IS
  'Event-scoped Skybound Pilot Academy progression, upgrades, salvage, active sortie, and settlement idempotency ledger.';
