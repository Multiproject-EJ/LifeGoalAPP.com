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
-- Note: Storage RLS policies are created on the storage.objects table

-- Policy: Users can view their own images (and public images)
DROP POLICY IF EXISTS "vision_board_select" ON storage.objects;
CREATE POLICY "vision_board_select" ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'vision-board'
    AND (
      -- Allow access to user's own folder
      (storage.foldername(name))[1] = auth.uid()::text
      -- Or allow access if the bucket is public (for sharing)
      OR EXISTS (
        SELECT 1 FROM storage.buckets
        WHERE id = 'vision-board' AND public = true
      )
    )
  );

-- Policy: Users can upload images to their own folder only
DROP POLICY IF EXISTS "vision_board_insert" ON storage.objects;
CREATE POLICY "vision_board_insert" ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'vision-board'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Policy: Users can update their own images
DROP POLICY IF EXISTS "vision_board_update" ON storage.objects;
CREATE POLICY "vision_board_update" ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'vision-board'
    AND (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'vision-board'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Policy: Users can delete their own images
DROP POLICY IF EXISTS "vision_board_delete" ON storage.objects;
CREATE POLICY "vision_board_delete" ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'vision-board'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Add helpful comments
COMMENT ON POLICY "vision_board_select" ON storage.objects IS 'Allow users to view vision board images (own or public)';
COMMENT ON POLICY "vision_board_insert" ON storage.objects IS 'Allow users to upload vision board images to their own folder';
COMMENT ON POLICY "vision_board_update" ON storage.objects IS 'Allow users to update their own vision board images';
COMMENT ON POLICY "vision_board_delete" ON storage.objects IS 'Allow users to delete their own vision board images';
