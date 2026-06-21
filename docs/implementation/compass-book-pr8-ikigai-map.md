# Compass Book — PR 8 (Chapter 4: The Ikigai Map + Quest Leap seam) Report

_Date: 2026-06-21_
_Branch: `claude/gallant-volta-qrzkdh`_

## PASS / PARTIAL / FAIL

**PASS — safe to merge.** Authors Chapter 4 end-to-end (content + projector + constellation graphic)
and adds the Quest Leap proposal **type + pure builder** (architecture only — nothing persisted or
wired). Verified with `tsc -b` and a full `npm run build` (both green). No Island Run / economy /
Quest Pulse / goals / habits / AI changes.

## Summary

Chapter 4 (The Ikigai Map, islands 61–80) is now playable. It maps five forces (Curiosity,
Capability, Contribution, Viability, Willingness) into a constellation, derives a Spark/Gift/Need, a
deterministic **Mirage warning** when the player wants the outcome more than the daily work, lets the
player name three candidate paths and pick one for a Trial, and seals an Ikigai statement.

Per the brief, this PR also adds the **Quest Leap proposal seam**: a `QuestLeapProposal` type and a
pure `buildQuestLeapProposalFromIkigai` builder. It is not persisted, not surfaced as an automatic
write, and not wired to any UI — it just leaves room for the future Quest Leaps system (PR 12).

## Product behaviour

- Islands 61–80 unlock the fragments: follow the Spark (61–64), find the Gift (65–68), find the Need
  (69–72), test viability (73–75) + willingness (76–77), generate three paths (78), choose the Trial
  (79), illuminate the constellation (80).
- The graphic is a **five-point constellation** with lit force nodes, a glowing central Trial,
  Spark/Gift/Need/Trial chips, and a **Mirage warning** banner when willingness is low.
- Confirming activity 80 seals the chapter (constellation snapshot → `confirmed_output`).

## Data authority

- Projector + Quest Leap builder are pure and AI-free; read only answers; propose only.
- Sealing writes only `compass_chapter_states.confirmed_output`. No goals/habits/Island Run/legacy
  Compass interaction. **No Quest Leap is created or stored** — only a proposal shape exists.

## Changed files

**New**
- `src/features/compass-book/logic/projectors/ikigaiMapProjector.ts`
- `src/features/compass-book/logic/questLeap.ts` (type + pure builder; architecture seam)
- `src/features/compass-book/components/chapter-graphics/IkigaiMapGraphic.tsx`
- `docs/implementation/compass-book-pr8-ikigai-map.md`

**Edited**
- `src/features/compass-book/content/chapter4IkigaiMap.ts` — full content + `IKIGAI_LABELS`
- `src/features/compass-book/logic/projectors/index.ts` — registers the projector
- `src/features/compass-book/components/chapter-graphics/CompassChapterGraphic.tsx` — dispatch
- `src/features/compass-book/components/CompassChapterScreen.tsx` — graphic shown for Chapter 4
- `src/features/compass-book/components/compassBook.css` — constellation + warning styles
- `src/features/compass-book/__tests__/compassBook.test.ts` + `tsconfig.compass-book-tests.json` — tests

## Schema

None.

## Validation

- **Tests:** `npm run test:compass-book` — all pass, incl. Chapter 4 authored check (islands 61–80),
  Spark/Gift/Need mapping, trial-path resolution, **Mirage warning on/off**, and the **Quest Leap
  builder** (proposal from a chosen trial; null when no trial; carries evidence questions).
- **Typecheck:** `tsc -b` clean. **Build:** `npm run build` success (9.8s).

## Hard-constraint confirmation

No changes to Island Run, economy, Quest Pulse, goals, habits, AI, legacy Compass, or feature
availability. Deterministic, AI-free; outputs are proposals (incl. the explicitly non-binding Quest
Leap proposal); no user text baked into the graphic; Quest Leaps are not built, only seamed.

## Blockers and deferred work

- **PR 9:** Chapter 5 (The Quest Forge) + the reviewable **goal** proposal bridge.
- **PR 10:** Chapter 6 (The Personal Playbook) + the reviewable **habit** bridge.
- **PR 12:** the full Quest Leaps system (using this proposal seam).
- Concept-art images still absent from the repo.
