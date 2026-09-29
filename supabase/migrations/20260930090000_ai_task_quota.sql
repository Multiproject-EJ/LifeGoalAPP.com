-- ============================================================
-- AI TASK QUOTA: per-user daily limit for the ai-task edge function
--
-- AI features run on the device (Apple Intelligence) when they can, and
-- otherwise through the ai-task edge function, which holds the OpenAI key.
-- Any signed-in user can call that function, so it enforces a daily request
-- limit per user here, on the server, where the client cannot reset it.
--
-- Limits match the client-side free quota (src/services/aiQuotaService.ts):
--   level_1 (short rewrites, suggestions): 60 requests per UTC day
--   level_2 (tip of the day, conflict mediation): 12 requests per UTC day
-- Only the service role (the edge function) can read the table or call the RPC.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.ai_task_usage (
  user_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  usage_day DATE NOT NULL,
  level TEXT NOT NULL CHECK (level IN ('level_1', 'level_2')),
  request_count INTEGER NOT NULL DEFAULT 0 CHECK (request_count >= 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, usage_day, level)
);

ALTER TABLE public.ai_task_usage ENABLE ROW LEVEL SECURITY;
-- No policies: client roles have no access at all.
REVOKE ALL ON TABLE public.ai_task_usage FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.ai_task_usage TO service_role;

-- Counts one request and returns TRUE, or returns FALSE once the day's limit
-- is reached (the counter then stays at the limit).
CREATE OR REPLACE FUNCTION public.consume_ai_task_quota(p_user_id UUID, p_level TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_limit INTEGER;
  v_count INTEGER;
BEGIN
  v_limit := CASE p_level WHEN 'level_1' THEN 60 WHEN 'level_2' THEN 12 ELSE 0 END;
  IF p_user_id IS NULL OR v_limit = 0 THEN
    RETURN FALSE;
  END IF;

  INSERT INTO public.ai_task_usage AS usage (user_id, usage_day, level, request_count)
  VALUES (p_user_id, (now() AT TIME ZONE 'utc')::date, p_level, 1)
  ON CONFLICT (user_id, usage_day, level) DO UPDATE
    SET request_count = usage.request_count + 1,
        updated_at = now()
    WHERE usage.request_count < v_limit
  RETURNING request_count INTO v_count;

  RETURN v_count IS NOT NULL;
END;
$$;

REVOKE ALL ON FUNCTION public.consume_ai_task_quota(UUID, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_ai_task_quota(UUID, TEXT) TO service_role;

COMMENT ON TABLE public.ai_task_usage IS
  'Per-user daily request counts for the ai-task edge function (service role only).';
COMMENT ON FUNCTION public.consume_ai_task_quota(UUID, TEXT) IS
  'Service-role only: counts one ai-task request; FALSE once the daily limit for the level is reached.';
