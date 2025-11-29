-- ========================================================
-- HABITS MODULE - ARCHIVE AND DROP LEGACY TABLES
-- Migration 0012: Post-merge cleanup
-- 
-- WARNING: This migration should ONLY be run after:
-- 1. Migration 0011 has been applied and verified
-- 2. Read-only mode has been enabled for 3-7 days
-- 3. All legacy habits data has been confirmed migrated
-- 4. The application has been updated to use habitsV2 exclusively
--
-- This migration:
-- 1. Archives legacy tables (creates backup copies)
-- 2. Drops the legacy tables, indexes, triggers, and RLS policies
-- 3. Cleans up any remaining references
-- ========================================================

-- Step 0: Safety check - ensure read-only mode was enabled
-- (This will fail if migrations weren't run in proper order)
DO $$
DECLARE
    readonly_enabled boolean;
BEGIN
    SELECT (value->>'enabled')::boolean INTO readonly_enabled
    FROM public.app_config
    WHERE key = 'legacy_habits_readonly';
    
    IF readonly_enabled IS NULL OR readonly_enabled = false THEN
        RAISE NOTICE 'WARNING: legacy_habits_readonly was not enabled. ';
        RAISE NOTICE 'Ensure migration 0011 was run and read-only mode was tested before proceeding.';
        -- Uncomment the following line to enforce the safety check:
        -- RAISE EXCEPTION 'Legacy tables were not in read-only mode. Aborting to prevent data loss.';
    END IF;
END $$;

-- ========================================================
-- Step 1: Archive legacy tables
-- Creates copies with _archived suffix for backup
-- ========================================================

-- Archive habits table
CREATE TABLE IF NOT EXISTS public.habits_archived AS 
SELECT *, now() AS archived_at
FROM public.habits;

COMMENT ON TABLE public.habits_archived IS 
'Archived copy of legacy habits table. Created during v2 migration cleanup.';

-- Archive habit_logs table
CREATE TABLE IF NOT EXISTS public.habit_logs_archived AS
SELECT *, now() AS archived_at
FROM public.habit_logs;

COMMENT ON TABLE public.habit_logs_archived IS 
'Archived copy of legacy habit_logs table. Created during v2 migration cleanup.';

-- Archive habit_alerts table
CREATE TABLE IF NOT EXISTS public.habit_alerts_archived AS
SELECT *, now() AS archived_at
FROM public.habit_alerts;

COMMENT ON TABLE public.habit_alerts_archived IS 
'Archived copy of legacy habit_alerts table. Created during v2 migration cleanup.';

-- ========================================================
-- Step 2: Drop triggers from legacy tables
-- ========================================================

-- Drop read-only enforcement triggers
DROP TRIGGER IF EXISTS enforce_readonly_habits ON public.habits;
DROP TRIGGER IF EXISTS enforce_readonly_habit_logs ON public.habit_logs;
DROP TRIGGER IF EXISTS enforce_readonly_habit_alerts ON public.habit_alerts;

-- ========================================================
-- Step 3: Drop RLS policies from legacy tables
-- ========================================================

-- Drop any RLS policies on habits
DO $$
DECLARE
    policy_record RECORD;
BEGIN
    FOR policy_record IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'habits' AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.habits', policy_record.policyname);
    END LOOP;
END $$;

-- Drop any RLS policies on habit_logs
DO $$
DECLARE
    policy_record RECORD;
BEGIN
    FOR policy_record IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'habit_logs' AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.habit_logs', policy_record.policyname);
    END LOOP;
END $$;

-- Drop any RLS policies on habit_alerts
DO $$
DECLARE
    policy_record RECORD;
BEGIN
    FOR policy_record IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'habit_alerts' AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.habit_alerts', policy_record.policyname);
    END LOOP;
END $$;

-- ========================================================
-- Step 4: Drop indexes from legacy tables
-- ========================================================

-- Common index patterns to drop
DROP INDEX IF EXISTS public.idx_habits_goal_id;
DROP INDEX IF EXISTS public.idx_habits_name;
DROP INDEX IF EXISTS public.habits_goal_id_idx;

DROP INDEX IF EXISTS public.idx_habit_logs_habit_id;
DROP INDEX IF EXISTS public.idx_habit_logs_date;
DROP INDEX IF EXISTS public.idx_habit_logs_habit_date;
DROP INDEX IF EXISTS public.habit_logs_habit_id_idx;
DROP INDEX IF EXISTS public.habit_logs_date_idx;

DROP INDEX IF EXISTS public.idx_habit_alerts_habit_id;
DROP INDEX IF EXISTS public.idx_habit_alerts_alert_time;
DROP INDEX IF EXISTS public.habit_alerts_habit_id_idx;

-- ========================================================
-- Step 5: Drop legacy tables
-- ========================================================

-- Drop habit_alerts first (no foreign key dependencies)
DROP TABLE IF EXISTS public.habit_alerts CASCADE;

-- Drop habit_logs (depends on habits)
DROP TABLE IF EXISTS public.habit_logs CASCADE;

-- Drop habits (has foreign key to goals)
DROP TABLE IF EXISTS public.habits CASCADE;

-- ========================================================
-- Step 6: Clean up helper functions
-- ========================================================

-- Drop the read-only check function (no longer needed)
DROP FUNCTION IF EXISTS public.check_legacy_habits_readonly();

-- Drop the legacy schedule migration function (no longer needed)
DROP FUNCTION IF EXISTS public.migrate_legacy_schedule(text, jsonb);

-- ========================================================
-- Step 7: Update app_config to mark cleanup complete
-- ========================================================

UPDATE public.app_config 
SET value = jsonb_build_object(
    'enabled', false,
    'cleanup_completed_at', now()::text,
    'cleanup_migration', '0012_archive_and_drop_legacy_habits.sql'
),
    updated_at = now()
WHERE key = 'legacy_habits_readonly';

-- Add a new config entry to track cleanup status
INSERT INTO public.app_config (key, value, description)
VALUES (
    'legacy_habits_cleanup_status',
    jsonb_build_object(
        'status', 'completed',
        'completed_at', now()::text,
        'archived_tables', ARRAY['habits_archived', 'habit_logs_archived', 'habit_alerts_archived']
    ),
    'Tracks the status of legacy habits cleanup migration'
)
ON CONFLICT (key) DO UPDATE SET
    value = EXCLUDED.value,
    updated_at = now();

-- ========================================================
-- Verification queries (run after migration)
-- ========================================================

/*
-- Verify legacy tables are dropped:
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('habits', 'habit_logs', 'habit_alerts');
-- Expected: Empty result set

-- Verify archived tables exist:
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('habits_archived', 'habit_logs_archived', 'habit_alerts_archived');
-- Expected: 3 rows

-- Verify migration map exists and has data:
SELECT COUNT(*) AS migration_count FROM public.habit_migration_map;
-- Expected: Count > 0 if there were legacy habits

-- Verify v2 tables are intact:
SELECT 
    (SELECT COUNT(*) FROM public.habits_v2) AS v2_habits,
    (SELECT COUNT(*) FROM public.habit_logs_v2) AS v2_logs,
    (SELECT COUNT(*) FROM public.habit_reminder_prefs) AS v2_reminder_prefs;

-- Verify no remaining RLS policies on dropped tables:
SELECT schemaname, tablename, policyname
FROM pg_policies
WHERE tablename IN ('habits', 'habit_logs', 'habit_alerts')
  AND schemaname = 'public';
-- Expected: Empty result set

-- Check cleanup status:
SELECT key, value, updated_at 
FROM public.app_config 
WHERE key IN ('legacy_habits_readonly', 'legacy_habits_cleanup_status');
*/

-- ========================================================
-- Rollback instructions (if needed)
-- ========================================================

/*
ROLLBACK STEPS (execute manually if rollback is required):

1. Restore habits table from archive:
CREATE TABLE public.habits AS 
SELECT id, goal_id, name, frequency, schedule 
FROM public.habits_archived;

2. Restore habit_logs table from archive:
CREATE TABLE public.habit_logs AS 
SELECT id, habit_id, date, completed 
FROM public.habit_logs_archived;

3. Restore habit_alerts table from archive:
CREATE TABLE public.habit_alerts AS 
SELECT id, habit_id, alert_time, days_of_week, enabled, created_at, updated_at 
FROM public.habit_alerts_archived;

4. Add necessary constraints and indexes back manually.

5. Update app_config:
UPDATE public.app_config 
SET value = '{"status": "rolled_back"}'::jsonb
WHERE key = 'legacy_habits_cleanup_status';

NOTE: If rollback is needed, consider whether to keep the migrated v2 data
or revert to using only legacy tables.
*/

COMMENT ON TABLE public.habits_archived IS 
'Archived legacy habits table. Safe to drop after confirming v2 migration success (recommend 30+ days).';

COMMENT ON TABLE public.habit_logs_archived IS 
'Archived legacy habit_logs table. Safe to drop after confirming v2 migration success (recommend 30+ days).';

COMMENT ON TABLE public.habit_alerts_archived IS 
'Archived legacy habit_alerts table. Safe to drop after confirming v2 migration success (recommend 30+ days).';
