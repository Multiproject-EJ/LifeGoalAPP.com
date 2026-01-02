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

## Policy Explanation

These policies implement a secure access model:

- **SELECT**: Users can view their own images (stored in folders named with their user ID) or any images in the bucket if it's marked as public
- **INSERT**: Users can only upload images to folders named with their own user ID
- **UPDATE**: Users can only modify images in their own folder
- **DELETE**: Users can only delete images from their own folder

## References

- [Supabase Storage Access Control Documentation](https://supabase.com/docs/guides/storage/security/access-control)
- [GitHub Issue: ERROR: must be owner of table objects #4114](https://github.com/supabase/cli/issues/4114)
- [Supabase Discussion: Cannot Update Storage RLS](https://github.com/orgs/supabase/discussions/36611)
