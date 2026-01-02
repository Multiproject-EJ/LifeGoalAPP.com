-- ========================================================
-- VISION BOARD STORAGE BUCKET
-- Migration 0124: Create storage bucket for vision board images
-- ========================================================

-- Create the vision-board storage bucket
-- This bucket stores user-uploaded vision board images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'vision-board',
  'vision-board',
  true,  -- Public bucket for easy image serving
  5242880,  -- 5MB file size limit
  ARRAY['image/png', 'image/jpeg', 'image/webp', 'image/gif']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- RLS Policies for vision-board bucket
-- ===========================================
-- IMPORTANT: Due to Supabase platform security, storage.objects policies
-- cannot be created/dropped via standard SQL migrations (requires supabase_storage_admin role).
-- 
-- You have two options:
--
-- OPTION 1 (Recommended): Create policies via Supabase Dashboard
-- ----------------------------------------------------------------
-- 1. Go to Supabase Dashboard > Storage > vision-board bucket
-- 2. Click "Policies" tab
-- 3. Add the following policies:
--
-- SELECT Policy:
--   Name: vision_board_select
--   Target roles: authenticated
--   USING: bucket_id = 'vision-board' AND ((storage.foldername(name))[1] = auth.uid()::text OR EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'vision-board' AND public = true))
--
-- INSERT Policy:
--   Name: vision_board_insert
--   Target roles: authenticated
--   WITH CHECK: bucket_id = 'vision-board' AND (storage.foldername(name))[1] = auth.uid()::text
--
-- UPDATE Policy:
--   Name: vision_board_update
--   Target roles: authenticated
--   USING: bucket_id = 'vision-board' AND (storage.foldername(name))[1] = auth.uid()::text
--   WITH CHECK: bucket_id = 'vision-board' AND (storage.foldername(name))[1] = auth.uid()::text
--
-- DELETE Policy:
--   Name: vision_board_delete
--   Target roles: authenticated
--   USING: bucket_id = 'vision-board' AND (storage.foldername(name))[1] = auth.uid()::text
--
-- OPTION 2: Run via Supabase SQL Editor (with elevated permissions)
-- ------------------------------------------------------------------
-- Copy and paste the SQL below into the Supabase Dashboard SQL Editor:
--
/*
CREATE POLICY IF NOT EXISTS "vision_board_select" ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'vision-board'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR EXISTS (
        SELECT 1 FROM storage.buckets
        WHERE id = 'vision-board' AND public = true
      )
    )
  );

CREATE POLICY IF NOT EXISTS "vision_board_insert" ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'vision-board'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY IF NOT EXISTS "vision_board_update" ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'vision-board'
    AND (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'vision-board'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY IF NOT EXISTS "vision_board_delete" ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'vision-board'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
*/
