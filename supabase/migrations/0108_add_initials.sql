-- Add initials field to workspace_profiles table
-- Initials are auto-generated from the first two word letters of full_name

ALTER TABLE public.workspace_profiles
ADD COLUMN IF NOT EXISTS initials text;

-- Add preference for showing initials in main menu icon
ALTER TABLE public.workspace_profiles
ADD COLUMN IF NOT EXISTS show_initials_in_menu boolean DEFAULT false;

-- Add comment to document the fields
COMMENT ON COLUMN public.workspace_profiles.initials IS 'Auto-generated initials from the first two word letters of full_name';
COMMENT ON COLUMN public.workspace_profiles.show_initials_in_menu IS 'User preference to show initials instead of default icon in main menu';
