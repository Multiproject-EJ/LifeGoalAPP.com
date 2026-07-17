-- Migration ledger version 02560001
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

-- Consolidated companion migration (shared historical version).

-- Migration ledger version 02560002
-- ========================================================
-- COMPASS BOOK (new six-chapter curriculum)
-- Migration 0256: durable answer/output model for the new
-- Compass Book. Completely separate from the legacy 11-phase
-- compass_state (migration 0252), which is left untouched.
--   - compass_books: one active book per user per curriculum version
--   - compass_chapter_states: one row per book x chapter
-- Owner-only RLS on both. No goals/habits/game-state writes.
-- ========================================================

CREATE TABLE IF NOT EXISTS public.compass_books (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- Curriculum bundle version, e.g. 'v1'. A user has one active book per version.
  curriculum_version TEXT NOT NULL DEFAULT 'v1',
  -- not_started | in_progress | completed
  status TEXT NOT NULL DEFAULT 'not_started',
  current_chapter_id TEXT NULL,
  current_activity_id TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ NULL,
  UNIQUE (user_id, curriculum_version)
);

CREATE TABLE IF NOT EXISTS public.compass_chapter_states (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id UUID NOT NULL REFERENCES public.compass_books(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- Stable chapter id: living_wheel | inner_compass | living_horizon | ikigai_map | quest_forge | personal_playbook
  chapter_id TEXT NOT NULL,
  -- Curriculum version the answers were authored under (forward-compat).
  content_version TEXT NOT NULL DEFAULT 'v1',
  -- locked | unlocked | in_progress | complete
  status TEXT NOT NULL DEFAULT 'unlocked',
  -- Array of answer records (see CompassAnswerRecord). Stable activity/question ids.
  answers JSONB NOT NULL DEFAULT '[]'::jsonb,
  -- Deterministic projection of answers (proposed outputs).
  draft_output JSONB NULL,
  -- Player-sealed snapshot. Non-null marks the chapter complete.
  confirmed_output JSONB NULL,
  completed_activity_ids TEXT[] NOT NULL DEFAULT '{}',
  confirmed_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (book_id, chapter_id)
);

CREATE INDEX IF NOT EXISTS idx_compass_books_user ON public.compass_books(user_id);
CREATE INDEX IF NOT EXISTS idx_compass_chapter_states_book ON public.compass_chapter_states(book_id);
CREATE INDEX IF NOT EXISTS idx_compass_chapter_states_user ON public.compass_chapter_states(user_id);

-- ---------- RLS: owner-only on both tables ----------

ALTER TABLE public.compass_books ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "own_compass_books_select" ON public.compass_books;
CREATE POLICY "own_compass_books_select" ON public.compass_books
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "own_compass_books_insert" ON public.compass_books;
CREATE POLICY "own_compass_books_insert" ON public.compass_books
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "own_compass_books_update" ON public.compass_books;
CREATE POLICY "own_compass_books_update" ON public.compass_books
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "own_compass_books_delete" ON public.compass_books;
CREATE POLICY "own_compass_books_delete" ON public.compass_books
  FOR DELETE USING (auth.uid() = user_id);

ALTER TABLE public.compass_chapter_states ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "own_compass_chapter_states_select" ON public.compass_chapter_states;
CREATE POLICY "own_compass_chapter_states_select" ON public.compass_chapter_states
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "own_compass_chapter_states_insert" ON public.compass_chapter_states;
CREATE POLICY "own_compass_chapter_states_insert" ON public.compass_chapter_states
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "own_compass_chapter_states_update" ON public.compass_chapter_states;
CREATE POLICY "own_compass_chapter_states_update" ON public.compass_chapter_states
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "own_compass_chapter_states_delete" ON public.compass_chapter_states;
CREATE POLICY "own_compass_chapter_states_delete" ON public.compass_chapter_states
  FOR DELETE USING (auth.uid() = user_id);

COMMENT ON TABLE public.compass_books IS
  'Compass Book (new six-chapter curriculum): one active book per user per curriculum version. Separate from legacy compass_state.';
COMMENT ON TABLE public.compass_chapter_states IS
  'Compass Book per-chapter answers, draft and confirmed outputs. Owner-only. Never stores goals/habits/game state.';
