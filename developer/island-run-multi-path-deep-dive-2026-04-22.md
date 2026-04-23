# Island Run Deep Dive — Multi-Path Issues (2026-04-22)

## Scope
Investigation target: "issues with 2 or more Island Run game paths" — specifically whether Island Run still has multiple authoritative gameplay paths that can diverge.

Sources reviewed:
- `docs/gameplay/ISLAND_RUN_CANONICAL_MIGRATION_PLAN.md`
- `docs/gameplay/ISLAND_RUN_OPEN_ISSUES.md`
- `developer/island-run-stop-path-mapping-guide.md`
- `src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx`
- `src/features/gamification/level-worlds/services/islandRunContractV2StopResolver.ts`
- `src/features/gamification/level-worlds/services/islandRunStopTickets.ts`
- `src/features/gamification/level-worlds/services/islandRunFeatureFlags.ts`
- `src/config/islandRunFeatureFlags.ts`

---

## Executive findings

### 1) The codebase still has **parallel gameplay paths** (not fully single-path yet)
Even though migration docs mark the v2 migration as complete, the renderer still explicitly keeps backward-compat shims and unmigrated paths alive.

Evidence:
- `IslandRunBoardPrototype.tsx` documents C1 shim setters (`setDicePool`, `setTokenIndex`, `setSpinTokens`) retained for "unmigrated paths". This confirms active coexistence of old and new state-update routes.
- The same file still contains a large volume of direct `setRuntimeState(...)`, `persistIslandRunRuntimeStatePatch(...)`, and some `writeIslandRunGameStateRecord(...)` calls across many branches, indicating multi-writer behavior is still present.

Impact:
- Higher risk of state drift/races.
- Harder reproducibility because behavior depends on which path executed (store action vs mirror update vs patch write).

---

### 2) Contract-v2 can still be toggled at runtime, so legacy/v2 semantics can diverge
A runtime feature flag gate (`isIslandRunContractV2Enabled`) still controls whether v2 contract logic is used.

Evidence:
- `src/features/gamification/level-worlds/services/islandRunFeatureFlags.ts` reads from query param, localStorage, and env for `island_run_contract_v2`.
- `IslandRunBoardPrototype.tsx` branches widely on `ISLAND_RUN_CONTRACT_V2_ENABLED`.
- `docs/gameplay/ISLAND_RUN_CANONICAL_MIGRATION_PLAN.md` says migration is historical and explicitly says "do not reintroduce the feature flag" and that v2 is now the only path.
- `docs/gameplay/ISLAND_RUN_OPEN_ISSUES.md` P0-4 explicitly calls out completion divergence risk when the runtime flag changes mid-run.

Impact:
- If a user/device toggles this flag, completion semantics, unlock behavior, and island-clear logic can disagree.
- That maps directly to "2+ game paths" symptoms.

---

### 3) Stop status has at least two semantics: resolver semantic status vs UI display status
The stop resolver exposes `ticket_required`, but the visual map intentionally remaps that to `active` for UI parity.

Evidence:
- `resolveIslandRunContractV2Stops` returns statuses among `completed | active | ticket_required | locked`.
- In `IslandRunBoardPrototype.tsx`, `stopStateMap` maps `ticket_required -> active` deliberately for visuals.
- Interaction logic then checks `doesStopRequireTicketPayment(...)` to route to ticket modal.

Impact:
- Users can see "active" but hit a ticket gate.
- Not necessarily wrong by design, but it feels like a split path unless UX clearly communicates ticket-required state.

---

### 4) Resolver inputs are inconsistent across call sites
Some resolver calls include ticket ledger + island number; other calls pass only `stopStatesByIndex`.

Evidence:
- `IslandRunBoardPrototype.tsx` around `contractV2Stops` includes `stopTicketsPaidByIsland` and `islandNumber`.
- The same file has other resolver calls with only `stopStatesByIndex`.
- `resolveIslandRunContractV2Stops` explicitly preserves legacy two-state behavior when ticket inputs are omitted.

Impact:
- Different callers can derive different status semantics from the same underlying state (2-state vs 4-state resolver output).
- This is a direct multi-path interpretation risk.

---

### 5) Migration bridge logic remains active (`completedStops` + `stopStatesByIndex` merge)
The renderer still merges legacy `completedStops` into v2 stop state as a compatibility bridge.

Evidence:
- `mergedStopStatesByIndex` in `IslandRunBoardPrototype.tsx` force-upgrades `objectiveComplete` based on legacy stop completion list.
- `developer/island-run-stop-path-mapping-guide.md` documents this bridge and flags migration mismatch as a known inconsistency pattern.

Impact:
- Helps migrated accounts, but keeps dual-source truth alive.
- If either source lags, status can appear inconsistent across render/click/payment paths.

---

## What this likely means for your current bug class ("2+ paths")

Most likely primary contributors are:
1. Runtime v2 flag still allowing branch splits.
2. Store-based actions coexisting with legacy mirror/patch writes.
3. Resolver being called with different input completeness (ticket-aware vs legacy mode).
4. Intentional UI remap (`ticket_required` shown as `active`) creating perceived mismatch.

---

## Recommended stabilization order

1. **Lock contract mode to v2** in production runtime path.
   - Remove query/localStorage override support for contract-v2 mode (or hard-force true in production build).
2. **Create one canonical stop-status selector wrapper** and require all call sites to use identical inputs (always include ticket ledger + island).
3. **Stop remapping `ticket_required` to visual `active`** unless accompanied by explicit ticket badge/CTA state; otherwise users read this as broken tap logic.
4. **Finish Stage C/D cleanup** to remove legacy mirror writes (`setRuntimeState` + patch writes) from gameplay-critical paths.
5. Add an integration regression for full loop:
   - roll -> stop open -> ticket prompt/pay -> complete -> island clear -> travel,
   validated under one canonical state source.

---

## Confidence
High confidence that multi-path architecture is still present and is a plausible root cause class for current inconsistencies. Exact user-facing repros will depend on which branch/path executes in-session.

---

## Recommended program-level plan for game-loop path issues

To prevent repeated bug whack-a-mole, treat Island Run loop stability as a
single-source-of-truth migration program (not isolated one-off fixes).

### Priority order

1. **Finish mutation-path unification (Stage C/D completion)**
   - Remove remaining gameplay-critical legacy write paths in renderer.
   - Make the canonical store/record commit pipeline the only writer for
     roll/stop/travel/dice-critical fields.

2. **Harden patch/version semantics**
   - Either retire `persistIslandRunRuntimeStatePatch` from gameplay-critical
     flows or ensure strict monotonic version behavior for those writes.

3. **Enforce one stop-status semantic contract**
   - Require a single ticket-aware resolver input shape across all call sites.
   - Keep UI status and interaction-gating semantics aligned (avoid hidden
     status remaps that feel like dead taps).

4. **Add one full-loop integration gate test**
   - Cover: roll -> land -> stop interaction -> island clear -> travel.
   - Include interleaving/hydration simulation to catch seam races.

5. **Keep issue probes active until clean soak**
   - Issue 1: token mutation source-tag telemetry.
   - Issue 2: stop-tap decision tuple telemetry.
   - Issue 3: treat-dice bridge before/after dicePool telemetry.

### Operational rule of thumb

For any new gameplay-loop bug:
- First ask: **does this path bypass canonical store write?**
- If yes, fix path ownership first; then tune behavior.

---

## Second rundown (workflow-recovery pass, 2026-04-23)

This section is a clean execution checklist after the prior workflow issues
(partial PR creation, doc/status drift, and risk of incomplete fixes).

### Task list (do in order; verify each with code + tests before marking done)

1. **Hard-lock contract-v2 mode end-to-end**
   - Remove runtime override semantics (query/localStorage/env) from the
     contract-v2 flag helper so it cannot diverge per session/device.
   - Keep only one deterministic return path (`true`) for gameplay contract mode.
   - **Status:** ✅ Done on 2026-04-23.
   - **Implementation notes:** `isIslandRunContractV2Enabled()` now always returns
     `true`, and the old runtime override readers were removed from the helper.

2. **Unify stop resolver invocation shape**
   - Replace all resolver call sites that pass only `stopStatesByIndex` with one
     canonical wrapper/input payload that always includes:
     - `stopStatesByIndex`
     - `stopTicketsPaidByIsland`
     - `islandNumber`
   - Eliminate mixed 2-state vs 4-state semantics in live board flows.
   - **Status:** ✅ Done on 2026-04-23.
   - **Implementation notes:** `IslandRunBoardPrototype` now routes board-flow
     stop resolution through `resolveCanonicalContractV2Stops(...)`, and handler
     paths that mutate stop state pass current `runtimeStateRef` ticket-ledger
     state so resolver semantics remain ticket-aware during mutation commits.
   - **Evidence checks:** `npm run test:island-run` passed after this change.
   - **What remains:** Task 3 onward (visual semantic alignment, Stage C/D
     mutation-path unification, full-loop integration gate, completion evidence
     discipline).

3. **Align visual stop status with semantic stop status**
   - Remove (or explicitly redesign) `ticket_required -> active` visual remap.
   - If UX still wants parity visuals, add a clear badge/CTA so the user sees the
     ticket gate before tap.
   - **Status:** ✅ Done on 2026-04-23.
   - **Implementation notes:** `IslandRunBoardPrototype` now maps resolver output
     directly into `stopStateMap` with no `ticket_required -> active` fallback, and
     orbit stop icon rendering now shows a dedicated ticket icon (`🎫`) for
     `ticket_required` state. `BoardOrbitStops` also treats
     `ticket_required` as a ticket-cost badge-eligible state so the essence cost
     remains visible before tap.
   - **Evidence checks:** `npm run test:island-run` passed after this change.
   - **What remains:** Task 4 onward (Stage C/D mutation-path unification,
     canonical full-loop integration gate, completion evidence discipline).

4. **Finish mutation-path unification (Stage C/D completion)**
   - Remove gameplay-critical mirror write paths that mix:
     - `setRuntimeState(...)`
     - `persistIslandRunRuntimeStatePatch(...)`
     - `writeIslandRunGameStateRecord(...)`
   - Route roll/stop/travel/dice-critical changes through one canonical action path.
   - **Status:** 🟡 In progress on 2026-04-23.
   - **Implementation notes (this session):**
     - Added `syncCompletedStopsForIsland(...)` in `islandRunStateActions` so
       completed-stop island map writes now flow through `commitIslandRunState`
       instead of direct renderer-side `writeIslandRunGameStateRecord(...)`.
     - Added `applyStopTicketPayment(...)` in `islandRunStateActions` and wired
       the stop-ticket happy path in `IslandRunBoardPrototype` to use it, so
       ticket payment writes (`essence`, `essenceLifetimeSpent`,
       `stopTicketsPaidByIsland`) no longer bypass the store commit coordinator.
   - **Evidence checks:** `npm run test:island-run` passed after this increment.
   - **What remains:** migrate remaining gameplay-critical direct writes (notably
     island-travel-adjacent and reward/stop completion side paths) until the
     board loop no longer performs direct record writes for roll/stop/travel
     state ownership.

5. **Add one canonical full-loop integration gate**
   - Required scenario:
     - roll -> stop open -> ticket prompt/pay -> complete -> island clear -> travel
   - Include hydration/interleaving simulation to catch seam races.

6. **Add completion evidence discipline**
   - For each task, require:
     - code diff link
     - at least one passing automated check
     - explicit "what remains" note
   - Do not update status docs to "done" unless all evidence is present.
