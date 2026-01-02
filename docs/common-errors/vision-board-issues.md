# Vision Board Issues

This guide covers common errors related to the Vision Board feature.

## Error: "Unable to load vision board tags."

### Symptom
When accessing the Vision Board feature, you see an error message: "Unable to load vision board tags."

### Cause
The `vision_board_image_tags` table is missing from your Supabase database. This table was added in migrations `0120_vision_board_image_tags.sql` and `0121_vision_board_image_tags_group.sql`.

### Solution
Run the missing migrations in your Supabase SQL Editor:

1. Run `supabase/migrations/0120_vision_board_image_tags.sql`
2. Run `supabase/migrations/0121_vision_board_image_tags_group.sql`

Or run the consolidated manual.sql file which contains all migrations:
```bash
# In Supabase SQL Editor, run:
# sql/manual.sql
```

---

## Error: "Bucket Not found" when uploading images

### Symptom
When trying to upload an image file to the Vision Board, you see an error message containing "Bucket Not found" or similar. URL-based images work fine.

### Cause
The `vision-board` storage bucket doesn't exist in your Supabase project. This bucket is required to store uploaded image files.

### Solution

**Option 1: Run the migration (Recommended)**

Run the `0124_vision_board_storage_bucket.sql` migration in your Supabase SQL Editor:

```sql
-- Run this in Supabase SQL Editor
-- File: supabase/migrations/0124_vision_board_storage_bucket.sql
```

This migration:
- Creates the `vision-board` bucket with proper settings
- Sets up RLS policies to ensure users can only access their own images
- Configures file size limits (5MB) and allowed MIME types

**Option 2: Create the bucket manually**

1. Go to your Supabase Dashboard
2. Navigate to **Storage** → **Buckets**
3. Click **New bucket**
4. Configure:
   - Name: `vision-board`
   - Public bucket: **ON** (for easy image serving)
5. Set up storage policies (see migration file for exact policies)

**Option 3: Use URL-based images only**

If you don't want to set up the storage bucket, you can use URL-based images instead:
1. In the Vision Board, select "Image URL" upload mode
2. Paste a direct link to your image
3. This stores just the URL reference without uploading the file

---

## Storage RLS Policies

The `vision-board` bucket uses Row Level Security (RLS) policies to protect user data:

| Policy | Description |
|--------|-------------|
| `vision_board_select` | Users can view their own images (or any if bucket is public) |
| `vision_board_insert` | Users can upload only to their own folder (`{user_id}/`) |
| `vision_board_update` | Users can update only their own images |
| `vision_board_delete` | Users can delete only their own images |

### File Path Structure

Images are stored with the following path structure:
```
{user_id}/{random-uuid}-{sanitized-filename}.{extension}
```

For example:
```
a1b2c3d4-e5f6-7890-abcd-ef1234567890/12345678-my-dream-house.webp
```

---

## Related Files

- **Migration**: `supabase/migrations/0124_vision_board_storage_bucket.sql`
- **Service**: `src/services/visionBoard.ts`
- **Component**: `src/features/vision-board/VisionBoard.tsx`
- **Tags Service**: `src/services/visionBoardTags.ts`
