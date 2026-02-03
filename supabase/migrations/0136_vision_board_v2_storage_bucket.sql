-- VISION BOARD V2 STORAGE BUCKET
-- Migration 0136: Create private storage bucket for Vision Board V2 assets

-- Create the vision bucket (private by default)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'vision',
  'vision',
  false,
  10485760, -- 10MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- Storage policies are managed separately. See supabase/migrations/README_STORAGE_POLICIES.md
