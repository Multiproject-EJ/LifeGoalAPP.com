# Compass Book — PR 16 (Island fragment model + stop fragment) Report

_Date: 2026-06-22_
_Branch: `claude/gallant-volta-qrzkdh`_

## PASS / PARTIAL / FAIL

**PASS — safe to merge.** Pure fragment logic + a compact, self-contained `CompassStopFragment`
renderer for answering one Compass fragment in-game. **Not yet wired to the board** — that is the next
(gameplay-touching) PR. `npm run test:compass-book`, `tsc -b`, and full `npm run build` all green. No
Island Run / economy / Quest Pulse / curriculum-shape changes.

## What's here

### 1. Pure fragment model — `logic/islandFragment.ts`
- `splitIslandInputs(activity)` — keeps only the *answerable* inputs (`single_choice`, `multi_choice`,
  `scale`, `emotion_choice`, `short_text`, `reflection`, `sentence_completion`); excludes `review` /
  `confirmation` (book-only sealing). Splits them into a **Wisdom slice** (first ≤2 =
  `WISDOM_STOP_MAX_INPUTS`) and a **Habit-overflow slice** (the rest) so no single stop gets heavy.
- `getIslandFragment(islandNumber)` — the fragment for an island (or `null` if no authored activity).
- `isFragmentSlotComplete(fragment, slot, values)` — a stop slice's required inputs are answered.
- `isIslandFragmentComplete(islandNumber, values)` — the gating predicate for "this stop's Compass
  fragment is done". An island with no required inputs (or no fragment) is trivially complete, so it
  can never deadlock a stop.

### 2. Compact renderer — `components/CompassStopFragment.tsx`
- Renders a single slice's blocks using the **same** `CompassActivityRenderer`, goals/habits picker,
  and AI helper as the Player-Menu book — so in-game and in-book answering are identical.
- Loads the player's goals/habits (offline-first, defensive), gates **Save** on
  `isFragmentSlotComplete`, and calls back `onSave(activityId, entries)` for the caller to persist.
- Renders nothing when a slice has no answerable inputs (e.g. a seal island's empty overflow).
- **Standalone — not mounted anywhere yet.**

### 3. Shared slot builders — `components/compassBlockSlots.tsx`
- Extracted `makePickSlot` / `makeHelpSlot` (the picker + AI wiring) so the guided flow and the stop
  fragment stay consistent. `CompassGuidedFlow` now uses them (behaviour unchanged; less duplication).

## Design notes

- A seal island (e.g. `living_wheel.a20`) exposes only its finale statement as an input; `review` and
  `confirmation` are excluded, so **sealing stays a deliberate Player-Menu act** — the stop only
  captures answers.
- The split is deterministic and content-driven; no per-island configuration.

## Changed files

- New: `logic/islandFragment.ts`, `components/CompassStopFragment.tsx`,
  `components/compassBlockSlots.tsx`.
- Edited: `components/CompassGuidedFlow.tsx` (use the shared slot builders), `compassBook.css`
  (`.compass-stop*`), tests.

## Next (gameplay-touching, separate PR)

Mount `CompassStopFragment` in the Island Run Wisdom stop (Habit overflow when present); gate stop
completion on `isIslandFragmentComplete`; write answers to `compass_chapter_states` (reads
`islandNumber` only). **Open decision to confirm first:** whether answering should be *required* to
complete the stop, or optional/skippable — it changes Island Run pacing.

## Verification

- `npm run test:compass-book` — all pass, incl. new `testIslandFragment` (split + cap, Wisdom/overflow
  membership, slice/island completeness, optional inputs don't gate, seal-island input filtering,
  out-of-range → no fragment → trivially complete).
- `tsc -b` clean; `npm run build` success.
