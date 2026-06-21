# Compass Book — PR 10 (Chapter 6: The Personal Playbook + Habit Bridge) Report

_Date: 2026-06-21_
_Branch: `claude/gallant-volta-qrzkdh`_

## PASS / PARTIAL / FAIL

**PASS — safe to merge.** Authors Chapter 6 and adds the reviewable **habit** proposal bridge,
completing all six chapters. Creation is canonical and explicit-only. Verified with `tsc -b` and a
full `npm run build` (both green). No Island Run / economy / Quest Pulse / goals / AI changes.

## Summary

Chapter 6 (The Personal Playbook, islands 101–120) builds the player's seven sustain systems (Start
Engine, Momentum Loop, Minimum Mode, Warning Lights, Environment Rules, Recovery Route, Weekly
Compass Check) plus a concrete habit design. It then offers a **habit proposal**: a reviewable card
that, only on an explicit "Create this habit" tap, creates one canonical habit via
`services/habitsV2.ts` (`createHabitV2`). **This is the last chapter — the curriculum is complete.**

## Product behaviour

- Islands 101–120 unlock the playbook fragments; the graphic is a control panel whose seven system
  lights fill in as you answer, with your operating principle at the end.
- After the panel, a **habit proposal** card shows the designed habit (normal / small / minimum
  versions, cue, environment rule, completion evidence, recovery rule). The player can **Create this
  habit** (explicit) or **Not now**. A gentle tip recommends ~3 supporting habits (not enforced).
- Creating uses the canonical habit service; the habit lands in the player's habits as a daily
  boolean habit, with cue/minimum-mode/recovery/provenance folded into `habit_intent` and the
  environment rule in `habit_environment`, and `domain_key` set to the protected life area.

## Data authority

- **Habits are canonical**: creation only via `createHabitV2` (`services/habitsV2.ts`), only on
  explicit click. No parallel habit storage.
- The proposal builder (`logic/habitBridge.ts`) is **pure** — proposes only, never writes.
- Protected-area mapping uses the canonical Life Wheel key (shared `LIFE_AREA_OPTIONS`).

## Changed files

**New**
- `src/features/compass-book/logic/projectors/personalPlaybookProjector.ts`
- `src/features/compass-book/logic/habitBridge.ts` (pure proposal builder + intent description)
- `src/features/compass-book/components/chapter-graphics/PersonalPlaybookGraphic.tsx`
- `src/features/compass-book/components/CompassHabitBridge.tsx` (review + explicit create)
- `docs/implementation/compass-book-pr10-personal-playbook.md`

**Edited**
- `src/features/compass-book/content/chapter6PersonalPlaybook.ts` — full content + option pools + `PLAYBOOK_LABELS`
- `src/features/compass-book/logic/projectors/index.ts` — registers the projector
- `src/features/compass-book/components/chapter-graphics/CompassChapterGraphic.tsx` — dispatch
- `src/features/compass-book/components/CompassChapterScreen.tsx` — shows graphic + habit bridge
- `src/features/compass-book/__tests__/compassBook.test.ts` + `tsconfig.compass-book-tests.json` — tests

## Schema

None. Habits use the existing `habits_v2` table via the canonical service.

## Validation

- **Tests:** `npm run test:compass-book` — all pass, incl. Chapter 6 authored check (islands
  101–120), projector mapping, the **pure habit proposal builder** (cue/env-rule composition,
  minimum mode + provenance in intent, canonical protected-area key, null when no habit named), and
  a new assertion that **all six chapters now have a registered projector**.
- **Typecheck:** `tsc -b` clean. **Build:** `npm run build` success (10.3s).

## Hard-constraint confirmation

No automatic habit creation — creation requires an explicit tap through canonical `createHabitV2`.
The ~3-supporting-habits rule is a non-enforced recommendation. No changes to Island Run, economy,
Quest Pulse, goals, AI, legacy Compass, or feature availability. No duplicate habit storage. "Not
now" leaves canonical state unchanged. Deterministic/AI-free; no user text baked into the graphic.

## Milestone

**All six Compass Book chapters are now authored and playable** end-to-end across both entry points
(Player Menu + in-game panel), each with content, a deterministic projector, an app-rendered graphic,
sealing, and — for Chapters 5 & 6 — reviewable canonical goal/habit bridges.

## Blockers and deferred work

- **PR 11:** optional AI "Help me think" (per-question, narrow endpoint, player-confirmed).
- **PR 12:** Quest Leaps (uses the PR 8 proposal seam).
- Concept-art images still absent from the repo.
