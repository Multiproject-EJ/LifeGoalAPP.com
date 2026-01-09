-- ========================================================
-- PUSH NOTIFICATIONS OPTIMIZATION
-- Migration 0126: Indexes and functions for efficient reminder lookups
-- Purpose: Scale push notifications from 0 to 1,000+ users
-- ========================================================

-- Index for finding active habits quickly
-- This index helps filter habits by user and archived status efficiently
CREATE INDEX IF NOT EXISTS idx_habits_v2_active_user 
ON habits_v2(user_id, archived) 
WHERE archived = false;

-- Index for finding habits with reminders
-- Speeds up joins between habits and their reminder configurations
CREATE INDEX IF NOT EXISTS idx_habit_reminders_habit_id 
ON habit_reminders(habit_id);

-- Index for push subscriptions by user
-- Enables fast lookup of user subscriptions
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user 
ON push_subscriptions(user_id);

-- Index for reminder state lookups
-- Helps quickly find last reminder sent time for idempotency checks
CREATE INDEX IF NOT EXISTS idx_habit_reminder_state_habit 
ON habit_reminder_state(habit_id, last_reminder_sent_at);

-- Index for habit prefs
-- Speeds up filtering habits by enabled reminder preference
CREATE INDEX IF NOT EXISTS idx_habit_reminder_prefs_habit 
ON habit_reminder_prefs(habit_id) 
WHERE enabled = true;

-- Optimized view for finding eligible users
-- This view pre-filters users who have active habits with configured reminders
-- Use this to reduce the number of users checked in the CRON job
CREATE OR REPLACE VIEW v_users_with_active_reminders AS
SELECT DISTINCT h.user_id
FROM habits_v2 h
INNER JOIN habit_reminders hr ON hr.habit_id = h.id
WHERE h.archived = false;

COMMENT ON VIEW v_users_with_active_reminders IS 
'Materialized view candidate: Users who have active habits with configured reminders. Use this to filter users before checking reminder windows.';

-- Database function to get users with active reminders
-- This function is called by the Edge Function to efficiently get eligible users
-- Returns a list of user IDs who have at least one active habit with reminders configured
CREATE OR REPLACE FUNCTION get_users_with_active_reminders()
RETURNS TABLE(user_id UUID) AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT h.user_id
  FROM habits_v2 h
  INNER JOIN habit_reminders hr ON hr.habit_id = h.id
  WHERE h.archived = false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_users_with_active_reminders() IS 
'Returns user IDs who have active (non-archived) habits with reminder configurations. Used by CRON to filter users before checking time windows.';
