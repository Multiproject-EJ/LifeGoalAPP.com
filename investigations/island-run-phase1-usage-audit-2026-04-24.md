# Island Run Phase 1 Usage Audit (State-Authority Mapping) — 2026-04-24

## Goal
Phase 1 only: identify and classify usage of legacy vs canonical state paths without changing production behavior.

## Scope searched
Patterns requested:
- `persistIslandRunRuntimeStatePatch`
- `readIslandRunRuntimeState`
- `setRuntimeState`
- `runtimeState`
- `__storeState`
- `useIslandRunState`

Search scope:
- `src/features/gamification/level-worlds/**`
- `src/features/gamification/ScoreTab.tsx`
- `src/features/habits/UnifiedTodayView.tsx`
- `src/features/habits/DailyHabitTracker.tsx`

Raw result count: **382 matches**.

---

## Executive classification summary

- **Canonical (good):** `useIslandRunState`, `islandRunStateStore`, `islandRunStateActions`, `islandRunRollAction`.
- **Legacy write hotspots (high risk):**
  - `IslandRunBoardPrototype.tsx` (many direct patch + mirror writes),
  - `ScoreTab.tsx` (shield conversion patch),
  - `UnifiedTodayView.tsx` (habit shield patch).
- **Legacy read hotspots (medium risk):**
  - `DailyHabitTracker.tsx` runtime reads,
  - `ScoreTab.tsx` runtime reads,
  - `IslandRunBoardPrototype.tsx` runtime mirror reads.
- **Compatibility/hydration:** runtime alias + hydration wrappers and fallback behavior remain active.
- **Test-only:** runtime-state integration tests and phase tests intentionally call legacy APIs.

---

## File-by-file rundown (requested format)

## 1) `src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx`

- **Exact usage (examples):**
  - canonical read: `const { state: __storeState } = useIslandRunState(session, client);`
  - legacy mirror: `const [runtimeState, setRuntimeState] = useState(() => readIslandRunRuntimeState(session));`
  - legacy patch write: `void persistIslandRunRuntimeStatePatch({...})`
- **Classification:** mixed
  - canonical ✅
  - legacy read ✅
  - legacy write ✅
  - compatibility/hydration ✅
- **Risk level:** **Critical** (largest split-authority surface).
- **Recommended replacement action/service:**
  - keep reads on `useIslandRunState` for gameplay fields,
  - route gameplay mutations through `islandRunStateActions`, `islandRunRollAction`, `islandRunTileRewardAction`.
- **Behavior must be preserved?** **Yes (strictly).**

---

## 2) `src/features/gamification/ScoreTab.tsx`

- **Exact usage:**
  - legacy read: `const state = readIslandRunRuntimeState(session);`
  - legacy write: `persistIslandRunRuntimeStatePatch({ ... patch: { shields: 0 } })`
- **Classification:**
  - legacy read ✅
  - legacy write ✅
- **Risk level:** **High** (external UI writer outside canonical gameplay actions).
- **Recommended replacement action/service:**
  - add/use `islandRunStateActions` helper for shield conversion/spend.
- **Behavior must be preserved?** **Yes.**

---

## 3) `src/features/habits/UnifiedTodayView.tsx`

- **Exact usage:**
  - legacy read: `const currentState = readIslandRunRuntimeState(session);`
  - legacy write: `persistIslandRunRuntimeStatePatch({ patch: { shields: newShields } })`
- **Classification:**
  - legacy read ✅
  - legacy write ✅
- **Risk level:** **High** (habit completion writes gameplay currency outside canonical action path).
- **Recommended replacement action/service:**
  - add/use `islandRunStateActions` helper for awarding shield from habit completion.
- **Behavior must be preserved?** **Yes.**

---

## 4) `src/features/habits/DailyHabitTracker.tsx`

- **Exact usage:** runtime reads on mount/refresh (`readIslandRunRuntimeState`).
- **Classification:** legacy read.
- **Risk level:** **Medium** (read-side divergence possible; no direct write in sampled usage).
- **Recommended replacement action/service:**
  - for gameplay-critical reads, use canonical store selectors/hydrated snapshot path.
- **Behavior must be preserved?** **Yes.**

---

## 5) `src/features/gamification/level-worlds/services/islandRunStateActions.ts`

- **Exact usage:** comments and implementations describe replacing legacy patch writes.
- **Classification:** canonical target (migration helper).
- **Risk level:** **Low/Positive** (this is the path we want).
- **Recommended replacement action/service:** continue expanding this file for missing external write flows.
- **Behavior must be preserved?** **Yes.**

---

## 6) `src/features/gamification/level-worlds/services/islandRunRollAction.ts`

- **Exact usage:** authoritative dice/roll bookkeeping service with mutex-based serialization.
- **Classification:** canonical.
- **Risk level:** **Low/Positive**.
- **Recommended replacement action/service:** keep as sole roll writer.
- **Behavior must be preserved?** **Yes.**

---

## 7) `src/features/gamification/level-worlds/services/islandRunTileRewardAction.ts`

- **Exact usage:** imports/calls `persistIslandRunRuntimeStatePatch` in service-level controlled path.
- **Classification:** compatibility/canonical-bridge (service path, not random UI patching).
- **Risk level:** **Medium** (still patch API under the hood, but centralized and mutex-aware).
- **Recommended replacement action/service:** long-term converge to store-action commit internals only.
- **Behavior must be preserved?** **Yes.**

---

## 8) `src/features/gamification/level-worlds/services/islandRunRuntimeState.ts`

- **Exact usage:** legacy alias API for runtime read/hydrate/persist patch.
- **Classification:** compatibility/hydration bridge.
- **Risk level:** **Medium** (needed currently; dangerous if used as default for new gameplay mutations).
- **Recommended replacement action/service:** keep bridge; gate/alert gameplay-field patch writes in dev/test.
- **Behavior must be preserved?** **Yes (during migration).**

---

## 9) `src/features/gamification/level-worlds/hooks/useIslandRunState.ts`

- **Exact usage:** subscribable canonical read/commit/hydrate hook.
- **Classification:** canonical.
- **Risk level:** **Low/Positive**.
- **Recommended replacement action/service:** make this the only gameplay read source in React components.
- **Behavior must be preserved?** **Yes.**

---

## 10) `src/features/gamification/level-worlds/services/islandRunStateStore.ts`

- **Exact usage:** authoritative in-memory snapshot + publish/commit/hydrate.
- **Classification:** canonical.
- **Risk level:** **Low/Positive**.
- **Recommended replacement action/service:** continue convergence of all gameplay writes into this pipeline via actions.
- **Behavior must be preserved?** **Yes.**

---

## 11) `src/features/gamification/level-worlds/components/IslandRunDebugPanel.tsx`

- **Exact usage:** receives `runtimeState` as debug input and displays it.
- **Classification:** UI/debug-only.
- **Risk level:** **Low**.
- **Recommended replacement action/service:** none required for now.
- **Behavior must be preserved?** **Yes (debug visibility).**

---

## 12) Test-only files

- `src/features/gamification/level-worlds/services/__tests__/islandRunRuntimeState.integration.test.ts`
- `src/features/gamification/level-worlds/services/__tests__/minigameConsolidationPhase2.test.ts`
- `src/features/gamification/level-worlds/services/__tests__/islandRunContractV2Semantics.test.ts`

**Classification:** test-only usage of runtime patch/read APIs for regression coverage.

**Risk level:** **Low** (expected in tests).

**Recommended replacement action/service:** keep tests until migration completes; then update assertions to canonical-only paths where appropriate.

---

## Highest-priority migration targets (Phase 2-ready)

1. `ScoreTab.tsx` direct gameplay patch writes.
2. `UnifiedTodayView.tsx` direct gameplay patch writes.
3. High-volume `IslandRunBoardPrototype.tsx` mixed-authority writes.

These three are the biggest contributors to “AI changed one place but bug persists elsewhere.”

---

## Explicit behavior-preservation constraints

For every migration slice:

- Keep user-visible outputs identical (same currencies, same timing, same unlock behavior).
- Keep local UI state local (modal/camera/animations/debug toggles).
- Migrate gameplay field writes only.
- Maintain backward compatibility during rollout.

