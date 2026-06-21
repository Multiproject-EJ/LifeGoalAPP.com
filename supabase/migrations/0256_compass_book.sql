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
