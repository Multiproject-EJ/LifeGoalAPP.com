# Island Run Build Modal v2 investigation (Monopoly GO-style bottom tray)

## PASS/FAIL summary

- PASS: Current Island Buildings modal and open/render path mapped.
- PASS: Card data derivation and build action path traced.
- PASS: Island-clear/travel trigger flow traced.
- PASS: Safe UI-only refactor path identified for Island 1-first rollout.
- PASS: Artwork storage/fallback recommendation provided.
- PASS: Risks, file impact, and test plan documented.
- FAIL: None found that block an investigation-only PR.

## Current file map

- Entry/render chain
  - `src/App.tsx` (renders `LevelWorldsHub` overlay)
  - `src/features/gamification/level-worlds/LevelWorldsHub.tsx` (mounts `IslandRunBoardPrototype`)
  - `src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx` (owns Build modal state + render + handlers)
- Build modal presentation/style
  - `src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx` (current vertical list modal markup, `showBuildPanel`)
  - `src/features/gamification/level-worlds/LevelWorlds.css` (`.build-panel-*` and `.build-panel-modal` styles)
- Data/service dependencies used by modal
  - `src/features/gamification/level-worlds/services/islandRunStops.ts` (canonical 5 stop identities/titles)
  - `src/features/gamification/level-worlds/services/islandRunContractV2EssenceBuild.ts` (cost/build math helpers)
  - `src/features/gamification/level-worlds/services/islandRunStateActions.ts` (`applyStopBuildSpendBatch` canonical write action)
  - `src/features/gamification/level-worlds/services/islandRunFirstSessionTutorialUi.ts` (Hatchery-first tutorial row gating)
  - `src/features/gamification/level-worlds/services/islandRunContractV2StopResolver.ts` (full-clear gate logic)
- Relevant guard/source tests
  - `src/features/gamification/level-worlds/services/__tests__/islandRunBoardEssenceParity.test.ts` (source-guard assertions tied to current build-spend control flow)

## Current data/action flow

1. Open flow
   - Footer Build button in `IslandRunBoardPrototype` calls `openBuildPanelFromFooter` → `setShowBuildPanel(true)`.
   - Tutorial transitions are also applied there (`applyFirstSessionTutorialState` targets).

2. Card identity + display data (per row in `islandStopPlan.map(...)`)
   - Landmark identity/name: `islandStopPlan[idx]` from `generateIslandStopPlan(...)`.
   - Current level: `runtimeState.stopBuildStateByIndex[idx].buildLevel`.
   - Progress: `spentEssence / requiredEssence` from same build state.
   - Full-build requirement: `buildPanelRemainingToFullByIndex[idx]` (current remainder + future levels via `getStopUpgradeCost` loop).
   - Need-more-essence state: `canAfford = runtimeState.essence >= min(CONTRACT_V2_ESSENCE_SPEND_STEP, remaining)`.
   - Objective complete state: `runtimeState.stopStatesByIndex[idx]?.objectiveComplete`.
   - Build availability/disabled:
     - disabled when fully built, cannot afford step, or in-flight spend lock.
     - tutorial may additionally mute non-Hatchery rows.
   - Build click/hold:
     - pointer/keyboard triggers `handleRepeatedBuildActivation(idx)`.
     - that calls `handleSpendEssenceOnBuild(idx, batchSteps)`.
     - canonical write commits through `applyStopBuildSpendBatch(...)`.

3. Canonical action/service used for upgrade
   - `applyStopBuildSpendBatch` in `islandRunStateActions.ts` is the canonical mutation path used by the UI.
   - Per-step spend math remains in `spendIslandRunContractV2EssenceOnStopBuild(...)`; batch action commits once via `commitIslandRunState(...)`.

4. Island completion/travel trigger
   - Boss completion path (`handleCompleteActiveStop`) sets objective complete and checks `isIslandRunFullyClearedV2(...)` (objectives + builds + hatchery egg resolved).
   - If fully cleared: calls `showIslandClearCelebrationFromAnywhere(...)` → `showIslandClearCelebration` modal.
   - Celebration CTA calls `handleTravelFromCelebration` → travel overlay → `performIslandTravel(...)`.
   - `performIslandTravel` executes canonical `travelToNextIsland(...)` action service.

## Risks converting vertical list to bottom carousel

1. **Tutorial gate coupling risk**: row index 0 Hatchery highlighting/muting must survive a carousel layout.
2. **Input conflict risk**: hold-to-build on `touchstart/mousedown` can fight horizontal tray scrolling if gesture handling is not explicit.
3. **Source-guard brittleness risk**: `islandRunBoardEssenceParity.test.ts` checks specific source substrings around build flow; large refactors may fail guards even if behavior is correct.
4. **Authority drift risk**: extracting UI must not introduce new gameplay writes or direct patch paths from presentation components.
5. **Completion-flow regression risk**: build modal UI must not accidentally short-circuit boss/full-clear messaging and celebration/travel pathways.
6. **Asset-missing UX risk**: missing Island 1 stage art could create blank center area without fallback treatment.

## Data safe to pass into a new presentational `BuildModalV2` (no gameplay logic change)

- Modal shell props
  - `isOpen`, `essenceAvailable`, `onClose`
- Center artwork props (derived only)
  - `islandNumber`
  - `artworkStage` (1..3 derived from existing build/objective aggregate)
  - `milestones` (3 marker labels/states derived from same aggregate)
  - `artworkSources` (stage image URLs)
- Tray props
  - `cards: Array<{ stopId, title, icon, level, maxLevel, spentEssence, requiredEssence, remainingToFull, objectiveComplete, canAffordStep, isFullyBuilt, isInteractionDisabled, tutorialState }>`
- Action callbacks (already existing handlers, passed through)
  - `onBuildActivate(stopIndex)` (tap/keyboard)
  - `onBuildHoldStart(stopIndex, event)` / `onBuildHoldEnd()` (or equivalent wrapper preserving current hold behavior)

All of the above can be adapter-derived in `IslandRunBoardPrototype` and passed down; no new persistence/runtime gameplay fields are required.

## Recommended safest implementation slice (Island 1 only)

1. Keep all build spend/completion logic in `IslandRunBoardPrototype`.
2. Add a small adapter layer there to compute `BuildModalV2` view model from existing state.
3. Extract only modal layout/presentation into `BuildModalV2` + optional child presentational components.
4. Gate the new center artwork/progress meter to Island 1 only; for other islands, render neutral fallback center panel while still using same tray.
5. Reuse existing build handlers unchanged (`handleRepeatedBuildActivation`, hold loop, in-flight lock, canonical batch action).
6. Keep close/open flow unchanged (`showBuildPanel`, footer Build button, tutorial transitions).
7. Land in one reversible UI PR without changing economy/service files.

## Artwork storage recommendation

Recommended paths:

- `public/assets/islands/island-001/build-modal/stage-1.webp`
- `public/assets/islands/island-001/build-modal/stage-2.webp`
- `public/assets/islands/island-001/build-modal/stage-3.webp`

Why:
- Matches existing public asset convention under `/assets/islands/island-XXX/...`.
- Avoids gameplay-state coupling and avoids new manifest/persistence requirements for first slice.

## Missing artwork fallback recommendation

- Use deterministic URL construction for Island 1 stage images.
- On image `onError`, degrade to a built-in non-blocking fallback panel:
  - keep progress meter + milestones text active,
  - show static placeholder art block/gradient + label (“Construction in progress”),
  - keep bottom build tray fully functional.
- Never block or reroute build actions when artwork fails.

## Proposed component structure

- `IslandRunBoardPrototype` (owner of gameplay state + handlers)
  - computes `buildModalV2Model` from existing state
  - passes existing callbacks and modal open/close state
- `BuildModalV2` (new, presentational)
  - `BuildModalV2Header`
  - `BuildModalV2CenterArtwork`
  - `BuildModalV2ProgressMeter`
  - `BuildModalV2Tray`
  - `BuildModalV2Card` (presentational card rows in horizontal tray)

## Exact files likely to change (implementation PR, not this investigation PR)

- `src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx`
  - replace current vertical build modal JSX with `BuildModalV2` integration adapter.
- `src/features/gamification/level-worlds/components/BuildModalV2.tsx` (new)
  - presentational modal layout.
- `src/features/gamification/level-worlds/LevelWorlds.css`
  - new `build-modal-v2` classes + tray/center layout.
- `public/assets/islands/island-001/build-modal/stage-1.webp` (new)
- `public/assets/islands/island-001/build-modal/stage-2.webp` (new)
- `public/assets/islands/island-001/build-modal/stage-3.webp` (new)
- likely test touchpoints:
  - `src/features/gamification/level-worlds/services/__tests__/islandRunBoardEssenceParity.test.ts` (if source-guard strings need updates only due structural moves)

No gameplay math/service files should change unless a minimal adapter helper is strictly needed.

## Tests to run (implementation PR)

- `npm run build`
- `npm run test:island-run`
- `npm run check:island-run-architecture-guards`
- `npm run check:island-art-assets` (especially when adding stage images)
- `npm run check:island-art-render-wiring` (if center artwork wiring touches existing art render paths)
- `git --no-pager diff --check`

## Blocker list

- No hard blockers for investigation.
- Watch items:
  - source-guard brittleness in `islandRunBoardEssenceParity.test.ts` during markup refactor,
  - touch gesture design for horizontal tray vs hold-to-build interaction,
  - explicit fallback behavior if stage assets are missing at runtime.

## Validation run during investigation PR

- `npm ci`
- `npm run build`
- `npm run test:island-run`

Result: PASS in this branch during investigation (build succeeded; Island Run tests completed with 681 passed / 0 failed).
