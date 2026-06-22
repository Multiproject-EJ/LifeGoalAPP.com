# Compass Book — PR 14 (Pick from your real goals/habits) Report

_Date: 2026-06-22_
_Branch: `claude/gallant-volta-qrzkdh`_

## PASS / PARTIAL / FAIL

**PASS — safe to merge.** Turns the heaviest "name your goal / name your habit" prompts in Chapters 5
and 6 into a one-tap chip pick from the player's **real** goals/habits, while keeping them text blocks
so projectors and the goal/habit bridges are untouched. `npm run test:compass-book` green, `tsc -b`
clean, full `npm run build` green (12.3s). Read-only on goals/habits — never creates/updates/deletes.

## Why

Chapters 5 (Quest Forge) and 6 (Personal Playbook) were writing-heavy precisely because they ask for
the player's actual goals and habits. Per the agreed direction, those come from the app's own data:
the player taps one of their real goals/habits instead of retyping it.

## Product behaviour

- On the goal/habit "name it" fragments, a compact chip row appears above the text box:
  _"Tap one of your goals, or type your own:"_ — tapping a chip fills the answer with that goal/habit's
  title. The player can still edit or type freely.
- When the player has no goals/habits (or data fails to load), **no chips render** and the fragment is
  a normal text box — zero regression.

### Where it's wired
- **Chapter 5:** `quest_a`, `quest_b`, `quest_c` → `pickFrom: 'player_goals'`.
- **Chapter 6:** `sustained_effort`, `abandoned_effort`, `the_habit` → `pickFrom: 'player_habits'`.

## Design / safety

- **No answer-shape change.** The picker only fills the existing `{ kind: 'text' }` answer with the
  chosen title. `questForgeProjector` / `personalPlaybookProjector` and the PR 9/10 goal & habit
  bridges keep working unchanged.
- **Declarative + additive.** A new optional `pickFrom?: CompassPickSource` on `CompassBlockDefinition`
  (`'player_goals' | 'player_habits'`). Absent ⇒ plain text. No curriculum-shape change.
- **Read-only, offline-first, defensive.** `loadCompassPlayerData(userId)` reads via the canonical
  offline-first repos (`loadGoalsOfflineFirst`, `listLocalHabitsV2ForUser`); every read is wrapped so
  any failure degrades to an empty list. Deleted goals and archive-pending habits are filtered; labels
  are trimmed, de-duplicated by id, and capped at `MAX_PICK_OPTIONS` (12).
- **Pure core.** Normalization/selection live in `logic/playerOptions.ts` (no I/O, no React) and are
  unit-tested; the I/O wrapper and the `CompassPlayerPicker` chip component are thin.

## Changed files

- New: `logic/playerOptions.ts` (pure), `services/compassPlayerData.ts` (read-only loader),
  `components/CompassPlayerPicker.tsx`.
- Edited: `types.ts` (`CompassPickSource` + optional `pickFrom`), `CompassActivityRenderer.tsx`
  (`renderPick` slot above the input), `CompassGuidedFlow.tsx` (load player data + supply the picker),
  `CompassBookScreen.tsx` (pass `userId`), `content/chapter5QuestForge.ts`,
  `content/chapter6PersonalPlaybook.ts`, `compassBook.css`, tests.

## Follow-up (not in this PR)

Today, tapping a chip stores the title (the canonical id is loaded but not yet threaded into the
answer). A later pass can let the goal/habit bridge **reference/update the selected existing entity**
instead of proposing a new one, avoiding a possible duplicate when a player commits to a goal/habit
they already have. That touches the bridge contract, so it is intentionally deferred.

## Verification

- `npm run test:compass-book` — all assertions passed (new `testPlayerOptionPickers`: normalization,
  de-dupe, cap, source/noun selection, empty-data fallback, and content wiring assertions).
- `tsc -b` clean; `npm run build` success.
