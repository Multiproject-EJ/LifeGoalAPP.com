-- Seed personality recommendations for rules-based filtering

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

INSERT INTO public.personality_recommendations (
  trait_key,
  min_value,
  max_value,
  label,
  description,
  priority
)
SELECT
  'stress_response',
  NULL,
  40,
  'Stress support',
  'Lean on meditation and grounding rituals when things feel heavy.',
  10
WHERE NOT EXISTS (
  SELECT 1
  FROM public.personality_recommendations
  WHERE label = 'Stress support'
);

INSERT INTO public.personality_recommendations (
  trait_key,
  min_value,
  max_value,
  label,
  description,
  priority
)
SELECT
  'regulation_style',
  65,
  NULL,
  'Structured planning',
  'Use detailed goal plans and habit streaks to stay on track.',
  20
WHERE NOT EXISTS (
  SELECT 1
  FROM public.personality_recommendations
  WHERE label = 'Structured planning'
);

INSERT INTO public.personality_recommendations (
  trait_key,
  min_value,
  max_value,
  label,
  description,
  priority
)
SELECT
  'regulation_style',
  NULL,
  40,
  'Flexible planning',
  'Try lighter habit prompts and focus on momentum over rigidity.',
  21
WHERE NOT EXISTS (
  SELECT 1
  FROM public.personality_recommendations
  WHERE label = 'Flexible planning'
);

INSERT INTO public.personality_recommendations (
  trait_key,
  min_value,
  max_value,
  label,
  description,
  priority
)
SELECT
  'extraversion',
  65,
  NULL,
  'Social momentum',
  'Plan goals with a buddy or share progress in community spaces.',
  30
WHERE NOT EXISTS (
  SELECT 1
  FROM public.personality_recommendations
  WHERE label = 'Social momentum'
);

INSERT INTO public.personality_recommendations (
  trait_key,
  min_value,
  max_value,
  label,
  description,
  priority
)
SELECT
  'extraversion',
  NULL,
  40,
  'Quiet focus',
  'Block solo deep-work sessions and celebrate private wins.',
  31
WHERE NOT EXISTS (
  SELECT 1
  FROM public.personality_recommendations
  WHERE label = 'Quiet focus'
);

INSERT INTO public.personality_recommendations (
  trait_key,
  min_value,
  max_value,
  label,
  description,
  priority
)
SELECT
  'openness',
  65,
  NULL,
  'Explore & learn',
  'Add learning quests or skill sprints that keep curiosity alive.',
  40
WHERE NOT EXISTS (
  SELECT 1
  FROM public.personality_recommendations
  WHERE label = 'Explore & learn'
);

INSERT INTO public.personality_recommendations (
  trait_key,
  min_value,
  max_value,
  label,
  description,
  priority
)
SELECT
  'overall',
  NULL,
  NULL,
  'Weekly focus review',
  'Pick one outcome that matters most this week and track it daily.',
  80
WHERE NOT EXISTS (
  SELECT 1
  FROM public.personality_recommendations
  WHERE label = 'Weekly focus review'
);

INSERT INTO public.personality_recommendations (
  trait_key,
  min_value,
  max_value,
  label,
  description,
  priority
)
SELECT
  'overall',
  NULL,
  NULL,
  'Daily check-in',
  'Spend two minutes naming your top priority and emotional state.',
  81
WHERE NOT EXISTS (
  SELECT 1
  FROM public.personality_recommendations
  WHERE label = 'Daily check-in'
);

INSERT INTO public.personality_recommendations (
  trait_key,
  min_value,
  max_value,
  label,
  description,
  priority
)
SELECT
  'overall',
  NULL,
  NULL,
  'Breathing reset',
  'Use a short breathing exercise to reset your nervous system.',
  82
WHERE NOT EXISTS (
  SELECT 1
  FROM public.personality_recommendations
  WHERE label = 'Breathing reset'
);
