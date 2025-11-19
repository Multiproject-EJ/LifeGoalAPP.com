-- Workspace profiles table
-- Backfill workspace_profiles schema to match production fixes.
-- This ensures the upsert with onConflict: 'user_id' works correctly.

-- Create workspace_profiles table
CREATE TABLE IF NOT EXISTS public.workspace_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text,
  full_name text,
  workspace_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create unique index on user_id to support onConflict upserts
-- This fixes the error: "there is no unique or exclusion constraint matching the ON CONFLICT specification"
CREATE UNIQUE INDEX IF NOT EXISTS workspace_profiles_user_id_key 
ON public.workspace_profiles (user_id);

-- Enable RLS
ALTER TABLE public.workspace_profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policy if it exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'workspace_profiles'
      AND policyname = 'workspace_profiles_owner_all'
  ) THEN
    EXECUTE 'DROP POLICY "workspace_profiles_owner_all" ON public.workspace_profiles';
  END IF;
END$$;

-- Create RLS policy: users can only access their own workspace profile
CREATE POLICY "workspace_profiles_owner_all" 
ON public.workspace_profiles
AS PERMISSIVE
FOR ALL
TO public
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
