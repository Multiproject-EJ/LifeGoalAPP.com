# Island Run Architecture Investigation (2026-04-24)

## Scope
Deep static/runtime-path audit focused on the 40-tile circular Island Run board and bug-prone state behavior.

## Executive Summary
The app is **partially migrated** to a canonical store architecture, but the production board still executes a **hybrid model**:

1. A canonical subscribable store (`useIslandRunState` / `islandRunStateStore`) exists.
2. The board still keeps a large legacy `runtimeState` mirror and many local `useState` mirrors.
3. Several non-board surfaces still read/write runtime state directly via legacy patch APIs.

This creates a high risk of **state divergence, stale reads, and non-deterministic write ordering** under real usage.

---

## Primary Runtime Path (what actually runs)

1. `App.tsx` mounts `LevelWorldsHub`.
2. `LevelWorldsHub` renders `IslandRunBoardPrototype` (the production board path).
3. `IslandRunBoardPrototype` uses both:
   - `useIslandRunState(...).state` (store snapshot), and
   - legacy `runtimeState` + dozens of local mirrors.
4. Some updates use canonical action services (`islandRunStateActions` / `islandRunRollAction`), but many effects still call `persistIslandRunRuntimeStatePatch` and local `setRuntimeState` paths.

Net: **multiple live write paths** operate simultaneously.

---

## Key Architecture Inconsistencies

## 1) Two authorities in the same board component
`useIslandRunState` is documented as the single React entry point, but `IslandRunBoardPrototype` still carries a parallel `runtimeState` authority and many local mirrors.

Consequence:
- A state change can update one path first (store or runtime mirror), while another effect renders from the other path, causing transient wrong UI and race-like bugs.

Signals in code:
- Direct store-derived values (`__storeState.dicePool`, `__storeState.tokenIndex`, `__storeState.spinTokens`).
- Simultaneous legacy `runtimeState` (`useState(() => readIslandRunRuntimeState(session))`) + `setRuntimeState` + patch persistence effects.

## 2) Canonical action pipeline is incomplete in production board
The codebase has robust action services (`apply*`, roll/tile actions, mutex, single-flight commit), but board code still does substantial in-component mutation orchestration.

Consequence:
- Not all mutations enjoy the same ordering and atomicity guarantees.
- Harder to reason about regression: some paths are transactional, some are effect-driven.

## 3) External app surfaces still use legacy runtime patch writes
Non-board features (e.g. habits and score/bank surfaces) still read/write Island Run state via `readIslandRunRuntimeState` / `persistIslandRunRuntimeStatePatch`.

Consequence:
- Cross-feature writes may bypass canonical store commit discipline and action mutex expectations.
- Board and non-board screens can disagree temporarily or overwrite each other depending on timing.

## 4) Feature-flag contract drift is real (tests currently fail)
Current island-run test suite reports two failing cases tied to rollout semantics:
- Expected default `todaysOfferSpinEntryEnabled: false`, actual default is `true`.
- Clamp helper expected pass-through when flag is OFF, but behavior clamps due flag default being ON.

Consequence:
- Behavior in production likely differs from intended consolidation rollout docs/tests.
- "Version drift" exists between test assumptions and shipped defaults.

## 5) Legacy hydration fallback still active (`select('*')` wildcard path)
On schema mismatch, hydration falls back to a wildcard remote row mapping path.

Consequence:
- Useful for survivability, but it prolongs legacy-shape compatibility and can hide schema-version misalignment.
- Increases complexity and can reintroduce stale/legacy data assumptions.

## 6) Canonical board semantics vs legacy constants
Board docs state stops are decoupled from tile indices; still, legacy stop index constants (`STOP_TILE_INDICES_40`) remain exported in layout.

Consequence:
- Even if currently unused, this is a maintenance trap: future call sites may accidentally re-couple stop logic to tile indices.

---

## Evidence that “different versions” are coexisting
Yes — there are multiple coexisting “versions” of the game model in code:

- **Version A (target architecture):** store-centric, action-service based, mutex-protected writes.
- **Version B (legacy bridge):** runtime-state alias + patch persistence API + in-component mirrors.
- **Version C (compat hydration):** schema-mismatch fallback wildcard hydration path.
- **Version D (rollout semantics):** tests/docs expect one flag state; runtime defaults ship another.

This is exactly the pattern that causes bugs that are hard to reproduce and appear as "random" desync.

---

## Highest-Risk Bug Classes From Current Design

1. **Lost-update / last-writer-wins races** between board effects and non-board patch writes.
2. **Hydration overwrite anomalies** when stale mirror/effect paths re-apply older values after a canonical action write.
3. **UI inconsistency bugs** where one panel reflects store snapshot and another reads runtime mirror.
4. **Feature behavior mismatches** from test-vs-default drift.

---

## Recommended Remediation Order

1. **Finish Stage-C migration in `IslandRunBoardPrototype`:**
   - Remove local gameplay mirrors for canonical fields.
   - Read canonical values only from `useIslandRunState().state`.
2. **Ban direct runtime patch writes for gameplay currencies/progression outside action services.**
   - Route all writes through `islandRunStateActions`.
3. **Align feature-flag defaults with consolidation spec/tests** (or update tests/spec intentionally and explicitly).
4. **Deprecate wildcard hydration fallback with telemetry threshold + sunset plan.**
5. **Remove or isolate misleading legacy constants** (e.g. stop tile index constants) to prevent future misuse.

---

## Bottom Line
Your bug volume is consistent with a system mid-migration where multiple gameplay state systems are still active. The app does use different "versions" of Island Run logic/state handling depending on the path, and older compatibility pathways are still live in production-critical surfaces.


---

## Safe Cleanup Plan (No Functionality Loss)

This is the practical migration path to clean up architecture while minimizing regressions.

### Phase 0 — Freeze Contracts Before Refactor

1. **Lock expected behavior in tests first** (before moving code):
   - Roll flow (dice cost, hop sequence, reward resolution).
   - Stop progression flow (unlock gating, ticket requirements, completion semantics).
   - Cross-surface currency writes (Score/Today/Board interactions).
   - Hydration precedence (local newer than stale remote, remote newer than local).
2. Add integration tests specifically for "split-authority" failure modes:
   - board action + external patch write racing in same second,
   - hydration while action in-flight,
   - tab switch during regen tick.
3. Capture baseline snapshots from production test users (anonymized) to replay deterministic scenarios.

### Phase 1 — Single Writer Rule (Keep Existing UI)

Goal: Keep all current screens, but enforce one mutation path.

1. Introduce a strict policy: **gameplay writes must go through `islandRunStateActions`**.
2. Replace direct `persistIslandRunRuntimeStatePatch` callsites in non-board features with dedicated action helpers:
   - shield award,
   - shield convert,
   - shards/dice wallet mutations,
   - stop/completion mutations.
3. Keep read compatibility for now, but log telemetry on any legacy direct write call (temporary warning).

### Phase 2 — Board Read Unification

Goal: Remove dual read authorities in `IslandRunBoardPrototype`.

1. Convert canonical fields to read exclusively from `useIslandRunState().state`.
2. Remove local mirrors for canonical fields in small slices (dice/token first, then stop/build/reward-bar).
3. Keep UI-only ephemeral state local (`isModalOpen`, animation flags, hover state), not gameplay state.
4. After each slice, run full island-run test suite + a deterministic manual QA script.

### Phase 3 — Hydration Compatibility Sunset

Goal: preserve resilience but retire permanent legacy drag.

1. Keep wildcard fallback temporarily, but add metric + alert counter for fallback hits.
2. If fallback hit-rate is below threshold for N releases, switch wildcard path to hard error + migration hint.
3. Remove fallback mapping once schema parity is guaranteed.

### Phase 4 — Feature Flag Contract Alignment

1. Decide canonical truth source:
   - either tests/spec are right and defaults must be changed,
   - or runtime defaults are right and tests/spec must be updated.
2. Make decision explicit in a single changelog entry and keep tests synchronized.
3. Add CI guard that fails if default flag snapshot changes without an explicit test update.

### Phase 5 — Dead Code / Trap Removal

1. Remove misleading constants and bridge paths once migrations complete:
   - legacy stop tile index constants if no longer semantically valid,
   - runtime patch helpers for gameplay mutations,
   - temporary shim setters in board component.
2. Rename `IslandRunBoardPrototype` only when semantics are fully migrated (to avoid naming lying about runtime behavior).

### Release Safety Controls

- **Canary rollouts** for state-write pathway changes.
- **Per-user rollback switch** to re-enable legacy writer for emergency recovery.
- **Write-audit telemetry** (`source`, `runtimeVersion`, `field-set`) for every mutation.
- **No mixed-mode releases**: each release either adds new canonical action coverage or removes one legacy path; never both broad changes at once.

### Definition of Done

Cleanup is complete only when all are true:

1. No gameplay mutation path writes via `persistIslandRunRuntimeStatePatch` from UI surfaces.
2. Board gameplay state reads come from one authority (`useIslandRunState`).
3. Fallback wildcard hydration path is retired or strictly gated.
4. Feature-flag defaults and consolidation tests are in sync.
5. Existing user save data survives migration with zero-loss replay tests passing.
