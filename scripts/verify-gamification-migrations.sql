-- Verification script for gamification migrations
-- Run this in Supabase SQL Editor to check migration status

-- Check if all tables exist
SELECT 
  CASE 
    WHEN EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'gamification_profiles') 
    THEN '✅' ELSE '❌' 
  END as gamification_profiles,
  CASE 
    WHEN EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'achievements') 
    THEN '✅' ELSE '❌' 
  END as achievements,
  CASE 
    WHEN EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'daily_spin_state') 
    THEN '✅' ELSE '❌' 
  END as daily_spin_state,
  CASE 
    WHEN EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'power_ups') 
    THEN '✅' ELSE '❌' 
  END as power_ups;

-- Check achievements count
SELECT 'Achievements seeded: ' || COUNT(*) FROM achievements;

-- Check power-ups count
SELECT 'Power-ups seeded: ' || COUNT(*) FROM power_ups;

-- Check for achievements without category (the bug)
SELECT 
  'Achievements missing category: ' || COUNT(*) 
FROM achievements 
WHERE category IS NULL;

-- If any found, fix them:
UPDATE achievements 
SET category = 'engagement' 
WHERE category IS NULL AND achievement_key IN ('shopaholic', 'power_user', 'mystery_hunter');

UPDATE achievements 
SET category = 'habits' 
WHERE category IS NULL AND requirement_type IN ('habits_completed', 'streak');

UPDATE achievements 
SET category = 'goals' 
WHERE category IS NULL AND requirement_type = 'goals_achieved';

-- Verify fix
SELECT 'After fix - missing category: ' || COUNT(*) FROM achievements WHERE category IS NULL;
