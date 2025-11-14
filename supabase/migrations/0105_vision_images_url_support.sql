-- Add support for URL-based images in vision_images table
-- This migration adds columns to support both file uploads and external URLs

-- Add image_url column to store external image URLs
alter table public.vision_images add column if not exists image_url text;

-- Add image_source column to track whether the image is from a file or URL
-- Default to 'file' for backward compatibility with existing records
alter table public.vision_images add column if not exists image_source text default 'file';

-- Add check constraint to ensure image_source is either 'file' or 'url'
do $$ 
begin
  if not exists (
    select 1 from pg_constraint 
    where conname = 'vision_images_source_check' 
    and conrelid = 'public.vision_images'::regclass
  ) then
    alter table public.vision_images 
    add constraint vision_images_source_check 
    check (image_source in ('file', 'url'));
  end if;
end $$;

-- Add check constraint to ensure either image_path or image_url is set based on source
do $$ 
begin
  if not exists (
    select 1 from pg_constraint 
    where conname = 'vision_images_path_url_check' 
    and conrelid = 'public.vision_images'::regclass
  ) then
    alter table public.vision_images 
    add constraint vision_images_path_url_check 
    check (
      (image_source = 'file' and image_path is not null) or
      (image_source = 'url' and image_url is not null)
    );
  end if;
end $$;

-- Comment the columns for documentation
comment on column public.vision_images.image_url is 'External URL for images loaded from the web';
comment on column public.vision_images.image_source is 'Source type: file (uploaded to storage) or url (external link)';
