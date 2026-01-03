-- ========================================================
-- ANNUAL REVIEWS - Add completed_at field
-- Migration 0125: Track when users complete the annual review wizard
-- ========================================================

-- Add completed_at column to annual_reviews table
ALTER TABLE public.annual_reviews 
ADD COLUMN IF NOT EXISTS completed_at timestamptz;

-- Add comment for documentation
COMMENT ON COLUMN public.annual_reviews.completed_at IS 'Timestamp when the user completed the full annual review wizard (all 4 steps)';
