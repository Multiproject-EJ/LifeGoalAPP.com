# Island Run File Rundown (Non-Coder Friendly) — 2026-04-24

This is a plain-English map of what the important Island Run files do, what is actively used in production, what is a migration bridge, and what is effectively retired.

---

## 1) Where the game actually opens in the app

### `src/App.tsx` (ACTIVE)
**Purpose:** Main app shell. Opens the Island Run modal.

- This file renders `LevelWorldsHub` when the Island Run modal is opened.  
- In plain terms: this is the “door” into Island Run from the main app UI.

**Why you care:** If this file points at an older/prototype hub, the whole live experience uses it.

---

### `src/features/gamification/level-worlds/LevelWorldsHub.tsx` (ACTIVE)
**Purpose:** Island Run launcher container.

- It renders `IslandRunBoardPrototype` directly.
- It logs `isIslandRunPrototype: true` on mount.

**Why you care:** This confirms production is still routed through the prototype-named board component.

---

## 2) Main board and rendering split

### `src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx` (ACTIVE, LARGE, MIXED AUTHORITY)
**Purpose:** Main gameplay brain + UI glue.

What is inside:
- dice rolling flow hookup,
- stop interactions,
- currencies,
- eggs/companions,
- hydration and persistence effects,
- debug utilities,
- minigame launching,
- lots of state synchronization code.

Critical architecture note:
- It reads **store state** (`useIslandRunState`, `__storeState`) **and**
- It also keeps a **legacy `runtimeState` mirror** and still writes patches through `persistIslandRunRuntimeStatePatch` in many places.

**Status:** This is the core source of drift risk because it currently hosts both old + new state styles.

---

### `src/features/gamification/level-worlds/components/board/BoardStage.tsx` (ACTIVE, VISUAL LAYER)
**Purpose:** Visual board renderer and animation orchestrator.

- Camera, gestures, token animation, board particles, tiles, and orbit stop visuals.
- It explicitly says gameplay logic is in `IslandRunBoardPrototype`.

**Status:** Good separation idea (visual vs gameplay), but gameplay component is still very heavy.

---

## 3) State architecture files (the important cluster)

### `src/features/gamification/level-worlds/hooks/useIslandRunState.ts` (ACTIVE, TARGET PATTERN)
**Purpose:** Official React hook for canonical store state.

- Designed as “single authoritative React entry point”.
- Based on `useSyncExternalStore` for safe concurrent rendering.

**Status:** This is the intended future pattern.

---

### `src/features/gamification/level-worlds/services/islandRunStateStore.ts` (ACTIVE, TARGET AUTHORITY)
**Purpose:** Canonical in-memory store mirror + subscribe/commit/hydrate API.

- Holds per-user snapshots.
- Publishes updates to subscribers.
- Commits via central writer path.

**Status:** This is the architecture the codebase is trying to converge to.

---

### `src/features/gamification/level-worlds/services/islandRunStateActions.ts` (ACTIVE, MIGRATION HELPERS)
**Purpose:** Action functions that mutate gameplay through the store.

- Designed to replace ad-hoc patch writes from UI.
- Includes roll-result syncing, token rewards, essence/reward-bar actions, island travel actions, etc.

**Status:** Strong direction, but not yet the only mutation path.

---

### `src/features/gamification/level-worlds/services/islandRunRuntimeState.ts` (ACTIVE, LEGACY BRIDGE)
**Purpose:** Legacy compatibility wrapper.

- `IslandRunRuntimeState` is now a type alias of canonical game state.
- Kept so old call sites still compile during migration.
- Still exposes `persistIslandRunRuntimeStatePatch`.

**Status:** This is a bridge layer. Useful temporarily, risky long-term if overused.

---

### `src/features/gamification/level-worlds/services/islandRunGameStateStore.ts` (ACTIVE, PERSISTENCE CORE)
**Purpose:** Read/write/hydrate from localStorage + Supabase.

- Handles hydration sources, write coordination, and fallback behavior.
- Includes a schema-mismatch wildcard fallback (`select('*')`) path.

**Status:** Operationally resilient, but wildcard fallback keeps legacy compatibility complexity alive.

---

## 4) Core gameplay services

### `src/features/gamification/level-worlds/services/islandRunRollAction.ts` (ACTIVE, AUTHORITATIVE ROLL PATH)
**Purpose:** Single bookkeeping authority for roll deduction + movement resolution.

- Handles dice cost calculation and token movement bookkeeping.
- Uses action mutex to serialize concurrent actions.

**Status:** Good canonical service. Should remain the only roll writer.

---

### `src/features/gamification/level-worlds/services/islandRunTileRewardAction.ts` (ACTIVE)
**Purpose:** Applies tile reward outcomes through protected mutation path.

**Status:** Part of canonical direction, but board still contains legacy patch writes elsewhere.

---

### `src/features/gamification/level-worlds/services/islandRunActionMutex.ts` (ACTIVE)
**Purpose:** Prevents parallel gameplay writes from stepping on each other.

**Status:** Important safety layer.

---

## 5) Feature flags and rollout controls

### `src/config/islandRunFeatureFlags.ts` (ACTIVE)
**Purpose:** Runtime feature-flag defaults for Island Run event/minigame rollout.

**Status:** Active and used, but currently drifting from some consolidation test expectations.

---

### `src/features/gamification/level-worlds/services/islandRunFeatureFlags.ts` (ACTIVE, DIFFERENT CONCERN)
**Purpose:** Legacy surface for “Contract V2 enabled?”

- Returns `true` permanently.

**Status:** Not duplicate behavior-wise, but naming overlap with config flags can confuse maintainers.

---

## 6) Files that are effectively retired or trap-prone

### `src/features/gamification/level-worlds/services/islandRunTimerProgression.ts` (RETIRED, KEPT FOR COMPAT)
**Purpose:** Old island timer progression logic.

- Explicitly marked retired; returns inert/no-op outputs.

**Status:** Compatibility stub. Safe but noisy in architecture map.

---

### `src/features/gamification/level-worlds/services/islandBoardLayout.ts` (`STOP_TILE_INDICES_40`) (TRAP RISK)
**Purpose:** Board geometry and anchors.

- Comments say stops are decoupled from tile indices.
- But `STOP_TILE_INDICES_40` constant still exists and is exported.

**Status:** Not used by other source files right now, but can mislead future edits.

---

## 7) Non-board screens still touching runtime state directly

### `src/features/gamification/ScoreTab.tsx` (ACTIVE, DIRECT RUNTIME PATCH WRITES)
**Purpose:** Score/bank/leaderboard UI.

- Reads runtime state directly.
- Persists runtime patches directly (example: shield conversion).

**Status:** Cross-feature direct writes increase split-authority risk.

---

### `src/features/habits/UnifiedTodayView.tsx` (ACTIVE, DIRECT RUNTIME PATCH WRITES)
**Purpose:** Habits view.

- Reads runtime state directly.
- Writes shield rewards directly via patch API.

**Status:** Another cross-feature direct writer outside canonical gameplay actions.

---

### `src/features/habits/DailyHabitTracker.tsx` (ACTIVE, DIRECT RUNTIME READS)
**Purpose:** Habit tracker with Island Run runtime reads for offer/event context.

**Status:** Read-side coupling to runtime state remains outside board/store hook boundaries.

---

## 8) What is “new canonical” vs “old bridge” right now

## New canonical direction (should dominate)
- `useIslandRunState`
- `islandRunStateStore`
- `islandRunStateActions`
- `islandRunRollAction` / `islandRunTileRewardAction`
- action mutex

## Old bridge paths (still active in production)
- local `runtimeState` mirrors inside `IslandRunBoardPrototype`
- `persistIslandRunRuntimeStatePatch` callsites in board + non-board features
- fallback hydration compatibility paths

That coexistence is the architectural reason you keep seeing recurring bugs after agent edits.

---

## 9) “Used / retired / maybe removable” quick checklist

### Definitely used in production now
- `App.tsx` Island Run modal wiring
- `LevelWorldsHub.tsx`
- `IslandRunBoardPrototype.tsx`
- canonical store/action services
- runtime-state bridge services

### Retired-but-kept
- island timer progression logic (inert stubs)

### Likely cleanup candidates after migration is complete
- direct UI patch writes (`persistIslandRunRuntimeStatePatch`) outside action services
- redundant runtime mirrors in board
- legacy compatibility fallback paths once telemetry says safe
- misleading constants like `STOP_TILE_INDICES_40` if no longer semantically valid

---

## 10) Practical interpretation for you (non-coder)

You are not imagining it:
- The app has a new “single source of truth” architecture,
- but parts of the old one are still live,
- so AI edits can accidentally wire into different paths,
- and the same category of bug can reappear.

The fix is not one magic patch; it is a controlled migration where each release removes one class of legacy write path and proves parity with tests before removing the next.
