-- Optional: target a specific Supabase user by running this before the script:
--   select set_config('app.demo_email', 'you@example.com', false);
-- If no email is provided, the script will fall back to the earliest auth user.

DO $$
DECLARE
  demo_user_id uuid;
  resolved_email text := nullif(trim(current_setting('app.demo_email', true)), '');
  habit1_id uuid;
  habit2_id uuid;
  habit3_id uuid;
  challenge_id uuid;
BEGIN

  IF resolved_email IS NULL OR resolved_email = 'YOUR_EMAIL_HERE' THEN
    SELECT email
    INTO resolved_email
    FROM auth.users
    ORDER BY created_at ASC
    LIMIT 1;
  END IF;

  IF resolved_email IS NULL THEN
    RAISE EXCEPTION 'No Supabase users found. Create an account or set app.demo_email before seeding demo data.';
  END IF;

  -- Find user ID from email
  SELECT id INTO demo_user_id FROM auth.users WHERE email = resolved_email;

  -- Validate user exists
  IF demo_user_id IS NULL THEN
    RAISE EXCEPTION 'User with email % not found. Run select set_config(''app.demo_email'',''your@email.com'',false); with an existing address.', resolved_email;
  END IF;

  RAISE NOTICE 'Found user ID: % for email: %', demo_user_id, resolved_email;

  -- Insert profile
  INSERT INTO public.profiles (user_id, display_name, tz)
  VALUES (demo_user_id, 'Demo User', 'America/New_York')
  ON CONFLICT (user_id) DO UPDATE SET display_name = 'Demo User';

  -- Insert sample habits
  -- Habit 1: Boolean - Daily meditation
  INSERT INTO public.habits_v2 (user_id, title, emoji, type, schedule, allow_skip)
  VALUES (
    demo_user_id,
    'Morning Meditation',
    '🧘',
    'boolean',
    '{"mode": "daily"}'::jsonb,
    true
  )
  RETURNING id INTO habit1_id;

  -- Habit 2: Quantity - Water intake
  INSERT INTO public.habits_v2 (user_id, title, emoji, type, target_num, target_unit, schedule, allow_skip)
  VALUES (
    demo_user_id,
    'Hydrate (8 glasses)',
    '💧',
    'quantity',
    8,
    'glasses',
    '{"mode": "daily"}'::jsonb,
    true
  )
  RETURNING id INTO habit2_id;

  -- Habit 3: Duration - Reading
  INSERT INTO public.habits_v2 (user_id, title, emoji, type, target_num, target_unit, schedule, allow_skip)
  VALUES (
    demo_user_id,
    'Read 20 minutes',
    '📚',
    'duration',
    20,
    'min',
    '{"mode": "specific_days", "days": [1,2,3,4,5]}'::jsonb,
    true
  )
  RETURNING id INTO habit3_id;

  -- Insert reminders for habits
  INSERT INTO public.habit_reminders (habit_id, local_time)
  VALUES 
    (habit1_id, '07:00:00'),
    (habit2_id, '09:00:00'),
    (habit2_id, '15:00:00'),
    (habit3_id, '21:00:00');

  -- Insert some historical logs (last 7 days)
  -- Meditation logs
  INSERT INTO public.habit_logs_v2 (habit_id, user_id, ts, done)
  SELECT 
    habit1_id,
    demo_user_id,
    (CURRENT_DATE - i)::timestamp,
    true
  FROM generate_series(0, 6) AS i;

  -- Water logs (varying amounts)
  INSERT INTO public.habit_logs_v2 (habit_id, user_id, ts, done, value)
  VALUES
    (habit2_id, demo_user_id, (CURRENT_DATE - 0)::timestamp, true, 6),
    (habit2_id, demo_user_id, (CURRENT_DATE - 1)::timestamp, true, 8),
    (habit2_id, demo_user_id, (CURRENT_DATE - 2)::timestamp, true, 7),
    (habit2_id, demo_user_id, (CURRENT_DATE - 3)::timestamp, true, 5),
    (habit2_id, demo_user_id, (CURRENT_DATE - 4)::timestamp, true, 8),
    (habit2_id, demo_user_id, (CURRENT_DATE - 5)::timestamp, true, 6),
    (habit2_id, demo_user_id, (CURRENT_DATE - 6)::timestamp, true, 7);

  -- Reading logs (weekdays only)
  INSERT INTO public.habit_logs_v2 (habit_id, user_id, ts, done, value)
  SELECT 
    habit3_id,
    demo_user_id,
    (CURRENT_DATE - i)::timestamp,
    true,
    20
  FROM generate_series(0, 6) AS i
  WHERE EXTRACT(DOW FROM CURRENT_DATE - i) BETWEEN 1 AND 5;

  -- Insert a sample challenge
  INSERT INTO public.habit_challenges (owner_id, title, description, start_date, end_date, scoring)
  VALUES (
    demo_user_id,
    '30-Day Mindfulness Challenge',
    'Practice meditation daily for 30 days',
    CURRENT_DATE,
    CURRENT_DATE + INTERVAL '30 days',
    'count'
  )
  RETURNING id INTO challenge_id;

  -- Join the challenge
  INSERT INTO public.habit_challenge_members (challenge_id, user_id, habit_id)
  VALUES (challenge_id, demo_user_id, habit1_id);

  RAISE NOTICE 'Demo data inserted successfully!';
  RAISE NOTICE 'Created habits with IDs: %, %, %', habit1_id, habit2_id, habit3_id;
  RAISE NOTICE 'Created challenge with ID: %', challenge_id;

END $$;

-- Verify the data for the resolved user
WITH resolved_email AS (
  SELECT coalesce(
    nullif(nullif(trim(current_setting('app.demo_email', true)), ''), 'YOUR_EMAIL_HERE'),
    (
      SELECT email
      FROM auth.users
      ORDER BY created_at ASC
      LIMIT 1
    )
  ) AS email
), target_user AS (
  SELECT id FROM auth.users WHERE email = (SELECT email FROM resolved_email)
)
SELECT
  h.title,
  h.emoji,
  h.type,
  h.schedule,
  COUNT(l.id) AS log_count,
  s.current_streak,
  s.best_streak
FROM habits_v2 h
LEFT JOIN habit_logs_v2 l ON l.habit_id = h.id
LEFT JOIN v_habit_streaks s ON s.habit_id = h.id
WHERE h.user_id = (SELECT id FROM target_user)
GROUP BY h.id, h.title, h.emoji, h.type, h.schedule, s.current_streak, s.best_streak;
