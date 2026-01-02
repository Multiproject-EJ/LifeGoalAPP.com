-- Migration 0116: Annual Reviews and Goals
-- Description: Create tables for Year in Review feature and backend functions

-- 1. Annual Reviews Table
CREATE TABLE IF NOT EXISTS public.annual_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  year int NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  reflection_text text,
  overall_rating int CHECK (overall_rating >= 1 AND overall_rating <= 10),
  UNIQUE(user_id, year)
);

-- RLS for annual_reviews
ALTER TABLE public.annual_reviews ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'annual_reviews'
      AND policyname = 'Users can manage their own annual reviews'
  ) THEN
    CREATE POLICY "Users can manage their own annual reviews"
      ON public.annual_reviews
      FOR ALL
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END$$;

-- 2. Annual Goals Table
CREATE TABLE IF NOT EXISTS public.annual_goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id uuid NOT NULL REFERENCES public.annual_reviews(id) ON DELETE CASCADE,
  category text NOT NULL, -- Linked to Life Wheel segments
  goal_statement text NOT NULL,
  vision_image_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- RLS for annual_goals
ALTER TABLE public.annual_goals ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'annual_goals'
      AND policyname = 'Users can manage their own annual goals'
  ) THEN
    CREATE POLICY "Users can manage their own annual goals"
      ON public.annual_goals
      FOR ALL
      USING (
        EXISTS (
          SELECT 1 FROM public.annual_reviews
          WHERE id = annual_goals.review_id
          AND user_id = auth.uid()
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.annual_reviews
          WHERE id = annual_goals.review_id
          AND user_id = auth.uid()
        )
      );
  END IF;
END$$;


-- 3. Backend Functions (RPC)

CREATE OR REPLACE FUNCTION get_year_in_review_stats(year_input int)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id uuid;
  v_total_habits_completed int;
  v_longest_streak int;
  v_most_active_category text;
BEGIN
  -- Get current user ID
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- 1. Total habits completed in the given year
  -- Try to count from reminder_action_logs if it exists and has 'done' actions
  BEGIN
    SELECT count(*)
    INTO v_total_habits_completed
    FROM public.reminder_action_logs
    WHERE user_id = v_user_id
    AND action = 'done'
    AND date_part('year', created_at) = year_input;
  EXCEPTION WHEN OTHERS THEN
    v_total_habits_completed := 0;
  END;
  
  -- Handle null result from count if any
  IF v_total_habits_completed IS NULL THEN
    v_total_habits_completed := 0;
  END IF;

  -- 2. Longest streak
  -- Fetch from gamification_profiles if available
  BEGIN
    SELECT longest_streak
    INTO v_longest_streak
    FROM public.gamification_profiles
    WHERE user_id = v_user_id;
  EXCEPTION WHEN OTHERS THEN
    v_longest_streak := 0;
  END;
  
  -- If null, set to 0
  IF v_longest_streak IS NULL THEN
    v_longest_streak := 0;
  END IF;

  -- 3. Most active category
  -- Placeholder for now as category tracking might not be fully standardized on habits
  v_most_active_category := 'General';

  RETURN json_build_object(
    'total_habits_completed', v_total_habits_completed,
    'longest_streak', v_longest_streak,
    'most_active_category', v_most_active_category
  );
END;
$$;