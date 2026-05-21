# Daily Journal / Quick Journal triangle launcher and privacy investigation

Date: 2026-05-21

## Recommendation

**PASS with one privacy-semantics caveat.** The visual launcher and focused modal conversion are safe as a small Today-tab UI slice because Quick Journal is localized mostly to `DailyHabitTracker.tsx` and `src/index.css`. The Private flag is also schema-safe because `journal_entries.is_private` already exists, is present in generated TypeScript types, and is supported by demo/offline save flows. However, the current app writes every journal entry as `is_private: true`, while AI Coach currently reads journal entries without filtering that flag. Before implementation, product/engineering should decide whether existing `is_private: true` rows should become excluded from AI context immediately, or whether a backfill/new semantic flag is needed to preserve current AI Coach behavior.

## 1. Current component/file map

### Today tab Quick Journal

- `src/App.tsx`
  - The Planning/Today workspace renders `DailyHabitTracker` for `activeWorkspaceNav === 'planning'` (`src/App.tsx:3380-3423`).
  - App-wide quick action journal navigation exists separately through `handleQuickJournalNow`, which opens the full Journal workspace composer (`src/App.tsx:2806-2814`, `src/App.tsx:5255-5262`).
- `src/features/habits/DailyHabitTracker.tsx`
  - Owns the Today Quick Journal state and draft type: `QuickJournalDraft`, `QuickJournalMode = 'written' | 'pulse' | 'dream'`, and dream tone state (`src/features/habits/DailyHabitTracker.tsx:447-478`).
  - Renders the Today expandable section `id="today-quick-journal"` with title `Quick journal` (`src/features/habits/DailyHabitTracker.tsx:8341-8349`).
  - Current layout is a mode tablist for Written / Pulse check-in / Dream journal plus a `+ Add journal entry` button (`src/features/habits/DailyHabitTracker.tsx:8375-8417`).
  - The editor is currently inline inside the card/sheet after `isQuickJournalOpen` becomes true (`src/features/habits/DailyHabitTracker.tsx:8418-8695`).
  - Save/submit logic is local to the component (`src/features/habits/DailyHabitTracker.tsx:7392-7590`).
- `src/index.css`
  - Quick Journal styles are global BEM-style selectors `.habit-quick-journal__*` (`src/index.css:9049-9283`).
  - The current tab/button styling is `.habit-quick-journal__type-toggle`, `.habit-quick-journal__type-button`, and `.habit-quick-journal__button` (`src/index.css:9107-9140`).

### Full Journal workspace

- `src/features/journal/Journal.tsx`
  - Full journal shell; defines `JournalType = JournalEntryType`, owns entries, editor open state, launch requests, list/detail/editor wiring (`src/features/journal/Journal.tsx:43-79`, `src/features/journal/Journal.tsx:230-253`).
  - Loads entries with `listJournalEntries({ limit: 250 })` and refreshes offline queue state (`src/features/journal/Journal.tsx:344-412`).
  - Handles external `launchRequest` by setting the mode and opening `JournalEntryEditor` (`src/features/journal/Journal.tsx:291-306`).
- `src/features/journal/JournalEntryEditor.tsx`
  - Existing modal/dialog pattern: `role="dialog"`, backdrop, panel, form, save/cancel actions (`src/features/journal/JournalEntryEditor.tsx:967-1174`).
  - Supports several modes, including quick, deep, brain dump, life wheel, secret, goal, problem, gratitude; it does not currently have a Dream-specific form branch (`src/features/journal/JournalEntryEditor.tsx:554-563`).
- `src/features/journal/JournalTypeSelector.tsx`
  - Lists full journal modes including `quick`, `gratitude`, and `dream` (`src/features/journal/JournalTypeSelector.tsx:15-27`).
- `src/features/journal/JournalEntryList.tsx` and `JournalEntryDetail.tsx`
  - Display saved entries in calendar/list/detail views, including type labels, tags, linked goals/habits, locked time capsule handling (`src/features/journal/JournalEntryList.tsx:88-220`, `src/features/journal/JournalEntryDetail.tsx:77-225`).

## 2. Current journal data model and save/load flow

### Schema and types

- `journal_entries` was created in `supabase/migrations/0106_journal_feature.sql` with columns including `entry_date`, `title`, `content`, `mood`, `tags`, `is_private boolean NOT NULL DEFAULT true`, `attachments`, `linked_goal_ids`, and `linked_habit_ids` (`supabase/migrations/0106_journal_feature.sql:21-35`).
- Journal mode columns were added in `supabase/migrations/0112_journal_modes.sql`: `type`, `mood_score`, `category`, `unlock_date`, and `goal_id` (`supabase/migrations/0112_journal_modes.sql:6-23`).
- Additional mode migrations added `problem`, `gratitude`, and `dream` to the `journal_entries_type_allowed_values` constraint (`supabase/migrations/0114_problem_journal_type.sql:33-40`, `supabase/migrations/0165_gratitude_journal_type.sql:16-32`, `supabase/migrations/0232_dream_journal_type.sql:16-33`).
- `src/lib/database.types.ts` already exposes `JournalEntryType` with `quick`, `gratitude`, and `dream`, and `journal_entries.Row/Insert/Update` includes `is_private` (`src/lib/database.types.ts:9-20`, `src/lib/database.types.ts:565-615`).

### Service layer

- `src/services/journal.ts` exports `JournalEntry` from database types and provides `listJournalEntries`, `getJournalEntry`, `createJournalEntry`, `updateJournalEntry`, and `deleteJournalEntry` (`src/services/journal.ts:28-30`, `src/services/journal.ts:411-575`).
- `createJournalEntry` validates the active Supabase session and user id before inserting; if a network-like error occurs, it queues a local create (`src/services/journal.ts:490-525`).
- `listJournalEntries` loads demo data when Supabase data is unavailable, otherwise queries `journal_entries`, then merges local pending offline rows over remote rows (`src/services/journal.ts:411-472`).
- Offline persistence lives in `src/data/journalOfflineRepo.ts`; local rows and queued mutation payloads use the same database typed `JournalEntryInsert` / `JournalEntryUpdate`, so `is_private` is already carried in offline create/update payloads (`src/data/journalOfflineRepo.ts:1-38`, `src/data/journalOfflineRepo.ts:96-154`).
- Demo journal data also normalizes and writes `is_private` (`src/services/demoData.ts:1835-1890`).

### Today Quick Journal save flow

- `handleSubmitQuickJournal` builds text content from the currently selected mode (`pulse`, `written`, or `dream`) (`src/features/habits/DailyHabitTracker.tsx:7447-7502`).
- It inserts a `journal_entries` row with:
  - `is_private: true`
  - `type: 'dream'` for dream mode, otherwise `type: 'quick'`
  - `category: 'nonverbal'` for pulse mode
  - tags like `pulse-check-in`, `dream`, `sleep`, `quick-entry`, or gratitude-related tags (`src/features/habits/DailyHabitTracker.tsx:7517-7550`).
- After save, it awards XP, records activity/challenge activity, removes the local draft, closes the inline sheet, and resets all local Quick Journal fields (`src/features/habits/DailyHabitTracker.tsx:7552-7584`).
- Draft persistence is localStorage-based through `quickJournalDraftKey`, `saveDraft`, `loadDraft`, and `removeDraft`; the draft includes mode and mode-specific fields but not a privacy flag yet (`src/features/habits/DailyHabitTracker.tsx:447-467`, `src/features/habits/DailyHabitTracker.tsx:7424-7444`).

### Full Journal save/load/display flow

- Full Journal loads all recent entries via `listJournalEntries({ limit: 250 })` and sorts/selects them locally (`src/features/journal/Journal.tsx:344-374`).
- Full Journal save builds a payload with `is_private: true` for both creates and updates (`src/features/journal/Journal.tsx:830-887`).
- `JournalEntryEditor` draft currently has no `isPrivate` field, so the user cannot toggle `is_private` from the full journal editor (`src/features/journal/JournalEntryEditor.tsx:19-36`).
- `JournalEntryList` and `JournalEntryDetail` do not display a private indicator today (`src/features/journal/JournalEntryList.tsx:166-192`, `src/features/journal/JournalEntryDetail.tsx:85-120`).

## 3. Current journal modes: real types vs UI labels

- `Dream Journal` is a real database mode: `JournalEntryType` includes `dream`, `JournalTypeSelector` includes `Dream`, and migration `0232` adds `dream` to the DB constraint (`src/lib/database.types.ts:9-20`, `src/features/journal/JournalTypeSelector.tsx:15-27`, `supabase/migrations/0232_dream_journal_type.sql:16-33`).
- `Written Journal` is currently a Today Quick Journal UI mode only. It saves as `type: 'quick'`, not a distinct `written` database type (`src/features/habits/DailyHabitTracker.tsx:476`, `src/features/habits/DailyHabitTracker.tsx:7456-7474`, `src/features/habits/DailyHabitTracker.tsx:7544`).
- `Pulse Check-in` is currently a Today Quick Journal UI mode only. It saves as `type: 'quick'` with `category: 'nonverbal'` and tags `nonverbal` / `pulse-check-in` (`src/features/habits/DailyHabitTracker.tsx:7450-7455`, `src/features/habits/DailyHabitTracker.tsx:7517-7549`).

## 4. Existing modal patterns suitable for launcher modes

- Best reusable local pattern: `JournalEntryEditor` provides a conventional React dialog/backdrop/panel/modal form (`src/features/journal/JournalEntryEditor.tsx:967-1174`). It is suitable as a pattern but not a drop-in for Pulse or Today Dream because those forms are currently implemented only inside `DailyHabitTracker`.
- Today Quick Journal currently has all three focused forms inline; the safest conversion is to extract those three mode bodies and actions into a Today-local modal component rather than routing Today users to the full Journal workspace.
- Other modal/sheet patterns exist throughout features, but using the existing journal editor modal structure keeps keyboard/backdrop behavior aligned with journal UX and avoids broad Today redesign.

## 5. Current AI Coach journal-context flow

- AI Coach reads the account-level data-access setting from `getAiCoachAccess`; `DEFAULT_AI_COACH_ACCESS.journaling` is `true` (`src/types/aiCoach.ts:10-17`, `src/services/aiCoachAccess.ts:13-28`).
- Account UI has a coarse `Journaling` access toggle: “Allow the coach to read journal entries you have saved” (`src/types/aiCoach.ts:39-43`, `src/features/account/AiSettingsSection.tsx:165-200`).
- In `AiCoach.tsx`, if `dataAccess.journaling` is enabled, it loads up to 12 entries from the last 14 days using `listJournalEntries({ fromDate, limit: 12 })` and passes them into `buildMindsetInterventions` (`src/features/ai-coach/AiCoach.tsx:512-520`).
- The mindset intervention scanner uses `title + content` text and does not check `entry.is_private` (`src/features/ai-coach/AiCoach.tsx:165-180`, `src/features/ai-coach/AiCoach.tsx:357-388`).
- `loadAiCoachInstructions` only includes the coarse data-access summary; it does not include raw journal entries, but it does tell the coach whether journaling access is allowed (`src/services/aiCoachInstructions.ts:75-120`).

## 6. Safest place to enforce “private entries excluded from AI context”

Recommended central enforcement point: add a journal privacy/context helper in or near `src/services/journal.ts`, for example a small exported function that filters entries before any AI-context construction. Then update `AiCoach.tsx` to call that helper immediately after `listJournalEntries` and before `buildMindsetInterventions`.

Why this location:

- It preserves user-facing journal history: `listJournalEntries` should continue returning all entries for the journal UI.
- It centralizes the AI exclusion rule near the journal service/model, making future AI surfaces less likely to forget the privacy rule.
- It avoids changing AI provider/model behavior and avoids broad coach rewrites.
- It can be unit-tested without rendering the whole coach.

Avoid enforcing privacy only inside the Today component; entries can also be created from the full Journal workspace, goal reflections, rationality/problem flows, and other services that call `createJournalEntry`.

## 7. Does the Private flag require a DB migration?

**Schema migration: no, not for a boolean flag.** `journal_entries.is_private` already exists, has a default, appears in generated TS types, is written by current create flows, and is carried by demo/offline sync.

**Possible data/semantics migration: maybe.** Current behavior sets `is_private: true` for all observed journal create flows:

- Today Quick Journal (`src/features/habits/DailyHabitTracker.tsx:7542`).
- Today Intentions/Todos (`src/features/habits/DailyHabitTracker.tsx:7650`).
- Full Journal workspace (`src/features/journal/Journal.tsx:878`).
- Demo/local normalization defaults to true (`src/services/demoData.ts:1850`, `src/services/journal.ts:122`).

If implementation simply starts filtering `is_private === true` out of AI context, existing users will likely lose all journal-derived coach interventions until they explicitly mark entries non-private. That is privacy-safe but behavior-changing. If the intended default is “not private from AI unless toggled,” then a migration or new field would be needed to distinguish legacy “private journal storage/RLS” from the new “exclude from AI context” meaning.

Recommended decision:

- If privacy takes precedence: reuse `is_private`, default the new toggle to private/on, and accept that AI Coach will not use old entries unless changed later.
- If preserving AI Coach behavior takes precedence: add a new explicit field such as `exclude_from_ai_context boolean NOT NULL DEFAULT false`, or run a one-time backfill setting legacy `is_private = false` after validating no sharing semantics depend on it. This would require a Supabase migration and generated type update.

## 8. Recommended implementation plan split into small PR steps

### PR 1 — Central privacy semantics and tests

1. Confirm product decision for legacy `is_private` semantics.
2. Add a centralized journal-to-AI filter/helper near `src/services/journal.ts`.
3. Update `AiCoach.tsx` to filter entries before mindset intervention construction.
4. Add targeted tests for the filter and for AI Coach intervention entry selection if an existing test harness exists.
5. Do not change AI model/provider behavior.

### PR 2 — Today launcher UI only

1. In `DailyHabitTracker.tsx`, replace the tablist + `+ Add journal entry` button with a three-orb launcher inside the existing `today-quick-journal` expandable section.
2. Keep the current section header/status/draft behavior and avoid broad Today layout changes.
3. Clicking an orb sets `quickJournalMode` and opens a focused modal instead of the inline sheet.
4. Preserve current payload construction, XP/activity/challenge side effects, draft persistence, and reset behavior.
5. Add/adjust CSS in `src/index.css` for the triangular layout and responsive fallback.

### PR 3 — Private toggle in Quick Journal modal

1. Add `isPrivate` to Quick Journal draft state and localStorage draft persistence.
2. Add a clear Private toggle in the focused modal.
3. Write `is_private` from the toggle when creating entries.
4. Show helper copy: private entries remain visible in Journal but are excluded from AI Coach context.
5. Add regression coverage for create payloads if existing tests support DailyHabitTracker flows.

### PR 4 — Full Journal parity

1. Add `isPrivate` to `JournalEntryDraft` and `JournalEntryEditor` create/edit forms.
2. Preserve existing entries’ `is_private` value when editing.
3. Display a small private badge in `JournalEntryList` and `JournalEntryDetail`.
4. Ensure full Journal creates and updates no longer hard-code `is_private: true` without consulting the draft.

### PR 5 — Optional data migration/backfill

Only needed if the product decision is to preserve legacy AI Coach journal access for old entries while adding an explicit opt-out. Add migration/types/tests in a separate PR to minimize risk.

## 9. Specific files likely to change

Likely for core implementation:

- `src/features/habits/DailyHabitTracker.tsx`
- `src/index.css`
- `src/services/journal.ts`
- `src/features/ai-coach/AiCoach.tsx`
- `src/features/journal/JournalEntryEditor.tsx`
- `src/features/journal/Journal.tsx`
- `src/features/journal/JournalEntryList.tsx`
- `src/features/journal/JournalEntryDetail.tsx`
- `src/services/demoData.ts` if defaults/normalization semantics change
- `src/data/journalOfflineRepo.ts` only if a new DB field is introduced; existing `is_private` needs no offline schema change
- `src/lib/database.types.ts` only if Supabase generated types need refreshing or a new column is added
- `supabase/migrations/<next>_*.sql` only if introducing a new field or backfilling legacy privacy semantics

Likely tests/validation additions, depending on existing harness coverage:

- New or existing tests under `src/features/journal/**/__tests__` or `src/features/ai-coach/**/__tests__`
- A small service-level test for any centralized privacy filter

## 10. Risks/blockers

- **Privacy semantic mismatch:** `is_private` already exists but currently means “journal entries are private/user-owned” in copy and writes, not “excluded from AI Coach.” Filtering it immediately will exclude nearly all current journal entries from AI Coach.
- **Existing entries:** Backwards compatibility depends on the chosen semantic. A backfill/new field may be necessary to avoid silently changing coach behavior.
- **Offline sync:** Existing offline queues carry `is_private`; adding a new field requires DB type updates and care for pending old mutations. Reusing `is_private` is offline-safe.
- **Today component size:** `DailyHabitTracker.tsx` is large and owns many unrelated Today behaviors. Keep the launcher/modal extraction narrow to avoid broad regressions.
- **Duplicate journal forms:** Today Quick Journal has richer pulse/dream forms than `JournalEntryEditor`; extracting shared subcomponents may be safer than trying to reuse the full editor immediately.
- **AI surfaces beyond AI Coach:** The current confirmed journal AI read is `AiCoach.tsx`, but future/other AI surfaces may call `listJournalEntries` directly. Central helper naming and docs reduce accidental bypass.
- **UI accessibility:** Three circular orbs need accessible names, focus states, keyboard operation, and a responsive layout that does not rely only on visual triangle position.
- **Tests:** There may not be focused Today Quick Journal tests. Add minimal tests around pure payload/filter logic where possible rather than introducing broad brittle UI coverage.

## 11. Validation commands to run later

For implementation PRs, run the existing repo validation commands relevant to changed areas:

```bash
npm ci
npm run build
```

There is no repo-level `npm test` script in the current `package.json`; if implementation adds targeted tests, add/run an existing-style package script for that test scope in the same PR. Do not run Island Run-specific validation unless an implementation PR touches Island Run, which this work should avoid.

## Final PASS/FAIL

**PASS for implementation after the privacy-semantics decision is made.** The UI conversion is localized and the data model already has a privacy boolean. The only blocker is deciding how to treat legacy `is_private: true` entries when enforcing AI exclusion.
