-- Restore Island Run runtime-state read access for regular authenticated users.
-- Gameplay hydration depends on authenticated users being able to read their own
-- canonical runtime row before controls unlock.

ALTER TABLE public.island_run_runtime_state ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own island run runtime state"
  ON public.island_run_runtime_state;

CREATE POLICY "Users can view their own island run runtime state"
  ON public.island_run_runtime_state
  FOR SELECT
  USING (
    auth.uid() = user_id
    OR auth.role() = 'service_role'
  );

GRANT SELECT ON TABLE public.island_run_runtime_state TO authenticated;
GRANT SELECT ON TABLE public.island_run_runtime_state TO service_role;

COMMENT ON POLICY "Users can view their own island run runtime state"
  ON public.island_run_runtime_state IS
  'Allow authenticated users to hydrate their own Island Run runtime state; service_role remains available for server-side maintenance.';
