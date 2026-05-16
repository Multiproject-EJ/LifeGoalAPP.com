# Investigation: Dev speed egg-hatch regression + dev-only Clear Island action

Date: 2026-05-16  
Repository: `Multiproject-EJ/LifeGoalAPP.com`

## Scope and constraints checked

- Investigated first before implementing.
- Preserved canonical Island Run architecture (`useIslandRunState` reads, `islandRunStateActions` writes).
- No production economy/timer/telemetry/schema balance changes.
- Dev-only tooling focus.

---

## Files inspected

- `src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx`
- `src/features/gamification/level-worlds/components/IslandRunDebugPanel.tsx`
- `src/features/gamification/level-worlds/components/lucky-roll/IslandRunLuckyRollDevOverlay.tsx`
- `src/features/gamification/level-worlds/services/islandRunStateActions.ts`
- `src/features/gamification/level-worlds/services/islandRunContractV2StopResolver.ts`
- `src/features/gamification/level-worlds/services/islandRunBestNextActionAdvisor.ts`
- `src/features/gamification/level-worlds/services/eggService.ts`
- `src/features/gamification/level-worlds/services/islandRunActionMutex.ts`
- `docs/gameplay/ISLAND_RUN_ARCHITECTURE_CONTRACT.md`
- `docs/gameplay/CANONICAL_GAMEPLAY_CONTRACT.md`
- `docs/gameplay/ISLAND_RUN_GUARDRAILS_AND_CONFLICT_MATRIX_2026-04-24.md`

Recent commit history inspected:
- `8f2175c8` Refine Island Run topbar wallets and compact formatting
- `8149ff4d` Add DEV MODE canonical Build All to L3 action
- `d73ba19d` island clear travel modal + Lucky Roll → Treasure Path rename
- `b7a9eea3` Harden egg collect/sell idempotency through canonical action

---

## Part 1 — Dev speed egg hatching

### 1) Where is the dev speed-hatch button/UI?

- The active speed-hatch control is in `IslandRunBoardPrototype` DEV HUD controls:
  - label: `🥚 Speed Hatch Egg`
  - visible when `isDevModeEnabled`.
- It is **not** in `IslandRunDebugPanel` and **not** in `IslandRunLuckyRollDevOverlay`.

### 2) What state/action does it call?

- UI handler: `handleDevSpeedHatchEgg` in `IslandRunBoardPrototype`.
- Canonical action: `applyDevSpeedHatchEgg(...)` in `islandRunStateActions`.
- Action behavior:
  - loads canonical snapshot via `getIslandRunStateSnapshot`
  - targets `perIslandEggs[currentIslandKey]`
  - writes egg ledger to `status: 'ready'` and `hatchAtMs = setAtMs`
  - updates active egg timing (`activeEggHatchDurationMs = 0` when active egg exists)
  - commits via `commitIslandRunState(...)`

### 3) What should happen?

- Pressing speed-hatch should:
  - force current island egg to hatch-ready (`perIslandEggs.status = 'ready'`)
  - immediately update board hatchery UI to ready/open state
  - allow normal canonical collect/sell transitions (`resolveReadyEggTerminalTransition`)

### 4) What currently happens (before fix)?

- Canonical commit happens, but board-local runtime mirror is not updated in the speed-hatch handler.
- Result: UI can remain stale (egg still appears incubating), so collect/sell flow appears broken from the player/dev perspective.

### 5) Is it blocked by V2 contract, perIslandEggs migration, action mutex, stale local state, or non-canonical writes?

- **Not blocked** by V2 clear contract logic.
- **Not blocked** by per-island egg migration semantics; action writes `perIslandEggs` correctly.
- **Not blocked** by action mutex; this handler is not mutex-gated and action itself commits canonically.
- **Blocked by stale local board state sync** after canonical write.
- **Not a non-canonical write issue** (action path is canonical).

### 6) Exact root cause and safest fix

Root cause:
- `handleDevSpeedHatchEgg` called canonical action but did not sync returned record into local board runtime mirror (`runtimeState` + `runtimeStateRef`), unlike other dev handlers (e.g., Build All to L3).

Safest fix:
- In `handleDevSpeedHatchEgg`, after `result.changed === true`, apply:
  - `setRuntimeState(result.record)`
  - `runtimeStateRef.current = result.record`
- This is minimal, dev-only, preserves canonical write path, and does not alter production timers/economy.

Fix status in this PR:
- ✅ Implemented.

---

## Part 2 — Dev-only “Clear Island” button investigation

Goal: dev-only button that satisfies canonical V2 clear gate and triggers existing celebration/travel flow.

### Current clear gate and trigger path

Canonical V2 clear gate:
- `isIslandRunFullyClearedV2(...)` requires:
  1. all 5 stop objectives complete
  2. all 5 stop builds at `MAX_BUILD_LEVEL`
  3. hatchery egg resolved (`perIslandEggs[current].status` is `collected` or `sold`)

Island-clear celebration/travel path:
- Best-next-action resolves `claim_island_clear` in `islandRunBestNextActionAdvisor`.
- Chip click calls `showIslandClearCelebrationFromAnywhere('best_next_action_chip')`.
- Celebration CTA calls `handleTravelFromCelebration`, which then runs normal travel/treasure-path logic.

### Existing helpers relevant to a dev clear flow

- `applyDevBuildAllToL3(...)` (already exists; canonical build progression)
- `applyStopObjectiveProgress(...)` (canonical objective state writer)
- `applyBossTrialResolvedMarker(...)` (canonical boss marker)
- `applyDevSpeedHatchEgg(...)` + `resolveReadyEggTerminalTransition(...)` (canonical egg ready/resolution path)

### Safest location for new dev button

- Existing DEV HUD controls in `IslandRunBoardPrototype` (same surface as speed-hatch/build-all), gated by `isDevModeEnabled`.
- Keep dev-only visibility tied to current dev mode gate and not exposed in production UX.

### Is a new dev action service needed?

- **Recommended:** yes, a single dev-only orchestrator in `islandRunStateActions` is safest.
- Reason: Clear Island requires coordinated writes across stop objectives, build state, boss marker, completed stops, and hatchery resolution. A dedicated service reduces split writes and keeps orchestration canonical and testable.

### Proposed implementation approach (follow-up PR)

1. Add `applyDevClearCurrentIslandForTravel(...)` in `islandRunStateActions`:
   - mark all stop objectives complete via canonical objective state update
   - ensure all builds L3 (reuse `applyDevBuildAllToL3` flow)
   - ensure boss marker resolved for current island
   - ensure hatchery requirement is resolved safely:
     - if incubating, speed-hatch then terminal-resolve
     - if ready, terminal-resolve
     - if already sold/collected, keep idempotent
   - keep triggerSource dev-specific
2. In board dev controls, add `🧹 Clear Island (Dev)` button:
   - gated by `isDevModeEnabled`
   - call new canonical action
   - on success, call existing `showIslandClearCelebrationFromAnywhere('dev_clear_island')`
3. Ensure path still uses existing celebration modal + CTA travel path (no bypass travel write).
4. Add focused tests for:
   - gate satisfied after action (objectives/builds/egg resolved)
   - idempotency
   - no production exposure
   - celebration trigger entry path remains existing one

### Implement now or defer?

- **Deferred** in this PR to keep risk low and scope tight.
- Reason: this needs multi-field orchestration and dedicated tests to avoid accidental reward/path regressions.

---

## Summary

- Root cause: dev speed-hatch canonical write was not mirrored to local board runtime state, making UI appear unchanged.
- Speed-hatch fixed: **Yes** (minimal dev-only sync in board handler).
- Clear Island implemented: **No** (deferred with exact follow-up plan above).
