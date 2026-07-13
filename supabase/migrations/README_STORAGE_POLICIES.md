# Storage Policies Setup Guide

## Issue: "must be owner of relation objects" Error

When running migration 0124_vision_board_storage_bucket.sql, you may encounter this error:

```
Error: Failed to run sql query: ERROR: 42501: must be owner of relation objects
```

## Root Cause

This error occurs because Supabase platform manages the `storage.objects` table with a system-level role (`supabase_storage_admin`). Regular database users, including project owners, do not have permission to:
- `DROP POLICY` on `storage.objects`
- `CREATE POLICY` on `storage.objects` (in some contexts)
- `ALTER TABLE storage.objects`

This is a security feature introduced by Supabase to protect the storage system integrity.

## Solution

The migration has been updated to only create the storage bucket. Storage policies must be created separately using one of these methods:

### Method 1: Supabase Dashboard (Recommended)

1. Open your project in the Supabase Dashboard
2. Navigate to **Storage** → **vision-board** bucket
3. Click on the **Policies** tab
4. Add the following policies using the UI:

#### SELECT Policy
- **Policy Name**: `vision_board_select`
- **Target Roles**: `authenticated`
- **USING Expression**:
  ```sql
  bucket_id = 'vision-board' AND ((storage.foldername(name))[1] = auth.uid()::text OR EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'vision-board' AND public = true))
  ```

#### INSERT Policy
- **Policy Name**: `vision_board_insert`
- **Target Roles**: `authenticated`
- **WITH CHECK Expression**:
  ```sql
  bucket_id = 'vision-board' AND (storage.foldername(name))[1] = auth.uid()::text
  ```

#### UPDATE Policy
- **Policy Name**: `vision_board_update`
- **Target Roles**: `authenticated`
- **USING Expression**:
  ```sql
  bucket_id = 'vision-board' AND (storage.foldername(name))[1] = auth.uid()::text
  ```
- **WITH CHECK Expression**:
  ```sql
  bucket_id = 'vision-board' AND (storage.foldername(name))[1] = auth.uid()::text
  ```

#### DELETE Policy
- **Policy Name**: `vision_board_delete`
- **Target Roles**: `authenticated`
- **USING Expression**:
  ```sql
  bucket_id = 'vision-board' AND (storage.foldername(name))[1] = auth.uid()::text
  ```

### Method 2: SQL Editor

Alternatively, you can run the policy creation SQL directly in the Supabase Dashboard SQL Editor:

```sql
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
```

## Per-user object cap (migration 0279)

The INSERT policy above lets a user upload an unlimited number of files.
Migration `0279_per_user_storage_object_cap.sql` tightens it so an account
can hold at most **1000** objects in the `vision-board` bucket — bounding
Storage growth the same way migration 0278 bounds table growth. Because
`storage.objects` is owned by `supabase_storage_admin`, apply this via the
Dashboard SQL editor (the migration itself degrades to a NOTICE when it
lacks privilege):

```sql
-- Counter runs outside RLS. A policy that selects from its own table
-- (storage.objects) raises "infinite recursion detected in policy", so the
-- count lives in a SECURITY DEFINER function. Run this block as a privileged
-- role (the Dashboard SQL editor runs as postgres) so the function owner can
-- read storage.objects.
CREATE OR REPLACE FUNCTION public.vision_board_object_count(p_uid uuid)
RETURNS bigint
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = storage, pg_temp
AS $$
  SELECT count(*)
  FROM storage.objects
  WHERE bucket_id = 'vision-board'
    AND (storage.foldername(name))[1] = p_uid::text
$$;

-- Replaces the uncapped "vision_board_insert" policy with a count-limited one.
DROP POLICY IF EXISTS "vision_board_insert" ON storage.objects;

CREATE POLICY "vision_board_insert" ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'vision-board'
    AND (storage.foldername(name))[1] = auth.uid()::text
    AND public.vision_board_object_count(auth.uid()) < 1000  -- tune here
  );
```

After applying, confirm the cap actually triggers (the count must be
non-zero for a user who owns files, proving the function can read
storage.objects):

```sql
SELECT public.vision_board_object_count('<some-user-uuid>');  -- expect > 0
```

To change the cap later, re-run the block with a different number. To find
users near the cap:

```sql
SELECT (storage.foldername(name))[1] AS user_id, count(*)
FROM storage.objects
WHERE bucket_id = 'vision-board'
GROUP BY 1 ORDER BY 2 DESC LIMIT 10;
```

Worst case per user is `1000 x 5 MB` (the bucket's per-file limit); typical
usage is far lower since images are webp-optimized to ~100–400 KB. The
private `vision` (V2) bucket has no INSERT policy today (it is effectively
closed); if it is ever activated, cap it with the same pattern.

## Policy Explanation

These policies implement a secure access model:

- **SELECT**: Users can view their own images (stored in folders named with their user ID) or any images in the bucket if it's marked as public
- **INSERT**: Users can only upload images to folders named with their own user ID, up to the per-user object cap (migration 0279)
- **UPDATE**: Users can only modify images in their own folder
- **DELETE**: Users can only delete images from their own folder

## References

- [Supabase Storage Access Control Documentation](https://supabase.com/docs/guides/storage/security/access-control)
- [GitHub Issue: ERROR: must be owner of table objects #4114](https://github.com/supabase/cli/issues/4114)
- [Supabase Discussion: Cannot Update Storage RLS](https://github.com/orgs/supabase/discussions/36611)
