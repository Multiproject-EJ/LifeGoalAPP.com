# Stage C — Island Run State Architecture Migration

**Written:** 2026-04-20 (end of session 8 / Stage A+B+E PR)
**Status:** C1 LANDED — roll/dice/token movement migrated; foundation (A, B, E) merged.
**Context file for new agent sessions.** Read this document before starting any Stage C work.
Companion docs: `CANONICAL_GAMEPLAY_CONTRACT.md`, `ISLAND_RUN_OPEN_ISSUES.md`, `NEXT_TODO_PR_LIST.md`.

---

## 1. What Stages A, B, E delivered (the foundation)

| Stage | Change | File |
|---|---|---|
| A | `IslandRunRuntimeState` became a **type alias** of `IslandRunGameStateRecord` | `islandRunRuntimeState.ts` |
| B | `IslandRunGameStateStore` (subscribable store + `useSyncExternalStore` hook `useIslandRunState`) | `islandRunGameStateStore.ts` (extended), new `useIslandRunState.ts` |
| E | Architecture docs + open-issues doc updated | `docs/gameplay/` |

**Nothing in A+B+E reroutes any existing code path.** The store has zero call-sites in the renderer; the legacy APIs (`persistIslandRunRuntimeStatePatch`, `writeIslandRunGameStateRecord`, `runtimeState` useState, `runtimeStateRef`) are all still active and unchanged. A+B+E is a safe additive foundation PR.

---

## 2. Why Stage C is needed

The renderer (`IslandRunBoardPrototype.tsx`, 8 954 lines) carries **two competing state ownership paths** for every gameplay field:

1. **Legacy path** — `runtimeState` useState (top-level `IslandRunRuntimeState`) + `runtimeStateRef` + 23 shadow `useState` mirrors + 9 persist `useEffect`s that race each other and the roll service.
2. **Service path** — `islandRunRollAction.ts` calls `writeIslandRunGameStateRecord` as the authoritative writer for dice/token, but the persist effects at 2290 also write those same fields, causing the session-7 dice-oscillation / token-rollback bugs.

Stage C removes every mirror, every renderer-side persist `useEffect`, and every inlined `persistIslandRunRuntimeStatePatch` call from the renderer, replacing them with **named canonical action functions** that take the store as their single writer.

---

## 3. Verified surface counts (as of 2026-04-20)

| Surface | Count | Primary location |
|---|---|---|
| `persistIslandRunRuntimeStatePatch(…)` call-sites in renderer | **41** | `IslandRunBoardPrototype.tsx` |
| `writeIslandRunGameStateRecord(…)` call-sites in renderer | **4** | lines 2273, 2321, 2865, 5315 |
| `readIslandRunGameStateRecord(…)` call-sites in renderer | **1** | line 2316 |
| `setRuntimeState(…)` call-sites | **60** | throughout renderer |
| `runtimeStateRef.current.*` reads | **83** | scattered across async callbacks |
| Gameplay `useState` mirrors | **23** | lines 912–1202 |
| Persist `useEffect`s (gated by `hasCompletedInitialHydrationSyncRef`) | **9** | lines 2131, 2149, 2256, 2290, 2331, 2346, 2380, 2407, 2424 |
| Hydration-mirror `useEffect` (runtimeState → 23 setters) | **1** | line 1427 |
| Regression-guard refs | **3** | `runtimeStateRef` (1272), `hasCompletedInitialHydrationSyncRef` (1283), `lastAppliedRuntimeVersionRef` (1278) |

---

## 4. Complete `useState` mirror inventory (all 23 must disappear)

| Mirror `useState` | Line | Record field it shadows |
|---|---|---|
| `dicePool` | 912 | `record.dicePool` |
| `tokenIndex` | 913 | `record.tokenIndex` |
| `activeStopId` | 931 | derived from `record.activeStopIndex` / `record.activeStopType` |
| `islandNumber` | 932 | `record.currentIslandNumber` |
| `timeLeftSec` | 954 | derived from `record.islandExpiresAtMs` (stays as UI ticker only) |
| `activeEgg` | 959 | derived from `record.perIslandEggs[currentIsland]` |
| `completedEncounterIndices` | 969 | subset of `record.completedStopsByIsland` |
| `bossTrialResolved` | 978 | `record.bossTrialResolvedIslandNumber === currentIsland` |
| `islandShards` | 985 | `record.islandShards` |
| `shardTierIndex` | 986 | `record.shardTierIndex` |
| `shardClaimCount` | 987 | `record.shardClaimCount` |
| `shields` | 989 | `record.shields` |
| `shards` | 991 | `record.shards` |
| `diamonds` | 993 | `record.diamonds` |
| `audioEnabled` | 1032 | `record.audioEnabled` |
| `cycleIndex` | 1034 | `record.cycleIndex` |
| `islandStartedAtMs` | 1127 | `record.islandStartedAtMs` |
| `islandExpiresAtMs` | 1128 | `record.islandExpiresAtMs` |
| `spinTokens` | 1133 | `record.spinTokens` |
| `creatureCollection` | 1190 | `record.creatureCollection` |
| `activeCompanionId` | 1191 | `record.activeCompanionId` |
| `creatureTreatInventory` | 1202 | `record.creatureTreatInventory` |
| `marketOwnedBundles` | (scoped) | `record.marketOwnedBundlesByIsland[currentIsland]` |

---

## 5. Stage C chunked migration sequence

All chunks create actions in a new file `services/islandRunStateActions.ts` (create in C1). Each chunk is one PR. PRs are ordered so later ones are cheaper because earlier ones have already reduced contention.

---

### C1 — Roll + dice + token movement ✅ LANDED

**Landed:** 2026-04-20. The persist effect at line 2290 is removed. `dicePool`, `tokenIndex`, and `spinTokens` are now store-derived via `useIslandRunState`. Shim setters (`setDicePool`, `setTokenIndex`, `setSpinTokens`) are provided for backward compatibility with unmigrated C2–C6 paths — each shim commits through `commitIslandRunState` so no persist effect is needed. Actions `applyRollResult` and `applyTokenHopRewards` live in `islandRunStateActions.ts`. 9 new integration tests pass (201 total).

**Why first:** The persist effect at line 2290 is the single most dangerous path alive. It re-writes `dicePool` / `tokenIndex` / `shards` / `essence` / `shields` in a `useEffect`, racing the roll service's own `writeIslandRunGameStateRecord` commit. This causes the session-7 dice oscillation and token rollback bugs. C1 eliminates the race at source.

**Gameplay domain:** dice spend on roll, token hop sequence, post-hop reward-bar progress increment.

**Actions to create in `islandRunStateActions.ts`:**
- `applyRollResult(store, rollResult)` — absorbs the result of `executeIslandRunRollAction` and writes the single authoritative commit. Replaces the persist effect at line 2290 and its `writeIslandRunGameStateRecord` at 2321.
- `applyTokenHop(store, intent)` — handles per-hop essence/dice/shard deltas (replaces `persistIslandRunRuntimeStatePatch` at line 3525 + paired `setRuntimeState` calls at 2142, 2159, 7751, 7755, 7759).

**useState mirrors removed:**
- `dicePool` (912), `tokenIndex` (913), `spinTokens` (1133)

**Persist paths removed:**
- `writeIslandRunGameStateRecord` at line **2321** (the gated full-record write inside the persist effect)
- `persistIslandRunRuntimeStatePatch` at line **3525** (`{ spinTokens, dicePool, essence }` after hop)
- `setRuntimeState` at lines 2142, 2159, 7751, 7755, 7759

**Persist effects removed:**
- The entire `useEffect` at line **2290** (deps: `tokenIndex`, `spinTokens`, `dicePool`, `essence`, `shields`, `islandShards`, `shardTierIndex`, `shardClaimCount`, `shards` — this effect was the root cause of the race)

**Hydration mirror lines removed:**
- Lines 1507–1509 (`setTokenIndex`, `setSpinTokens`, `setDicePool`) inside the 1427 effect

**Why safe to land independently:** Nothing outside this chunk reads the three mirrors after the roll resolves (they're animation-driven). The roll service already owns the canonical record. C1 makes the renderer a pure consumer of that result.

**Tests proving race is gone:**
- `islandRunRollAction.test.ts` — existing mutex/concurrency tests stay green.
- **Add:** "after roll, the store receives exactly one commit per roll call" (verify `writeIslandRunGameStateRecord` is called once using existing `testHarness` commit spy).
- **Add** to `islandRunStateStore.integration.test.ts`: "hydrating with an older `runtimeVersion` after a roll does NOT roll back `dicePool` or `tokenIndex`" (previously required `lastAppliedRuntimeVersionRef`; now guaranteed by store version comparison).

**Runtime behaviour change:** None — same roll outcome, same animation, same landing. Only state ownership changes.

---

### C2 — Tile rewards + encounter rewards + reward-bar + essence drift

**Gameplay domain:** currency/chest/micro/hazard tile payouts, encounter resolution payout, reward-bar threshold cascade, essence award/spend helpers, drift tick.

**Actions to create:**
- `applyTileReward(store, { tileType, islandNumber })` — from tile handler helpers; writes `essence` / `shards` / `dicePool` deltas + reward-bar progress.
- `applyEncounterReward(store, { index, outcome })` — from encounter resolve path; writes `completedStopsByIsland` (encounter index added) + rewardBar progress.
- `claimRewardBarThreshold(store, intent)` — from the cascade path at line 2550.
- `applyEssenceDriftTick(store)` — from the drift interval callback at line 2666.

**useState mirrors removed:**
- `completedEncounterIndices` (969)

**Persist paths removed:**
- `persistIslandRunRuntimeStatePatch` at lines **2469** (essence award), **2511** (essence spend), **2550** (reward-bar state), **2666** (drift tick), **8229**, **8248**, **8267**, **8286**, **8304** (5× creature-feed shard rewards)
- `setRuntimeState` paired: 2477, 2519, 2568, 2662, 8228, 8247, 8266, 8285, 8303

**Why safe:** Tile rewards are post-landing; they don't contend with hydration once C1 has unified the roll commit path.

**Tests proving race is gone:**
- Keep existing pure-logic tests in `islandRunContractV2RewardBar.test.ts` unchanged.
- **Add** integration: "tile reward + reward-bar threshold cascade issues exactly one commit per landing".
- **Add:** "essence drift tick never double-counts across a rapid hydrate + commit race".

**Runtime behaviour change:** None. Reward numbers identical.

---

### C3 — Stop progress + stop tickets + island travel

**Gameplay domain:** paying a stop ticket, marking a stop complete (objective + build), travelling to next island (atomic reset of per-island ledgers), starting/resetting island timer.

**Actions to create:**
- `openStopTicket(store, stopIndex)` — from the `writeIslandRunGameStateRecord` ticket-pay full-record write at line **2865**.
- `completeStop(store, stopIndex)` — from lines **3857** / **5390**.
- `spendStopBuildEssence(store, { stopIndex, amount })` — from `writeIslandRunGameStateRecord` at line **5315**.
- `travelToNextIsland(store, nextIsland)` — collapses 6 separate patch calls (lines **3454**, **5090**, **5160**, **5208**, **5247**, **5592**) into one atomic action. This is the most important atomicity fix in Stage C.
- `resetCurrentIslandProgress(store)` — from line **5619**.

**useState mirrors removed:**
- `activeStopId` (931), `islandNumber` (932), `cycleIndex` (1034), `islandStartedAtMs` (1127), `islandExpiresAtMs` (1128)
- `bossTrialResolved` (978) — travel-side mutations only; full removal in C6

**Persist paths removed:**
- `writeIslandRunGameStateRecord` at lines **2865**, **5315**
- `readIslandRunGameStateRecord` at line **2316** (now read from store snapshot)
- `persistIslandRunRuntimeStatePatch` at lines **3454**, **3857**, **5090**, **5160**, **5208**, **5247**, **5390**, **5592**, **5619**
- `setRuntimeState` at lines 2278, 2326, 3464, 3534, 3866, 3932, 4449, 4489, 5037, 5102, 5161, 5218, 5252, 5327, 5400, 5629

**Persist effects removed:**
- `useEffect` at line **2256** (`completedStopsByIsland` sync) + its `writeIslandRunGameStateRecord` write at 2273

**Why safe:** Travel is the largest transaction; collapsing it into one action makes the atomicity guarantee explicit. No coupling to egg/boss state (those come in C4/C6). The `writeIslandRunGameStateRecord` calls at 2865 and 5315 are the only full-record writes left outside the roll service — removing them is a net simplification.

**Tests proving race is gone:**
- `islandRunStopCompletion.test.ts`, `islandRunStopTickets.test.ts` — keep; add wrappers asserting exactly one commit per action call.
- **Add** integration: "travel-to-next-island is atomic — a simulated commit failure between the former 6 patches leaves the record in either full pre-travel or full post-travel state, never half". Mock the commit to fail at call N (for N = 1..6 previously) and assert record consistency.

**Runtime behaviour change:** None for numbers. **One structural fix**: island travel was previously non-atomic across 6 patches; this makes it a single commit.

---

### C4 — Eggs + market + companion

**Gameplay domain:** egg set / incubate / collect / sell lifecycle, market purchases (dice bundles, diamonds), companion bonus, active companion selection, perfect-companion computation.

**Actions to create:**
- `setEgg(store, { stopId, tier })` — from the awaited path at line **3902**.
- `collectEgg(store, islandKey)` — from lines **4435**, **4537**.
- `sellEgg(store, islandKey)` — from line **4609**.
- `autoHatchReadyEggOnHydration(store)` — lifts the egg auto-hatch logic OUT of the hydration effect at line **1488** (a known anti-pattern: writing to the store from inside the hydration effect).
- `buyMarketBundle(store, bundleId)` — from line **5042** (dice bundle) + **2365** (ownership record).
- `setActiveCompanion(store, id)` — from line **2429**.
- `applyCompanionDailyBonus(store, visitKey)` — from line **4258**.
- `applyPerfectCompanionComputation(store, result)` — from line **4215**.

**useState mirrors removed:**
- `activeEgg` (959), `creatureCollection` (1190), `activeCompanionId` (1191), `creatureTreatInventory` (1202), `marketOwnedBundles` (scoped)

**Persist paths removed:**
- `persistIslandRunRuntimeStatePatch` at lines **1488**, **2365**, **2393**, **2413**, **2429**, **3902**, **4215**, **4258**, **4435**, **4537**, **4609**, **5042**
- `setRuntimeState` at lines 1486, 2370, 2400, 2420, 2436, 4265, 4279, 4449 (egg-side), 4551, 4593, 4614, 4655, 5037

**Persist effects removed:**
- `useEffect` at line **2346** (market owned bundles sync)
- `useEffect` at line **2380** (creature-treat-inventory sync)
- `useEffect` at line **2407** (creature-collection sync)
- `useEffect` at line **2424** (active-companion sync)

**Why safe:** Eggs/market/companion are self-contained ledgers with no contested overlap with dice/roll/travel paths.

**Tests proving race is gone:**
- Keep `creatureCollectionService.test.ts`, `creatureTreatInventoryService.test.ts` unchanged.
- **Add** integration: "sell-egg atomically updates `perIslandEggs` AND `completedStopsByIsland` in one commit" (today these are two separate patch fields in a single patch call — fine, but the action makes it explicit).
- **Add:** "auto-hatch-on-hydration does NOT issue a second store write during the hydration pass" (regression test for the hydrate→write→hydrate loop at line 1488).

**Runtime behaviour change:** None for egg/market/companion values. One latent bug-fix: the `autoHatchReadyEggOnHydration` path is moved out of the hydration effect so it no longer re-triggers hydration.

---

### C5 — Shards + reward-bar escalation + diamonds + shard-tier claim

**Gameplay domain:** shard-accumulation & tier-claim flow, diamond wallet persistence, reward-bar escalation state beyond per-roll progress.

**Actions to create:**
- `awardShards(store, { delta, source })` — from lines **2444**, **2685**, and all 5 feed-reward sites **8229**, **8248**, **8267**, **8286**, **8304**.
- `claimShardTier(store)` — from line **8851**.
- `adjustDiamonds(store, delta)` — from line **2336**.
- `updateRewardBarEscalation(store, nextState)` — from the escalation fields in the 2550 patch not already covered by C2.

**useState mirrors removed:**
- `islandShards` (985), `shardTierIndex` (986), `shardClaimCount` (987), `shards` (991), `shields` (989), `diamonds` (993)

**Persist paths removed:**
- `persistIslandRunRuntimeStatePatch` at lines **2336**, **2444**, **2685**, **8229**, **8248**, **8267**, **8286**, **8304**, **8851**
- `setRuntimeState` at lines 2444 (internal), 8228, 8247, 8266, 8285, 8303

**Persist effects removed:**
- `useEffect` at line **2331** (diamonds sync)

**Why safe:** Wallet fields (shards, diamonds, shields) are orthogonal to the dice/roll/travel paths. They share the record but touch no contested field.

**Tests proving race is gone:**
- Pure shard-service tests unchanged.
- **Add** integration: "5 parallel sanctuary feed rewards from 5 concurrent calls produce the correct final shard count without double-counting" (today 8229/48/66/85/303 are 5 independent fire-and-forget patches; this test would currently fail under concurrent load).

**Runtime behaviour change:** None.

---

### C6 — Boss + onboarding + prologue + audio + flags

**Gameplay domain:** boss trial resolve, boss exit, onboarding completion, story prologue seen, audio toggle, display-name loop completion.

**Actions to create:**
- `resolveBossTrial(store, islandNumber)` — from lines **4847**, **5565**.
- `advanceAfterBoss(store, nextIsland)` — from line **5592** (boss-specific island advance; may already be handled by `travelToNextIsland` from C3 — consolidate if so).
- `completeOnboarding(store)` — from line **5538**.
- `setStoryPrologueSeen(store)` — from line **6206**.
- `setAudioEnabled(store, enabled)` — from line **2154**.
- `setOnboardingDisplayNameLoopCompleted(store)` — from line **2137**.

**useState mirrors removed:**
- `audioEnabled` (1032), `bossTrialResolved` (978) (full removal)

**Persist paths removed:**
- `persistIslandRunRuntimeStatePatch` at lines **2137**, **2154**, **4847**, **5538**, **5565**, **5592**, **6206**
- `setRuntimeState` at lines 2436 (companion portion already in C4), 4831, 4855, 5552, 5573, 5602, 5629 (reset portions), 6191, 6211

**Persist effects removed:**
- `useEffect` at line **2131** (onboarding display-name-loop sync)
- `useEffect` at line **2149** (audio-enabled sync)

**Why safe:** These are one-shot, low-rate flags. No contention with dice/roll/travel. Safest to land last among the mutation chunks.

**Tests proving race is gone:**
- **Add** integration: "`completeOnboarding` is idempotent — two rapid calls produce exactly one commit".

**Runtime behaviour change:** None.

---

### C7 — Full progress reset + legacy architecture retirement (= Stage D)

**Gameplay domain:** hard reset to island 1, `diceRegenState` reset, bonus-tile charge reset.

**Actions to create:**
- `resetIslandRunProgress(store)` — wraps `buildFreshIslandRunRecord` from `islandRunProgressReset.ts` and issues a single commit. Replaces line **5619** (already handled in C3 as a partial reset — consolidate here).

**Files deleted:**
- `services/islandRunRuntimeState.ts` (type alias only, zero logic after C1–C6; type can be inlined or re-exported from `islandRunGameStateStore.ts`)
- `services/islandRunRuntimeStateBackend.ts` (all consumers replaced by store actions in C1–C6)

**Refs deleted from renderer:**
- `runtimeStateRef` (line 1272) — all 83 reads have been replaced by store snapshots in C1–C6
- `hasCompletedInitialHydrationSyncRef` (line 1283) — no longer needed; store hydration is synchronous
- `lastAppliedRuntimeVersionRef` (line 1278) — no longer needed; store has version comparison

**Effects deleted:**
- The entire hydration-mirror `useEffect` at line **1427** — no mirrors remain to populate

**Top-level state deleted:**
- The `runtimeState` `useState` (wherever declared) + its setter `setRuntimeState` — zero remaining call-sites after C1–C6

**Legacy APIs retired:**
- `readIslandRunRuntimeState`, `hydrateIslandRunRuntimeState`, `hydrateIslandRunRuntimeStateWithSource` — deleted
- `persistIslandRunRuntimeStatePatch`, `IslandRunRuntimeStateBackend` — deleted

**Why last:** C7 can only land when a grep of the renderer for `runtimeState`, `runtimeStateRef`, `persistIslandRunRuntimeStatePatch`, `writeIslandRunGameStateRecord` (outside actions), `readIslandRunGameStateRecord` returns zero results. That grep is the pre-condition for the PR opening.

**Tests:**
- Rename `islandRunRuntimeState.integration.test.ts` → `islandRunStateStore.integration.test.ts`; add the full regression matrix:
  - concurrent action calls (concurrency ordering)
  - hydrate-then-action
  - action-then-hydrate
  - remote-failure + recovery + backoff
  - parked write replay

**Runtime behaviour change:** None. Same defaults, same reset. Architecture change only.

---

## 6. Ordering rationale

```
C1 (roll/dice/token)     ← closes the highest-contention race immediately
C2 (tile/encounter/drift) ← lower contention, builds on C1's single-commit pattern
C3 (stops/travel)         ← atomic travel; large but self-contained
C4 (eggs/market/companion) ← no contention; isolated ledgers
C5 (shards/diamonds)      ← wallet fields; orthogonal
C6 (boss/flags)           ← one-shot flags; trivially safe
C7 (reset + legacy delete) ← gate: zero grep hits, then delete everything
```

Each PR can be reviewed and merged independently. If a PR is reverted, the earlier PRs remain valid and safe because actions are additive to the store.

---

## 7. New file to create: `services/islandRunStateActions.ts`

Create this file in **C1**. It is the barrel for all canonical actions. Shape:

```ts
// services/islandRunStateActions.ts
// Canonical action functions for Island Run state mutations.
// Each function takes the store (IslandRunGameStateStore) as its first argument
// and returns a Promise<void> or the committed record.
// These replace all inlined persistIslandRunRuntimeStatePatch / writeIslandRunGameStateRecord
// calls in the renderer.

export async function applyRollResult(store, rollResult): Promise<void> { … }
export async function applyTokenHop(store, intent): Promise<void> { … }
// … one export per action, grouped by domain with a comment header
```

---

## 8. Top residual architectural risks right now (between A+B+E and C1)

**These are unresolved bugs / race conditions that are live in production today:**

1. **Persist effect at line 2290 races the roll service** — it re-writes `dicePool` / `tokenIndex` / `shards` / `essence` / `shields` from React state in a `useEffect`, firing after every render where those state values change. `executeIslandRunRollAction` also writes those fields through `writeIslandRunGameStateRecord`. The two writes arrive at the store in unpredictable order. **Session-7 root cause.** Fixed by: **C1**.

2. **`runtimeStateRef.current` lags the store mirror by one render** — 83 reads inside async callbacks can see pre-roll values. The `lastAppliedRuntimeVersionRef` guard only protects reads that flow through the 1427 hydration effect. The 29 `runtimeState.shards` reads and 26 `runtimeState.essence` reads bypass that guard. Fixed by: **C1–C6** (reads replaced by store snapshot lookups).

3. **`lastAppliedRuntimeVersionRef` is not a real fix** — it suppresses the symptom (token rollback animation) but the underlying stale write still goes through to localStorage. Fixed by: **C1**.

4. **Island travel is non-atomic** — currently issues up to 6 separate `persistIslandRunRuntimeStatePatch` calls (lines 3454, 5090, 5160, 5208, 5247, 5592). A commit failure mid-sequence leaves the record in an undefined mixed-island state. Fixed by: **C3**.

5. **Auto-hatch-on-hydration is a write inside the hydration effect** — line 1488 calls `persistIslandRunRuntimeStatePatch` from within the same `useEffect` that also calls `setRuntimeState`. This triggers a second hydration cycle on every app entry where an egg was ready while offline. Fixed by: **C4**.

6. **Creature-feed rewards are 5 independent fire-and-forget patch writes** — lines 8229/48/67/85/304. Rapid double-tap produces up to 10 overlapping commits with no mutex. Fixed by: **C5** (`awardShards` with mutex).

7. **`persistIslandRunRuntimeStatePatch` cannot delete map keys** — it only overlays keys (see `persist patch semantics` memory). Any future action that needs to remove an island key from `completedStopsByIsland` (e.g., prestige / cycle-reset) cannot use the patch API. The action layer (C3) will issue full-record commits for these cases.

---

## 9. Is the A+B+E foundation PR safe to merge before C1?

**Yes — safe to merge.** Reasons:

- The store has zero call-sites in the renderer. The in-memory mirror is never populated, so it can never diverge from the legacy path.
- Every legacy surface (`persistIslandRunRuntimeStatePatch`, `writeIslandRunGameStateRecord`, `readIslandRunGameStateRecord`, `hydrateIslandRunRuntimeState*`) is unchanged and behaves bit-for-bit identically.
- All 9 persist effects, the 1427 hydration mirror effect, and all three guard refs remain active.
- 192/192 island-run tests pass; `tsc -b` clean; CodeQL clean.

**Caveats:**
- Merging A+B+E does NOT fix any user-visible bug. The session-7 dice oscillation, token rollback, and cross-device drift risks are structurally unchanged until C1 and C3 land.
- The PR should be labelled as a foundation that enables C1–C7, not as a bug fix.

**Recommended next action after merging:** open C1 immediately. It is the highest-value chunk (closes the root-cause of the two worst production bugs) and is the smallest of the seven chunks.

---

## 10. Prompt to use when starting C1 in a new agent session

```
I have just merged the Stage A+B+E foundation PR for Island Run state architecture.
The next work is Stage C, chunk C1: Roll + dice + token movement.

Read docs/gameplay/STAGE_C_STATE_ARCHITECTURE_MIGRATION.md section 5 "C1" for
the full spec. Then:

1. Create services/islandRunStateActions.ts with `applyRollResult` and `applyTokenHop`.
2. Update IslandRunBoardPrototype.tsx to call those actions instead of the inlined
   persist patches + setRuntimeState calls listed in the C1 spec.
3. Delete the persist useEffect at line ~2290 and its writeIslandRunGameStateRecord at ~2321.
4. Remove the dicePool / tokenIndex / spinTokens useState mirrors (lines 912, 913, 1133)
   and their hydration-mirror setters (lines 1507–1509 inside the 1427 effect).
5. Add the two new integration tests listed in the C1 spec.
6. Run npm run test:island-run and npm run typecheck; all must pass.
```

---

_End of Stage C migration plan. Update the Status line at the top of this document as chunks land._
