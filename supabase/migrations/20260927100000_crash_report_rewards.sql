-- ============================================================
-- CRASH REPORTS WITH A DICE THANK-YOU
--
-- Players can send a crash report after something breaks. Reports
-- land in the existing support cases (case_type 'support',
-- category 'crash_report') with bounded technical diagnostics in
-- metadata. As a thank-you the server grants a fixed dice reward
-- at most once per user per UTC day; the client never chooses the
-- amount. A daily report cap keeps the inbox usable.
--
-- The client applies the granted dice to runtime state through the
-- canonical Island Run commit path only when this RPC says so.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.crash_report_rewards (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reward_day DATE NOT NULL,
  thread_id UUID REFERENCES public.case_threads(id) ON DELETE SET NULL,
  reward_amount INTEGER NOT NULL CHECK (reward_amount >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, reward_day)
);

ALTER TABLE public.crash_report_rewards ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS crash_report_rewards_select_own ON public.crash_report_rewards;
CREATE POLICY crash_report_rewards_select_own
  ON public.crash_report_rewards
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.submit_crash_report(
  p_subject TEXT,
  p_body TEXT,
  p_metadata JSONB,
  p_source_route TEXT,
  p_is_demo BOOLEAN DEFAULT false
)
RETURNS TABLE(thread_id UUID, reward_granted BOOLEAN, reward_amount INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_today DATE := (now() AT TIME ZONE 'utc')::date;
  v_reports_today INTEGER;
  v_thread_id UUID;
  v_amount CONSTANT INTEGER := 20;
  v_inserted BOOLEAN := false;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT count(*) INTO v_reports_today
  FROM public.case_threads c
  WHERE c.user_id = v_user_id
    AND c.category = 'crash_report'
    AND c.created_at >= (v_today::timestamp AT TIME ZONE 'utc');
  IF v_reports_today >= 10 THEN
    RAISE EXCEPTION 'crash report daily limit reached';
  END IF;

  IF p_metadata IS NOT NULL AND octet_length(p_metadata::text) > 60000 THEN
    RAISE EXCEPTION 'crash report diagnostics too large';
  END IF;

  INSERT INTO public.case_threads (
    user_id, case_type, category, subject, source_surface, source_route, is_demo, metadata
  )
  VALUES (
    v_user_id,
    'support',
    'crash_report',
    left(coalesce(nullif(btrim(p_subject), ''), 'Crash report'), 140),
    'crash_report',
    left(p_source_route, 300),
    coalesce(p_is_demo, false),
    coalesce(p_metadata, '{}'::jsonb)
  )
  RETURNING id INTO v_thread_id;

  INSERT INTO public.case_messages (thread_id, author_user_id, author_role, message_type, body)
  VALUES (
    v_thread_id,
    v_user_id,
    'user',
    'submission',
    left(coalesce(nullif(btrim(p_body), ''), '(No description — technical details attached.)'), 4000)
  );

  INSERT INTO public.crash_report_rewards (user_id, reward_day, thread_id, reward_amount)
  VALUES (v_user_id, v_today, v_thread_id, v_amount)
  ON CONFLICT (user_id, reward_day) DO NOTHING
  RETURNING true INTO v_inserted;

  RETURN QUERY SELECT v_thread_id, COALESCE(v_inserted, false), CASE WHEN COALESCE(v_inserted, false) THEN v_amount ELSE 0 END;
END;
$$;

REVOKE ALL ON FUNCTION public.submit_crash_report(TEXT, TEXT, JSONB, TEXT, BOOLEAN) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_crash_report(TEXT, TEXT, JSONB, TEXT, BOOLEAN) TO authenticated;

COMMENT ON FUNCTION public.submit_crash_report(TEXT, TEXT, JSONB, TEXT, BOOLEAN) IS
  'Files a crash report as a support case (category crash_report) and grants a fixed 20-dice thank-you at most once per user per UTC day. Returns the thread id and whether the reward was granted.';
