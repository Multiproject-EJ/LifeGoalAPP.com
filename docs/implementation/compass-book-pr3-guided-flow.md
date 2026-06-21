# Compass Book — PR 3 (Chapter 1 Fixed-Guided Flow) Report

_Date: 2026-06-21_
_Branch: `claude/gallant-volta-qrzkdh`_

## PASS / PARTIAL / FAIL

**PASS — safe to merge.** Adds the interactive answering flow for Chapter 1 with persistence
(Supabase + local resume). No Island Run / economy / Quest Pulse / goals / habits / AI changes.

## Summary

Players can now actually answer Chapter 1. This PR adds an activity renderer (all block types used
by Chapter 1), a guided stepper with save/resume and previous/next, persistence via a new
`useCompassBook` hook (canonical Supabase tables + a localStorage mirror for instant resume and
demo mode), and threads real progress through the book shell so cards/detail reflect saved work.

## Product behaviour

- From a chapter, **Begin chapter** / **Continue · n/20** opens the guided flow; tapping any
  available fragment opens the flow at that fragment.
- Each fragment renders its inputs: single/multi choice, emotion choice, 0–10 scales, short text /
  reflection, and a confirm control. Required blocks gate **Save & continue**.
- Answers persist immediately; **resume** works across reloads (local cache) and syncs to Supabase
  when signed in. Re-opening a fragment shows previous answers for **direct review/edit**.
- Chapter cards and the cover now show real completion (e.g. "3/20", stage dots, "In progress").
- Returning users: only fragments up to the current island are in the flow; later islands unlock
  more fragments automatically.

**Deferred to PR 4 (intentional):** the chapter does not yet *seal*. Completing all 20 activities
leaves the chapter "in progress" because `confirmedOutput` is produced by the Living Wheel projector
in PR 4. The activity-20 `review` block shows a placeholder until then.

## Data authority

- Compass answers are written only to `compass_chapter_states` (canonical) plus a localStorage
  mirror (`compass_book_v1:*`) for resume/demo. `completedActivityIds` is recomputed from answers
  via the shared `isActivityComplete`.
- Reads only `currentIslandNumber` for unlock; no Island Run writes.
- No goals/habits/legacy-Compass interaction. No AI.

## Changed files

**New**
- `src/features/compass-book/hooks/useCompassBook.ts`
- `src/features/compass-book/services/compassBookLocalStore.ts`
- `src/features/compass-book/components/CompassActivityRenderer.tsx`
- `src/features/compass-book/components/CompassGuidedFlow.tsx`
- `docs/implementation/compass-book-pr3-guided-flow.md`

**Edited**
- `src/features/compass-book/components/CompassBookScreen.tsx` — owns the hook; adds the `flow` view
- `src/features/compass-book/components/CompassBookContents.tsx` — takes `getProgress`; exports `CompassGetProgress`
- `src/features/compass-book/components/CompassBookCover.tsx` — uses `getProgress` (adds "sealed" count)
- `src/features/compass-book/components/CompassChapterScreen.tsx` — Begin/Continue + tappable fragments → flow
- `src/features/compass-book/components/compassBook.css` — flow/renderer styles; activity rows are buttons
- `src/features/compass-book/logic/progress.ts` — extracts `isAnswerValuePresent` + `areRequiredBlocksAnswered` (shared by flow and tests)
- `src/features/compass-book/__tests__/compassBook.test.ts` — guided-flow validation + save/resume parity tests
- `src/App.tsx` — passes `session` to `CompassBookScreen`

## Schema

None. Reuses `compass_chapter_states` from PR 1 (migration 0256).

## Validation

- **Tests:** `npm run test:compass-book` — all assertions pass, including new coverage:
  required-block gating for single-choice, 8-scale, and multi-block (choice + text) activities;
  value-presence edges (whitespace text, scale 0); and save→recompute-completion parity.
- **Typecheck/build/lint:** not runnable here (`node_modules` absent). Components target the repo's
  `react-jsx` + `Bundler` config; discriminated-union narrowing was written explicitly to satisfy
  `strict`. The only existing-code edit is one added prop on the `CompassBookScreen` render in `App.tsx`.

## Hard-constraint confirmation

No changes to Island Run progression, economy, Quest Pulse, goals, habits, AI, legacy Compass, or
feature availability. No automatic goal/habit creation. AI not involved. Skipped/optional fragments
never block progression; Island Run is never read for anything but the island number, never written.

## Blockers and deferred work

- **PR 4:** Living Wheel projector (answers → proposed Engine/Brake/Fragile Spoke/Lever), the
  evolving one-page graphic, the activity-20 review surface, and chapter sealing (`confirmedOutput`).
- **PR 5:** in-game Compass button → compact current-chapter panel.
- Concept-art images still absent from the repo.
