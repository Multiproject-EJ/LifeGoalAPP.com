# Investigation: Island Completion / Travel Modal & Lucky Roll Regressions

> **Date:** 2026-05-16  
> **Status:** Root causes confirmed. Fixes applied.

---

## Part 1 — Island Clear / Travel Modal Never Fires

### Files Inspected

| File | Purpose |
|------|---------|
| `src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx` | Main component — boss completion handler, BNA chip, celebration trigger |
| `src/features/gamification/level-worlds/services/islandRunContractV2StopResolver.ts` | `isIslandRunFullyClearedV2` — canonical V2 clear gate |
| `src/features/gamification/level-worlds/services/islandRunBestNextActionAdvisor.ts` | BNA chip logic — `claim_island_clear` action |
| `src/features/gamification/level-worlds/services/islandRunProgression.ts` | Legacy `isIslandFullyCleared` (checks completedStopsByIsland only) |
| `src/features/gamification/level-worlds/services/islandRunStopCompletion.ts` | `getEffectiveCompletedStops`, `isIslandStopEffectivelyCompleted` |
| `src/features/gamification/level-worlds/services/__tests__/islandRunBestNextActionAdvisor.test.ts` | Existing BNA tests |
| `src/features/gamification/level-worlds/services/__tests__/islandRunContractV2EssenceBuild.test.ts` | V2 clear gate tests |

---

### Root Cause 1 (Critical) — V2 Boss Path Never Triggers Celebration

**Location:** `IslandRunBoardPrototype.tsx:6907–6939`

When `ISLAND_RUN_CONTRACT_V2_ENABLED = true` (always true), the boss completion handler calls `isIslandRunFullyClearedV2`. If the result is `true` (all objectives + egg resolved + all buildings done), the code enters this branch:

```typescript
} else {
  setLandingText('👾 Boss defeated! Island clear is ready.');
  // ← missing: setActiveStopId(null)
  // ← missing: showIslandClearCelebrationFromAnywhere('v2_boss_complete')
}
return; // V2 path always returns here
```

The `setShowIslandClearCelebration(true)` call that actually opens the travel modal lives at line 6984, inside the **legacy block** guarded by `if (!ISLAND_RUN_CONTRACT_V2_ENABLED)`. Since V2 is always enabled, that block is permanently dead code.

**Result:** After the player completes the boss with all islands/objectives/egg done, the UI shows the text `"👾 Boss defeated! Island clear is ready."` but the celebration and travel modal **never open**. The boss stop modal also stays open indefinitely since `setActiveStopId(null)` is also missing from the `nowFullyCleared = true` branch.

**Fix:** In the `nowFullyCleared = true` branch, add `setActiveStopId(null)` to close the boss modal and call `showIslandClearCelebrationFromAnywhere('v2_boss_complete')` to fire the celebration.

---

### Root Cause 2 (Secondary) — BNA Advisor Uses Stale Egg-Resolved Semantics

**Location:** `islandRunBestNextActionAdvisor.ts:93–95` and `:171`

The BNA advisor's private `isEggSlotUsed` function returns `true` whenever any per-island egg entry exists (even `status: 'pending'` or `status: 'ready'`):

```typescript
function isEggSlotUsed(record: IslandRunGameStateRecord): boolean {
  return getCurrentIslandEgg(record) !== null; // ← too permissive
}
```

This is used to compute `effectiveCompletedStops` (adds 'hatchery' to the list) and then:

```typescript
if (isIslandFullyCleared(islandNumber, effectiveCompletedStops) && areAllBuildingsFullyComplete(record)) {
  return { action: 'claim_island_clear', ... };
}
```

`isIslandFullyCleared` is the **legacy** function that only checks `completedStopsByIsland` IDs. It does not check `hatcheryEggResolved`.

**Divergence vs component:**
- Component `islandEggSlotUsed` (line 3568–3571): `egg.status === 'collected' || egg.status === 'sold'`
- Component `isCurrentIslandFullyCleared` uses `isIslandRunFullyClearedV2` which requires `hatcheryEggResolved`
- BNA `isEggSlotUsed`: any egg entry (even 'ready')
- BNA clear check: uses legacy `isIslandFullyCleared` (ignores egg resolution)

**False positive scenario:** Player sets egg (hatchery stop done), egg hatches to `status: 'ready'`, all other stops done, all buildings done. BNA returns `claim_island_clear` → player clicks → `showIslandClearCelebrationFromAnywhere` fires → travel modal opens → but island is **not actually V2-complete** (egg not collected/sold).

**Fix:** Update `isEggSlotUsed` to require `status === 'collected' || status === 'sold'`, and replace the legacy `isIslandFullyCleared` + `areAllBuildingsFullyComplete` check with the canonical `isIslandRunFullyClearedV2`.

---

### One-Shot Ref Behaviour (Informational, Not a Bug in Reported Case)

`showIslandClearCelebrationFromAnywhere` uses a ref guard:
```typescript
if (islandClearCelebrationShownForVisitRef.current === islandClearVisitKey) return;
```

This guard is reset in `performIslandTravel` (line 6660) and in the dev-state loader (line 7289). If the player dismisses the celebration without traveling, the ref remains set and clicking the BNA chip again is a silent no-op. This is a UX concern but not the root cause of the reported bug.

---

### Fix Applied

**`IslandRunBoardPrototype.tsx` — V2 boss complete branch:**

```typescript
// Before (buggy):
} else {
  setLandingText('👾 Boss defeated! Island clear is ready.');
}

// After (fixed):
} else {
  setActiveStopId(null);
  showIslandClearCelebrationFromAnywhere('v2_boss_complete');
}
```

**`islandRunBestNextActionAdvisor.ts` — egg-resolved gate + V2 semantics:**

```typescript
// isEggSlotUsed: now requires collected or sold
function isEggSlotUsed(record: IslandRunGameStateRecord): boolean {
  const egg = getCurrentIslandEgg(record);
  return egg?.status === 'collected' || egg?.status === 'sold';
}

// claim_island_clear check: now uses isIslandRunFullyClearedV2
if (isIslandRunFullyClearedV2({
  stopStatesByIndex: record.stopStatesByIndex,
  stopBuildStateByIndex: record.stopBuildStateByIndex,
  hatcheryEggResolved: isEggSlotUsed(record),
})) {
  return { action: 'claim_island_clear', ... };
}
```

---

## Part 2 — Standalone Lucky Roll vs Island Run Treasure Path Structure

### Files Inspected

| File | Purpose |
|------|---------|
| `src/App.tsx` | Actual entrypoint wiring for overlay icon click → modal open |
| `src/components/GameBoardOverlay.tsx` | Overlay icon rail and `showLuckyRoll`/`onLuckyRollClick` contract |
| `src/features/gamification/daily-treats/LuckyRollBoard.tsx` | Legacy standalone board modal implementation |
| `src/features/gamification/daily-treats/LuckyRollDiceShop.tsx` | Legacy standalone board sub-modal |
| `src/hooks/useLuckyRollStatus.ts` | Legacy standalone availability source for overlay icon |
| `src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx` | Canonical Island Run Treasure Path orchestration + overlay |
| `src/features/gamification/level-worlds/components/lucky-roll/IslandRunLuckyRollDevOverlay.tsx` | Island Run-owned Treasure Path board overlay |
| `src/features/gamification/level-worlds/services/islandRunPostRareTreasurePathAction.ts` | Canonical Treasure Path start/collect/travel services |
| `src/features/gamification/level-worlds/services/__tests__/islandRunPostRareTreasurePathAction.test.ts` | Existing architecture guard tests for Treasure Path ownership |
| `docs/18_LUCKY_ROLL_ISLAND_RUN_REFACTOR.md` | Product direction contract |

---

### Confirmed Structure (Before This Follow-up Fix)

There were **two distinct concepts** live at once:

1. **Legacy standalone LuckyRollBoard path (outside Island Run):**
   - `App.tsx` imported `LuckyRollBoard`
   - `GameBoardOverlay` received `showLuckyRoll={luckyRollStatus.available}`
   - `onLuckyRollClick` in `App.tsx` called `setShowLuckyRoll(true)`
   - `const luckyRollModal = showLuckyRoll && activeSession ? <LuckyRollBoard .../> : null`
   - This made the old board accessible from the global game overlay whenever lucky-roll access was active

2. **Canonical Island Run Treasure Path path (inside Island Run):**
   - `IslandRunBoardPrototype.tsx` `handleTravelFromCelebration` checks `getTreasurePathMilestoneMetadata(stats.islandNumber)`
   - Milestone clear calls `startPostRareTreasurePath(...)`
   - If applicable, opens `IslandRunLuckyRollDevOverlay` via `handleOpenPostRareTreasurePathOverlay(...)`
   - Overlay resolution uses `onCollectPostRareTreasurePathAndTravel={handlePostRareTreasurePathCollectAndTravel}`
   - Pending sessions are resumed via `resolvePendingTreasurePathResume` + "Continue Treasure Path" CTA

So yes: **duplicate product surfaces existed** (legacy standalone + Island Run-owned Treasure Path).

---

### Entrypoints That Could Open `LuckyRollBoard` (Legacy Standalone)

Before this follow-up fix, all user-reachable `LuckyRollBoard` entrypoints were in `App.tsx`:

1. **Mobile overlay path**
   - `GameBoardOverlay` prop `onLuckyRollClick={() => setShowLuckyRoll(true)}`
   - `GameBoardOverlay` prop `showLuckyRoll={luckyRollStatus.available}`
2. **Desktop overlay path**
   - Same two props in the desktop `GameBoardOverlay` instance
3. **Modal mount gate**
   - `const luckyRollModal = showLuckyRoll && activeSession ? <LuckyRollBoard ... /> : null`
   - Rendered in both mobile and desktop branches

No Island Run Treasure Path codepath imported or rendered `LuckyRollBoard`.

---

### Classification: Legacy, Reused, or Duplicate?

- `LuckyRollBoard.tsx` is a **legacy standalone implementation**.
- Island Run Treasure Path is a **separate, canonical Island Run-owned implementation** (`IslandRunLuckyRollDevOverlay` + post-rare services).
- Therefore this was a **duplicate game surface**, not a single reused path.

---

### Final Decision

Adopt product direction: **Treasure Path is Island Run bonus/event path only**.

- ✅ Keep Island Run Treasure Path flow unchanged
- ✅ Remove standalone overlay exposure of `LuckyRollBoard`
- ✅ Preserve internal `lucky_roll` IDs for compatibility where needed

---

### Follow-up Fix Applied (This Change)

`App.tsx`:

- Removed standalone Lucky Roll modal wiring:
  - removed `LuckyRollBoard` import
  - removed `useLuckyRollStatus` import/hook usage
  - removed `showLuckyRoll` state
  - removed `luckyRollModal` rendering
  - removed `onLuckyRollClick` handlers
- Hard-disabled overlay entry in both overlay mounts:
  - `showLuckyRoll={false}`
- Updated nearby comment to document that Treasure Path is Island Run-owned and intentionally not exposed as standalone overlay game

This keeps GameBoardOverlay component API intact but prevents accidental user access to legacy standalone board from App.

---

### Regression Guard Tests Added

`src/features/gamification/level-worlds/services/__tests__/islandRunPostRareTreasurePathAction.test.ts`
(`milestone Treasure Path orchestration keeps resume UI canonical and guarded`)

Added source-guard assertions that:

- `App.tsx` must not import/render `LuckyRollBoard`
- `App.tsx` must not call `setShowLuckyRoll(...)`
- `App.tsx` must not pass `onLuckyRollClick` into `GameBoardOverlay`
- `App.tsx` must keep `showLuckyRoll={false}` in overlay wiring

These guards prevent accidental reintroduction of standalone overlay access.

---

## Validation Results

| Check | Result |
|-------|--------|
| `npm run test:island-run` | ✅ PASS |
| `npm run build` | ✅ PASS |
| `git --no-pager diff --check` | ✅ PASS |

---

## Summary

| | Root Cause | Fix Location |
|-|-----------|-------------|
| **Island clear / travel modal** | V2 boss path missing `showIslandClearCelebrationFromAnywhere` call | `IslandRunBoardPrototype.tsx:6936` |
| **BNA advisor false positive** | Legacy `isIslandFullyCleared` used instead of V2 gate; `isEggSlotUsed` too permissive | `islandRunBestNextActionAdvisor.ts:93,171` |
| **Standalone Lucky Roll exposure** | Global overlay still opened legacy `LuckyRollBoard` despite Treasure Path migration | `App.tsx` (remove modal/handler wiring, force `showLuckyRoll={false}`) |
