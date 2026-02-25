-- Goal execution foundations: plan quality fields, health snapshots, and adaptation events.

ALTER TABLE public.goals
  ADD COLUMN IF NOT EXISTS why_it_matters text,
  ADD COLUMN IF NOT EXISTS priority_level text CHECK (priority_level IN ('now', 'later')),
  ADD COLUMN IF NOT EXISTS weekly_workload_target integer CHECK (weekly_workload_target >= 0),
  ADD COLUMN IF NOT EXISTS plan_quality_score integer CHECK (plan_quality_score BETWEEN 0 AND 5),
  ADD COLUMN IF NOT EXISTS plan_quality_breakdown jsonb;

COMMENT ON COLUMN public.goals.why_it_matters IS 'Short user-authored reason this goal matters right now.';
COMMENT ON COLUMN public.goals.priority_level IS 'Execution priority used by coaching logic (now or later).';
COMMENT ON COLUMN public.goals.weekly_workload_target IS 'Weekly target for execution workload (sessions or blocks).';
COMMENT ON COLUMN public.goals.plan_quality_score IS 'Deterministic plan quality score from 0 to 5.';
COMMENT ON COLUMN public.goals.plan_quality_breakdown IS 'Criterion-level pass/fail breakdown for plan quality scoring.';

CREATE TABLE IF NOT EXISTS public.goal_health_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id uuid NOT NULL REFERENCES public.goals(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  captured_at timestamptz NOT NULL DEFAULT now(),
  health_state text NOT NULL CHECK (health_state IN ('on_track', 'caution', 'at_risk')),
  risk_reason text,
  recommended_action text,
  signals jsonb
);

CREATE INDEX IF NOT EXISTS idx_goal_health_snapshots_goal_id_captured_at
  ON public.goal_health_snapshots(goal_id, captured_at DESC);
CREATE INDEX IF NOT EXISTS idx_goal_health_snapshots_user_id_captured_at
  ON public.goal_health_snapshots(user_id, captured_at DESC);

ALTER TABLE public.goal_health_snapshots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own goal health snapshots" ON public.goal_health_snapshots;
CREATE POLICY "Users can view their own goal health snapshots"
  ON public.goal_health_snapshots FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own goal health snapshots" ON public.goal_health_snapshots;
CREATE POLICY "Users can insert their own goal health snapshots"
  ON public.goal_health_snapshots FOR INSERT
  WITH CHECK (auth.uid() = user_id);

COMMENT ON TABLE public.goal_health_snapshots IS 'Time-series snapshots of goal execution health and risk signals.';

CREATE TABLE IF NOT EXISTS public.goal_adaptations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id uuid NOT NULL REFERENCES public.goals(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action_type text NOT NULL CHECK (action_type IN (
    'scale_scope',
    'reduce_workload',
    'switch_to_planning_habit',
    'defer_priority',
    'clarify_success_metric'
  )),
  before_state jsonb,
  after_state jsonb,
  source text NOT NULL DEFAULT 'manual' CHECK (source IN ('ai_recommendation', 'manual')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_goal_adaptations_goal_id_created_at
  ON public.goal_adaptations(goal_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_goal_adaptations_user_id_created_at
  ON public.goal_adaptations(user_id, created_at DESC);

ALTER TABLE public.goal_adaptations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own goal adaptations" ON public.goal_adaptations;
CREATE POLICY "Users can view their own goal adaptations"
  ON public.goal_adaptations FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own goal adaptations" ON public.goal_adaptations;
CREATE POLICY "Users can insert their own goal adaptations"
  ON public.goal_adaptations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

COMMENT ON TABLE public.goal_adaptations IS 'Recorded plan adaptation actions applied to keep goals executable.';

ALTER TABLE public.journal_entries
  ADD COLUMN IF NOT EXISTS friction_tag text,
  ADD COLUMN IF NOT EXISTS ai_suggested_prompt_id text;

COMMENT ON COLUMN public.journal_entries.friction_tag IS 'Optional friction signal (for example: stuck, unclear, overwhelmed).';
COMMENT ON COLUMN public.journal_entries.ai_suggested_prompt_id IS 'Prompt identifier when a quick reflection used an AI suggestion.';
