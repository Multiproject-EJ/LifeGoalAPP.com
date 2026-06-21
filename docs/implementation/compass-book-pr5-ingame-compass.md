# Compass Book — PR 5 (In-game Compass Integration) Report

_Date: 2026-06-21_
_Branch: `claude/gallant-volta-qrzkdh`_

## PASS / PARTIAL / FAIL

**PASS — safe to merge.** Repurposes the Island Run compass button to open the new compact
current-chapter panel. Verified with `tsc -b` and a full `npm run build` (both green). Island Run
state is never read for anything but the island number, and never written.

## Summary

The compass button on the Island Run board now opens a compact Compass Book window for the current
chapter instead of the legacy 11-phase modal: the evolving chapter graphic, completion, five-stage
progress, a latest-insight line, the next fragment, and doors into the full book (Continue → the
fragment; Open full book → contents). The same `CompassChapterGraphic` powers this and the full book.

## Product behaviour

- Tap the board's compass button → a compact panel showing:
  - current chapter title + number
  - the evolving Living Wheel (`mode="compact"`)
  - "n / 20 fragments" + five-stage dots
  - a latest-insight line (e.g. "Season: Steady tending")
  - the next unlocked unfinished fragment (title + island)
  - **Continue** (opens the full book deep-linked into that fragment's guided flow)
  - **Open full book** (opens the full book at contents)
- Crossing island 20 → 21 switches the panel from Chapter 1 to Chapter 2 automatically.
- The legacy 11-phase Compass modal is no longer opened from this button; its code and the
  `compass_state` feeding (Wisdom/Habit stops) remain untouched.

## Data authority

- Panel reads Island position (`islandNumber`) only; **no Island Run writes**. It mounts only while
  open, so it never affects board performance when closed.
- Compass answers/progress come from `useCompassBook` (canonical `compass_chapter_states` + local
  mirror). Legacy `compass_state` is untouched and still fed by the board's stop logic.

## Changed files

**New**
- `src/features/compass-book/components/CompactGameCompassPanel.tsx`
- `docs/implementation/compass-book-pr5-ingame-compass.md`

**Edited**
- `src/features/compass-book/components/CompassBookScreen.tsx` — optional `initialChapterId` /
  `initialActivityId` deep-link props
- `src/features/compass-book/components/compassBook.css` — compact in-game panel styles
- `src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx` — the compass
  button now renders `CompactGameCompassPanel` instead of `CompassModal` (import swapped; the
  `showHatcheryCompassModal` seam, `compass_state` feeding, and all other board logic unchanged)

`CompassModal.tsx` remains in the tree as legacy code (now orphaned, intentionally not deleted).

## Schema

None.

## Validation

- **Tests:** `npm run test:compass-book` — all pass (no logic changes; regression check).
- **Typecheck:** `tsc -b` → clean. **Build:** `npm run build` → success (15.6s).

## Hard-constraint confirmation

No changes to Island Run progression, economy, Quest Pulse, goals, habits, AI, the legacy Compass
(`compass_state` / `compassCurriculum` / `CompassModal.tsx` all intact), or feature availability.
The in-game Compass never mutates Island Run state; the panel mounts only when opened (no board-state
mutation, no scroll-lock changes to the board). Quest Pulse remains reachable from My Quest.

## Blockers and deferred work

- **PR 6+:** author chapters 2–6 (content + projectors + graphics). The panel and full book already
  render reserved chapters gracefully (placeholder graphic, "coming soon").
- Concept-art images still absent from the repo.
- Optional: rename the internal `showHatcheryCompassModal` seam to a Compass-Book-specific name
  (left as-is to keep this PR minimal, consistent with retained legacy internal names).
