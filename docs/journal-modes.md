# Journal Modes Documentation

This document describes the modular journal system that supports multiple journaling experiences through different modes.

## Available Modes

The journal system supports 8 different modes, each designed for a specific journaling experience:

| Mode | Type Value | Description |
|------|------------|-------------|
| Standard | `standard` | Default journal entry with full features |
| Quick | `quick` | Fast daily capture with mood tracking |
| Deep | `deep` | Extended reflective writing with focus mode |
| Brain Dump | `brain_dump` | Timed free-writing session with optional AI reflection |
| Life Wheel | `life_wheel` | Category-based life area reflection |
| Secret | `secret` | Local-only temporary entries (not saved to DB) |
| Goal | `goal` | Goal-focused reflection linked to a specific goal |
| Time Capsule | `time_capsule` | Future-dated entries that unlock at a specified time |

## Fields by Mode

Each mode uses a different combination of fields from the `journal_entries` table. See `supabase/migrations/0112_journal_modes.sql` and `supabase/reference/legacy_006_journal_modes_README.md` for the complete schema.

### Standard (`standard`)
- All standard fields: `title`, `content`, `mood`, `tags`, `linked_goal_ids`, `linked_habit_ids`
- No special mode fields required

### Quick (`quick`)
- Required: `content`, `mood_score` (1-10 scale)
- Optional: `mood` (auto-mapped from `mood_score`)
- UI: Simplified with 3-sentence prompt and mood slider

### Deep (`deep`)
- Standard fields with emphasis on longer `content`
- UI: Focus mode toggle for distraction-free writing

### Brain Dump (`brain_dump`)
- Required: `content`
- UI features: 60-second countdown timer, progressive blur effect
- Optional: AI reflection stub (placeholder for future integration)

### Life Wheel (`life_wheel`)
- Required: `category` (life area), `mood_score` (satisfaction level 1-10)
- Content: Reflection on the selected life area
- Categories: Career, Health, Relationships, Personal Growth, Fun, Mindset, Finances, Environment

### Secret (`secret`)
- **Special**: No database persistence - local-only
- UI: Configurable self-destruct timer (25 seconds default or 10 minutes), manual destroy button
- Timer options:
  - **25 seconds** (default): Quick thoughts that need immediate privacy
  - **10 minutes**: Extended reflection with more time to process
- Content is never saved to `journal_entries`
- Timer can be changed at any time before destruction
- Closing the editor resets the timer and clears the content

### Goal (`goal`)
- Required: `goal_id` (single goal reference)
- Content: Reflection specifically about the linked goal
- Note: Different from `linked_goal_ids` which supports multiple goals

### Time Capsule (`time_capsule`)
- Required: `unlock_date` (timestamptz - when entry becomes visible)
- Content: Message to future self
- Locking: Entry is read-only if `unlock_date` is in the future

## Components with Mode-Specific Behavior

### `Journal.tsx`
- Manages journal type state via `JournalTypeSelector`
- Implements time capsule locking logic via `isEntryLocked()` function
- Passes `journalType` to `JournalEntryEditor`
- Handles all mode fields when saving entries

### `JournalEntryEditor.tsx`
- Renders mode-specific UI sections based on `draft.type`
- **Quick mode**: Mood slider, random prompts, 4-row textarea
- **Deep mode**: Focus mode toggle, 14-row textarea
- **Brain Dump**: 60-second timer, blur effect, AI reflection button
- **Life Wheel**: Category selector, satisfaction slider
- **Secret**: Self-destruct timer, local-only notice, no save to DB
- **Goal**: Primary goal selector
- **Time Capsule**: Unlock date picker
- Content labels and placeholders adapt per mode

### `JournalEntryList.tsx`
- Displays lock icon for locked time capsule entries
- Uses `isEntryLocked()` prop to determine lock status
- Shows entry previews with mode-appropriate formatting

### `JournalEntryDetail.tsx`
- Accepts `isLocked` prop to prevent editing locked time capsules
- Displays mode-specific metadata (category, primary goal, unlock date)
- Shows goal/habit links based on mode

## Special Logic

### Time Capsule Locking Rules
Implemented in `Journal.tsx`:
```typescript
function isEntryLocked(entry: JournalEntry): boolean {
  if (entry.type !== 'time_capsule') return false;
  if (!entry.unlock_date) return false;
  return new Date(entry.unlock_date) > new Date();
}
```
- Entry is locked if type is `time_capsule` AND `unlock_date` is in the future
- Locked entries cannot be edited (enforced in UI)

### Secret Mode (Local-Only)
Implemented in `JournalEntryEditor.tsx`:
- Content stored in local component state (`secretText`)
- Configurable countdown timer with two options:
  - **25 seconds** (default): Quick private thoughts with immediate destruction
  - **10 minutes** (600 seconds): Extended reflection time for deeper processing
- Timer duration selector with radio buttons
- User can switch between timer durations at any time before destruction
- Time display format:
  - Under 60 seconds: Shows as "Xs" (e.g., "25s")
  - 60 seconds or more: Shows as "M:SS" (e.g., "10:00", "5:30")
- Manual "Destroy now" button for immediate destruction
- Fading animation on destruction (500ms)
- Auto-destruct when timer reaches 0
- **Never persisted to database** - handled by skipping save in `handleSubmit()`
- Timer state resets when:
  - Opening/closing the editor
  - Switching to a different timer duration
  - After content destruction (timer resets to selected duration)

### Brain Dump Timer & Reflection
Implemented in `JournalEntryEditor.tsx`:
- 60-second countdown with progressive blur effect
- Blur calculation: `Math.max((60 - timeLeft) / 10, 0)`
- After timer completes: "Reflect on my brain dump" button appears
- AI reflection is a **placeholder stub** (`analyzeBrainDump()` function)
- Textarea becomes read-only after timer completes

## Adding a New Mode

To add a new journal mode, follow these steps:

### 1. Update Database Schema
- Add new type value to CHECK constraint in `supabase/migrations/0112_journal_modes.sql`
- Add any new mode-specific columns if needed
- Create migration script and test locally

### 2. Update TypeScript Types
- Add new mode to `JournalEntryType` union in `src/lib/database.types.ts`:
  ```typescript
  export type JournalEntryType = 
    | 'quick' | 'deep' | 'brain_dump' | 'life_wheel' 
    | 'secret' | 'goal' | 'time_capsule' | 'standard'
    | 'your_new_mode';  // Add here
  ```
- Add any new fields to `JournalEntryDraft` in `JournalEntryEditor.tsx`

### 3. Update Journal Type Selector
- Add new option to `JournalTypeSelector.tsx` component
- Add display label to `JOURNAL_TYPE_LABELS` in `JournalEntryEditor.tsx`

### 4. Implement Editor Behavior
In `JournalEntryEditor.tsx`:
- Add mode detection constant: `const isYourMode = draft.type === 'your_new_mode';`
- Add content label to `CONTENT_LABELS` object
- Add content placeholder to `CONTENT_PLACEHOLDERS` object
- Create render function for mode-specific UI (e.g., `renderYourModeSection()`)
- Call render function in the appropriate place in the form JSX

### 5. Update Detail View
In `JournalEntryDetail.tsx`:
- Add logic to display mode-specific metadata
- Handle any special rendering requirements (e.g., locked state)

### 6. Add Default Value Handling
In `JournalEntryEditor.tsx`:
- Update `createDraft()` to set sensible defaults for new fields
- Handle field mapping/transformation if needed

### 7. Save Logic
In `Journal.tsx`:
- Add new fields to `basePayload` in `handleSaveEntry()`
- Ensure proper null handling for optional fields

### 8. Test Thoroughly
- Create entries in the new mode
- Edit existing entries
- Verify field validation
- Check backward compatibility
- Test with demo mode

## References

- **Schema Migration**: `supabase/migrations/0112_journal_modes.sql`
- **Migration Docs**: `supabase/reference/legacy_006_journal_modes_README.md`
- **Implementation Guide**: `JOURNAL_MODES_IMPLEMENTATION.md`
- **Constants**: `src/features/journal/constants.ts`
- **Type Definitions**: `src/lib/database.types.ts`
