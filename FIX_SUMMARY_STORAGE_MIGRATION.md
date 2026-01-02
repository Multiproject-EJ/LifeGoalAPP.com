# Fix Summary: SQL Permission Error in Storage Migration

## Issue
Migration `0124_vision_board_storage_bucket.sql` failed with:
```
ERROR: 42501: must be owner of relation objects
```

## Root Cause
- Supabase platform manages `storage.objects` table ownership through `supabase_storage_admin` role
- Regular users (including project owners) cannot `DROP POLICY` or `CREATE POLICY` on this table
- This is a security feature to protect storage system integrity

## Solution
**Removed permission-restricted operations from the migration:**
- ❌ Removed all `DROP POLICY IF EXISTS` statements
- ❌ Removed all `CREATE POLICY` statements
- ✅ Kept bucket creation (`INSERT INTO storage.buckets`) which works without elevated permissions
- ✅ Added comprehensive documentation for manual policy setup

## Files Changed

### 1. `supabase/migrations/0124_vision_board_storage_bucket.sql`
- **Before**: 77 lines with policy creation that required elevated permissions
- **After**: 101 lines with bucket creation only + detailed documentation
- **Executable SQL**: Only the bucket INSERT statement (lines 8-19)
- **Documentation**: Instructions for manual policy setup (lines 21-101)

### 2. `supabase/migrations/README_STORAGE_POLICIES.md` (NEW)
- Comprehensive guide for setting up storage policies
- Two methods provided:
  1. **Dashboard UI** (recommended): Step-by-step instructions with expressions
  2. **SQL Editor**: Copy-paste SQL for direct execution
- Explains what each policy does
- References official Supabase documentation

## Migration Safety
✅ **The migration is now safe to run without permission errors**

The migration will:
1. Create the `vision-board` storage bucket
2. Set bucket configuration (public, 5MB limit, allowed MIME types)
3. Handle conflicts gracefully (updates if bucket already exists)
4. Skip policy creation (no permission errors)

## Post-Migration Steps
Users must manually create storage policies using one of these methods:

### Option 1: Supabase Dashboard (Recommended)
1. Go to Supabase Dashboard > Storage > vision-board bucket
2. Click "Policies" tab
3. Add 4 policies: SELECT, INSERT, UPDATE, DELETE
4. Use the expressions provided in the migration file or README

### Option 2: SQL Editor
1. Go to Supabase Dashboard > SQL Editor
2. Copy-paste the SQL from the migration file comments
3. Execute to create all policies at once

## Security Model
The policies implement secure access control:
- **SELECT**: Users can view their own images or public bucket images
- **INSERT**: Users can only upload to their own folder (auth.uid())
- **UPDATE**: Users can only modify their own images
- **DELETE**: Users can only delete their own images

## Testing
- ✅ Migration file syntax validated
- ✅ Only executable SQL is the bucket INSERT with ON CONFLICT handling
- ✅ No permission-restricted operations remain
- ✅ Code review passed with no blocking issues

## References
- [Supabase Storage Access Control](https://supabase.com/docs/guides/storage/security/access-control)
- [GitHub Issue #4114](https://github.com/supabase/cli/issues/4114)
- [Supabase Discussion #36611](https://github.com/orgs/supabase/discussions/36611)

## Impact
- ✅ Migration no longer fails with permission errors
- ✅ Users have clear instructions for manual policy setup
- ✅ Security best practices maintained
- ✅ Bucket creation works automatically
- ⚠️ Additional manual step required for policy setup (documented)
