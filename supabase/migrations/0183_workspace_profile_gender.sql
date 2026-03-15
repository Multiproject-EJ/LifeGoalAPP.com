-- Add optional gender field to workspace profiles
ALTER TABLE public.workspace_profiles
ADD COLUMN IF NOT EXISTS gender text;

COMMENT ON COLUMN public.workspace_profiles.gender IS 'Optional gender selected by the user in profile settings.';
