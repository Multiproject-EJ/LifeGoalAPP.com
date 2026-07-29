-- Persist each user's theme choices across PWA and native app sessions.
--
-- Nullable values preserve the user's existing device-local preference on the
-- first authenticated sync. The client fills all three values after hydration.
ALTER TABLE public.workspace_profiles
  ADD COLUMN IF NOT EXISTS theme_mode text,
  ADD COLUMN IF NOT EXISTS light_theme text,
  ADD COLUMN IF NOT EXISTS dark_theme text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.workspace_profiles'::regclass
      AND conname = 'workspace_profiles_theme_mode_check'
  ) THEN
    ALTER TABLE public.workspace_profiles
      ADD CONSTRAINT workspace_profiles_theme_mode_check
      CHECK (theme_mode IS NULL OR theme_mode IN ('light', 'dark', 'system'));
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.workspace_profiles'::regclass
      AND conname = 'workspace_profiles_light_theme_length_check'
  ) THEN
    ALTER TABLE public.workspace_profiles
      ADD CONSTRAINT workspace_profiles_light_theme_length_check
      CHECK (light_theme IS NULL OR char_length(light_theme) BETWEEN 1 AND 80);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.workspace_profiles'::regclass
      AND conname = 'workspace_profiles_dark_theme_length_check'
  ) THEN
    ALTER TABLE public.workspace_profiles
      ADD CONSTRAINT workspace_profiles_dark_theme_length_check
      CHECK (dark_theme IS NULL OR char_length(dark_theme) BETWEEN 1 AND 80);
  END IF;
END $$;

COMMENT ON COLUMN public.workspace_profiles.theme_mode IS
  'User-selected light, dark, or system theme mode, synced across devices.';
COMMENT ON COLUMN public.workspace_profiles.light_theme IS
  'User-selected light theme identifier, synced across devices.';
COMMENT ON COLUMN public.workspace_profiles.dark_theme IS
  'User-selected dark theme identifier, synced across devices.';
