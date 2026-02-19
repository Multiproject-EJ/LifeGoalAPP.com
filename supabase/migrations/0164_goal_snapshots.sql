-- Goal snapshots track how goals evolve over time so adaptation is treated as growth, not failure.

CREATE TABLE IF NOT EXISTS public.goal_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id uuid NOT NULL REFERENCES public.goals(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  snapshot_type text NOT NULL CHECK (snapshot_type IN ('created', 'updated', 'deleted', 'status_changed', 'retitled', 'timeline_shifted', 'evolved')),
  summary text NULL,
  before_state jsonb NULL,
  after_state jsonb NULL,
  metadata jsonb NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_goal_snapshots_goal_id_created_at
  ON public.goal_snapshots(goal_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_goal_snapshots_user_id_created_at
  ON public.goal_snapshots(user_id, created_at DESC);

ALTER TABLE public.goal_snapshots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own goal snapshots" ON public.goal_snapshots;
CREATE POLICY "Users can view their own goal snapshots"
  ON public.goal_snapshots FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own goal snapshots" ON public.goal_snapshots;
CREATE POLICY "Users can insert their own goal snapshots"
  ON public.goal_snapshots FOR INSERT
  WITH CHECK (auth.uid() = user_id);

COMMENT ON TABLE public.goal_snapshots IS 'Historical snapshots of goal evolution so progress and adaptation are both preserved.';
COMMENT ON COLUMN public.goal_snapshots.snapshot_type IS 'Type of change event for the goal lifecycle.';
COMMENT ON COLUMN public.goal_snapshots.before_state IS 'Goal shape before mutation (if available).';
COMMENT ON COLUMN public.goal_snapshots.after_state IS 'Goal shape after mutation (if available).';
