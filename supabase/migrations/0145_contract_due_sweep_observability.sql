-- ========================================================
-- Commitment Contracts sweep observability audit log (Slice R)
-- ========================================================

CREATE TABLE IF NOT EXISTS public.commitment_contract_sweep_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  triggered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finished_at TIMESTAMPTZ,
  job_source TEXT NOT NULL DEFAULT 'cron' CHECK (job_source IN ('cron', 'manual', 'app')),
  max_users INTEGER NOT NULL,
  max_windows_per_user INTEGER NOT NULL,
  users_processed INTEGER NOT NULL DEFAULT 0,
  evaluations_created INTEGER NOT NULL DEFAULT 0,
  failed_users INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'success', 'partial', 'failed')),
  error_message TEXT,
  details JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_contract_sweep_runs_triggered_at
  ON public.commitment_contract_sweep_runs (triggered_at DESC);

CREATE INDEX IF NOT EXISTS idx_contract_sweep_runs_status
  ON public.commitment_contract_sweep_runs (status);

ALTER TABLE public.commitment_contract_sweep_runs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role can read sweep run audits" ON public.commitment_contract_sweep_runs;
CREATE POLICY "Service role can read sweep run audits"
  ON public.commitment_contract_sweep_runs
  FOR SELECT
  TO service_role
  USING (TRUE);

DROP POLICY IF EXISTS "Service role can insert sweep run audits" ON public.commitment_contract_sweep_runs;
CREATE POLICY "Service role can insert sweep run audits"
  ON public.commitment_contract_sweep_runs
  FOR INSERT
  TO service_role
  WITH CHECK (TRUE);

DROP POLICY IF EXISTS "Service role can update sweep run audits" ON public.commitment_contract_sweep_runs;
CREATE POLICY "Service role can update sweep run audits"
  ON public.commitment_contract_sweep_runs
  FOR UPDATE
  TO service_role
  USING (TRUE)
  WITH CHECK (TRUE);

GRANT SELECT, INSERT, UPDATE ON public.commitment_contract_sweep_runs TO service_role;

COMMENT ON TABLE public.commitment_contract_sweep_runs
  IS 'Operational audit log for scheduled commitment contract due-window sweep runs.';

CREATE OR REPLACE FUNCTION public.evaluate_due_commitment_contracts_sweep(
  p_max_users INTEGER DEFAULT 200,
  p_max_windows_per_user INTEGER DEFAULT 12
)
RETURNS TABLE (
  users_processed INTEGER,
  evaluations_created INTEGER,
  ran_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user RECORD;
  v_users_processed INTEGER := 0;
  v_evaluations_created INTEGER := 0;
  v_failed_users INTEGER := 0;
  v_row_count INTEGER := 0;
  v_ran_at TIMESTAMPTZ := NOW();
  v_run_id UUID;
  v_errors JSONB := '[]'::JSONB;
BEGIN
  INSERT INTO public.commitment_contract_sweep_runs (
    triggered_at,
    job_source,
    max_users,
    max_windows_per_user,
    status
  )
  VALUES (
    v_ran_at,
    CASE WHEN auth.role() = 'service_role' THEN 'manual' ELSE 'cron' END,
    GREATEST(1, p_max_users),
    GREATEST(1, p_max_windows_per_user),
    'running'
  )
  RETURNING id INTO v_run_id;

  FOR v_user IN
    SELECT DISTINCT user_id
    FROM public.commitment_contracts
    WHERE status = 'active'
    ORDER BY user_id
    LIMIT GREATEST(1, p_max_users)
  LOOP
    BEGIN
      v_users_processed := v_users_processed + 1;

      WITH evaluated AS (
        SELECT id
        FROM public.evaluate_due_commitment_contracts(v_user.user_id, p_max_windows_per_user)
      )
      SELECT COUNT(*)
      INTO v_row_count
      FROM evaluated;

      v_evaluations_created := v_evaluations_created + COALESCE(v_row_count, 0);
    EXCEPTION
      WHEN OTHERS THEN
        v_failed_users := v_failed_users + 1;
        v_errors := v_errors || jsonb_build_object(
          'user_id', v_user.user_id,
          'error', SQLERRM,
          'failed_at', NOW()
        );
    END;
  END LOOP;

  UPDATE public.commitment_contract_sweep_runs
  SET finished_at = NOW(),
      users_processed = v_users_processed,
      evaluations_created = v_evaluations_created,
      failed_users = v_failed_users,
      status = CASE
        WHEN v_failed_users = 0 THEN 'success'
        WHEN v_users_processed > v_failed_users THEN 'partial'
        ELSE 'failed'
      END,
      details = jsonb_build_object(
        'errors', v_errors,
        'max_users', GREATEST(1, p_max_users),
        'max_windows_per_user', GREATEST(1, p_max_windows_per_user)
      )
  WHERE id = v_run_id;

  RETURN QUERY
  SELECT v_users_processed, v_evaluations_created, v_ran_at;
EXCEPTION
  WHEN OTHERS THEN
    IF v_run_id IS NOT NULL THEN
      UPDATE public.commitment_contract_sweep_runs
      SET finished_at = NOW(),
          users_processed = v_users_processed,
          evaluations_created = v_evaluations_created,
          failed_users = v_failed_users,
          status = 'failed',
          error_message = SQLERRM,
          details = jsonb_build_object(
            'errors', v_errors,
            'max_users', GREATEST(1, p_max_users),
            'max_windows_per_user', GREATEST(1, p_max_windows_per_user)
          )
      WHERE id = v_run_id;
    END IF;
    RAISE;
END;
$$;

COMMENT ON FUNCTION public.evaluate_due_commitment_contracts_sweep(INTEGER, INTEGER)
IS 'Server-side sweep that evaluates due windows for active commitment contracts across users and records audit telemetry for each run.';
