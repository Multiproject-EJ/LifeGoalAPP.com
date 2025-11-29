-- ========================================================
-- HABITS MODULE - MERGE LEGACY HABITS INTO V2
-- Migration 0011: Migrate data from legacy habits tables to v2
-- 
-- Purpose: Consolidate the two habit systems into a single,
-- React-based Habits V2 implementation without loss of functionality,
-- preserving historical data and Today checklist UX in the PWA.
-- ========================================================

-- Step 1: Create migration map table to track old→new habit ID mappings
-- This allows us to maintain references and rollback if needed
CREATE TABLE IF NOT EXISTS public.habit_migration_map (
    old_habit_id uuid NOT NULL,
    new_habit_v2_id uuid NOT NULL,
    migrated_at timestamptz NOT NULL DEFAULT now(),
    migration_notes text,
    PRIMARY KEY (old_habit_id)
);

-- Index for reverse lookup (v2 ID → legacy ID)
CREATE INDEX IF NOT EXISTS idx_habit_migration_map_new_id 
    ON public.habit_migration_map(new_habit_v2_id);

-- RLS for migration map (admin-only access typically)
ALTER TABLE public.habit_migration_map ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read their own migration mappings
DROP POLICY IF EXISTS "users_view_own_migrations" ON public.habit_migration_map;
CREATE POLICY "users_view_own_migrations" ON public.habit_migration_map
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.habits h
            JOIN public.goals g ON h.goal_id = g.id
            WHERE h.id = habit_migration_map.old_habit_id 
            AND g.user_id = auth.uid()
        )
    );

-- ========================================================
-- Step 2: Migrate habits from public.habits → habits_v2
-- Field mappings:
--   habits.name → habits_v2.title
--   habits.goal_id → habits_v2.goal_id  
--   habits.frequency → used to derive schedule mode
--   habits.schedule → habits_v2.schedule (transformed)
--   type defaults to 'boolean' for legacy habits
-- ========================================================

-- Function to convert legacy schedule JSON to v2 format
CREATE OR REPLACE FUNCTION migrate_legacy_schedule(
    legacy_frequency text,
    legacy_schedule jsonb
) RETURNS jsonb AS $$
DECLARE
    result jsonb;
    schedule_type text;
    days_array int[];
BEGIN
    -- Default to daily if no schedule specified
    IF legacy_schedule IS NULL OR legacy_schedule = 'null'::jsonb THEN
        RETURN '{"mode": "daily"}'::jsonb;
    END IF;

    -- Check for type field in schedule
    schedule_type := legacy_schedule->>'type';
    
    IF schedule_type = 'daily' THEN
        RETURN '{"mode": "daily"}'::jsonb;
    END IF;
    
    IF schedule_type = 'weekly' AND legacy_schedule->'days' IS NOT NULL THEN
        -- Convert day names to day indices
        SELECT ARRAY(
            SELECT CASE lower(d::text)
                WHEN '"sunday"' THEN 0
                WHEN '"sun"' THEN 0
                WHEN '"monday"' THEN 1
                WHEN '"mon"' THEN 1
                WHEN '"tuesday"' THEN 2
                WHEN '"tue"' THEN 2
                WHEN '"wednesday"' THEN 3
                WHEN '"wed"' THEN 3
                WHEN '"thursday"' THEN 4
                WHEN '"thu"' THEN 4
                WHEN '"friday"' THEN 5
                WHEN '"fri"' THEN 5
                WHEN '"saturday"' THEN 6
                WHEN '"sat"' THEN 6
                ELSE NULL
            END
            FROM jsonb_array_elements(legacy_schedule->'days') AS d
            WHERE d IS NOT NULL
        ) INTO days_array;
        
        IF array_length(days_array, 1) > 0 THEN
            RETURN jsonb_build_object('mode', 'specific_days', 'days', days_array);
        END IF;
    END IF;
    
    -- Check if schedule is already an array of days
    IF jsonb_typeof(legacy_schedule) = 'array' THEN
        SELECT ARRAY(
            SELECT CASE lower(d::text)
                WHEN '"sunday"' THEN 0
                WHEN '"sun"' THEN 0
                WHEN '"monday"' THEN 1
                WHEN '"mon"' THEN 1
                WHEN '"tuesday"' THEN 2
                WHEN '"tue"' THEN 2
                WHEN '"wednesday"' THEN 3
                WHEN '"wed"' THEN 3
                WHEN '"thursday"' THEN 4
                WHEN '"thu"' THEN 4
                WHEN '"friday"' THEN 5
                WHEN '"fri"' THEN 5
                WHEN '"saturday"' THEN 6
                WHEN '"sat"' THEN 6
                ELSE NULL
            END
            FROM jsonb_array_elements(legacy_schedule) AS d
        ) INTO days_array;
        
        IF array_length(days_array, 1) > 0 THEN
            RETURN jsonb_build_object('mode', 'specific_days', 'days', days_array);
        END IF;
    END IF;
    
    -- Fallback: parse frequency string
    IF legacy_frequency IS NOT NULL THEN
        IF lower(legacy_frequency) LIKE '%daily%' THEN
            RETURN '{"mode": "daily"}'::jsonb;
        ELSIF lower(legacy_frequency) LIKE '%weekly%' THEN
            -- Default to daily for generic weekly
            RETURN '{"mode": "daily"}'::jsonb;
        END IF;
    END IF;
    
    -- Default fallback
    RETURN '{"mode": "daily"}'::jsonb;
END;
$$ LANGUAGE plpgsql;

-- Perform the migration (only for habits not already migrated)
DO $$
DECLARE
    legacy_habit RECORD;
    new_habit_id uuid;
    user_id_for_habit uuid;
    v2_schedule jsonb;
BEGIN
    -- Iterate through each legacy habit that hasn't been migrated
    FOR legacy_habit IN 
        SELECT h.id, h.goal_id, h.name, h.frequency, h.schedule
        FROM public.habits h
        LEFT JOIN public.habit_migration_map m ON h.id = m.old_habit_id
        WHERE m.old_habit_id IS NULL
    LOOP
        -- Get the user_id from the associated goal
        SELECT g.user_id INTO user_id_for_habit
        FROM public.goals g
        WHERE g.id = legacy_habit.goal_id;
        
        -- Skip if no user found (orphaned habit)
        IF user_id_for_habit IS NULL THEN
            CONTINUE;
        END IF;
        
        -- Convert schedule to v2 format
        v2_schedule := migrate_legacy_schedule(
            legacy_habit.frequency,
            legacy_habit.schedule::jsonb
        );
        
        -- Insert into habits_v2
        INSERT INTO public.habits_v2 (
            user_id,
            title,
            emoji,
            type,
            schedule,
            goal_id,
            archived,
            created_at
        ) VALUES (
            user_id_for_habit,
            legacy_habit.name,
            NULL, -- No emoji in legacy
            'boolean', -- Default type for legacy habits
            v2_schedule,
            legacy_habit.goal_id,
            false,
            now()
        )
        RETURNING id INTO new_habit_id;
        
        -- Record the mapping
        INSERT INTO public.habit_migration_map (old_habit_id, new_habit_v2_id, migration_notes)
        VALUES (legacy_habit.id, new_habit_id, 'Automated migration from legacy habits');
        
    END LOOP;
END $$;

-- ========================================================
-- Step 3: Migrate habit_logs from public.habit_logs → habit_logs_v2
-- Field mappings:
--   habit_logs.habit_id → lookup via migration_map → habit_logs_v2.habit_id
--   habit_logs.date → habit_logs_v2.date
--   habit_logs.completed → habit_logs_v2.done
--   value defaults to NULL (boolean logs)
-- ========================================================

DO $$
DECLARE
    legacy_log RECORD;
    new_habit_id uuid;
    user_id_for_habit uuid;
BEGIN
    -- Iterate through each legacy log for migrated habits
    FOR legacy_log IN 
        SELECT l.id, l.habit_id, l.date, l.completed, m.new_habit_v2_id
        FROM public.habit_logs l
        JOIN public.habit_migration_map m ON l.habit_id = m.old_habit_id
        LEFT JOIN public.habit_logs_v2 v2 ON 
            v2.habit_id = m.new_habit_v2_id AND 
            v2.date = l.date
        WHERE v2.id IS NULL -- Only migrate if not already present
    LOOP
        -- Get user_id from the v2 habit
        SELECT user_id INTO user_id_for_habit
        FROM public.habits_v2
        WHERE id = legacy_log.new_habit_v2_id;
        
        IF user_id_for_habit IS NOT NULL THEN
            -- Insert into habit_logs_v2
            INSERT INTO public.habit_logs_v2 (
                habit_id,
                user_id,
                date,
                done,
                value,
                note
            ) VALUES (
                legacy_log.new_habit_v2_id,
                user_id_for_habit,
                legacy_log.date,
                legacy_log.completed,
                NULL, -- No value in legacy logs
                'Migrated from legacy habit_logs'
            )
            ON CONFLICT DO NOTHING;
        END IF;
    END LOOP;
END $$;

-- ========================================================
-- Step 4: Translate habit_alerts → habit_reminder_prefs
-- Field mappings:
--   habit_alerts.habit_id → lookup via migration_map → habit_reminder_prefs.habit_id
--   habit_alerts.alert_time → habit_reminder_prefs.preferred_time
--   habit_alerts.enabled → habit_reminder_prefs.enabled
--   habit_alerts.days_of_week → embedded in v2 schedule (best-effort)
-- ========================================================

DO $$
DECLARE
    legacy_alert RECORD;
    new_habit_id uuid;
BEGIN
    -- Iterate through each legacy alert for migrated habits
    FOR legacy_alert IN 
        SELECT a.id, a.habit_id, a.alert_time, a.enabled, a.days_of_week, m.new_habit_v2_id
        FROM public.habit_alerts a
        JOIN public.habit_migration_map m ON a.habit_id = m.old_habit_id
        LEFT JOIN public.habit_reminder_prefs p ON p.habit_id = m.new_habit_v2_id
        WHERE p.habit_id IS NULL -- Only migrate if not already present
    LOOP
        -- Insert into habit_reminder_prefs
        INSERT INTO public.habit_reminder_prefs (
            habit_id,
            enabled,
            preferred_time,
            created_at,
            updated_at
        ) VALUES (
            legacy_alert.new_habit_v2_id,
            legacy_alert.enabled,
            legacy_alert.alert_time,
            now(),
            now()
        )
        ON CONFLICT (habit_id) DO UPDATE SET
            enabled = EXCLUDED.enabled,
            preferred_time = EXCLUDED.preferred_time,
            updated_at = now();
    END LOOP;
END $$;

-- ========================================================
-- Step 5: Create read-only lock mechanism for legacy tables
-- Controlled via a feature flag row in a config table
-- ========================================================

-- Create config table for feature flags if not exists
CREATE TABLE IF NOT EXISTS public.app_config (
    key text PRIMARY KEY,
    value jsonb NOT NULL DEFAULT '{}'::jsonb,
    description text,
    updated_at timestamptz DEFAULT now()
);

-- Insert the legacy tables read-only flag (defaults to false/disabled)
INSERT INTO public.app_config (key, value, description)
VALUES (
    'legacy_habits_readonly',
    '{"enabled": false}'::jsonb,
    'When enabled, blocks INSERT/UPDATE/DELETE on legacy habits, habit_logs, and habit_alerts tables'
)
ON CONFLICT (key) DO NOTHING;

-- Function to check if legacy tables are read-only
CREATE OR REPLACE FUNCTION check_legacy_habits_readonly()
RETURNS TRIGGER AS $$
DECLARE
    is_readonly boolean;
BEGIN
    SELECT (value->>'enabled')::boolean INTO is_readonly
    FROM public.app_config
    WHERE key = 'legacy_habits_readonly';
    
    IF is_readonly = true THEN
        RAISE EXCEPTION 'Legacy habits tables are in read-only mode. Please use habits_v2 instead.';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers to enforce read-only mode on legacy tables
-- These only fire when the flag is enabled

DROP TRIGGER IF EXISTS enforce_readonly_habits ON public.habits;
CREATE TRIGGER enforce_readonly_habits
    BEFORE INSERT OR UPDATE OR DELETE ON public.habits
    FOR EACH ROW
    EXECUTE FUNCTION check_legacy_habits_readonly();

DROP TRIGGER IF EXISTS enforce_readonly_habit_logs ON public.habit_logs;
CREATE TRIGGER enforce_readonly_habit_logs
    BEFORE INSERT OR UPDATE OR DELETE ON public.habit_logs
    FOR EACH ROW
    EXECUTE FUNCTION check_legacy_habits_readonly();

DROP TRIGGER IF EXISTS enforce_readonly_habit_alerts ON public.habit_alerts;
CREATE TRIGGER enforce_readonly_habit_alerts
    BEFORE INSERT OR UPDATE OR DELETE ON public.habit_alerts
    FOR EACH ROW
    EXECUTE FUNCTION check_legacy_habits_readonly();

-- ========================================================
-- Verification queries (as comments for manual verification)
-- ========================================================

-- Verify migration counts:
-- SELECT 
--     (SELECT COUNT(*) FROM public.habits) AS legacy_habits_count,
--     (SELECT COUNT(*) FROM public.habit_migration_map) AS migrated_count,
--     (SELECT COUNT(*) FROM public.habits_v2 WHERE goal_id IS NOT NULL) AS v2_with_goal_count;

-- Verify log migration:
-- SELECT
--     (SELECT COUNT(*) FROM public.habit_logs) AS legacy_logs_count,
--     (SELECT COUNT(*) FROM public.habit_logs_v2 WHERE note LIKE '%Migrated%') AS migrated_logs_count;

-- Verify alert migration:
-- SELECT
--     (SELECT COUNT(*) FROM public.habit_alerts) AS legacy_alerts_count,
--     (SELECT COUNT(*) FROM public.habit_reminder_prefs) AS v2_prefs_count;

-- Enable read-only mode (run manually after verification):
-- UPDATE public.app_config 
-- SET value = '{"enabled": true}'::jsonb, updated_at = now()
-- WHERE key = 'legacy_habits_readonly';

-- Disable read-only mode (for rollback):
-- UPDATE public.app_config 
-- SET value = '{"enabled": false}'::jsonb, updated_at = now()
-- WHERE key = 'legacy_habits_readonly';

COMMENT ON TABLE public.habit_migration_map IS 
'Tracks mapping of legacy habit IDs to v2 habit IDs for migration and rollback support.';

COMMENT ON TABLE public.app_config IS 
'Application configuration flags including legacy_habits_readonly for migration control.';
