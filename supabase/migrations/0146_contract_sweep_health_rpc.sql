-- Surface non-sensitive contract sweep health telemetry to authenticated clients.
CREATE OR REPLACE FUNCTION public.get_commitment_contract_sweep_health()
RETURNS TABLE (
  status text,
  triggered_at timestamptz,
  finished_at timestamptz,
  users_processed integer,
  evaluations_created integer,
  failed_users integer
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    run.status::text,
    run.triggered_at,
    run.finished_at,
    run.users_processed,
    run.evaluations_created,
    run.failed_users
  FROM public.commitment_contract_sweep_runs AS run
  ORDER BY run.triggered_at DESC
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_commitment_contract_sweep_health() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_commitment_contract_sweep_health() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_commitment_contract_sweep_health() TO service_role;

COMMENT ON FUNCTION public.get_commitment_contract_sweep_health()
  IS 'Returns a single latest commitment contract sweep run summary for user-facing reliability messaging.';
