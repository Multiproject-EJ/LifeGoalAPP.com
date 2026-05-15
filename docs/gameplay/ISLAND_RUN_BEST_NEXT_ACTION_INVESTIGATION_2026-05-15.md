# Island Run — Best Next Action Investigation
**Date:** 2026-05-15  
**Status:** Investigation only — no code changes  
**Scope:** Service design, priority table, UI placement, risks, and first-PR recommendation

---

## 1. Context

After clearing the dice economy issues (high-multiplier reward-bar scaling, label clarity,
Vision Quest double-credit, encounter direct dice removal, and docs alignment), the next
product goal is UX/retention:

> Island Run should always make the **next best action obvious and thumb-friendly**, so the
> player never wonders what to do next.

---

## 2. Current Action-State Map

The table below maps every candidate "next action" to the state fields that govern it,
and the existing pure helper (if any) that already encodes the decision.

| # | Action | Governing state fields | Existing helper | Notes |
|---|--------|------------------------|-----------------|-------|
| 1 | **Roll** | `dicePool`, `diceRegenState`, `isRolling` (UI-local) | `resolveDiceRegenConfig`, `resolveNextRollEtaMs` | `dicePool >= effectiveMultiplier` to roll |
| 2 | **Claim reward bar** | `rewardBarProgress`, `rewardBarEscalationTier`, `activeTimedEvent` | `canClaimIslandRunContractV2RewardBar(state)` | Already a single boolean |
| 3 | **Pay next stop ticket** | `essence`, `stopTicketsPaidByIsland`, `stopStatesByIndex`, `currentIslandNumber`, `cycleIndex` | `isStopTicketPaid`, `getStopTicketCost`, `payStopTicket` | Hatchery (index 0) is always free |
| 4 | **Open/complete Hatchery (set egg)** | `activeEggTier`, `activeEggSetAtMs`, `completedStopsByIsland`, `perIslandEggs` | `isIslandStopEffectivelyCompleted` (`stopId='hatchery'`) | Hatchery is done the moment an egg is set |
| 5 | **Collect or sell ready egg** | `activeEgg.hatchAtMs`, `activeEggIsDormant`, per-island egg `status` | `adviseEggSellChoice` (post-hatch choice) | "Ready" = `nowMs >= hatchAtMs && status !== 'collected' && status !== 'sold'` |
| 6 | **Complete Habit stop** | `stopStatesByIndex[1].objectiveComplete`, `stopTicketsPaidByIsland[island][1]` | `isStopTicketPaid`, `isStopCompleted` | Requires ticket paid AND player to perform the habit |
| 7 | **Complete Mystery stop** | `stopStatesByIndex[2].objectiveComplete`, ticket paid | Same pattern as Habit | Mystery may launch Vision Quest minigame |
| 8 | **Complete Wisdom stop** | `stopStatesByIndex[3].objectiveComplete`, ticket paid | Same pattern | — |
| 9 | **Fight / complete Boss** | `stopBuildStateByIndex[4]`, `bossTrialResolvedIslandNumber`, `currentIslandNumber` | `isBossArenaFullyBuilt`, `canChallengeBoss`, `getBossChallengeLockReason` | Boss requires arena at Level 3 first |
| 10 | **Build / fund building** | `stopBuildStateByIndex[n]`, `essence`, `stopStatesByIndex[n].buildComplete` | `isStopBuildFullyComplete`, `getStopUpgradeCost`, `getRemainingIslandBuildCost` | `attentionHint: 'affordable'` already computed in board |
| 11 | **Claim Island Clear** | `completedStopsByIsland`, `currentIslandNumber`, `stopBuildStateByIndex` (all L3) | `isIslandFullyCleared(islandNumber, completedStopIds)` | Fully cleared = all 5 stop IDs in `completedStopsByIsland[island]` |
| 12 | **Play active event / minigame** | `minigameTicketsByEvent[eventId]`, `activeTimedEvent`, event not expired | `getActiveEvent(state, nowMs)`, `openEventMinigame` | Tickets > 0 AND active event not expired |
| 13 | **Get more Island Dice / wait for regen** | `dicePool`, `diceRegenState`, `marketOwnedBundlesByIsland` | `resolveNextRollEtaMs`, `resolveFullRefillEtaMs` | Fallback when `dicePool < 1` |
| 14 | **Resolve stuck/blocked state** | Any inconsistency or error condition detected by action services | — | Diagnosis path; lowest priority unless something is actively broken |

### 2.1 State field sources

All fields listed above live on `IslandRunGameStateRecord` (defined in
`services/islandRunGameStateStore.ts`, lines 187–313). The canonical read path is:

```ts
import { getIslandRunStateSnapshot } from './islandRunStateStore';
const record = getIslandRunStateSnapshot(session); // stable reference, no tearing
```

In React components the hook `useIslandRunState(session, client)` wraps
`useSyncExternalStore` over the same store.

---

## 3. Existing Derived Helpers Catalogue

### 3.1 Reward bar
| Helper | File | Signature |
|--------|------|-----------|
| `canClaimIslandRunContractV2RewardBar` | `islandRunContractV2RewardBar.ts:469` | `(state: IslandRunRewardBarRuntimeSlice) => boolean` |
| `resolveRewardBarClaimPayoutPreview` | same:529 | preview payout without mutating |
| `resolveNextRewardKind` | same:171 | rotating reward kind |

### 3.2 Stop tickets
| Helper | File | Signature |
|--------|------|-----------|
| `isStopTicketPaid` | `islandRunStopTickets.ts:94` | `({ ticketsPaid, stopIndex }) => boolean` |
| `getStopTicketCost` | same:53 | `({ effectiveIslandNumber, stopIndex }) => number` |
| `getStopTicketsPaidForIsland` | same:70 | returns paid index list |
| `payStopTicket` (pure compute) | same:145 | returns `PayStopTicketResult` (ok/error) |

### 3.3 Stop completion
| Helper | File | Signature |
|--------|------|-----------|
| `isStopCompleted` | `islandRunStopCompletion.ts:5` | `(completedStops, stopId) => boolean` |
| `isIslandStopEffectivelyCompleted` | same:9 | includes hatchery egg-slot logic |
| `getStopCompletionBlockReason` | same:69 | human-readable block reason |

### 3.4 Boss
| Helper | File | Signature |
|--------|------|-----------|
| `isBossArenaFullyBuilt` | `islandRunBossEncounter.ts:14` | `(BossBuildStateInput) => boolean` |
| `canChallengeBoss` | same:27 | arena built + not yet defeated |
| `getBossChallengeLockReason` | same:33 | null = unlocked, string = reason |

### 3.5 Egg state
| Helper | File | Signature |
|--------|------|-----------|
| `adviseEggSellChoice` | `islandRunEggSellAdvisor.ts:25` | **Only existing advisor** — post-hatch choice (shards vs dice) |
| `getEggStageName / getEggStageEmoji` | `eggService.ts:48,61` | display helpers |
| Egg "ready" check | — | No dedicated helper yet — inlined in component as `nowMs >= hatchAtMs` |

### 3.6 Building
| Helper | File | Signature |
|--------|------|-----------|
| `isStopBuildFullyComplete` | `islandRunContractV2EssenceBuild.ts:34` | `(buildState) => boolean` |
| `getStopUpgradeCost` | same:146 | next-level cost |
| `getRemainingIslandBuildCost` | same:183 | total essence still owed |

### 3.7 Island clear
| Helper | File | Signature |
|--------|------|-----------|
| `isIslandFullyCleared` | `islandRunProgression.ts:7` | `(islandNumber, completedStopIds) => boolean` |
| `getRequiredStopIdsForIsland` | same:3 | canonical stop id list |

### 3.8 Dice / regen
| Helper | File | Signature |
|--------|------|-----------|
| `resolveDiceRegenConfig` | `islandRunDiceRegeneration.ts:33` | `(playerLevel) => { maxDice, regenIntervalMinutes }` |
| `applyDiceRegeneration` | same:74 | applies catch-up ticks |
| `resolveNextRollEtaMs` | same:147 | ms until dicePool ≥ target |
| `resolveFullRefillEtaMs` | same:173 | ms until dicePool == maxDice |

### 3.9 Active event / minigame tickets
| Helper | File | Signature |
|--------|------|-----------|
| `getActiveEvent` | `islandRunEventEngine.ts:144` | `(state, nowMs) => ActiveEventDescriptor | null` |
| `openEventMinigame` | same:371 | resolves `EventMinigameLaunchDescriptor` or null (checks `ticketsAvailable`) |
| `parseEventId` | same:107 | canonicalises stored event id string |

---

## 4. Proposed Pure Service: `resolveIslandRunBestNextAction`

### 4.1 Location

```
src/features/gamification/level-worlds/services/islandRunBestNextActionAdvisor.ts
```

No UI imports. No side effects. No persistence calls.

### 4.2 Input type

```ts
export interface IslandRunBestNextActionInput {
  /** Full authoritative game record from getIslandRunStateSnapshot(session). */
  record: IslandRunGameStateRecord;
  /** Current wall-clock milliseconds (pass Date.now() at call-site). */
  nowMs: number;
  /** Player level (used for dice regen config). Read from user profile, not game record. */
  playerLevel: number;
}
```

### 4.3 Output type

```ts
export type IslandRunBestNextActionKind =
  | 'claim_island_clear'
  | 'claim_reward_bar'
  | 'collect_egg'
  | 'set_egg_hatchery'
  | 'pay_stop_ticket'
  | 'complete_active_stop'
  | 'challenge_boss'
  | 'fund_building'
  | 'roll'
  | 'play_event_minigame'
  | 'wait_for_dice_regen'
  | 'buy_dice'
  | 'resolve_stuck';

export type IslandRunBestNextActionUrgency = 'critical' | 'high' | 'normal' | 'low';

export interface IslandRunBestNextActionResult {
  action: IslandRunBestNextActionKind;
  urgency: IslandRunBestNextActionUrgency;
  /** Short human-readable label for a footer CTA or banner. Max ~30 chars. */
  ctaLabel: string;
  /** One-sentence explanation for debug / accessibility. */
  reason: string;
  /**
   * Optional metadata that lets the UI navigate directly to the relevant
   * panel without extra state reads.
   */
  meta?: {
    stopId?: string;          // for pay_stop_ticket / complete_active_stop
    stopIndex?: number;       // for pay_stop_ticket / fund_building
    eventId?: string;         // for play_event_minigame
    regenEtaMs?: number;      // for wait_for_dice_regen
  };
}
```

### 4.4 Signature

```ts
export function resolveIslandRunBestNextAction(
  input: IslandRunBestNextActionInput,
): IslandRunBestNextActionResult
```

All imports come from existing selector services; no new logic is invented.

---

## 5. Priority Order

Rules are evaluated **top-to-bottom**; the first matching rule wins.

| Priority | Rule / Condition | Action returned | Urgency | Rationale |
|----------|------------------|-----------------|---------|-----------|
| 1 | `isIslandFullyCleared(island, effectiveCompletedStops)` AND all `stopBuildStateByIndex[n].buildLevel >= 3` | `claim_island_clear` | `critical` | Island clear is the highest-value moment; never bury it. |
| 2 | `canClaimIslandRunContractV2RewardBar(record)` | `claim_reward_bar` | `critical` | Bar filled = immediate dopamine tap; should never sit unclaimed. |
| 3 | Egg is ready: `activeEgg && nowMs >= activeEgg.hatchAtMs && status not in ['collected','sold']` | `collect_egg` | `high` | Hatched egg blocking hatchery slot is a common friction point. |
| 4 | Hatchery (stop 0) not effectively completed: `!isIslandStopEffectivelyCompleted({stopId:'hatchery', ...})` | `set_egg_hatchery` | `high` | Hatchery must be done first; blocks all downstream stops. |
| 5 | Next unpaid stop ticket: any `stopIndex` in `[1..4]` where `!isStopTicketPaid` AND previous stop is complete AND `essence >= cost` | `pay_stop_ticket` | `high` | Player has the essence and can unlock the next stop immediately. |
| 6 | Boss arena built (`isBossArenaFullyBuilt`) and boss not yet defeated (`canChallengeBoss`) | `challenge_boss` | `high` | Boss fight is a major event; surface it prominently. |
| 7 | An open stop has its ticket paid but `objectiveComplete === false` | `complete_active_stop` | `normal` | Player is mid-stop; guide them to finish it. |
| 8 | Any `stopBuildStateByIndex[n].buildLevel < 3` AND `essence >= nextLevelCost` — prefer the stop that un-blocks the boss (index 4) or is earliest | `fund_building` | `normal` | Building drives progression; surface when affordable. |
| 9 | `dicePool >= 1` (or `>= effectiveMultiplier`) | `roll` | `normal` | Default action — dice available, go roll. |
| 10 | Active event and `minigameTicketsByEvent[eventId] > 0` | `play_event_minigame` | `low` | Tickets available; nudge player to play minigame. |
| 11 | `dicePool < 1` and regen timer running (`diceRegenState` valid and pool < maxDice) | `wait_for_dice_regen` | `low` | Tell player how long until next die; reduce anxiety. |
| 12 | `dicePool < 1` and `dicePool >= maxDice` (fully spent, no regen left before cap) | `buy_dice` | `low` | Hard out-of-dice; suggest shop. |
| 13 | None of the above match cleanly (e.g. `dicePool = 0`, no regen, no event, island complete but clear blocked by missing build) | `resolve_stuck` | `low` | Diagnostic fallback; log the unusual state for investigation. |

> **Notes on ties:**
> - Rules 5 and 6 may both be true simultaneously. Rule 5 is listed first because
>   paying a ticket is a lighter action than a boss fight, but product may choose to
>   swap 5 ↔ 6 after playtesting.
> - Rules 3 and 4 may both be true on a fresh island. Rule 3 is listed first because
>   a dormant egg from a previous island needs collection before a new egg can be set.
> - Rule 8 filters to the **most impactful** affordable build:
>   boss-arena (index 4) first, then ascending stop index.

---

## 6. Required State Inputs

The pure function needs only a `IslandRunGameStateRecord` snapshot plus `nowMs` and
`playerLevel`.  All fields it reads are already present on the record:

| Field | Used for |
|-------|----------|
| `currentIslandNumber` | island clear check, ticket cost scaling |
| `cycleIndex` | `getEffectiveIslandNumber` for ticket/build cost |
| `completedStopsByIsland` | island clear, stop completion |
| `stopTicketsPaidByIsland` | ticket unlock |
| `stopStatesByIndex` | objective / build complete per stop |
| `stopBuildStateByIndex` | building level, affordability |
| `bossTrialResolvedIslandNumber` | boss defeated check |
| `essence` | ticket and build affordability |
| `activeEggTier`, `activeEggSetAtMs`, `activeEggHatchDurationMs`, `activeEggIsDormant`, `perIslandEggs` | egg readiness |
| `dicePool`, `diceRegenState` | roll availability, regen ETA |
| `rewardBarProgress`, `rewardBarEscalationTier`, `activeTimedEvent` | reward bar claim |
| `minigameTicketsByEvent` | event minigame availability |

No new fields are required. No new runtime state is needed.

---

## 7. Suggested UI Display Locations

The advisor result is a **read-only hint**. It must never write state. All UI placement
options below simply read the `IslandRunBestNextActionResult` and render it.

### 7.1 Footer CTA chip (highest impact, safest)
- **Where:** Below the dice/roll button in the board footer, or as an overlay chip
  that appears when the roll button is idle.
- **Render rule:** Show only when `urgency === 'critical' || urgency === 'high'` to
  avoid crowding the UI.
- **Content:** `result.ctaLabel` (max ~30 chars).
- **Tap target:** Navigates to the relevant panel (stop modal, build modal, egg panel).
- **Risk:** Low. Purely additive. Roll button stays primary.

### 7.2 Stop/landmark HUD attention dot
- **Where:** The orbit buttons around the island board that open each stop.
- **Render rule:** Pulse the dot on the stop matching `result.meta.stopId` when
  `action` is `pay_stop_ticket`, `complete_active_stop`, `challenge_boss`, or
  `fund_building`.
- **Content:** Small coloured ring (green = affordable/complete, orange = pending).
- **Risk:** Very low. The `attentionHint: 'affordable'` pattern already exists in the
  board (line 942, 3901) — this extends the same convention.

### 7.3 Build panel hint
- **Where:** Inside the existing Build Panel / stop upgrade modal.
- **Render rule:** When `action === 'fund_building'` and `meta.stopIndex` matches the
  currently open stop, show a short hint line: "Fund this building to unlock the boss"
  or similar.
- **Risk:** Low. Purely additive inside an already-open modal.

### 7.4 Top helper banner (contextual / dismissible)
- **Where:** A thin sticky banner below the island name header.
- **Render rule:** Show for `action` in `['set_egg_hatchery', 'collect_egg', 'claim_island_clear']`.
  These are actions the player might forget about entirely.
- **Content:** `result.ctaLabel` + dismiss X.
- **Risk:** Medium. Banners compete for attention. Must be dismissible and must not
  reappear immediately. Mirror the `getEggReadyBannerKey` localStorage-dismiss pattern
  already used for the egg-ready banner (board line 416–419).

### 7.5 Out-of-dice panel
- **Where:** The existing "You're out of dice" prompt (board line 4535).
- **Render rule:** When `action === 'wait_for_dice_regen'`, replace or augment the
  prompt copy with "Next die in MM:SS — meanwhile, complete your open stop" (or
  whichever secondary action applies).
- **Risk:** Low. Replaces static copy with dynamic, context-aware copy.

---

## 8. Risk List

| Risk | Severity | Mitigation |
|------|----------|------------|
| **Fighting existing buttons** — BNA chip overlaps or visually competes with the roll button | Medium | Render chip only when `urgency >= high`; position below roll button, not over it |
| **Misleading player with stale state** — state snapshot is from a few frames ago | Low | Always read from `getIslandRunStateSnapshot(session)` (store is updated before network round-trip, so it is effectively fresh) |
| **Pushing build when player should roll** — player is in the middle of a dice burst | Low | Priority table places `roll` above `fund_building`; if dice are available the advisor returns `roll` |
| **Too many CTAs** — multiple "urgent" actions at once | Medium | Cap displayed CTAs to 1 (the top-priority result). The priority table resolves ties deterministically |
| **UI mutation leak** — a UI handler reads BNA and accidentally calls a write path | High | The advisor is a pure function in a service file with no UI imports; it returns data only. Architecture contract forbids gameplay writes in UI components |
| **Advisor returns wrong action during tutorial** — first-session tutorial has its own state machine | Medium | Check `firstSessionTutorialState !== 'complete'` at the top of the resolver; if the tutorial is still active, return `null` (or a special `tutorial` action kind) and let the existing tutorial flow drive the UI |
| **Regen ETA off by one** — `resolveNextRollEtaMs` uses `lastRegenAtMs` anchor; if regen is applied lazily the countdown may jump | Low | The board already runs `applyDiceRegeneration` on focus restore; the advisor should do the same before calling `resolveNextRollEtaMs` |
| **Boss priority conflict** — advisor says "challenge boss" but the player is mid-essence-grind | Low | Rule 8 (fund_building) only fires when essence >= cost; rule 6 (challenge_boss) only fires when the arena is complete. No conflict |
| **Dormant egg confusion** — dormant egg from previous island appears as "collect egg" but is on a different island panel | Low | Check `activeEggIsDormant` flag; if dormant, surface "Collect dormant egg" with appropriate meta rather than directing to the current island's hatchery |

---

## 9. Smallest Safe First Implementation PR

### PR scope

> Create the pure `resolveIslandRunBestNextAction` function and wire it to a single
> **footer chip** visible only on `urgency === 'critical'`.

### Checklist

- [ ] **New file:** `src/features/gamification/level-worlds/services/islandRunBestNextActionAdvisor.ts`
  - Exports `resolveIslandRunBestNextAction(input)`.
  - Imports only existing selector functions (no new logic invented).
  - Handles tutorial guard: returns `null` when `firstSessionTutorialState !== 'complete'`.
  - Handles `activeEggIsDormant` correctly.

- [ ] **New test file:** `src/features/gamification/level-worlds/services/__tests__/islandRunBestNextActionAdvisor.test.ts`
  - Uses the existing test harness (`testHarness.ts`).
  - Covers at minimum: island clear eligible, reward bar claimable, egg ready, stop ticket payable, roll available, dice depleted.
  - No snapshot tests — pure unit assertions.

- [ ] **UI wire-up (additive only):** inside `IslandRunBoardPrototype.tsx`
  - Call `resolveIslandRunBestNextAction({ record: storeState, nowMs: Date.now(), playerLevel })` inside a `useMemo` keyed on `storeState`.
  - When `result?.urgency === 'critical'`, render a small chip **below the roll button** (not overlapping it) with `result.ctaLabel`.
  - Chip tap navigates to the relevant panel using the same `setActiveStopId` / `setIslandClearModalOpen` / etc. calls already in the component.
  - No new `useState` mirrors of gameplay fields.

- [ ] **Architecture guard passes:** `npm run check:island-run-architecture-guards`

- [ ] **Tests pass:** `npm run test:island-run`

- [ ] **Build passes:** `npm run build`

### What is explicitly NOT in this PR

- No `high` / `normal` / `low` urgency UI placements yet.
- No attention dots on stop orbit buttons.
- No top helper banner.
- No out-of-dice panel augmentation.
- No telemetry events.
- No A/B flag (add one only if the team wants a staged rollout).

### Estimated file changes

| File | Change type |
|------|-------------|
| `islandRunBestNextActionAdvisor.ts` | New (~120 lines) |
| `__tests__/islandRunBestNextActionAdvisor.test.ts` | New (~80 lines) |
| `IslandRunBoardPrototype.tsx` | +~15 lines (useMemo + conditional chip render) |

---

## 10. Appendix: Key File References

| File | Purpose | Key exports |
|------|---------|-------------|
| `services/islandRunGameStateStore.ts` | `IslandRunGameStateRecord` type (lines 187–313) | Full state shape |
| `services/islandRunStateStore.ts` | In-memory store mirror | `getIslandRunStateSnapshot`, `commitIslandRunState` |
| `hooks/useIslandRunState.ts` | React hook binding | `useIslandRunState` |
| `services/islandRunContractV2RewardBar.ts:469` | Reward bar | `canClaimIslandRunContractV2RewardBar` |
| `services/islandRunStopTickets.ts:94` | Ticket unlock | `isStopTicketPaid`, `getStopTicketCost` |
| `services/islandRunStopCompletion.ts:5` | Stop state | `isStopCompleted`, `isIslandStopEffectivelyCompleted` |
| `services/islandRunBossEncounter.ts:27` | Boss | `canChallengeBoss`, `getBossChallengeLockReason` |
| `services/islandRunContractV2EssenceBuild.ts:34` | Buildings | `isStopBuildFullyComplete`, `getStopUpgradeCost` |
| `services/islandRunProgression.ts:7` | Island clear | `isIslandFullyCleared` |
| `services/islandRunDiceRegeneration.ts:147` | Dice regen | `resolveNextRollEtaMs`, `resolveFullRefillEtaMs` |
| `services/islandRunEventEngine.ts:144` | Active event | `getActiveEvent`, `openEventMinigame` |
| `services/islandRunEggSellAdvisor.ts:25` | Egg sell | `adviseEggSellChoice` ← reference pattern for BNA |
| `src/config/islandRunFeatureFlags.ts` | Feature flags | `getIslandRunFeatureFlags`, `isIslandRunFeatureEnabled` |
