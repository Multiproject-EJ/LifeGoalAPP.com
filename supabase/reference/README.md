# Legacy SQL Reference Files

This directory contains archived SQL files from the former `sql/` directory structure. These files are kept for historical reference only and should **not be used** for new development.

## Background

Prior to the SQL consolidation (December 2025), the repository maintained SQL files in two locations:
- `sql/` - Top-level directory with numbered migration-style files
- `supabase/migrations/` - Canonical migration directory used by Supabase CLI

This caused duplication, confusion, and potential drift between the two locations.

## Consolidation Summary

All SQL files have been consolidated into `supabase/migrations/` as the single source of truth:

### Files Moved to Migrations
- `sql/006_journal_modes.sql` → `supabase/migrations/0112_journal_modes.sql`
  - Extends journal_entries table with multiple journal modes support
  - Only file with unique schema changes not already in migrations

### Files Archived Here
The following files have been archived because they:
- Are duplicates of existing migrations (with minor cosmetic differences)
- Reference deprecated legacy habits tables (already archived in migration 0012)
- Are superseded by newer migrations in `supabase/migrations/`

| Original File | Archived As | Status |
|--------------|-------------|---------|
| `sql/001_schema.sql` | `legacy_001_schema.sql` | Legacy schema (goals, habits, etc.) - superseded by migrations |
| `sql/002_policies.sql` | `legacy_002_policies.sql` | Legacy RLS policies - superseded by migrations |
| `sql/003_life_goals_extended.sql` | `legacy_003_life_goals_extended.sql` | Superseded by `0104_life_goals_extended.sql` |
| `sql/004_ai_settings.sql` | `legacy_004_ai_settings.sql` | Superseded by `0108_ai_settings.sql` |
| `sql/005_habit_alerts.sql` | `legacy_005_habit_alerts.sql` | References deprecated legacy habits table |
| `sql/007_meditation_sessions.sql` | `legacy_007_meditation_sessions.sql` | Superseded by `0110_meditation_sessions.sql` |
| `sql/006_journal_modes_README.md` | `legacy_006_journal_modes_README.md` | Documentation for journal modes |
| `sql/README.md` | `legacy_sql_README.md` | Old README explaining legacy structure |

### Files Removed
- `sql/008_meditation_reminders.sql` - Identical to `0111_meditation_reminders.sql` (duplicate)
- `sql/manual.sql` - Regenerated from `supabase/migrations/` (now auto-generated)

## Current Structure

**Canonical Location**: `supabase/migrations/`
- All SQL migrations numbered sequentially (0001, 0002, ..., 0112, etc.)
- Each migration has a descriptive name (e.g., `0112_journal_modes.sql`)
- Demo data in `supabase/migrations/demo_data.sql`

**Generated Bundle**: `sql/manual.sql`
- Auto-generated from migrations using `npm run build:manual-sql`
- For manual Supabase setup without CLI
- Kept up-to-date via CI checks

**Edge Functions**: `supabase/functions/`
- Supabase Edge Functions (auto-progression, send-reminders, etc.)

## CI Protection

A GitHub Actions workflow (`legacy-sql-guard.yml`) prevents accidental re-introduction of SQL files in `sql/`. All new migrations must be created in `supabase/migrations/`.

## Documentation

- See `sql/README.md` for current SQL bundle documentation
- See `JOURNAL_MODES_IMPLEMENTATION.md` for journal modes details
- See individual migration files in `supabase/migrations/` for schema documentation

---

**Important**: These files are for reference only. Do not copy or run them. Use migrations from `supabase/migrations/` or the generated `sql/manual.sql` bundle instead.
