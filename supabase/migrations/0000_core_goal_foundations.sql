-- Canonical baseline for the original LifeGoal domain.
--
-- These tables previously lived only in the archived bootstrap SQL under
-- supabase/reference. Keeping them in the migration chain makes a clean local
-- reset (and a new hosted project) reproducible before later migrations add
-- goal, vision-board, and quest fields.

CREATE TABLE IF NOT EXISTS public.goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  target_date date,
  progress_notes text,
  status_tag text
);

CREATE INDEX IF NOT EXISTS goals_user_id_idx ON public.goals(user_id);

CREATE TABLE IF NOT EXISTS public.goal_reflections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id uuid NOT NULL REFERENCES public.goals(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  entry_date date NOT NULL,
  confidence numeric,
  highlight text,
  challenge text,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS goal_reflections_goal_id_idx
  ON public.goal_reflections(goal_id);
CREATE INDEX IF NOT EXISTS goal_reflections_user_date_idx
  ON public.goal_reflections(user_id, entry_date DESC);

CREATE TABLE IF NOT EXISTS public.vision_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  image_path text,
  caption text,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS vision_images_user_id_idx
  ON public.vision_images(user_id);

CREATE TABLE IF NOT EXISTS public.checkins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date date NOT NULL,
  scores jsonb NOT NULL,
  CONSTRAINT checkins_unique_per_day UNIQUE (user_id, date)
);

CREATE INDEX IF NOT EXISTS checkins_user_date_idx
  ON public.checkins(user_id, date DESC);

CREATE TABLE IF NOT EXISTS public.notification_preferences (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  habit_reminders_enabled boolean NOT NULL DEFAULT true,
  habit_reminder_time text,
  checkin_nudges_enabled boolean NOT NULL DEFAULT true,
  timezone text,
  subscription jsonb,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE OR REPLACE FUNCTION public.set_notification_preferences_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at := timezone('utc', now());
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_notification_preferences_updated_at
  ON public.notification_preferences;
CREATE TRIGGER set_notification_preferences_updated_at
  BEFORE UPDATE ON public.notification_preferences
  FOR EACH ROW
  EXECUTE FUNCTION public.set_notification_preferences_updated_at();

ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goal_reflections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vision_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checkins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own goals" ON public.goals;
CREATE POLICY "Users manage own goals"
  ON public.goals
  FOR ALL
  TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users manage own goal reflections" ON public.goal_reflections;
CREATE POLICY "Users manage own goal reflections"
  ON public.goal_reflections
  FOR ALL
  TO authenticated
  USING (
    (SELECT auth.uid()) = user_id
    AND EXISTS (
      SELECT 1
      FROM public.goals
      WHERE goals.id = goal_reflections.goal_id
        AND goals.user_id = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    (SELECT auth.uid()) = user_id
    AND EXISTS (
      SELECT 1
      FROM public.goals
      WHERE goals.id = goal_reflections.goal_id
        AND goals.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users manage own vision images" ON public.vision_images;
CREATE POLICY "Users manage own vision images"
  ON public.vision_images
  FOR ALL
  TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users manage own checkins" ON public.checkins;
CREATE POLICY "Users manage own checkins"
  ON public.checkins
  FOR ALL
  TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users manage own notification preferences" ON public.notification_preferences;
CREATE POLICY "Users manage own notification preferences"
  ON public.notification_preferences
  FOR ALL
  TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

REVOKE ALL ON TABLE public.goals FROM anon;
REVOKE ALL ON TABLE public.goal_reflections FROM anon;
REVOKE ALL ON TABLE public.vision_images FROM anon;
REVOKE ALL ON TABLE public.checkins FROM anon;
REVOKE ALL ON TABLE public.notification_preferences FROM anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.goals TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.goal_reflections TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.vision_images TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.checkins TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.notification_preferences TO authenticated;

COMMENT ON TABLE public.goals IS 'User-owned long-term goals and campaign foundations.';
COMMENT ON TABLE public.goal_reflections IS 'Dated reflections attached to a user-owned goal.';
