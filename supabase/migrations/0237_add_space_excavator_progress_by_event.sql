-- Migration 0237: Add canonical Island Run Space Excavator progress ledger.
--
-- Stores per-timed-event Space Excavator board/reveal state keyed by the
-- runtime event id, so players can exit and resume the same event board.

ALTER TABLE public.island_run_runtime_state
  ADD COLUMN IF NOT EXISTS space_excavator_progress_by_event jsonb NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.island_run_runtime_state.space_excavator_progress_by_event IS
  'Canonical Space Excavator progress ledger keyed by timed-event runtime event id. Stores board seed/result, dug tiles, found treasures, completion status, and updatedAtMs for resume.';
