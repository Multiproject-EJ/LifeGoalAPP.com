-- ========================================================
-- AI Coach chat threads/messages
-- Migration 0256: durable short-term chat history for the main AI Coach.
-- Long-term compact memories are intentionally deferred to a later slice.
-- ========================================================

CREATE TABLE IF NOT EXISTS public.ai_coach_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  surface TEXT NOT NULL DEFAULT 'main_coach',
  title TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),
  last_message_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ai_coach_threads_user_last_message_idx
  ON public.ai_coach_threads(user_id, last_message_at DESC);

CREATE INDEX IF NOT EXISTS ai_coach_threads_user_status_idx
  ON public.ai_coach_threads(user_id, status, updated_at DESC);

CREATE TABLE IF NOT EXISTS public.ai_coach_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id UUID NOT NULL REFERENCES public.ai_coach_threads(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  token_estimate INTEGER,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ai_coach_messages_thread_created_idx
  ON public.ai_coach_messages(thread_id, created_at ASC);

CREATE INDEX IF NOT EXISTS ai_coach_messages_user_created_idx
  ON public.ai_coach_messages(user_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.update_ai_coach_threads_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_ai_coach_threads_updated_at ON public.ai_coach_threads;
CREATE TRIGGER trg_ai_coach_threads_updated_at
BEFORE UPDATE ON public.ai_coach_threads
FOR EACH ROW EXECUTE FUNCTION public.update_ai_coach_threads_updated_at();

ALTER TABLE public.ai_coach_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_coach_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ai_coach_threads_owner_select" ON public.ai_coach_threads;
CREATE POLICY "ai_coach_threads_owner_select"
  ON public.ai_coach_threads
  FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "ai_coach_threads_owner_insert" ON public.ai_coach_threads;
CREATE POLICY "ai_coach_threads_owner_insert"
  ON public.ai_coach_threads
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "ai_coach_threads_owner_update" ON public.ai_coach_threads;
CREATE POLICY "ai_coach_threads_owner_update"
  ON public.ai_coach_threads
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "ai_coach_threads_owner_delete" ON public.ai_coach_threads;
CREATE POLICY "ai_coach_threads_owner_delete"
  ON public.ai_coach_threads
  FOR DELETE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "ai_coach_messages_owner_select" ON public.ai_coach_messages;
CREATE POLICY "ai_coach_messages_owner_select"
  ON public.ai_coach_messages
  FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "ai_coach_messages_owner_insert" ON public.ai_coach_messages;
CREATE POLICY "ai_coach_messages_owner_insert"
  ON public.ai_coach_messages
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1
      FROM public.ai_coach_threads t
      WHERE t.id = thread_id
        AND t.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "ai_coach_messages_owner_delete" ON public.ai_coach_messages;
CREATE POLICY "ai_coach_messages_owner_delete"
  ON public.ai_coach_messages
  FOR DELETE
  USING (auth.uid() = user_id);

COMMENT ON TABLE public.ai_coach_threads IS 'Durable short-term conversation threads for the main AI Coach.';
COMMENT ON TABLE public.ai_coach_messages IS 'Recent AI Coach chat messages. Long-term summaries live in a future compact memory table.';
