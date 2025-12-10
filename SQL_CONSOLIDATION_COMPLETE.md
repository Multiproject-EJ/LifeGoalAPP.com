# SQL Consolidation Complete

This document summarizes the SQL consolidation work completed in December 2025.

## Objective

Consolidate all SQL files and functions into the canonical `supabase/` location, eliminating duplication and confusion between `sql/` and `supabase/migrations/` directories.

## What Was Done

### 1. SQL File Analysis and Consolidation

Analyzed all files in both locations and categorized them:

| Original File | Action Taken | Reason |
|--------------|--------------|---------|
| `sql/001_schema.sql` | Archived to `supabase/reference/` | Legacy schema for deprecated tables |
| `sql/002_policies.sql` | Archived to `supabase/reference/` | Legacy RLS policies for deprecated tables |
| `sql/003_life_goals_extended.sql` | Archived to `supabase/reference/` | Superseded by `0104_life_goals_extended.sql` |
| `sql/004_ai_settings.sql` | Archived to `supabase/reference/` | Superseded by `0108_ai_settings.sql` |
| `sql/005_habit_alerts.sql` | Archived to `supabase/reference/` | References deprecated legacy habits table |
| `sql/006_journal_modes.sql` | **Moved** to `supabase/migrations/0112_journal_modes.sql` | Unique schema changes not in migrations |
| `sql/007_meditation_sessions.sql` | Archived to `supabase/reference/` | Superseded by `0110_meditation_sessions.sql` |
| `sql/008_meditation_reminders.sql` | **Removed** | Identical duplicate of `0111_meditation_reminders.sql` |
| `sql/manual.sql` | **Removed and regenerated** | Auto-generated bundle |
| `sql/README.md` | Archived to `supabase/reference/` | Replaced with new README |
| `sql/006_journal_modes_README.md` | Archived to `supabase/reference/` | Documentation archived with migration |

### 2. New Structure Created

**`supabase/migrations/`** - Canonical location for all migrations
- Added `0112_journal_modes.sql` (moved from `sql/006_journal_modes.sql`)
- All 24 migrations now in sequential order

**`supabase/reference/`** - Archive of legacy SQL files
- Created directory with 9 archived files
- Added comprehensive README explaining legacy files
- Files renamed with `legacy_` prefix for clarity

**`sql/`** - Generated bundles only
- New README documenting current structure
- `.gitignore` to prevent SQL files (except `manual.sql`)
- Regenerated `manual.sql` with all 24 migrations

### 3. CI Protection

Created `.github/workflows/legacy-sql-guard.yml`:
- Prevents SQL files in `sql/` directory
- Verifies `manual.sql` is up-to-date
- Provides helpful error messages with migration guide
- Runs on all PRs and pushes to main

### 4. Documentation Updates

Updated all references in:
- `IMPLEMENTATION_COMPLETE.md`
- `JOURNAL_MODES_IMPLEMENTATION.md`
- `HABIT_ALERTS_GUIDE.md`
- `docs/journal-modes.md`
- `src/features/auth/SupabaseAuthProvider.tsx` (error messages)

References now point to:
- `supabase/migrations/` for current schema
- `supabase/reference/` for archived files
- `sql/manual.sql` for manual bundle (still valid)

## Verification

All checks passed:
- ✅ `sql/` contains only: `.gitignore`, `README.md`, `manual.sql`
- ✅ Migration `0112_journal_modes.sql` exists in `supabase/migrations/`
- ✅ 9 files archived in `supabase/reference/` with README
- ✅ `manual.sql` contains 24 migrations in correct order
- ✅ `.gitignore` blocks new SQL files but allows `manual.sql`
- ✅ CI workflow properly validates structure
- ✅ No security vulnerabilities detected

## Benefits

1. **Single Source of Truth**: All migrations in `supabase/migrations/`
2. **No Duplication**: Legacy files archived, duplicates removed
3. **CI Protection**: Prevents future SQL files in `sql/`
4. **Clear Documentation**: README files explain structure
5. **Backward Compatibility**: `sql/manual.sql` still works for manual setup
6. **History Preserved**: All legacy files archived with explanations

## Migration Guide for Developers

### Creating New Migrations

1. Create file in `supabase/migrations/` with next number (e.g., `0113_feature_name.sql`)
2. Write idempotent SQL using `CREATE IF NOT EXISTS`, `DROP IF EXISTS`, etc.
3. Run `npm run build:manual-sql` to update `sql/manual.sql`
4. Test locally, then commit

### Applying Migrations

**Option 1: Supabase CLI**
```bash
supabase db push
```

**Option 2: Manual (SQL Editor)**
```sql
-- Copy and paste sql/manual.sql
```

**Option 3: Individual Migration**
```sql
-- Copy specific migration from supabase/migrations/
```

## Files Changed

- **Added**: 3 files
  - `.github/workflows/legacy-sql-guard.yml`
  - `sql/.gitignore`
  - `supabase/reference/README.md`

- **Modified**: 10 files
  - `sql/README.md` (completely rewritten)
  - `sql/manual.sql` (regenerated)
  - `supabase/migrations/0112_journal_modes.sql` (moved/updated)
  - `IMPLEMENTATION_COMPLETE.md`
  - `JOURNAL_MODES_IMPLEMENTATION.md`
  - `HABIT_ALERTS_GUIDE.md`
  - `docs/journal-modes.md`
  - `supabase/reference/legacy_sql_README.md`

- **Moved/Archived**: 8 files to `supabase/reference/`

- **Removed**: 2 files
  - `sql/008_meditation_reminders.sql` (duplicate)
  - Original `sql/manual.sql` (regenerated)

## Next Steps

1. ✅ All SQL files consolidated
2. ✅ CI protection in place
3. ✅ Documentation updated
4. ✅ Security scan passed
5. Ready for review and merge

## References

- Current SQL docs: `sql/README.md`
- Legacy files: `supabase/reference/README.md`
- Migrations: `supabase/migrations/`
- CI workflow: `.github/workflows/legacy-sql-guard.yml`

---

**Status**: ✅ Complete and verified
**Date**: December 10, 2025
