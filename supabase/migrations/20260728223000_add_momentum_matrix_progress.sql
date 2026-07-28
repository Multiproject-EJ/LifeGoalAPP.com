-- Canonical, owner-scoped Momentum Matrix progress.
--
-- The runtime-state table already has self-only RLS policies and explicit
-- authenticated grants. Keeping the resumable board inside this canonical row
-- avoids a second gameplay authority while allowing cross-device recovery.

ALTER TABLE public.island_run_runtime_state
  ADD COLUMN IF NOT EXISTS momentum_matrix_progress_by_event jsonb NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.island_run_runtime_state.momentum_matrix_progress_by_event IS
  'Canonical Momentum Matrix exhibition progress keyed by timed-event runtime id. Stores the resumable 8x8 run and monotonic lifetime score/corridor/beacon statistics.';
