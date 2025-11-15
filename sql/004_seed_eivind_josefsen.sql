-- Custom onboarding seed for Eivind Josefsen (Josefsen.eivind@gmail.com)
--
-- How to use this script:
-- 1. Open your Supabase project's SQL editor.
-- 2. Paste this entire file.
-- 3. Run it once. It will create/update the auth user, profile, habits, and goals.
--
-- The script is idempotent: re-running it will update the same user instead of duplicating data.

create extension if not exists "pgcrypto";

DO $$
DECLARE
  target_email text := 'Josefsen.eivind@gmail.com';
  plaintext_password text := '""Admin123';
  display_name text := 'EJ';
  timezone_pref text := 'Europe/Oslo';
  target_user_id uuid;
  provider_meta jsonb := jsonb_build_object('provider', 'email', 'providers', array['email']);
  now_ts timestamptz := timezone('utc', now());
BEGIN
  SELECT id INTO target_user_id FROM auth.users WHERE email = target_email;

  IF target_user_id IS NULL THEN
    target_user_id := gen_random_uuid();

    INSERT INTO auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      last_sign_in_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      is_super_admin
    )
    VALUES (
      '00000000-0000-0000-0000-000000000000',
      target_user_id,
      'authenticated',
      'authenticated',
      target_email,
      crypt(plaintext_password, gen_salt('bf')),
      now_ts,
      now_ts,
      provider_meta,
      jsonb_build_object('full_name', display_name),
      now_ts,
      now_ts,
      false
    );
  ELSE
    UPDATE auth.users
    SET
      encrypted_password = crypt(plaintext_password, gen_salt('bf')),
      email_confirmed_at = coalesce(email_confirmed_at, now_ts),
      updated_at = now_ts,
      last_sign_in_at = now_ts,
      raw_app_meta_data = provider_meta,
      raw_user_meta_data = jsonb_build_object('full_name', display_name)
    WHERE id = target_user_id;
  END IF;

  INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, created_at, updated_at)
  VALUES (
    gen_random_uuid(),
    target_user_id,
    jsonb_build_object('sub', target_user_id::text, 'email', target_email),
    'email',
    target_email,
    now_ts,
    now_ts
  )
  ON CONFLICT (provider, provider_id) DO UPDATE
    SET user_id = excluded.user_id,
        identity_data = excluded.identity_data,
        updated_at = excluded.updated_at;

  INSERT INTO public.profiles (user_id, display_name, tz)
  VALUES (target_user_id, display_name, timezone_pref)
  ON CONFLICT (user_id) DO UPDATE
    SET display_name = excluded.display_name,
        tz = excluded.tz;

  IF to_regclass('public.workspace_profiles') IS NOT NULL THEN
    INSERT INTO public.workspace_profiles (user_id, full_name, workspace_name, onboarding_prompt_dismissed_at)
    VALUES (target_user_id, display_name, display_name || ' Workspace', now_ts)
    ON CONFLICT (user_id) DO UPDATE
      SET full_name = excluded.full_name,
          workspace_name = excluded.workspace_name,
          onboarding_prompt_dismissed_at = excluded.onboarding_prompt_dismissed_at;
  END IF;

  INSERT INTO public.notification_preferences (user_id, habit_reminders_enabled, habit_reminder_time, checkin_nudges_enabled, timezone)
  VALUES (target_user_id, true, '07:00', true, timezone_pref)
  ON CONFLICT (user_id) DO UPDATE
    SET timezone = excluded.timezone,
        habit_reminders_enabled = excluded.habit_reminders_enabled,
        habit_reminder_time = excluded.habit_reminder_time,
        checkin_nudges_enabled = excluded.checkin_nudges_enabled;

  -- Clear existing habits/goals for a clean slate
  DELETE FROM public.habit_logs_v2 WHERE user_id = target_user_id;
  DELETE FROM public.habit_reminders WHERE habit_id IN (
    SELECT id FROM public.habits_v2 WHERE user_id = target_user_id
  );
  DELETE FROM public.habits_v2 WHERE user_id = target_user_id;
  DELETE FROM public.goal_reflections WHERE user_id = target_user_id;
  DELETE FROM public.life_goal_alerts WHERE user_id = target_user_id;
  DELETE FROM public.goals WHERE user_id = target_user_id;

  INSERT INTO public.habits_v2 (user_id, title, emoji, type, target_num, target_unit, schedule, allow_skip, autoprog)
  VALUES
    (target_user_id, 'Answers Socials', '💬', 'boolean', null, null, jsonb_build_object('mode', 'daily'), true, null),
    (target_user_id, '15 Beinhev', '🏋️', 'quantity', 15, 'reps', jsonb_build_object('mode', 'specific_days', 'days', array[1,3,5]), false, null),
    (target_user_id, 'Morning pre cal burn walk', '🚶', 'duration', 45, 'min', jsonb_build_object('mode', 'daily', 'time', '06:30'), true, null),
    (target_user_id, 'Protein-packed meals', '🥗', 'quantity', 3, 'meals', jsonb_build_object('mode', 'daily'), true, null),
    (target_user_id, 'Lights out before 22:30', '🌙', 'boolean', null, null, jsonb_build_object('mode', 'daily'), true, null);

  INSERT INTO public.goals (user_id, title, description, target_date, status_tag, life_wheel_category)
  VALUES
    (target_user_id, 'Best Physice every 2026', 'Dial in training, recovery, and nutrition to arrive in peak shape during 2026.', '2026-12-31', 'in-progress', 'fitness'),
    (target_user_id, '3.5 mill NOK 2026', 'Systematically grow total net worth to 3.5 million NOK by the end of 2026.', '2026-12-31', 'in-progress', 'finance');
END $$;
