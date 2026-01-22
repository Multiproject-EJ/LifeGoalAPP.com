-- Personality test schema (profiles extensions + test history + recommendations)

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS personality_traits jsonb,
  ADD COLUMN IF NOT EXISTS personality_axes jsonb,
  ADD COLUMN IF NOT EXISTS personality_profile_type text,
  ADD COLUMN IF NOT EXISTS personality_summary text,
  ADD COLUMN IF NOT EXISTS personality_last_tested_at timestamptz;

CREATE TABLE IF NOT EXISTS public.personality_tests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  taken_at timestamptz DEFAULT now(),
  traits jsonb NOT NULL,
  axes jsonb NOT NULL,
  answers jsonb,
  version text NOT NULL DEFAULT 'v1'
);

CREATE INDEX IF NOT EXISTS idx_personality_tests_user_id
  ON public.personality_tests (user_id);
CREATE INDEX IF NOT EXISTS idx_personality_tests_user_taken_at
  ON public.personality_tests (user_id, taken_at DESC);

CREATE TABLE IF NOT EXISTS public.personality_questions (
  id text PRIMARY KEY,
  text text NOT NULL,
  trait_key text NOT NULL,
  axis_type text NOT NULL CHECK (axis_type IN ('big5', 'custom')),
  reverse_scored boolean NOT NULL DEFAULT false,
  order_index integer
);

CREATE TABLE IF NOT EXISTS public.personality_recommendations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trait_key text NOT NULL,
  min_value numeric,
  max_value numeric,
  label text NOT NULL,
  description text NOT NULL,
  action_link jsonb,
  priority integer DEFAULT 0
);

ALTER TABLE public.personality_tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.personality_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.personality_recommendations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "personality_tests_owner_all" ON public.personality_tests;
CREATE POLICY "personality_tests_owner_all"
  ON public.personality_tests
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "personality_questions_read" ON public.personality_questions;
CREATE POLICY "personality_questions_read"
  ON public.personality_questions
  FOR SELECT
  USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "personality_recommendations_read" ON public.personality_recommendations;
CREATE POLICY "personality_recommendations_read"
  ON public.personality_recommendations
  FOR SELECT
  USING (auth.role() = 'authenticated');
