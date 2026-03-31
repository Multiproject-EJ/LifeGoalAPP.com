-- Migration: Routines Foundation
-- Description: Introduce first-class routines that compose existing habits_v2 records.

-- =====================================================
-- 1) ENUMS
-- =====================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'routine_step_display_mode'
      AND n.nspname = 'public'
  ) THEN
    CREATE TYPE public.routine_step_display_mode AS ENUM (
      'inside_routine_only',
      'also_show_standalone',
      'standalone_only'
    );
  END IF;
END
$$;

-- =====================================================
-- 2) TABLES
-- =====================================================
CREATE TABLE IF NOT EXISTS public.routines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  schedule JSONB NOT NULL DEFAULT jsonb_build_object('mode', 'daily'),
  anchor_time TIME,
  domain_key TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.routine_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  routine_id UUID NOT NULL REFERENCES public.routines(id) ON DELETE CASCADE,
  habit_id UUID NOT NULL REFERENCES public.habits_v2(id) ON DELETE CASCADE,
  step_order INTEGER NOT NULL DEFAULT 0,
  required BOOLEAN NOT NULL DEFAULT TRUE,
  display_mode public.routine_step_display_mode NOT NULL DEFAULT 'inside_routine_only',
  fallback_step BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT routine_steps_order_nonnegative CHECK (step_order >= 0)
);

CREATE TABLE IF NOT EXISTS public.routine_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  routine_id UUID NOT NULL REFERENCES public.routines(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  completed BOOLEAN NOT NULL DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  mode TEXT NOT NULL DEFAULT 'normal' CHECK (mode IN ('normal', 'fallback')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT routine_logs_unique_per_day UNIQUE (routine_id, user_id, date)
);

-- =====================================================
-- 3) INDEXES
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_routines_user_id ON public.routines(user_id);
CREATE INDEX IF NOT EXISTS idx_routines_user_is_active ON public.routines(user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_routine_steps_routine_order ON public.routine_steps(routine_id, step_order);
CREATE INDEX IF NOT EXISTS idx_routine_steps_habit_id ON public.routine_steps(habit_id);
CREATE INDEX IF NOT EXISTS idx_routine_logs_user_date ON public.routine_logs(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_routine_logs_routine_date ON public.routine_logs(routine_id, date DESC);

-- =====================================================
-- 4) RLS
-- =====================================================
ALTER TABLE public.routines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.routine_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.routine_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own routines" ON public.routines;
CREATE POLICY "Users can view their own routines"
  ON public.routines
  FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create their own routines" ON public.routines;
CREATE POLICY "Users can create their own routines"
  ON public.routines
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own routines" ON public.routines;
CREATE POLICY "Users can update their own routines"
  ON public.routines
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own routines" ON public.routines;
CREATE POLICY "Users can delete their own routines"
  ON public.routines
  FOR DELETE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view steps for own routines" ON public.routine_steps;
CREATE POLICY "Users can view steps for own routines"
  ON public.routine_steps
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.routines r
      WHERE r.id = routine_steps.routine_id
        AND r.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can create steps for own routines" ON public.routine_steps;
CREATE POLICY "Users can create steps for own routines"
  ON public.routine_steps
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.routines r
      WHERE r.id = routine_steps.routine_id
        AND r.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can update steps for own routines" ON public.routine_steps;
CREATE POLICY "Users can update steps for own routines"
  ON public.routine_steps
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM public.routines r
      WHERE r.id = routine_steps.routine_id
        AND r.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.routines r
      WHERE r.id = routine_steps.routine_id
        AND r.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can delete steps for own routines" ON public.routine_steps;
CREATE POLICY "Users can delete steps for own routines"
  ON public.routine_steps
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1
      FROM public.routines r
      WHERE r.id = routine_steps.routine_id
        AND r.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can view own routine logs" ON public.routine_logs;
CREATE POLICY "Users can view own routine logs"
  ON public.routine_logs
  FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create own routine logs" ON public.routine_logs;
CREATE POLICY "Users can create own routine logs"
  ON public.routine_logs
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own routine logs" ON public.routine_logs;
CREATE POLICY "Users can update own routine logs"
  ON public.routine_logs
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own routine logs" ON public.routine_logs;
CREATE POLICY "Users can delete own routine logs"
  ON public.routine_logs
  FOR DELETE
  USING (auth.uid() = user_id);

-- =====================================================
-- 5) TRIGGERS
-- =====================================================
CREATE OR REPLACE FUNCTION public.touch_routines_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS touch_routines_updated_at ON public.routines;
CREATE TRIGGER touch_routines_updated_at
  BEFORE UPDATE ON public.routines
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_routines_updated_at();

DROP TRIGGER IF EXISTS touch_routine_steps_updated_at ON public.routine_steps;
CREATE TRIGGER touch_routine_steps_updated_at
  BEFORE UPDATE ON public.routine_steps
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_routines_updated_at();

DROP TRIGGER IF EXISTS touch_routine_logs_updated_at ON public.routine_logs;
CREATE TRIGGER touch_routine_logs_updated_at
  BEFORE UPDATE ON public.routine_logs
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_routines_updated_at();

-- =====================================================
-- 6) COMMENTS
-- =====================================================
COMMENT ON TABLE public.routines IS 'User-defined routines that compose existing habits_v2 into ordered flows.';
COMMENT ON TABLE public.routine_steps IS 'Ordered steps linking routines to habits_v2 with display behavior rules.';
COMMENT ON TABLE public.routine_logs IS 'Optional routine-level completion milestones per user/day.';
COMMENT ON COLUMN public.routine_steps.display_mode IS 'Visibility control for rendering a step in routine vs standalone habit lanes.';
