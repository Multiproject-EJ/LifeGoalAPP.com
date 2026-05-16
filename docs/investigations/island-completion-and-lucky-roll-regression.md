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

## Part 2 — Lucky Roll Still Appears as "Lucky Roll" (Should Be "Treasure Path")

### Files Inspected

| File | Purpose |
|------|---------|
| `src/types/habitGames.ts` | Game registry — `label: 'Lucky Roll'` |
| `src/features/gamification/daily-treats/LuckyRollBoard.tsx` | Standalone board component — title and aria labels |
| `src/features/gamification/daily-treats/LuckyRollDiceShop.tsx` | Dice shop sub-component — title and aria labels |
| `src/components/GameBoardOverlay.tsx` | Game overlay — Lucky Roll button aria label |
| `src/hooks/useLuckyRollStatus.ts` | Availability hook — already gates on active/earned |
| `src/App.tsx:4716,5036` | `showLuckyRoll={luckyRollStatus.available}` — already gated |
| `docs/18_LUCKY_ROLL_ISLAND_RUN_REFACTOR.md` | Product direction: Lucky Roll repurposed as finite bonus |
| `src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx` | Already uses "Treasure Path" for post-rare overlay |

---

### Root Cause

**Product direction** (`docs/18_LUCKY_ROLL_ISLAND_RUN_REFACTOR.md`): Lucky Roll is being repurposed from a permanent hub game into a finite Island Run bonus reward board. The Island Run internal system already consistently uses **"Treasure Path"** (e.g. `IslandRunLuckyRollDevOverlay.tsx`, `islandRunPostRareTreasurePathAction.ts`, `pendingTreasurePathResumeCtaLabel`). 

The standalone Lucky Roll board (`LuckyRollBoard.tsx`, `LuckyRollDiceShop.tsx`) and the game overlay entry still carry the old "Lucky Roll" user-facing label. The gating logic (`luckyRollStatus.available` in `App.tsx`) is already correct — Lucky Roll only appears when active. The problem is the **display name**, not the gating.

**User-facing "Lucky Roll" occurrences (non-internal):**

| File | Line | Text |
|------|------|------|
| `src/types/habitGames.ts` | 42 | `label: 'Lucky Roll'` |
| `src/features/gamification/daily-treats/LuckyRollBoard.tsx` | 274 | `aria-label="Lucky Roll Reward Board"` |
| `src/features/gamification/daily-treats/LuckyRollBoard.tsx` | 279 | `🎲 Lucky Roll Reward Run` (heading) |
| `src/features/gamification/daily-treats/LuckyRollBoard.tsx` | 281 | `aria-label="Close Lucky Roll"` |
| `src/features/gamification/daily-treats/LuckyRollDiceShop.tsx` | 67 | `aria-label="Lucky Roll Dice Shop"` |
| `src/features/gamification/daily-treats/LuckyRollDiceShop.tsx` | 73 | `🛒 Lucky Roll Dice Shop` (heading) |
| `src/features/gamification/daily-treats/LuckyRollDiceShop.tsx` | 81 | `aria-label="Close Lucky Roll Dice Shop"` |
| `src/components/GameBoardOverlay.tsx` | 292 | `aria-label="Open Lucky Roll reward"` |

**Preserved as-is (internal/economy identifiers):**
- All `'lucky_roll'` string IDs (economy source keys, localStorage keys, event names) — changing these would alter telemetry and schema
- `"Lucky Roll Dice: ..."` wallet stat line — preserved per dice-label convention
- CSS class names (`lucky-roll-board`, etc.) — internal, not user-facing

---

### Fix Applied

All eight user-facing occurrences renamed from "Lucky Roll" → "Treasure Path". See code changes for exact diffs.

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
| **Lucky Roll label** | User-facing text never updated from "Lucky Roll" to "Treasure Path" | `LuckyRollBoard.tsx`, `LuckyRollDiceShop.tsx`, `GameBoardOverlay.tsx`, `habitGames.ts` |
