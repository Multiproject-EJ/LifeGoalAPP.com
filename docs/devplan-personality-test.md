# Personality Test Dev Plan

## Goals
- Ship a mobile-first Personality Test flow inside the **ID** tab that helps users understand their traits and tailor their LifeGoal experience.
- Store results in Supabase with offline-friendly capture + sync.
- Reuse existing UI patterns for cards, buttons, and workspace sections.

## Non-goals
- Building the full quiz or scoring logic in the first step.
- Changing existing authentication, navigation, or unrelated tabs.
- Creating a new global routing system.

## UX flow (mobile-first)
1. User taps **ID** in the mobile menu or workspace nav.
2. Personality Test intro card explains the benefit and offers **Start**.
3. The quiz walks through short prompts (1 screen per question on mobile).
4. Results summary shows traits, strengths, and suggested habits/goals.
5. Users can retake or edit preferences.

## Data model & migrations plan (Supabase)
- `personality_tests`
  - `id` (uuid, pk)
  - `user_id` (uuid, fk -> auth.users)
  - `created_at` (timestamptz)
  - `status` (text: in_progress | completed)
  - `score_version` (text)
- `personality_answers`
  - `id` (uuid, pk)
  - `test_id` (uuid, fk -> personality_tests)
  - `question_id` (text)
  - `answer` (jsonb)
  - `created_at` (timestamptz)
- `personality_profiles`
  - `id` (uuid, pk)
  - `user_id` (uuid, fk -> auth.users)
  - `summary` (text)
  - `traits` (jsonb)
  - `updated_at` (timestamptz)

## Component breakdown (file list)
- `src/features/identity/PersonalityTest.tsx` (intro/stub screen)
- `src/features/identity/PersonalityTestFlow.tsx` (multi-step quiz UI)
- `src/features/identity/PersonalityTestQuestion.tsx` (question card)
- `src/features/identity/PersonalityTestResults.tsx` (results screen)
- `src/services/personalityTest.ts` (Supabase + offline sync helpers)
- `src/data/personalityTestRepo.ts` (idb cache + queue)

## Offline queue approach
- Use `idb` (see `src/data/localDb.ts`) to store in-progress answers.
- Queue writes in an `offline` table with temp IDs, similar to `src/data/goalsRepo.ts`.
- On reconnect/service-worker sync, push queued answers to Supabase and reconcile IDs.

## Step-by-step checklist
1. **Step 1**: Replace ID tab placeholder with a Personality Test intro stub (title, explanation, Start button).
2. Step 2: Add question data model + local state for a single question flow (no Supabase yet).
3. Step 3: Add offline cache and queue using `idb`.
4. Step 4: Add Supabase tables + service layer for sync.
5. Step 5: Add results summary and personalization hooks.

## Testing checklist
- Manual: open ID tab on desktop and mobile widths.
- Manual: verify Start button focus styles and keyboard navigation.
- Manual: ensure no changes to other tabs.

## Done
- Step 1: Personality Test intro stub wired to ID tab.

## Next
- Step 2: Add single-question flow state and minimal question component.

## Blockers
- None.

## Notes from repo scan
- Navigation tabs and ID placeholder live in `src/App.tsx`.
- Supabase access flows through `src/lib/supabaseClient.ts` and `src/features/auth/SupabaseAuthProvider.tsx`.
- Offline and local cache patterns exist in `src/data/localDb.ts` and `src/data/goalsRepo.ts`.
- PWA/service worker setup is in `public/sw.js` and `src/registerServiceWorker.ts`.
- Feature modules are grouped under `src/features/*` with barrel exports.
