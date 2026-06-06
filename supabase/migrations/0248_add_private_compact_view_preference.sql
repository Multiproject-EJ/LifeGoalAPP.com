-- Persist the Today screen private/compact mode preference across sessions and devices.
ALTER TABLE public.workspace_profiles
  ADD COLUMN IF NOT EXISTS private_compact_view_enabled boolean DEFAULT false;

COMMENT ON COLUMN public.workspace_profiles.private_compact_view_enabled IS
  'User preference for opening the Today habit screen in private compact view by default.';
