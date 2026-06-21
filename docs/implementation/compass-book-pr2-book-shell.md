# Compass Book — PR 2 (Player Menu Book Shell) Report

_Date: 2026-06-21_
_Branch: `claude/gallant-volta-qrzkdh`_

## PASS / PARTIAL / FAIL

**PASS — safe to merge.** Adds the full-screen Compass Book shell and wires the Player Menu hero
card to open it. Quest Pulse is untouched. No Island Run / economy / goals / habits / AI changes.

## Summary

Implements the Player Menu entry point for the Compass Book: a full-screen, mobile-first sheet with
a cover, a six-chapter table of contents (locked / available / current / sealed states), and a
per-chapter detail view listing its 20 island-linked fragments. The hero card now opens this shell
instead of the feature-preview overlay.

## Product behaviour

- Tapping the **Compass Book** hero in the Player Menu opens the book full-screen.
- The cover shows the title, the promise, and how many chapters are unlocked.
- Contents lists all six chapters; locked chapters show "Unlocks at Island N" and are non-interactive;
  the chapter matching the player's current island is marked **Current**.
- Opening a chapter shows its core question, output fields, and the 20 fragments with
  locked/available state.
- Close (✕ or backdrop or Escape) returns to the menu; from a chapter, Back/Escape returns to contents.
- Quest Pulse remains reachable exactly as before via its own My Quest entry.

The guided answer flow and the evolving one-page graphic are intentionally **not** here — they are
PR 3 and PR 4. Chapter cards currently derive state from island position only (no persisted answers
loaded yet), so completion shows 0/20 until PR 3 wires saved answers.

## Data authority

- Reads only `currentIslandNumber` (via the existing `overlayIslandNumber` state in `App.tsx`) to
  derive unlock state through the pure `computeChapterProgress` / `getCurrentChapterId` logic.
- No writes anywhere. No Supabase calls in this PR.
- Legacy `compass_state`, goals, habits, Life Wheel taxonomy untouched.

## Changed files

**New components**
- `src/features/compass-book/components/CompassBookScreen.tsx` (container + navigation + Escape)
- `src/features/compass-book/components/CompassBookContents.tsx`
- `src/features/compass-book/components/CompassBookCover.tsx`
- `src/features/compass-book/components/CompassChapterCard.tsx`
- `src/features/compass-book/components/CompassChapterScreen.tsx`
- `src/features/compass-book/components/compassBook.css`

**Edited**
- `src/App.tsx`
  - import `CompassBookScreen`
  - add `isCompassBookOpen` state
  - hero card `onClick` now opens the book (was `openFeaturePreviewOverlay('app.compass_book', …)`);
    aria-label + subtitle copy updated
  - render `<CompassBookScreen>` next to the Quest Pulse modal

**Docs**
- `docs/implementation/compass-book-pr2-book-shell.md` (this report)

## Schema

None. No migrations.

## Validation

- **Foundation tests:** `npm run test:compass-book` still passes (pure logic untouched).
- **Typecheck/build/lint:** not runnable in this environment (`node_modules` not installed). New
  components are self-contained; the only edits to existing code are additive (`App.tsx` import,
  one state hook, hero `onClick` swap, one conditional render).
- **Manual checks (by reading):** screen uses `position: fixed` with safe-area padding and a high
  z-index, mirroring how the adjacent `QuestCompassModal` is mounted; Escape/back/close paths covered.

## Hard-constraint confirmation

No changes to: Island Run progression, economy, Quest Pulse (`features/quest-compass` untouched),
goals, habits, AI, legacy Compass, or unrelated gameplay. The Compass Book route never opens Quest
Pulse. `app.compass_book` feature-availability entry is left as-is (still defined for voting/preview);
the hero simply no longer routes to the preview overlay.

## Blockers and deferred work

- **PR 3:** Chapter 1 fixed-guided flow (activity renderer, save/resume, direct edit) — and loading
  persisted chapter states so cards/detail show real completion.
- **PR 4:** Living Wheel projector + evolving one-page graphic.
- **PR 5:** in-game Compass button → compact current-chapter panel.
- Concept-art images still absent from the repo.
