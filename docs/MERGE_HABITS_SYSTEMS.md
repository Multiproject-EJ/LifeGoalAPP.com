# Merging Legacy Habits Systems into V2

This document provides a comprehensive guide for consolidating the application's two habit systems into a single, React-based Habits V2 implementation.

## Overview

The application previously had two parallel habit tracking systems:

1. **Legacy System** (Vanilla JS + Supabase)
   - Tables: `habits`, `habit_logs`, `habit_alerts`
   - Entry point: `/app/habits/habits.js`
   - Used by: Legacy dashboard, standalone habits page

2. **V2 System** (React + Supabase)
   - Tables: `habits_v2`, `habit_logs_v2`, `habit_reminder_prefs`
   - Entry point: `src/features/habits/HabitsModule.tsx`
   - Used by: React PWA

This migration consolidates everything into the V2 system while preserving all historical data.

## Architecture

### Database Schema After Migration

```
┌─────────────────────────┐
│      habits_v2          │
│  (unified habit store)  │
├─────────────────────────┤
│ id, user_id, title      │
│ emoji, type, schedule   │
│ target_num, target_unit │
│ domain_key, goal_id     │
│ archived, created_at    │
└───────────┬─────────────┘
            │
    ┌───────┴───────┐
    │               │
    ▼               ▼
┌─────────────┐  ┌──────────────────┐
│habit_logs_v2│  │habit_reminder_   │
│             │  │    prefs         │
├─────────────┤  ├──────────────────┤
│ habit_id    │  │ habit_id         │
│ user_id     │  │ enabled          │
│ date, done  │  │ preferred_time   │
│ value, note │  └──────────────────┘
└─────────────┘

┌─────────────────────────┐
│  habit_migration_map    │
│ (tracks legacy→v2 IDs)  │
├─────────────────────────┤
│ old_habit_id            │
│ new_habit_v2_id         │
│ migrated_at             │
└─────────────────────────┘
```

### Service Layer

| Legacy Service | V2 Service | Adapter (Transition) |
|----------------|------------|----------------------|
| `src/services/habits.ts` | `src/services/habitsV2.ts` | `src/compat/legacyHabitsAdapter.ts` |
| `src/services/habitAlerts.ts` | `src/services/habitReminderPrefs.ts` | `src/compat/legacyAlertsAdapter.ts` |

### UI Components

| Legacy Component | V2 Component |
|------------------|--------------|
| `DailyHabitTracker.tsx` | `HabitsModule.tsx` → Today's checklist |
| `/app/habits/*` | `HabitsModule.tsx` (full feature) |
| — | `UnifiedTodayView.tsx` (compact widget) |

## Migration Steps

### Phase 1: Data Migration (Migration 0011)

Run `supabase/migrations/0011_merge_legacy_habits_into_v2.sql`:

```bash
# Apply the migration
supabase db push

# Or run directly in Supabase SQL editor
```

This migration:
1. Creates `habit_migration_map` table
2. Migrates habits: `habits` → `habits_v2` with field mapping
3. Migrates logs: `habit_logs` → `habit_logs_v2` using migration map
4. Translates alerts: `habit_alerts` → `habit_reminder_prefs`
5. Creates read-only lock mechanism (disabled by default)

**Verification queries:**
```sql
-- Check migration counts
SELECT 
    (SELECT COUNT(*) FROM public.habits) AS legacy_habits,
    (SELECT COUNT(*) FROM public.habit_migration_map) AS migrated,
    (SELECT COUNT(*) FROM public.habits_v2) AS v2_habits;

-- Verify sample records
SELECT m.old_habit_id, m.new_habit_v2_id, 
       h.name AS legacy_name, v.title AS v2_title
FROM public.habit_migration_map m
JOIN public.habits h ON h.id = m.old_habit_id
JOIN public.habits_v2 v ON v.id = m.new_habit_v2_id
LIMIT 10;
```

### Phase 2: Enable Read-Only Mode (Shadow Period)

After verifying the migration, enable read-only mode for legacy tables:

```sql
UPDATE public.app_config 
SET value = '{"enabled": true}'::jsonb, updated_at = now()
WHERE key = 'legacy_habits_readonly';
```

**Duration:** 3-7 days of monitoring

**What to monitor:**
- Application logs for blocked write attempts
- User feedback for missing functionality
- V2 system performance and data integrity

### Phase 3: Code Updates

1. **Update imports to use V2 services:**
   ```typescript
   // Before
   import { fetchHabitsForUser } from '../services/habits';
   
   // After
   import { listHabitsV2 } from '../services/habitsV2';
   ```

2. **Or use compatibility adapters temporarily:**
   ```typescript
   // Temporary during transition
   import { fetchHabitsForUser } from '../compat/legacyHabitsAdapter';
   ```

3. **Update navigation to point to HabitsModule:**
   - Remove legacy `/app/habits` entry points from routing
   - Route "Habits" link to HabitsModule component

### Phase 4: Cleanup (Migration 0012)

After successful shadow period, run `supabase/migrations/0012_archive_and_drop_legacy_habits.sql`:

```bash
# Apply the cleanup migration
supabase db push
```

This migration:
1. Archives legacy tables (creates `*_archived` copies)
2. Drops triggers, RLS policies, and indexes
3. Drops legacy tables
4. Updates config to mark cleanup complete

### Phase 5: Redeploy Edge Functions

Update any Supabase Edge Functions that referenced legacy tables:

```bash
cd supabase/functions
supabase functions deploy send-reminders
```

## Rollback Plan

### During Shadow Period (Phase 2)

Disable read-only mode:
```sql
UPDATE public.app_config 
SET value = '{"enabled": false}'::jsonb, updated_at = now()
WHERE key = 'legacy_habits_readonly';
```

### After Cleanup (Phase 4)

If rollback is needed after cleanup, restore from archived tables:

```sql
-- Restore habits
CREATE TABLE public.habits AS 
SELECT id, goal_id, name, frequency, schedule 
FROM public.habits_archived;

-- Restore habit_logs
CREATE TABLE public.habit_logs AS 
SELECT id, habit_id, date, completed 
FROM public.habit_logs_archived;

-- Restore habit_alerts
CREATE TABLE public.habit_alerts AS 
SELECT id, habit_id, alert_time, days_of_week, enabled, created_at, updated_at 
FROM public.habit_alerts_archived;

-- Re-add constraints and indexes as needed
```

## Field Mapping Reference

### habits → habits_v2

| Legacy Field | V2 Field | Transformation |
|--------------|----------|----------------|
| `id` | — | New UUID generated |
| `goal_id` | `goal_id` | Direct copy |
| `name` | `title` | Direct copy |
| `frequency` | — | Derived into `schedule.mode` |
| `schedule` | `schedule` | JSON transformation |
| — | `user_id` | Looked up from goal |
| — | `type` | Default 'boolean' |
| — | `emoji` | NULL |
| — | `target_num` | NULL |
| — | `target_unit` | NULL |
| — | `archived` | false |

### habit_logs → habit_logs_v2

| Legacy Field | V2 Field | Transformation |
|--------------|----------|----------------|
| `id` | `id` | New UUID generated |
| `habit_id` | `habit_id` | Looked up via migration_map |
| `date` | `date` | Direct copy |
| `completed` | `done` | Direct copy |
| — | `user_id` | Looked up from v2 habit |
| — | `value` | NULL |
| — | `note` | 'Migrated from legacy' |

### habit_alerts → habit_reminder_prefs

| Legacy Field | V2 Field | Transformation |
|--------------|----------|----------------|
| `id` | — | Not preserved |
| `habit_id` | `habit_id` | Looked up via migration_map |
| `alert_time` | `preferred_time` | Direct copy |
| `enabled` | `enabled` | Direct copy |
| `days_of_week` | — | Embedded in v2 schedule |

## CI Guardrails

The `.github/workflows/legacy-refs-check.yml` workflow:

1. **Runs on:** Push to main, PRs to main
2. **Checks for:**
   - Direct queries to legacy tables (`habits`, `habit_logs`, `habit_alerts`)
   - Imports from deprecated services (`habits.ts`, `habitAlerts.ts`)
3. **Excludes:**
   - Migration files (`supabase/migrations/*`)
   - Documentation (`docs/*`, `*.md`)
   - Compatibility adapters (`src/compat/*`)
   - Type definitions (`database.types.ts`)

## Feature Parity Checklist

### Today Checklist (PWA)

- [x] Display habits scheduled for today
- [x] Mark boolean habits as done
- [x] Log quantity/duration values
- [x] Show weekly progress for times_per_week habits
- [x] Support every_n_days scheduling
- [x] Handle notification actions (done/snooze)

### Habit Creation

- [x] 3-step wizard flow
- [x] Template gallery
- [x] All schedule modes (daily, specific_days, times_per_week, every_n_days)
- [x] Target values for quantity/duration types
- [x] Reminder configuration

### Insights & Analytics

- [x] 31-day heatmap
- [x] Current and best streak
- [x] 7-day and 30-day adherence
- [x] AI-powered suggestions (with feature flag)

### Reminders

- [x] Per-habit reminder preferences
- [x] Preferred time configuration
- [x] Enable/disable per habit
- [x] Web push notifications via Edge Function

## Troubleshooting

### "Legacy habits tables are in read-only mode" Error

This means the read-only flag is enabled. Either:
1. Complete the migration to V2 services, or
2. Disable read-only mode temporarily:
   ```sql
   UPDATE public.app_config 
   SET value = '{"enabled": false}'::jsonb
   WHERE key = 'legacy_habits_readonly';
   ```

### Missing Habits After Migration

1. Check migration map:
   ```sql
   SELECT COUNT(*) FROM public.habit_migration_map;
   ```
2. Look for orphaned habits (no associated goal):
   ```sql
   SELECT h.* FROM public.habits h
   LEFT JOIN public.goals g ON h.goal_id = g.id
   WHERE g.id IS NULL;
   ```
3. Re-run migration for missing habits (they're skipped, not overwritten)

### Reminders Not Working

1. Verify habit has a reminder pref:
   ```sql
   SELECT * FROM public.habit_reminder_prefs WHERE habit_id = '<habit-id>';
   ```
2. Check Edge Function logs for errors
3. Verify push subscription exists for user

## Related Documentation

- [docs/habits-v2.md](habits-v2.md) - V2 system documentation
- [docs/DAILY_REMINDER_SCHEDULING.md](DAILY_REMINDER_SCHEDULING.md) - Reminder system
- [HABITS_SETUP_GUIDE.md](../HABITS_SETUP_GUIDE.md) - Initial setup guide

## Support

If you encounter issues during migration:

1. Check this document's troubleshooting section
2. Review migration logs in Supabase Dashboard
3. Verify all migrations are applied in order
4. Contact the development team with specific error messages
