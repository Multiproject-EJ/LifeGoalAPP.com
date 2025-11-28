-- Migration: Add rollback/revert support columns to habit_adjustments table
-- This migration adds audit fields for tracking when suggestions are applied and reverted.

-- Add applied_at column (timestamp when the suggestion was applied)
ALTER TABLE public.habit_adjustments ADD COLUMN IF NOT EXISTS applied_at timestamptz;

-- Add reverted column (flag indicating if the suggestion has been rolled back)
ALTER TABLE public.habit_adjustments ADD COLUMN IF NOT EXISTS reverted boolean DEFAULT false;

-- Add reverted_at column (timestamp when the suggestion was reverted)
ALTER TABLE public.habit_adjustments ADD COLUMN IF NOT EXISTS reverted_at timestamptz;

-- Add revert_rationale column (optional user-provided reason for reverting)
ALTER TABLE public.habit_adjustments ADD COLUMN IF NOT EXISTS revert_rationale text;

-- Note: For existing applied rows without applied_at, the service layer will backfill
-- applied_at = now() on first revert operation via COALESCE(applied_at, now()).
