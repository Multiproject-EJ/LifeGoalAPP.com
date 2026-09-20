-- Nullable for old clients: the existing snapshot RPC populates absent fields as NULL
-- when creating a new row. New clients normalize NULL to an empty career map.
-- Additive save surface for Crystal Miners. Existing owner-only runtime-state
-- policies and commit_action RPC continue to govern reads and writes.
ALTER TABLE public.island_run_runtime_state
  ADD COLUMN IF NOT EXISTS crystal_miners_progress_by_event jsonb DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.island_run_runtime_state.crystal_miners_progress_by_event IS
  'Event-keyed checkpoints of one permanent Crystal Miners career: tool rack, terrain, ore, score and monotonic revision. The latest checkpoint carries across all islands and event rotations. Ticket spend and reward progress are committed atomically with this snapshot.';
