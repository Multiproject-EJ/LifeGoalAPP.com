# Compass Book — PR 15 (Bridge reuse: update existing goal/habit) Report

_Date: 2026-06-22_
_Branch: `claude/gallant-volta-qrzkdh`_

## PASS / PARTIAL / FAIL

**PASS — safe to merge.** Closes the duplicate gap from PR 14: when the Primary Quest / designed habit
was **picked from an existing goal/habit**, the bridge now offers **"Update this goal/habit"** and
enriches the existing entity in place instead of creating a duplicate. Still explicit-tap; typing your
own text falls back to create-new. `npm run test:compass-book`, `tsc -b`, and full `npm run build` all
green.

## Decision implemented

Per the product call: **update the existing entity** (enrich with the Compass-designed fields +
provenance), rather than link-only or always-create.

## How it works (the reference flows end-to-end)

1. **Pick carries an id.** The goals/habits picker now fills the text answer with an optional
   `sourceRef: { kind: 'goal' | 'habit'; id }`. Typing in the box writes a plain `{ kind: 'text' }`
   with no ref, so an edited answer is correctly treated as custom/new. `sourceRef` round-trips through
   the existing JSONB answer blob — no serialization change.
2. **Projectors surface the id.** `questForgeProjector` adds `primaryQuestSourceGoalId` (resolved
   through `primary_candidate` → the chosen quest slot's `sourceRef`, goal-kind only).
   `personalPlaybookProjector` adds `habitSourceId` (from `the_habit`, habit-kind only).
3. **Bridges carry it.** `CompassGoalProposal.existingGoalId` / `CompassHabitProposal.existingHabitId`.
4. **UI updates in place.** When set, `CompassGoalBridge` calls `updateGoal(id, …)` and
   `CompassHabitBridge` calls `updateHabitFullV2(id, …)` with the Compass-designed fields (goal:
   description+provenance, why, review date, life area; habit: `habit_intent`, `habit_environment`).
   Header / button / success copy switch to "Update this goal/habit". Title is left untouched.

## Safety

- **Explicit-tap only**, exactly like create. Nothing writes until the player approves; "Not now"
  leaves canonical state unchanged.
- **Kind-checked:** a goal slot only accepts a `goal` sourceRef and the habit only a `habit` sourceRef
  (covered by tests), so a mismatched ref can never target the wrong entity.
- **Additive types:** `sourceRef` and the two new output/proposal fields are all optional/derived;
  absent ⇒ the previous create-new behaviour, unchanged. No curriculum-shape change.

## Changed files

- `types.ts` (`CompassSourceRef` + optional `sourceRef` on text values).
- `components/CompassPlayerPicker.tsx` (emits the full option), `CompassGuidedFlow.tsx` (attaches the
  ref).
- `logic/projectors/questForgeProjector.ts`, `logic/projectors/personalPlaybookProjector.ts`
  (resolve the source ids).
- `logic/goalBridge.ts`, `logic/habitBridge.ts` (carry the existing id).
- `components/CompassGoalBridge.tsx`, `components/CompassHabitBridge.tsx` (update-vs-create path + copy).
- tests.

## Verification

- `npm run test:compass-book` — all pass, incl. new coverage: typed answer ⇒ no link ⇒ create; picked
  answer ⇒ id flows to `existingGoalId`/`existingHabitId` ⇒ update; and a mismatched-kind sourceRef is
  not read as the wrong id.
- `tsc -b` clean; `npm run build` success.
