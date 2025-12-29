-- Migration 0114: Add metadata + review loop fields to vision_images

ALTER TABLE public.vision_images
  ADD COLUMN IF NOT EXISTS vision_type TEXT;

ALTER TABLE public.vision_images
  ADD COLUMN IF NOT EXISTS review_interval_days INTEGER DEFAULT 30;

ALTER TABLE public.vision_images
  ADD COLUMN IF NOT EXISTS last_reviewed_at TIMESTAMPTZ;

ALTER TABLE public.vision_images
  ADD COLUMN IF NOT EXISTS linked_goal_ids TEXT[];

ALTER TABLE public.vision_images
  ADD COLUMN IF NOT EXISTS linked_habit_ids TEXT[];

COMMENT ON COLUMN public.vision_images.vision_type IS 'Classification for the vision board entry (goal, habit, identity, experience, environment).';
COMMENT ON COLUMN public.vision_images.review_interval_days IS 'Number of days between review check-ins for a vision board item.';
COMMENT ON COLUMN public.vision_images.last_reviewed_at IS 'Timestamp of the most recent review check-in.';
COMMENT ON COLUMN public.vision_images.linked_goal_ids IS 'Goal IDs linked to this vision board entry.';
COMMENT ON COLUMN public.vision_images.linked_habit_ids IS 'Habit IDs linked to this vision board entry.';
