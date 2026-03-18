-- Environment audit foundations: lightweight current-state fields plus append-only audit history.

ALTER TABLE public.goals
  ADD COLUMN IF NOT EXISTS environment_context jsonb,
  ADD COLUMN IF NOT EXISTS environment_score integer CHECK (environment_score BETWEEN 0 AND 5),
  ADD COLUMN IF NOT EXISTS environment_last_audited_at timestamptz;

COMMENT ON COLUMN public.goals.environment_context IS 'Structured environment audit context for the current goal setup.';
COMMENT ON COLUMN public.goals.environment_score IS 'Deterministic environment setup score from 0 to 5.';
COMMENT ON COLUMN public.goals.environment_last_audited_at IS 'Timestamp of the most recent environment audit for this goal.';

ALTER TABLE public.habits_v2
  ADD COLUMN IF NOT EXISTS environment_context jsonb,
  ADD COLUMN IF NOT EXISTS environment_score integer CHECK (environment_score BETWEEN 0 AND 5),
  ADD COLUMN IF NOT EXISTS environment_risk_tags text[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS environment_last_audited_at timestamptz;

COMMENT ON COLUMN public.habits_v2.environment_context IS 'Structured environment audit context for the current habit setup.';
COMMENT ON COLUMN public.habits_v2.environment_score IS 'Deterministic environment setup score from 0 to 5.';
COMMENT ON COLUMN public.habits_v2.environment_risk_tags IS 'Derived risk tags used for recommendations and coaching.';
COMMENT ON COLUMN public.habits_v2.environment_last_audited_at IS 'Timestamp of the most recent environment audit for this habit.';

CREATE TABLE IF NOT EXISTS public.environment_audits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  goal_id uuid REFERENCES public.goals(id) ON DELETE CASCADE,
  habit_id uuid REFERENCES public.habits_v2(id) ON DELETE CASCADE,
  entity_type text NOT NULL CHECK (entity_type IN ('goal', 'habit')),
  audit_source text NOT NULL DEFAULT 'manual_edit' CHECK (audit_source IN ('setup', 'weekly_review', 'ai_prompt', 'manual_edit')),
  score_before integer CHECK (score_before IS NULL OR score_before BETWEEN 0 AND 5),
  score_after integer CHECK (score_after IS NULL OR score_after BETWEEN 0 AND 5),
  risk_tags text[] NOT NULL DEFAULT '{}'::text[],
  before_state jsonb,
  after_state jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT environment_audits_single_entity_check CHECK (
    ((goal_id IS NOT NULL)::int + (habit_id IS NOT NULL)::int) = 1
  ),
  CONSTRAINT environment_audits_entity_type_match_check CHECK (
    (entity_type = 'goal' AND goal_id IS NOT NULL AND habit_id IS NULL)
    OR (entity_type = 'habit' AND habit_id IS NOT NULL AND goal_id IS NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_environment_audits_goal_id_created_at
  ON public.environment_audits(goal_id, created_at DESC)
  WHERE goal_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_environment_audits_habit_id_created_at
  ON public.environment_audits(habit_id, created_at DESC)
  WHERE habit_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_environment_audits_user_id_created_at
  ON public.environment_audits(user_id, created_at DESC);

ALTER TABLE public.environment_audits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own environment audits" ON public.environment_audits;
CREATE POLICY "Users can view their own environment audits"
  ON public.environment_audits FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own environment audits" ON public.environment_audits;
CREATE POLICY "Users can insert their own environment audits"
  ON public.environment_audits FOR INSERT
  WITH CHECK (auth.uid() = user_id);

COMMENT ON TABLE public.environment_audits IS 'Append-only audit history for goal and habit environment setup changes.';
COMMENT ON COLUMN public.environment_audits.audit_source IS 'Origin of the audit event such as setup, weekly review, AI prompt, or manual edit.';
COMMENT ON COLUMN public.environment_audits.risk_tags IS 'Risk tags inferred from the environment context at the time of the audit.';
