# Journal Modes Migration

This migration extends the `journal_entries` table to support multiple journal modes and enhanced metadata.

## What This Migration Does

Adds the following new columns to `journal_entries`:

1. **`type`** (text, NOT NULL, default: 'standard')
   - Defines the journal entry mode
   - Valid values: `quick`, `deep`, `brain_dump`, `life_wheel`, `secret`, `goal`, `time_capsule`, `standard`
   - Enforced by CHECK constraint

2. **`mood_score`** (integer, nullable)
   - Numeric mood score on a 0-10 scale
   - Separate from the existing string `mood` field
   - Constrained to values between 0 and 10 (inclusive)

3. **`category`** (text, nullable)
   - Life Wheel category for `life_wheel` journal mode
   - Examples: Career, Health, Relationships, etc.

4. **`unlock_date`** (timestamptz, nullable)
   - Date when a time capsule entry becomes visible
   - Used for `time_capsule` journal mode

5. **`goal_id`** (uuid, nullable, foreign key to goals.id)
   - Primary goal reference for goal-specific entries
   - Use for entries focused on a single goal
   - For multiple goals, use the existing `linked_goal_ids` array

## How to Apply

1. Open your Supabase dashboard
2. Navigate to the SQL Editor
3. Copy the contents of `006_journal_modes.sql`
4. Paste and execute in the SQL Editor
5. Verify success - you should see "Success. No rows returned"

## Backward Compatibility

This migration is **fully backward compatible**:
- All new columns are either nullable or have default values
- Existing journal entries will automatically get `type = 'standard'`
- Existing application code continues to work without changes
- The migration can be run multiple times safely (uses `IF NOT EXISTS`)

## Performance

The migration adds three indexes for optimal query performance:
- `idx_journal_entries_type` - for filtering by journal mode
- `idx_journal_entries_goal_id` - for filtering by goal
- `idx_journal_entries_unlock_date` - partial index for time capsule entries

## Application Code Updates

The TypeScript types have been updated in:
- `src/lib/database.types.ts` - Added `JournalEntryType` union and new fields
- `src/features/journal/` - Updated to support new optional fields
- `src/services/demoData.ts` - Demo data includes new fields

All new fields are optional when creating/updating entries, maintaining backward compatibility.
