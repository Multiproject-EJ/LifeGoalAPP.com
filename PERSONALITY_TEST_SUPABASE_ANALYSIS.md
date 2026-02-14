# Personality Test Supabase Storage Analysis

## Executive Summary

This document provides a comprehensive analysis of where personality test results are saved in Supabase and when the saving occurs in the LifeGoalAPP.com application.

## Database Schema in Supabase

### 1. Main Table: `personality_tests`

**Location:** Defined in `/supabase/migrations/0132_personality_test.sql` (lines 10-18)

**Structure:**
```sql
CREATE TABLE IF NOT EXISTS public.personality_tests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  taken_at timestamptz DEFAULT now(),
  traits jsonb NOT NULL,
  axes jsonb NOT NULL,
  answers jsonb,
  version text NOT NULL DEFAULT 'v1'
);
```

**Enhanced in:** `/supabase/migrations/0139_add_archetype_hand.sql`
- Added `archetype_hand JSONB` column to store the 5-card archetype hand (dominant, secondary, 2 supports, shadow)

**Purpose:** Stores complete personality test results including:
- User identification and timestamp
- Big Five personality traits (openness, conscientiousness, extraversion, agreeableness, emotional_stability)
- Additional personality axes (regulation_style, stress_response, identity_sensitivity, cognitive_entry, honesty_humility, emotionality)
- Raw test answers
- Derived archetype hand

**Indexes:**
- `idx_personality_tests_user_id` - Fast lookup by user
- `idx_personality_tests_user_taken_at` - Efficient retrieval of test history sorted by date

**Security:** Row Level Security (RLS) enabled with policy `personality_tests_owner_all` ensuring users can only access their own tests

### 2. Profile Extensions: `profiles` Table

**Location:** Defined in `/supabase/migrations/0132_personality_test.sql` (lines 3-8)

**Added Columns:**
```sql
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS personality_traits jsonb,
  ADD COLUMN IF NOT EXISTS personality_axes jsonb,
  ADD COLUMN IF NOT EXISTS personality_profile_type text,
  ADD COLUMN IF NOT EXISTS personality_summary text,
  ADD COLUMN IF NOT EXISTS personality_last_tested_at timestamptz;
```

**Purpose:** Stores the user's most recent personality profile for quick access without joining to personality_tests table

## Visual Flow Diagram

```
User Completes Test
        ↓
┌───────────────────────────────────────────────────────────┐
│  Phase 1: Immediate Local Save (0ms)                      │
│  ------------------------------------------------          │
│  Component: PersonalityTest.tsx (line 740)               │
│  Function: queuePersonalityTestResult()                  │
│                                                            │
│  [IndexedDB] ← Save with _dirty: true                    │
│              ← UUID, timestamp, scores, answers           │
│              ← archetype_hand                             │
└───────────────────────────────────────────────────────────┘
        ↓
┌───────────────────────────────────────────────────────────┐
│  Phase 2: Immediate Supabase Sync (0-2 seconds)          │
│  ------------------------------------------------          │
│  Component: PersonalityTest.tsx (line 749)               │
│  Function: syncPersonalityTestsWithSupabase()            │
│                                                            │
│  [Supabase: personality_tests] ← UPSERT full test data   │
│  [Supabase: profiles]          ← UPDATE latest summary   │
│  [IndexedDB]                   ← Mark _dirty: false       │
└───────────────────────────────────────────────────────────┘
        ↓
┌───────────────────────────────────────────────────────────┐
│  Phase 3: Refresh History Display                         │
│  ------------------------------------------------          │
│  Shows test in UI history panel                          │
└───────────────────────────────────────────────────────────┘


On Component Mount / App Load:
┌───────────────────────────────────────────────────────────┐
│  Background Sync                                           │
│  ------------------------------------------------          │
│  • Sync any remaining dirty tests                        │
│  • Fetch remote tests from Supabase                      │
│  • Merge with local IndexedDB                            │
│  • Display in UI                                          │
└───────────────────────────────────────────────────────────┘
```

## Code Flow: When Results Are Saved

### Phase 1: Local Storage (Immediate)

**File:** `/src/data/personalityTestRepo.ts`
**Function:** `queuePersonalityTestResult()` (lines 14-37)

**When:** Immediately after the user completes the personality test

**What happens:**
1. Test results arrive at the results step of PersonalityTest component
2. `queuePersonalityTestResult()` is called from `/src/features/identity/PersonalityTest.tsx` (line 740)
3. Creates a new record with:
   - UUID identifier
   - User ID
   - Current timestamp
   - Personality traits scores
   - Personality axes scores
   - Raw answers
   - Archetype hand (if available)
   - Version (default 'v1')
   - `_dirty: true` flag (indicates needs sync to Supabase)
4. Saves to browser's IndexedDB via `putPersonalityTest(record)`

**Code location:** `PersonalityTest.tsx` lines 731-757
```typescript
useEffect(() => {
  if (step !== 'results' || !scores || !activeUserId) {
    return;
  }

  if (savedResultRef.current) {
    return;
  }

  queuePersonalityTestResult({
    userId: activeUserId,
    answers,
    scores,
    archetypeHand: archetypeHand || undefined,
    version: 'v1',
  })
    .then((record) => {
      savedResultRef.current = record.id;
      return syncPersonalityTestsWithSupabase(activeUserId);
    })
    .then(() => {
      void refreshHistory();
    })
    .catch(() => {
      // Fail silently; results are still shown locally.
    });
}, [activeUserId, answers, scores, step]);
```

### Phase 2: Supabase Sync (Immediately After Local Save)

**File:** `/src/services/personalityTest.ts`
**Function:** `syncPersonalityTestsWithSupabase()` (lines 159-204)

**When:** Automatically triggered right after local save (same useEffect, line 749)

**What happens:**
1. Retrieves all "dirty" tests from IndexedDB (tests with `_dirty: true`)
2. For each dirty test:
   - Upserts to `personality_tests` table in Supabase (lines 169-178)
   - Includes all fields: id, user_id, taken_at, traits, axes, answers, version, archetype_hand
   - Uses `onConflict: 'id'` for idempotent upserts
   - On success, marks the local record as clean (`_dirty: false`)
3. After all tests synced, updates the `profiles` table with the most recent test (lines 194-202):
   - Updates `personality_traits`
   - Updates `personality_axes`
   - Updates `personality_summary` (generated text description)
   - Updates `personality_last_tested_at`

**Key code:** `personalityTest.ts` lines 169-178
```typescript
for (const test of dirtyTests) {
  const { error } = await supabase.from('personality_tests').upsert({
    id: test.id,
    user_id: test.user_id,
    taken_at: test.taken_at,
    traits: test.traits,
    axes: test.axes,
    answers: test.answers ?? null,
    version: test.version,
    archetype_hand: test.archetype_hand ?? null,
  }, { onConflict: 'id' });
  // ... error handling and marking clean
}
```

### Phase 3: Background Sync (On Component Mount)

**File:** `/src/features/identity/PersonalityTest.tsx`
**Lines:** 767-788

**When:** When the PersonalityTest component mounts and user is authenticated

**What happens:**
- Attempts to sync any remaining dirty tests
- Falls back to local history if sync fails
- Ensures eventual consistency

### Phase 4: App Load Sync (On App Initialization)

**File:** `/src/App.tsx`
**Function:** `loadSummary()` (lines 810-876)

**When:** When the app loads and user session is active

**What happens:**
1. Calls `loadPersonalityTestHistoryWithSupabase(userId)` (line 815)
2. This function:
   - Loads local tests from IndexedDB
   - Fetches remote tests from Supabase
   - Merges both sources (remote takes precedence unless local is dirty)
   - Stores remote tests in IndexedDB for offline access
3. Loads personality profile from `profiles` table
4. Reconstructs PersonalityScores and ArchetypeHand from stored data

## Summary: Storage Locations

### In Supabase Database:

1. **`personality_tests` table** - Complete test history
   - All test results ever taken by the user
   - Full test data including answers
   - Sortable by date
   - Archetype hand for each test

2. **`profiles` table** - Latest personality summary
   - Most recent test results
   - Quick-access personality summary
   - Last tested timestamp

### In Browser:

**IndexedDB (via `localDb.ts`)** - Local cache
- Stores all tests with sync status (`_dirty` flag)
- Enables offline functionality
- Acts as staging area before Supabase sync

## Timing Summary

| Event | When | Where Saved | Function |
|-------|------|-------------|----------|
| Test Completed | User finishes test | IndexedDB (browser) | `queuePersonalityTestResult()` |
| Immediate Sync | 0-2 seconds after completion | Supabase `personality_tests` | `syncPersonalityTestsWithSupabase()` |
| Profile Update | Right after sync | Supabase `profiles` | `upsertPersonalityProfile()` |
| Background Sync | Component mount | Supabase | `syncPersonalityTestsWithSupabase()` |
| App Load | App initialization | Both IndexedDB + Supabase | `loadPersonalityTestHistoryWithSupabase()` |

## Key Features

### Offline Support
- Tests are saved locally first
- Sync happens asynchronously
- User can retake test even if offline
- Results sync when connection restored

### Data Integrity
- UUID-based deduplication
- Idempotent upserts prevent duplicates
- `_dirty` flag tracks sync status
- Merge strategy preserves dirty local changes

### Security
- Row Level Security (RLS) enforced
- Users can only access their own tests
- Foreign key to auth.users ensures data isolation

## Related Files

**Database Migrations:**
- `/supabase/migrations/0132_personality_test.sql` - Initial schema
- `/supabase/migrations/0139_add_archetype_hand.sql` - Archetype hand enhancement

**Data Layer:**
- `/src/data/personalityTestRepo.ts` - Local data operations
- `/src/data/localDb.ts` - IndexedDB interface
- `/src/services/personalityTest.ts` - Supabase sync operations

**UI Components:**
- `/src/features/identity/PersonalityTest.tsx` - Main test interface
- `/src/App.tsx` - App-level personality profile loading

**Type Definitions:**
- `/src/lib/database.types.ts` - TypeScript types for Supabase tables
