# Compass Book — PR 17 (In-game Wisdom/Habit stop wiring) Report

_Date: 2026-06-22_
_Branch: `claude/gallant-volta-qrzkdh`_

## PASS / PARTIAL / FAIL

**PASS — safe to merge.** Mounts the compact Compass fragment at the Island Run **Wisdom** stop
(Wisdom slice) and **Habit** stop (overflow slice). Answering is **optional** — it never gates stop
completion. Writes only to `compass_chapter_states` (+ local mirror); reads `islandNumber` only.
`npm run test:compass-book`, `tsc -b`, and full `npm run build` all green.

## Decision implemented

Per the product call: **optional / skippable**. The fragment appears at the stop and can be answered
there, but the host stop completes through its own existing flow regardless. No Island Run pacing
change — completing a stop never requires a Compass answer.

## What changed

- **New `components/CompassStopFragmentMount.tsx`** — a self-contained mount that owns its persistence
  via `useCompassBook(session)`: it resolves the island's fragment, seeds saved values from
  `compass_chapter_states`, renders `CompassStopFragment`, and persists on save through
  `saveActivityAnswers`. This keeps **all** Compass logic inside the compass-book feature, so the board
  change is a two-line drop-in per stop.
- **`IslandRunBoardPrototype.tsx`** — renders `<CompassStopFragmentMount slot="wisdom" />` alongside
  the Wisdom Tree card, and `<CompassStopFragmentMount slot="habit_overflow" />` alongside the Habit
  intake card. Both are siblings of the existing card — they do **not** touch `onComplete` /
  `handleCompleteActiveStop`, the legacy `recordCompassContribution` (Wisdom→`compass_state`) call, or
  any reward/progression logic.
- **`CompassStopFragment.tsx`** — adds lightweight "✓ Saved to your Compass Book" feedback and an
  Update affordance after a save.

## Safety / data authority

- **Optional by construction:** the mount is a sibling panel; the stop's completion path is untouched.
  If the player ignores it and completes the stop, nothing about the run changes.
- **Feature isolation preserved:** the board imports one component and passes `session` + `islandNumber`
  + `slot`. No Compass persistence logic leaks into the board.
- **Legacy Compass untouched:** the Wisdom stop still feeds `compass_state` exactly as before; the new
  `compass_chapter_states` write happens alongside it.
- **Defensive:** `useCompassBook` is best-effort with a local mirror; the picker/AI degrade silently.
  An island with no overflow inputs renders nothing at the Habit stop.

## How the slices map in-game

For an island, the **Wisdom** stop shows the first ≤2 answerable inputs and the **Habit** stop shows
the rest (`splitIslandInputs`). Islands whose stop plan lacks one of those stops simply expose those
inputs only in the Player-Menu book — the full book remains the complete surface.

## Changed files

- New: `components/CompassStopFragmentMount.tsx`.
- Edited: `components/CompassStopFragment.tsx` (saved feedback), `components/compassBook.css`,
  `features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx` (import + two mounts).

## Verification

- `npm run test:compass-book` — all pass (fragment-model coverage from PR 16 still green).
- `tsc -b` clean; `npm run build` success.
- Note: the board is a large prototype that can't be exercised headlessly here; the integration is two
  additive sibling renders with no change to existing stop/reward/progression logic.

## Status

This completes the in-game answering arc. Remaining items are out of scope and tracked separately:
the Today-tab struggling-habit coach, and deploying the `compass-help` edge function for live AI.
