-- Add optional birthday field to workspace profiles
ALTER TABLE public.workspace_profiles
ADD COLUMN IF NOT EXISTS birthday date;

COMMENT ON COLUMN public.workspace_profiles.birthday IS 'Optional birthday for account profile.';
