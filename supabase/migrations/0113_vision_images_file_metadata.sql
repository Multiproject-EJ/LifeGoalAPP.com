-- Migration 0113: Add file metadata columns to vision_images table
-- This migration adds columns to store file paths and formats for uploaded images

-- Add file_path column (for storing the original file path before WebP conversion)
ALTER TABLE public.vision_images ADD COLUMN IF NOT EXISTS file_path TEXT;

-- Add file_format column (for storing the original file format, e.g., 'jpeg', 'png', 'webp')
ALTER TABLE public.vision_images ADD COLUMN IF NOT EXISTS file_format TEXT;

-- Add index on file_format for potential filtering/reporting
CREATE INDEX IF NOT EXISTS idx_vision_images_file_format ON public.vision_images(file_format);

-- Comment the columns for documentation
COMMENT ON COLUMN public.vision_images.file_path IS 'Original file path in storage (before WebP conversion if applicable)';
COMMENT ON COLUMN public.vision_images.file_format IS 'Original file format (e.g., jpeg, png, webp)';
