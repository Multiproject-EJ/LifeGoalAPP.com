# Island Run Guardrails & Conflict Matrix (2026-04-24)

## Short answer
Yes — the guardrail approach is correct.

A cleanup removes current drift, but without permanent guardrails, future edits (especially partial-context AI edits) can reintroduce split-authority bugs.

This document lists the concrete conflict surfaces in the current repo and the guardrails to prevent regression.

---

## Why guardrails are necessary (current repo evidence)

- Production still routes through `IslandRunBoardPrototype` from `LevelWorldsHub`.
- The board currently mixes canonical store state (`useIslandRunState`) with legacy `runtimeState` + direct patch writes.
- Non-board UI surfaces still directly read/write runtime state (`ScoreTab`, `UnifiedTodayView`).
- Runtime compatibility APIs remain active by design (`islandRunRuntimeState.ts`).

This means the codebase is still vulnerable to “new code picks wrong path” mistakes.

---

## Conflict matrix: files to account for

## A) Critical split-authority files

1. `src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx`
   - Mixed authority and many direct compatibility writes.
   - Highest risk for reintroducing drift.

2. `src/features/gamification/ScoreTab.tsx`
   - Direct runtime-state patch usage in UI flow (shield conversion).

3. `src/features/habits/UnifiedTodayView.tsx`
   - Direct runtime-state patch usage in habit reward flow.

## B) Medium-risk coupling files

4. `src/features/habits/DailyHabitTracker.tsx`
   - Runtime read coupling from non-board surface.

5. `src/features/gamification/level-worlds/services/islandRunRuntimeState.ts`
   - Compatibility bridge (necessary for migration, dangerous if used as default for new gameplay writes).

6. `src/features/gamification/level-worlds/services/islandRunTileRewardAction.ts`
   - Service-level controlled path still uses patch API internals.

## C) Canonical target files (should be preferred)

7. `src/features/gamification/level-worlds/hooks/useIslandRunState.ts`
8. `src/features/gamification/level-worlds/services/islandRunStateStore.ts`
9. `src/features/gamification/level-worlds/services/islandRunStateActions.ts`
10. `src/features/gamification/level-worlds/services/islandRunRollAction.ts`

## D) Retired/trap-prone semantics

11. `src/features/gamification/level-worlds/services/islandRunTimerProgression.ts`
   - Explicitly retired no-op compatibility API.

12. `src/features/gamification/level-worlds/services/islandBoardLayout.ts`
   - `STOP_TILE_INDICES_40` remains exported despite stop-decoupled contract comments.

---

## Recommended 4-layer guardrail system

## Layer 1: Architecture contract doc (must-have)

Add and enforce a canonical contract file:

- `docs/gameplay/ISLAND_RUN_ARCHITECTURE_CONTRACT.md`

Minimum content:
- canonical read path (`useIslandRunState`),
- canonical write path (`islandRunStateActions` + roll/tile actions),
- explicit forbidden patterns,
- migration exception policy (if any).

## Layer 2: File-level warnings in high-risk files

Add loud top-of-file warnings to:

- `IslandRunBoardPrototype.tsx`
- `ScoreTab.tsx`
- `UnifiedTodayView.tsx`
- `islandRunRuntimeState.ts`

Purpose: help partial-context AI edits choose the right path.

## Layer 3: CI guard script for forbidden imports/usages

Add a script (example: `scripts/check-island-run-architecture-guards.mjs`) that fails CI when:

- UI/features/components import `persistIslandRunRuntimeStatePatch` for gameplay writes,
- new `runtimeState` gameplay mirrors are introduced where forbidden,
- forbidden direct gameplay writes are added outside approved service files.

Initial policy can be “warn-only” for migration exceptions, then upgraded to “fail-hard” once Phase 2 is complete.

## Layer 4: Agent-facing rules (AGENTS.md + README section)

Add explicit AI-editing instructions that must be read before Island Run modifications.

Include:
- required docs to read first,
- forbidden patterns,
- required mutation path,
- required tests for gameplay changes.

---

## Do you have many conflicting files?

Yes — but they are concentrated, not everywhere.

Practical interpretation:
- **Very high conflict concentration** in 3 files: `IslandRunBoardPrototype`, `ScoreTab`, `UnifiedTodayView`.
- **Moderate background conflict** in a few bridge/coupling files.
- Canonical architecture files already exist and are usable.

So this is very fixable if migration and guardrails are done in order.

---

## Sequencing recommendation

1. Add guardrails (docs + warnings + CI check) first.
2. Migrate external direct writers (`ScoreTab`, `UnifiedTodayView`) to canonical actions.
3. Continue board read/write unification in safe slices.
4. Tighten CI from warn → fail.
5. Rename prototype surfaces only after split-authority is gone.

