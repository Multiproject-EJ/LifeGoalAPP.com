-- Explicitly document/enforce that daily user activity is never directly
-- readable from the Data API. Admins consume only aggregate SECURITY DEFINER
-- output from get_admin_telemetry_insights(). service_role bypasses RLS for the
-- scheduled rollup.
DROP POLICY IF EXISTS "telemetry_user_activity_no_direct_access"
  ON public.telemetry_user_activity_daily;

CREATE POLICY "telemetry_user_activity_no_direct_access"
  ON public.telemetry_user_activity_daily
  FOR ALL
  TO anon, authenticated
  USING (FALSE)
  WITH CHECK (FALSE);

CREATE INDEX IF NOT EXISTS telemetry_user_activity_daily_user_day_idx
  ON public.telemetry_user_activity_daily (user_id, day DESC);
