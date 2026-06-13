-- Goals already carry a single primary life_wheel_category. This adds the
-- optional *secondary* life-wheel areas a goal can also touch on, so a goal is
-- always anchored to one primary area while still expressing the other areas it
-- contributes to.
ALTER TABLE public.goals
  ADD COLUMN IF NOT EXISTS secondary_life_wheel_categories text[] NOT NULL DEFAULT '{}';
