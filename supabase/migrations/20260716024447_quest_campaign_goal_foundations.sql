-- ========================================================
-- QUEST / CAMPAIGN / GOAL FOUNDATIONS
--
-- Canonical product hierarchy:
--   Compass Book -> Goal -> Campaign -> Quest -> Quest habits
--
-- A Campaign is a time-boxed season around a Goal. A Quest is a
-- SMART-sized outcome/experiment inside that season. Quest-habit
-- links are normalized so every supporting habit can carry the same
-- Quest tag while the existing single "Quest Habit" bonus-door star
-- remains an independent game mechanic.
-- ========================================================

-- ── 1. Campaigns get canonical Goal/Life-Wheel links ───────

ALTER TABLE public.campaigns
  ADD COLUMN IF NOT EXISTS goal_id uuid REFERENCES public.goals(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS life_wheel_category text;

CREATE INDEX IF NOT EXISTS campaigns_goal_id_idx
  ON public.campaigns(goal_id)
  WHERE goal_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS campaigns_life_wheel_category_idx
  ON public.campaigns(owner_id, life_wheel_category)
  WHERE life_wheel_category IS NOT NULL;

COMMENT ON COLUMN public.campaigns.goal_id IS
  'Canonical Goal this time-boxed Campaign advances. Nullable for legacy/game-only campaigns.';
COMMENT ON COLUMN public.campaigns.life_wheel_category IS
  'Canonical Life Wheel area inherited from or explicitly chosen for the Campaign.';

-- Prevent a signed-in owner from attaching their Campaign to another
-- player''s Goal. These replace the original 0272 write policies.
DROP POLICY IF EXISTS campaigns_insert_own ON public.campaigns;
CREATE POLICY campaigns_insert_own
  ON public.campaigns FOR INSERT TO authenticated
  WITH CHECK (
    (select auth.uid()) = owner_id
    AND (
      goal_id IS NULL
      OR EXISTS (
        SELECT 1 FROM public.goals g
        WHERE g.id = goal_id AND g.user_id = (select auth.uid())
      )
    )
  );

DROP POLICY IF EXISTS campaigns_update_own ON public.campaigns;
CREATE POLICY campaigns_update_own
  ON public.campaigns FOR UPDATE TO authenticated
  USING ((select auth.uid()) = owner_id)
  WITH CHECK (
    (select auth.uid()) = owner_id
    AND (
      goal_id IS NULL
      OR EXISTS (
        SELECT 1 FROM public.goals g
        WHERE g.id = goal_id AND g.user_id = (select auth.uid())
      )
    )
  );

-- ── 2. Canonical Quests ────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.quests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  goal_id uuid REFERENCES public.goals(id) ON DELETE SET NULL,
  campaign_id uuid REFERENCES public.campaigns(id) ON DELETE SET NULL,
  title text NOT NULL CHECK (char_length(btrim(title)) BETWEEN 1 AND 160),
  outcome text NOT NULL DEFAULT '' CHECK (char_length(outcome) <= 2000),
  quest_kind text NOT NULL DEFAULT 'smart_goal'
    CHECK (quest_kind IN ('smart_goal', 'behavior_experiment', 'milestone', 'recovery')),
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'active', 'paused', 'completed', 'archived')),
  starts_on date,
  ends_on date,
  life_wheel_category text,
  -- Specific / Measurable / Achievable / Relevant / Time-bound fields.
  smart_definition jsonb NOT NULL DEFAULT '{}'::jsonb
    CHECK (jsonb_typeof(smart_definition) = 'object'),
  -- Current loop, better loop, environment changes, minimum move,
  -- keystone-habit design, friction plan, and recovery rule.
  behavior_design jsonb NOT NULL DEFAULT '{}'::jsonb
    CHECK (jsonb_typeof(behavior_design) = 'object'),
  -- Cadence, evidence questions, review checkpoints, and completion review.
  reflection_plan jsonb NOT NULL DEFAULT '{}'::jsonb
    CHECK (jsonb_typeof(reflection_plan) = 'object'),
  source_compass_chapter_id text,
  source_compass_activity_id text,
  completed_at timestamptz,
  archived_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (ends_on IS NULL OR starts_on IS NULL OR ends_on >= starts_on),
  CHECK ((status = 'completed' AND completed_at IS NOT NULL) OR status <> 'completed')
);

CREATE INDEX IF NOT EXISTS quests_user_status_dates_idx
  ON public.quests(user_id, status, starts_on, ends_on);
CREATE INDEX IF NOT EXISTS quests_goal_id_idx
  ON public.quests(goal_id, status)
  WHERE goal_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS quests_campaign_id_idx
  ON public.quests(campaign_id, status)
  WHERE campaign_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS quests_life_wheel_category_idx
  ON public.quests(user_id, life_wheel_category, status)
  WHERE life_wheel_category IS NOT NULL;

ALTER TABLE public.quests ENABLE ROW LEVEL SECURITY;

CREATE POLICY quests_select_own
  ON public.quests FOR SELECT TO authenticated
  USING ((select auth.uid()) = user_id);

CREATE POLICY quests_insert_own_links
  ON public.quests FOR INSERT TO authenticated
  WITH CHECK (
    (select auth.uid()) = user_id
    AND (
      goal_id IS NULL
      OR EXISTS (
        SELECT 1 FROM public.goals g
        WHERE g.id = goal_id AND g.user_id = (select auth.uid())
      )
    )
    AND (
      campaign_id IS NULL
      OR EXISTS (
        SELECT 1 FROM public.campaigns c
        WHERE c.id = campaign_id AND c.owner_id = (select auth.uid())
      )
    )
  );

CREATE POLICY quests_update_own_links
  ON public.quests FOR UPDATE TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK (
    (select auth.uid()) = user_id
    AND (
      goal_id IS NULL
      OR EXISTS (
        SELECT 1 FROM public.goals g
        WHERE g.id = goal_id AND g.user_id = (select auth.uid())
      )
    )
    AND (
      campaign_id IS NULL
      OR EXISTS (
        SELECT 1 FROM public.campaigns c
        WHERE c.id = campaign_id AND c.owner_id = (select auth.uid())
      )
    )
  );

CREATE POLICY quests_delete_own
  ON public.quests FOR DELETE TO authenticated
  USING ((select auth.uid()) = user_id);

CREATE OR REPLACE FUNCTION public.set_quests_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.set_quests_updated_at() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_quests_updated_at ON public.quests;
CREATE TRIGGER trg_quests_updated_at
  BEFORE UPDATE ON public.quests
  FOR EACH ROW EXECUTE FUNCTION public.set_quests_updated_at();

COMMENT ON TABLE public.quests IS
  'SMART-sized outcomes and behavior experiments linked to a Goal and optionally a time-boxed Campaign. The row itself is the Compass Book live-evidence layer; sealed Compass answers are never overwritten.';

-- ── 3. Every supporting habit receives a Quest relationship ─

CREATE TABLE IF NOT EXISTS public.quest_habit_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  quest_id uuid NOT NULL REFERENCES public.quests(id) ON DELETE CASCADE,
  habit_id uuid NOT NULL REFERENCES public.habits_v2(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'supporting'
    CHECK (role IN ('keystone', 'supporting')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (quest_id, habit_id)
);

CREATE INDEX IF NOT EXISTS quest_habit_links_habit_idx
  ON public.quest_habit_links(habit_id, quest_id);
CREATE INDEX IF NOT EXISTS quest_habit_links_user_idx
  ON public.quest_habit_links(user_id, quest_id);

ALTER TABLE public.quest_habit_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY quest_habit_links_select_own
  ON public.quest_habit_links FOR SELECT TO authenticated
  USING ((select auth.uid()) = user_id);

CREATE POLICY quest_habit_links_insert_own_entities
  ON public.quest_habit_links FOR INSERT TO authenticated
  WITH CHECK (
    (select auth.uid()) = user_id
    AND EXISTS (
      SELECT 1 FROM public.quests q
      WHERE q.id = quest_id AND q.user_id = (select auth.uid())
    )
    AND EXISTS (
      SELECT 1 FROM public.habits_v2 h
      WHERE h.id = habit_id AND h.user_id = (select auth.uid())
    )
  );

CREATE POLICY quest_habit_links_update_own_entities
  ON public.quest_habit_links FOR UPDATE TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK (
    (select auth.uid()) = user_id
    AND EXISTS (
      SELECT 1 FROM public.quests q
      WHERE q.id = quest_id AND q.user_id = (select auth.uid())
    )
    AND EXISTS (
      SELECT 1 FROM public.habits_v2 h
      WHERE h.id = habit_id AND h.user_id = (select auth.uid())
    )
  );

CREATE POLICY quest_habit_links_delete_own
  ON public.quest_habit_links FOR DELETE TO authenticated
  USING ((select auth.uid()) = user_id);

COMMENT ON TABLE public.quest_habit_links IS
  'Normalized Quest-to-habit relationships. Every linked habit renders the Quest tag; one may be designated the keystone habit.';

-- ── 4. Quest reflections / loop evidence ───────────────────

CREATE TABLE IF NOT EXISTS public.quest_reflections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  quest_id uuid NOT NULL REFERENCES public.quests(id) ON DELETE CASCADE,
  reflection_type text NOT NULL DEFAULT 'check_in'
    CHECK (reflection_type IN ('check_in', 'loop_review', 'completion', 'ally_reply')),
  content text NOT NULL DEFAULT '' CHECK (char_length(content) <= 10000),
  loop_observation jsonb NOT NULL DEFAULT '{}'::jsonb
    CHECK (jsonb_typeof(loop_observation) = 'object'),
  next_experiment text CHECK (next_experiment IS NULL OR char_length(next_experiment) <= 2000),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS quest_reflections_quest_created_idx
  ON public.quest_reflections(quest_id, created_at DESC);
CREATE INDEX IF NOT EXISTS quest_reflections_user_created_idx
  ON public.quest_reflections(user_id, created_at DESC);

ALTER TABLE public.quest_reflections ENABLE ROW LEVEL SECURITY;

CREATE POLICY quest_reflections_select_own
  ON public.quest_reflections FOR SELECT TO authenticated
  USING ((select auth.uid()) = user_id);

CREATE POLICY quest_reflections_insert_own_quest
  ON public.quest_reflections FOR INSERT TO authenticated
  WITH CHECK (
    (select auth.uid()) = user_id
    AND EXISTS (
      SELECT 1 FROM public.quests q
      WHERE q.id = quest_id AND q.user_id = (select auth.uid())
    )
  );

CREATE POLICY quest_reflections_update_own_quest
  ON public.quest_reflections FOR UPDATE TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK (
    (select auth.uid()) = user_id
    AND EXISTS (
      SELECT 1 FROM public.quests q
      WHERE q.id = quest_id AND q.user_id = (select auth.uid())
    )
  );

CREATE POLICY quest_reflections_delete_own
  ON public.quest_reflections FOR DELETE TO authenticated
  USING ((select auth.uid()) = user_id);

COMMENT ON TABLE public.quest_reflections IS
  'Quest check-ins, behavior-loop observations, completion reviews, and future Quest Ally letter replies.';

-- ── 5. Atomic Quest bundle save ────────────────────────────
--
-- A Quest Forge save may create/update the Quest, create one new
-- habits_v2 row, and replace every Quest-habit link. A Postgres
-- function call is one short transaction, preventing orphan habits or
-- partially linked Quests. SECURITY INVOKER keeps normal RLS active.

CREATE OR REPLACE FUNCTION public.save_quest_bundle(
  p_quest jsonb,
  p_links jsonb DEFAULT '[]'::jsonb,
  p_new_habit jsonb DEFAULT NULL
)
RETURNS public.quests
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_user_id uuid := (SELECT auth.uid());
  v_quest public.quests;
  v_status text;
  v_goal_id uuid;
  v_campaign_id uuid;
  v_new_habit_id uuid;
  v_new_habit_goal_id uuid;
BEGIN
  IF v_user_id IS NULL OR p_quest IS NULL THEN
    RAISE EXCEPTION 'Authentication required.' USING ERRCODE = '42501';
  END IF;
  IF jsonb_typeof(p_quest) <> 'object' OR jsonb_typeof(COALESCE(p_links, '[]'::jsonb)) <> 'array' THEN
    RAISE EXCEPTION 'Invalid Quest bundle.' USING ERRCODE = '22023';
  END IF;
  IF NULLIF(p_quest->>'user_id', '')::uuid IS DISTINCT FROM v_user_id THEN
    RAISE EXCEPTION 'Quest owner does not match the authenticated user.' USING ERRCODE = '42501';
  END IF;

  v_goal_id := NULLIF(p_quest->>'goal_id', '')::uuid;
  v_campaign_id := NULLIF(p_quest->>'campaign_id', '')::uuid;
  v_status := COALESCE(NULLIF(p_quest->>'status', ''), 'draft');

  IF v_goal_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.goals g WHERE g.id = v_goal_id AND g.user_id = v_user_id
  ) THEN
    RAISE EXCEPTION 'Goal is not owned by the authenticated user.' USING ERRCODE = '42501';
  END IF;
  IF v_campaign_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.campaigns c WHERE c.id = v_campaign_id AND c.owner_id = v_user_id
  ) THEN
    RAISE EXCEPTION 'Campaign is not owned by the authenticated user.' USING ERRCODE = '42501';
  END IF;

  IF p_new_habit IS NOT NULL THEN
    IF jsonb_typeof(p_new_habit) <> 'object'
      OR NULLIF(p_new_habit->>'user_id', '')::uuid IS DISTINCT FROM v_user_id THEN
      RAISE EXCEPTION 'Invalid Quest habit owner.' USING ERRCODE = '42501';
    END IF;
    v_new_habit_id := (p_new_habit->>'id')::uuid;
    v_new_habit_goal_id := NULLIF(p_new_habit->>'goal_id', '')::uuid;
    IF btrim(COALESCE(p_new_habit->>'title', '')) = '' THEN
      RAISE EXCEPTION 'Quest habit title is required.' USING ERRCODE = '22023';
    END IF;
    IF v_new_habit_goal_id IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM public.goals g WHERE g.id = v_new_habit_goal_id AND g.user_id = v_user_id
    ) THEN
      RAISE EXCEPTION 'Quest habit goal is not owned by the authenticated user.' USING ERRCODE = '42501';
    END IF;
    INSERT INTO public.habits_v2 (
      id, user_id, title, emoji, type, status, schedule, start_date,
      archived, goal_id, habit_intent
    ) VALUES (
      v_new_habit_id,
      v_user_id,
      btrim(p_new_habit->>'title'),
      NULLIF(p_new_habit->>'emoji', ''),
      COALESCE(NULLIF(p_new_habit->>'type', ''), 'boolean')::public.habit_type,
      COALESCE(NULLIF(p_new_habit->>'status', ''), 'active')::public.habit_lifecycle_status,
      COALESCE(p_new_habit->'schedule', '{"mode":"daily"}'::jsonb),
      COALESCE(NULLIF(p_new_habit->>'start_date', '')::date, current_date),
      COALESCE((p_new_habit->>'archived')::boolean, false),
      v_new_habit_goal_id,
      CASE
        WHEN p_new_habit->>'habit_intent' IN ('build', 'break')
          THEN p_new_habit->>'habit_intent'
        ELSE 'build'
      END
    )
    ON CONFLICT (id) DO UPDATE SET
      title = EXCLUDED.title,
      emoji = EXCLUDED.emoji,
      type = EXCLUDED.type,
      status = EXCLUDED.status,
      schedule = EXCLUDED.schedule,
      start_date = EXCLUDED.start_date,
      archived = EXCLUDED.archived,
      goal_id = EXCLUDED.goal_id,
      habit_intent = EXCLUDED.habit_intent
    WHERE public.habits_v2.user_id = v_user_id;
  END IF;

  INSERT INTO public.quests (
    id, user_id, goal_id, campaign_id, title, outcome, quest_kind,
    status, starts_on, ends_on, life_wheel_category, smart_definition,
    behavior_design, reflection_plan, source_compass_chapter_id,
    source_compass_activity_id, completed_at, archived_at
  ) VALUES (
    (p_quest->>'id')::uuid,
    v_user_id,
    v_goal_id,
    v_campaign_id,
    btrim(p_quest->>'title'),
    COALESCE(p_quest->>'outcome', ''),
    COALESCE(NULLIF(p_quest->>'quest_kind', ''), 'behavior_experiment'),
    v_status,
    NULLIF(p_quest->>'starts_on', '')::date,
    NULLIF(p_quest->>'ends_on', '')::date,
    NULLIF(p_quest->>'life_wheel_category', ''),
    COALESCE(p_quest->'smart_definition', '{}'::jsonb),
    COALESCE(p_quest->'behavior_design', '{}'::jsonb),
    COALESCE(p_quest->'reflection_plan', '{}'::jsonb),
    NULLIF(p_quest->>'source_compass_chapter_id', ''),
    NULLIF(p_quest->>'source_compass_activity_id', ''),
    CASE WHEN v_status = 'completed' THEN COALESCE(NULLIF(p_quest->>'completed_at', '')::timestamptz, now()) END,
    CASE WHEN v_status = 'archived' THEN COALESCE(NULLIF(p_quest->>'archived_at', '')::timestamptz, now()) END
  )
  ON CONFLICT (id) DO UPDATE SET
    goal_id = EXCLUDED.goal_id,
    campaign_id = EXCLUDED.campaign_id,
    title = EXCLUDED.title,
    outcome = EXCLUDED.outcome,
    quest_kind = EXCLUDED.quest_kind,
    status = EXCLUDED.status,
    starts_on = EXCLUDED.starts_on,
    ends_on = EXCLUDED.ends_on,
    life_wheel_category = EXCLUDED.life_wheel_category,
    smart_definition = EXCLUDED.smart_definition,
    behavior_design = EXCLUDED.behavior_design,
    reflection_plan = EXCLUDED.reflection_plan,
    source_compass_chapter_id = EXCLUDED.source_compass_chapter_id,
    source_compass_activity_id = EXCLUDED.source_compass_activity_id,
    completed_at = EXCLUDED.completed_at,
    archived_at = EXCLUDED.archived_at
  WHERE public.quests.user_id = v_user_id
  RETURNING * INTO v_quest;

  IF v_quest.id IS NULL THEN
    RAISE EXCEPTION 'Quest could not be saved.' USING ERRCODE = '42501';
  END IF;

  DELETE FROM public.quest_habit_links qhl
  WHERE qhl.quest_id = v_quest.id
    AND qhl.user_id = v_user_id
    AND NOT EXISTS (
      SELECT 1
      FROM jsonb_array_elements(COALESCE(p_links, '[]'::jsonb)) item
      WHERE NULLIF(item->>'habit_id', '')::uuid = qhl.habit_id
    );

  INSERT INTO public.quest_habit_links (user_id, quest_id, habit_id, role)
  SELECT
    v_user_id,
    v_quest.id,
    (item->>'habit_id')::uuid,
    COALESCE(NULLIF(item->>'role', ''), 'supporting')
  FROM jsonb_array_elements(COALESCE(p_links, '[]'::jsonb)) item
  ON CONFLICT (quest_id, habit_id) DO UPDATE SET role = EXCLUDED.role
  WHERE public.quest_habit_links.user_id = v_user_id;

  RETURN v_quest;
END;
$$;

REVOKE ALL ON FUNCTION public.save_quest_bundle(jsonb, jsonb, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.save_quest_bundle(jsonb, jsonb, jsonb) TO authenticated, service_role;

COMMENT ON FUNCTION public.save_quest_bundle(jsonb, jsonb, jsonb) IS
  'Atomically creates or updates an owned Quest, an optional new habit, and the complete desired Quest-habit link set under normal RLS.';

-- ── 6. Explicit Data API grants (required by current defaults) ─

REVOKE ALL ON TABLE public.quests, public.quest_habit_links, public.quest_reflections FROM anon;
REVOKE ALL ON TABLE public.campaigns, public.habits_v2 FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE
  ON TABLE public.quests, public.quest_habit_links, public.quest_reflections
  TO authenticated;
-- Current Supabase projects require explicit Data API grants. Quest Forge can
-- create a purpose-built habit inside the SECURITY INVOKER bundle function;
-- the existing owner-only habits_v2 RLS policy remains the authorization gate.
GRANT SELECT, INSERT, UPDATE, DELETE
  ON TABLE public.campaigns, public.habits_v2
  TO authenticated;
GRANT ALL
  ON TABLE public.quests, public.quest_habit_links, public.quest_reflections
  TO service_role;

-- ── 7. Bound user-generated Quest data ─────────────────────

INSERT INTO public.user_data_limits
  (table_name, user_column, scope_label, max_rows, max_row_bytes)
VALUES
  ('quests',              'user_id', 'account',  500,  32768),
  ('quest_habit_links',   'user_id', 'account', 5000,   2048),
  ('quest_reflections',   'user_id', 'account', 10000, 16384)
ON CONFLICT (table_name) DO NOTHING;

SELECT public.attach_user_data_limit_triggers();
