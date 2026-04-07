# Island Run Canonical Gameplay Migration Plan (Production Mapping)

Date: 2026-04-07  
Source contract: `docs/gameplay/CANONICAL_GAMEPLAY_CONTRACT.md`

## 1) Executive summary

Current production Island Run is close to the canonical loop in structure (tile movement, 5-stop island, boss final gate), but it still carries legacy mechanics that directly conflict with the new contract:

- island timers still gate progression and can auto-advance islands;
- hearts remain in the board-loop energy path via heart→dice conversion and boss lives;
- stop architecture is still stop-as-tile and not truly sequential (multiple non-boss stops are simultaneously active);
- reward loop is shard milestone-based, not event-scoped reward-bar progression;
- timed events are not modeled as one persistent active event with expiry replacement.

Safest migration path is a **feature-flagged contract-v2 runtime layer** that introduces new state in parallel, routes critical board decisions through v2 selectors, and only then deprecates legacy fields and flows.

---

## 2) Current production systems to preserve as-is (or near as-is)

### 2.1 Runtime persistence infrastructure (preserve)
- Runtime hydrate/persist pipeline in `islandRunRuntimeState.ts`, `islandRunRuntimeStateBackend.ts`, and `islandRunGameStateStore.ts` is already robust and versioned enough to carry additional v2 fields.
- Existing `runtimeVersion` and patch-based persistence pattern is suitable for additive migration.

### 2.2 Multi-device/session safety (preserve)
- Active-session ownership and hydration reconciliation in the board component should remain unchanged during gameplay-contract migration.

### 2.3 Board rendering + movement shell (preserve with config changes)
- Tile anchor rendering and movement animation shell can stay; only assumptions about stop tiles and fixed size should become config-driven.

### 2.4 Existing stop IDs and boss identity (preserve semantics)
- Existing `hatchery` and `boss` identifiers can be retained as stable IDs while replacing dynamic stop naming with canonical sequence naming.

### 2.5 Egg and boss subsystem primitives (preserve, rewire outputs)
- Egg runtime ledger and boss-trial flow can be retained, but rewards and completion gating must be moved to contract-v2 rules.

---

## 3) Current production systems to refactor

### 3.1 Stop progression state machine (high priority)
**Where:**
- `src/features/gamification/level-worlds/services/islandRunStops.ts`
- `src/features/gamification/level-worlds/services/islandRunStopCompletion.ts`
- `src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx`

**Current issue:** non-boss stops are all marked active; completion is mostly checklist-based and not strictly sequential with objective+build dual condition.

**Refactor direction:**
- Introduce `activeStopIndex` (0..4) and explicit stop progression object.
- Replace “stop completed list” as the primary gate with per-stop dual-condition state:
  - objectiveComplete
  - buildComplete (Essence spend)
- Keep `completedStopsByIsland` temporarily as a derived compatibility ledger.

### 3.2 Board contract decoupling (medium-high)
**Where:**
- `islandBoardTileMap.ts`
- `islandBoardLayout.ts`
- `islandRunStops.ts`
- board component stop-map usage.

**Current issue:** hard-coded 17-tile loop and stop tile indices (0/4/8/12/16).

**Refactor direction:**
- Introduce board-config object with tile count and stop rendering separated from tile map.
- Keep current 17-tile geometry as default layout profile for now, but remove game logic dependence on stop tile positions.

### 3.3 Energy/currency flow (high)
**Where:**
- `islandRunEconomy.ts`
- `IslandRunBoardPrototype.tsx` (roll handling, boss lives, utility actions, HUD)
- runtime state interfaces/store/backend.

**Current issue:** hearts are still core fallback energy; dice not yet sole board energy; no Essence currency.

**Refactor direction:**
- Introduce `essence` as separate board-loop spend currency.
- Move all board movement spend checks to dice-only.
- Reframe hearts as legacy/non-core currency then remove from board loop after compatibility window.

### 3.4 Reward loop migration (high)
**Where:**
- Board HUD shard-pill logic in `IslandRunBoardPrototype.tsx`
- shard threshold/reward helpers currently backing collectible bar
- runtime state currently stores shard-tier progression, not reward-bar/event escalation state.

**Current issue:** current progress loop is lifetime shard milestone chain; contract requires claim-reset reward bar with escalation inside active timed event and full reset on event change.

**Refactor direction:**
- Add event-bound reward-bar state fields.
- Keep shard collectibles as separate long-term system (if retained) rather than core reward-bar driver.

### 3.5 Timed event/minigame model (high)
**Where:**
- `islandRunMinigameService.ts`
- `islandRunMinigameRegistry.ts`
- board launcher state in `IslandRunBoardPrototype.tsx`.

**Current issue:** minigame launcher exists, but no persisted single active timed event identity/lifecycle.

**Refactor direction:**
- Introduce single persisted `activeTimedEvent` object with `eventId`, `startedAtMs`, `expiresAtMs`, and event-scoped progression stats.
- Drive reward-bar escalation and event token outputs from this object.

---

## 4) Current production systems to remove or bypass

### 4.1 Island timer gating and expiry auto-travel (must bypass first, remove later)
**Where:** board timer/expiry effects and `islandStartedAtMs` + `islandExpiresAtMs` runtime usage.

**Risk:** very high; currently auto-advances island independent of stop completion, which directly violates contract.

**Plan:**
1. Under feature flag, bypass timer as progression gate immediately.
2. Keep fields for backward compatibility and telemetry.
3. Remove timer-driven travel flow after validating no consumers remain.

### 4.2 Hearts as core energy + boss life cost (must bypass early)
**Where:** roll conversion, boss fail/retry messaging, daily heart rewards, market heart bundles, utility heart refill.

**Risk:** high; deeply wired in UX and economy.

**Plan:**
1. Stop using hearts in roll eligibility under flag.
2. Remove heart-based boss-attempt blocking in v2 rules.
3. Retain heart wallet field temporarily for non-core rewards/shop compatibility.

### 4.3 Stop-as-tile assumptions (bypass before full removal)
**Where:** stop indices in tile map/layout/stops; landing behavior opens stop by tile.

**Risk:** medium-high due to broad UI coupling.

**Plan:**
1. Keep visual stop markers for now.
2. Remove logic coupling that requires landing on stop tiles to progress active stop.
3. Later remove stop tile type from core tile generator.

### 4.4 Non-sequential stop activation (must remove)
**Where:** `stopStateMap` currently marks all non-boss stops active.

**Risk:** high to progression correctness, low technical complexity.

**Plan:** replace with deterministic state machine keyed by `activeStopIndex`.

### 4.5 Outdated reward bar assumptions (must bypass)
**Where:** shard milestone claim system acting as visible board bar.

**Risk:** medium-high due to player-facing economy expectations.

**Plan:** ship canonical reward bar in parallel; keep shard lane as separate optional meta track during transition.

---

## 5) Proposed runtime state changes

## 5A) Add now (contract-v2 fields)

### Progression / stops
- `activeStopIndex: number` (0..4)
- `stopStatesByIndex: Array<{ objectiveComplete: boolean; buildComplete: boolean; completedAtMs?: number }>`
- `stopBuildStateByIndex: Array<{ requiredEssence: number; spentEssence: number; buildLevel: number }>`
- `bossState: { unlocked: boolean; objectiveComplete: boolean; buildComplete: boolean; completedAtMs?: number }`

### Economy
- `essence: number`
- `essenceLifetimeEarned: number`
- `essenceLifetimeSpent: number`
- `diceRegenState?: { maxDice: number; regenRatePerHour: number; lastRegenAtMs: number }` (if player-level-linked regen is implemented now)

### Reward bar
- `rewardBarProgress: number`
- `rewardBarThreshold: number`
- `rewardBarClaimCountInEvent: number`
- `rewardBarEscalationTier: number`
- `rewardBarLastClaimAtMs: number | null`
- `rewardBarBoundEventId: string | null`

### Timed event
- `activeTimedEvent: { eventId: string; eventType: string; startedAtMs: number; expiresAtMs: number; version: number } | null`
- `activeTimedEventProgress: { feedingActions: number; tokensEarned: number; milestonesClaimed: number }`

### Collectibles
- `stickerProgress: { fragments: number; guaranteedAt?: number; pityCounter?: number }`
- `stickerInventory: Record<string, number>`

## 5B) Keep temporarily for compatibility
- `hearts`
- `dailyHeartsClaimedDayKey`
- `islandStartedAtMs`
- `islandExpiresAtMs`
- `completedStopsByIsland` (derived mirror while migrating)
- `tokenIndex` (movement index still useful)
- shard-era fields (`islandShards`, `shardTierIndex`, `shardClaimCount`) as non-core meta loop during transition

## 5C) Deprecate later
- Heart-to-dice conversion assumptions
- Timer-based island progression fields (`islandStartedAtMs`, `islandExpiresAtMs`) as gameplay gates
- Stop-tile completion dependencies
- Any UI/telemetry labels implying “hearts = lives/energy” for core loop

---

## 6) Sequential stop implementation (target behavior)

1. Build canonical fixed stop sequence in runtime config:
   - 0 Hatchery
   - 1 Habit
   - 2 Breathing
   - 3 Wisdom
   - 4 Boss

2. Derive status per stop from two gates:
   - `objectiveComplete`
   - `buildComplete` (Essence-funded)

3. `activeStopIndex` points to the first stop not fully complete.

4. A stop is “complete” only when both gates are true.

5. Unlock rule:
   - on stop complete, set `activeStopIndex = previous + 1`
   - boss can only become active when indices 0..3 fully complete.

6. Board interaction rule:
   - landing on tiles may accelerate objective progress and essence earn,
   - but cannot skip or complete future stops out-of-order.

7. Compatibility strategy:
   - continue writing `completedStopsByIsland` as a projection from `stopStatesByIndex` for old surfaces until fully cut over.

---

## 7) Energy and currency migration path

### Hearts → removed from core board loop
- Phase 1: disable hearts in roll gating under flag, keep wallet display for compatibility.
- Phase 2: convert heart reward sources to dice/essence alternatives in Island Run context.
- Phase 3: remove heart references from Island Run core HUD and boss retry logic.

### Dice → sole movement energy
- Movement, roll eligibility, and core board interactions depend only on dice.
- Add (or defer) player-level-linked regen via dedicated `diceRegenState` rather than heart conversion.

### Essence → board-loop build currency
- Add Essence earnings primarily from feeding and selected reward bar outputs.
- Spend only on stop/build progression gating.

### Gold (coins) → preserve as persistent economy
- Keep coins as external/general economy currency; avoid making coins the stop-gate spend path.

---

## 8) Reward bar migration design

1. Introduce event-bound reward bar independent from shard milestone bar.
2. Feeding tiles become primary `rewardBarProgress` input; other tiles contribute minimally.
3. On claim:
   - payout generated from current escalation tier,
   - `rewardBarProgress` resets to 0,
   - `rewardBarEscalationTier` and `rewardBarClaimCountInEvent` increase.
4. On timed-event swap (eventId change):
   - full reward bar reset (progress + escalation + claim count).
5. Payout table should prioritize:
   - minigame tokens,
   - occasional dice,
   - stickers / sticker fragments.
6. Keep shard milestone system temporarily as a separate non-core lane if needed for economy stability.

---

## 9) Timed event migration design

Target invariant: exactly one active timed event per player.

Implementation shape:
- Persist one `activeTimedEvent` object in runtime state.
- Resolve on load:
  - if missing, assign current live-ops event;
  - if expired, rotate to next event and reset event-bound systems (reward bar, escalation, event progress).
- Do **not** reset event on island travel.
- Minigame launcher reads from `activeTimedEvent.eventType` to select available minigame/milestones.

---

## 10) Recommended phased implementation plan (safe rollout)

## Phase 0 — Read-only mapping & telemetry hardening
- Add analytics for current conflicts (timer expiry auto-advance, heart conversions, out-of-order stop completion).
- No gameplay behavior changes.

## Phase 1 — Runtime schema extension (additive)
- Add new v2 fields to runtime table/interfaces/backend (activeStopIndex, stop states, essence, reward bar/event fields, sticker fields).
- Keep all legacy fields untouched.
- Gate usage with `island_run_contract_v2` feature flag.

## Phase 2 — Sequential stop state machine behind flag
- Implement v2 stop resolver from new fields.
- Keep writing legacy `completedStopsByIsland` projection.
- Update UI to show exactly one active stop in v2 mode.

## Phase 3 — Timer bypass for progression under flag
- Disable timer expiry auto-advance in v2.
- Keep timer display optionally as non-gating cosmetic countdown if needed.
- Ensure island completion requires 5-stop completion + boss.

## Phase 4 — Energy migration (dice-only core)
- Remove heart fallback from roll gating in v2.
- Keep heart wallet reads/writes for compatibility integrations during transition.
- Introduce (or stub) dice regeneration fields if player-level-linked regen is planned in same release train.

## Phase 5 — Essence + build-gate rollout
- Turn on Essence earning paths from board/reward loop.
- Require Essence-funded `buildComplete` for each stop in v2.

## Phase 6 — Timed event singleton + reward bar v2
- Introduce persistent single active event lifecycle.
- Launch event-bound reward bar with claim-reset/escalation/event-reset behavior.
- Keep shard bar either hidden in v2 or relocated as separate meta module.

## Phase 7 — Economy rebalance + cleanup
- Rebalance payouts across stop/boss/egg/reward/minigame channels toward dice+essence+stickers.
- Remove dead heart/timer/stop-tile logic paths after telemetry confidence window.

## Phase 8 — Full cutover
- Default feature flag ON.
- Migrate remaining users on hydration by backfilling missing v2 fields.
- Archive legacy compatibility writes/reads in a follow-up cleanup migration.

---

## 11) Top migration risks

1. **Economy shock risk** (high): removing heart conversion without compensating dice flow can create stall points.  
   Mitigation: phase-gated rollouts + shadow balancing.

2. **State divergence risk** (high): dual-write legacy + v2 stop state may drift.  
   Mitigation: deterministic projection functions and invariants in tests.

3. **Live session migration risk** (high): users mid-island at rollout may get inconsistent stop/timer states.  
   Mitigation: one-time hydration reconciler that maps old state into v2 defaults.

4. **Reward expectation risk** (medium-high): replacing shard bar behavior may feel like nerf/break.  
   Mitigation: overlap period where shard lane remains visible as separate meta track.

5. **UI coupling risk** (medium): board component is monolithic; small logic changes can create regressions.  
   Mitigation: isolate v2 selectors/services first, then progressively route UI handlers.

6. **Event lifecycle risk** (medium): timed-event scheduler bugs could repeatedly reset reward bar.  
   Mitigation: bind resets strictly to `eventId` change and test expiry boundary cases.
