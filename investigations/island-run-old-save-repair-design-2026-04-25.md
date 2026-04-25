# Island Run Old-Save Snap-Back Repair Design (Plan Only, No Implementation)

Date: 2026-04-25  
Status: Design proposal only (no code changes to gameplay/runtime behavior in this document).  
Decision context: Fresh state behaves correctly; old saves can still trigger token snap-back.

---

## Goal

Design the **smallest safe hydrate-time repair** for old Island Run save records that may contain stale/corrupted movement state.

---

## Non-negotiable safety constraints

1. **No progress reset.**
2. Preserve player economy and progression data.
3. Only repair movement/transient integrity fields.
4. Repair must be deterministic + idempotent.
5. Emit diagnostics whenever repair applies.

---

## Exact fields to repair/clear

## A) Persisted fields to repair (allowed)

### 1) `tokenIndex` (REPAIR)
- Problem: old saves may carry invalid/out-of-topology token index values.
- Repair:
  - derive legal tile count from active board profile,
  - if `tokenIndex` is non-finite, negative, or out of range, normalize to legal range.
- Canonical normalization rule:
  - `normalized = ((floor(tokenIndex) % tileCount) + tileCount) % tileCount`
  - (wrap, not hard reset to 0, preserves relative position intent better for large legacy values).

### 2) runtime/store token movement mismatch marker (REPAIR metadata only)
- Add optional repair metadata (diagnostic marker) to indicate repair applied at least once for this user/session.
- This marker is not gameplay state and should not alter economy/progression.

## B) Transient runtime/component fields to clear (non-persisted, allowed)

These are unsafe when stale across mount/rehydrate windows and are safe to clear because they are view/animation state only:

1. `pendingHopSequence` → `null`
2. roll animation resolver refs / completion resolver refs → cleared
3. `isAnimatingRollRef` → `false`
4. `isRollSyncPendingRef` → `false`
5. any roll overlay/pending visual flags (`isRolling` only if no active authoritative roll operation is in-flight)

Rule: clear only during hydrate-time repair boundary so board resumes in stable idle state.

---

## Exact fields never to touch

Do **not** mutate any of the following in repair:

- Economy/currencies: `dicePool`, `spinTokens`, `essence`, `islandShards`, `shields`, `shards`, `diamonds`, `creatureTreatInventory`, `minigameTicketsByEvent`.
- Island progression: `currentIslandNumber`, `cycleIndex`, `completedStopsByIsland`, `stopTicketsPaidByIsland`, `stopStatesByIndex`, `stopBuildStateByIndex`, `bossState`, `activeStopIndex`, `activeStopType`.
- Egg/sanctuary/progression: `activeEgg*`, `perIslandEggs`, `creatureCollection`, `activeCompanionId`, `perfectCompanion*`.
- Story/onboarding markers: `storyPrologueSeen`, `firstRunClaimed`, `onboardingDisplayNameLoopCompleted`, `audioEnabled`.
- Event/reward-bar state: `activeTimedEvent`, `activeTimedEventProgress`, `rewardBar*`, `sticker*`.
- Time progression anchors: `islandStartedAtMs`, `islandExpiresAtMs`.

If any of these are invalid, handle in separate targeted migrations later; do not couple to snap-back repair.

---

## Deterministic conflict-resolution rule (tokenIndex/store/runtime mirror)

Use one canonical rule at hydrate boundary:

1. Build candidate record via existing hydration source logic.
2. Validate candidate `tokenIndex` against active topology tile count.
3. If valid, keep candidate as-is.
4. If invalid, apply wrap-normalization (above) and mark `repairApplied=true`.
5. Publish **the repaired record** to both:
   - runtime mirror (`setRuntimeState` path), and
   - canonical store mirror (`resetIslandRunStateSnapshot`).

Tie-break when local and remote runtime versions conflict:

- Keep existing runtimeVersion precedence rules globally.
- Add a narrow integrity override:
  - if chosen winner has invalid tokenIndex and loser has valid tokenIndex for same tileCount, prefer valid tokenIndex while keeping all non-token fields from the original winner.
  - this avoids broad semantic override while preventing illegal movement state.

This rule is deterministic and minimal-scope.

---

## Where repair should run

## Primary insertion point

- **Hydration boundary before state publication** in the initial hydrate/reconcile flow that currently decides local vs table and then publishes runtime/store snapshots.

Why here:
- one central point already owns source selection,
- avoids scattering repair logic across render or action code,
- ensures store and runtime mirror stay aligned on the same repaired payload.

## Secondary safety hook

- Reconcile paths (focus/visibility) should run same validator-repair function before publish.
- Keep function pure and shared (e.g., `repairHydratedMovementState(record, tileCount)`), so behavior is identical across initial hydrate and reconcile.

---

## Diagnostics to add when repair applies

Emit one structured diagnostic event per repair application:

- `stage`: `island_run_hydration_repair_applied`
- `source`: local/table/fallback
- `runtimeVersionChosen`
- `tokenIndexBefore`
- `tokenIndexAfter`
- `tileCount`
- `reason`: `invalid_token_index` | `version_conflict_validity_override`
- `wasInitialHydrate`: boolean
- `currentIslandNumber`, `cycleIndex`

Also emit no-op trace when validator runs but makes no changes:
- `stage`: `island_run_hydration_repair_noop`

This enables cohorting old-save repairs without noisy blanket telemetry.

---

## Idempotency contract

Repair function must satisfy:

- Applying to already-valid state returns identical record (`===` optional, deep-equal required).
- Applying twice yields same result as once.
- Diagnostics should indicate no-op on second run.

Implementation guard:
- only commit/publish a repaired durable write when `tokenIndexAfter !== tokenIndexBefore`.

---

## Tests to add (old/corrupt fixtures)

## Unit tests (pure repair function)

1. `tokenIndex = -1` with tileCount 40 → 39.
2. `tokenIndex = 40` with tileCount 40 → 0.
3. `tokenIndex = 87` with tileCount 40 → 7.
4. non-finite tokenIndex (`NaN`, `Infinity`) → safe normalized fallback (0).
5. already-valid tokenIndex unchanged.
6. idempotency: repair(repair(record)) == repair(record).

## Hydration selection tests

7. chosen winner invalid tokenIndex, loser valid tokenIndex (equal/close versions) → tokenIndex from valid candidate, all other fields from winner.
8. chosen winner valid tokenIndex → no override.
9. repair does not alter protected fields list (currencies/progression/eggs/events/story).

## Integration tests

10. initial hydrate with corrupt legacy local record publishes repaired tokenIndex to runtime + store mirrors.
11. focus/visibility reconcile with corrupt incoming state repairs before publish.
12. first roll after repaired hydrate does not snap back when pendingHopSequence clears.

---

## Risk assessment

## Low risk

- Transient flag clearing at hydrate boundary.
- Pure tokenIndex topology validation/wrap.
- Diagnostics-only additions.

## Medium risk

- Narrow validity override against runtimeVersion precedence (must be tightly scoped to tokenIndex only).

## High risk (avoid in this slice)

- Any repair touching currency/progression/island ownership/event state.
- Broad runtimeVersion tie-break rewrites across many fields.

---

## Recommended next implementation slice

Implement **Phase R1: Hydrate-time movement integrity repair** only:

1. Add pure repair validator for tokenIndex + idempotency.
2. Integrate at initial hydrate + reconcile publish points.
3. Clear transient roll/hop flags safely at repair boundary.
4. Add diagnostics.
5. Add fixture-driven tests listed above.

No gameplay rule changes.
No economy changes.
No progress reset.
