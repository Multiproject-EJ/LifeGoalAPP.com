# Archived Legacy SQL Files

This directory contains SQL files that were previously in the top-level `sql/` directory before the consolidation into `supabase/migrations/`.

## Purpose

These files are preserved for **historical reference only**. They should not be executed directly.

## Files

### Legacy Schema Files
- `legacy_001_schema.sql` - Original schema definitions (superseded by migrations 0001-0012, 0101-0107)
- `legacy_002_policies.sql` - Original RLS policies (superseded by migrations 0001-0012, 0101-0107)

### Legacy Feature Files (Different from Current Migrations)
- `legacy_003_life_goals_extended.sql` - Original version (canonical: `0104_life_goals_extended.sql`)
- `legacy_004_ai_settings.sql` - Original version (canonical: `0108_ai_settings.sql`)
- `legacy_006_journal_modes.sql` - Original version (canonical: `0106_journal_feature.sql`)
- `legacy_007_meditation_sessions.sql` - Original version (canonical: `0110_meditation_sessions.sql`)

## Note

The canonical versions of these features are in `supabase/migrations/` with updated migration numbers. These legacy files may have different content than the current migrations due to refinements made during the migration process.

If you need to understand the evolution of a feature, compare the legacy file with its corresponding migration in `supabase/migrations/`.

## Consolidated Files

The following files from the legacy `sql/` directory were consolidated into `supabase/migrations/`:

- `sql/005_habit_alerts.sql` → `supabase/migrations/0112_habit_alerts.sql` (moved with header)
- `sql/008_meditation_reminders.sql` → Deleted (identical to `0111_meditation_reminders.sql`)

## Documentation

For current database schema and migration information, see:
- `supabase/migrations/` - Canonical migration files
- `sql/manual.sql` - Auto-generated bundle of all migrations
- `sql/README.md` - Migration workflow documentation
