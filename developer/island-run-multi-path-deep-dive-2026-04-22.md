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
