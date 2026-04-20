-- Migration 0229: Add missing columns to island_run_runtime_state and fix
-- the active_stop_type constraint.
--
-- Context:
-- 1. stop_tickets_paid_by_island and last_essence_drift_lost were persisted
--    by the client in the action-commit payload (JSONB) but had no matching
--    database columns.  jsonb_populate_record silently dropped these keys,
--    causing data loss when the user switched devices.
-- 2. The active_stop_type constraint allowed 'breathing' but the client
--    renamed that stop kind to 'mystery'.  Writing 'mystery' to the DB
--    would violate the old constraint.

-- ─── 1. Add stop_tickets_paid_by_island column ─────────────────────────────
ALTER TABLE public.island_run_runtime_state
  ADD COLUMN IF NOT EXISTS stop_tickets_paid_by_island jsonb NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.island_run_runtime_state.stop_tickets_paid_by_island IS
  'Per-island ledger of stop indices (1-4) whose essence ticket has been paid.';

-- ─── 2. Add last_essence_drift_lost column ──────────────────────────────────
ALTER TABLE public.island_run_runtime_state
  ADD COLUMN IF NOT EXISTS last_essence_drift_lost integer NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.island_run_runtime_state.last_essence_drift_lost IS
  'Essence lost to drift on last hydration/session-open (UI notification). 0 = no drift.';

-- ─── 3. Fix active_stop_type constraint ─────────────────────────────────────
-- The client renamed 'breathing' → 'mystery'. Accept both for backward compat.
ALTER TABLE public.island_run_runtime_state
  DROP CONSTRAINT IF EXISTS island_run_runtime_state_active_stop_type_check;

ALTER TABLE public.island_run_runtime_state
  ADD CONSTRAINT island_run_runtime_state_active_stop_type_check
    CHECK (active_stop_type IN ('hatchery', 'habit', 'mystery', 'breathing', 'wisdom', 'boss'));
