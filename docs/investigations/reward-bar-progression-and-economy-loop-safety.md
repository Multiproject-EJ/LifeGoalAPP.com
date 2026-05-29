# Island Run Reward-Bar Progression & High-Dice Economy Loop Safety Investigation

Date: 2026-05-28
Scope: Investigation only (no gameplay tuning, no schema changes, no architecture changes).

## Executive summary

- **Current reward-bar pacing is mixed deterministic + formulaic**: early tiers are hardcoded (`4,6,8,12,16,24,32,48,64,80`), then continue via a quadratic tail formula; reward kinds rotate deterministically (`dice → essence → minigame tokens → sticker fragments`).
- **Multiplier scaling is currently asymmetric by design**: roll cost scales linearly with multiplier, and reward-bar progress also scales linearly with multiplier. This creates fast claim bursts at high multipliers, but escalation increases thresholds quickly enough to reduce chain length.
- **Dice-positive risk exists in bounded windows, not obviously infinite by default**: reward-bar dice can spike (especially sticker completion +100 dice), and event side systems (Lucky Roll, Space Excavator milestones, daily treats, welcome/tutorial grants) can inject additional dice. However, base roll cost at ×200 remains very high, and existing tests include a direct assertion that pure x200 reward-bar farming burns dice overall.
- **Preliminary safety verdict**: **PASS (provisional)** for the specific modeled loop “max-roll board farming with reward-bar claims only,” but **FAIL-RISK** for broader connected systems if multiple external dice sources are concurrently optimized (especially repeatable event reward chains + reward-bar + daily systems) without an economy budget governor.

## 1) Reward-bar architecture and progression definition

### Canonical reward-bar resolver

Primary authority:
- `src/features/gamification/level-worlds/services/islandRunContractV2RewardBar.ts`

Key mechanics:
- Timed-event rotation templates + ladder ids are defined in `TIMED_EVENT_SEQUENCE`.
- Progress sources: tile, creature feed, encounter resolve, event minigame complete.
- Progress values per tile type: chest=2, micro=1, currency=1.
- Early threshold ladder: `4, 6, 8, 12, 16, 24, 32, 48, 64, 80`.
- Post-hook tail: `80 + linear(10*t) + quadratic(2*t^2)` for tiers beyond index 9.
- Reward rotation is deterministic and fixed: `dice`, `essence`, `minigame_tokens`, `sticker_fragments`.
- Claim overflow carries into next tier (chain behavior), capped by `resolveChainedRewardBarClaims(maxChain<=10)`.

### Reward payout formulas

Payouts are formula-driven by escalation tier:
- Dice base: `5 + tier*3`
- Essence base: linear to tier 10, then softer slope
- Tokens base: `6 + tier`
- Sticker fragments: capped ramp 1→3
- Sticker completion bonus: `+100 dice` and `+50 essence` per full sticker

This is not target-driven payout proportionality; target threshold and payout formulas are independently defined.

## 2) Where progression and payout are applied in runtime

- **Progress application**: `applyIslandRunContractV2RewardBarProgress(...)` via event engine wrapper `recordEventProgress(...)` and tile action orchestration.
- **Claim execution**: `claimIslandRunContractV2RewardBar(...)`, then state write in `islandRunClaimRewardAction.ts`.
- **Tile integration path**: `executeIslandRunTileRewardAction(...)` computes essence + reward-bar progress together under the action lock and writes once.

## 3) Scaling checks requested

### Does reward-bar target/payout scale with...

- **Roll multiplier**: **Yes** for progress contribution (`applyMultiplierToProgress`), not direct payout scalar.
- **Island number**: **No** direct threshold/payout scaling by island number in reward-bar service.
- **Player dice balance**: **Indirectly** via multiplier unlock tiers only.
- **Event state**: **Yes** event binding and reset semantics are event-scoped; reward-bar state resets on event change.
- **Dev mode**: No direct dev branch in core reward-bar resolver; dev grant paths exist elsewhere.
- **Progression index/tier**: **Yes** thresholds and payouts both use escalation tier.
- **Reward tier**: Yes, via deterministic reward-kind rotation by claim count.

## 4) Competing configs / fallback risks

- Reward-bar core appears centralized in `islandRunContractV2RewardBar.ts`.
- Still, there are legacy compatibility surfaces (runtime patch pathways and mixed migration code) across broader Island Run services.
- Event mismatch protection exists: if `rewardBarBoundEventId` diverges from active event id, reward bar fully resets to current event baseline.
- Fallback/default risk still exists at hydration/sanitization layers if invalid values are read; mitigation is mostly coercion/flooring, not strict invariant repair.

## 5) Invalid progression index risk (persisted/local/remote)

- Sanitization and hydration run through `islandRunGameStateStore` and runtime patch backends.
- Reward-bar tier/claim fields are repeatedly floored/clamped in resolver functions (`Math.floor`, `Math.max`) which prevents NaN/negative explosion but does not enforce strict upper economic bounds.
- Chain claims are bounded per resolution call (`maxChain` bounded to 10), reducing accidental runaway in one tick.

## 6) Dice inflow map (Island Run-connected)

### Core loop inflows
- Reward bar claim dice payout (`islandRunClaimRewardAction.ts` via contract v2 payout).
- Sticker completion bonus dice (+100 each completed sticker) from reward-bar claims.

### Event/minigame inflows
- Space Excavator campaign milestone rewards can grant dice (`spaceExcavatorCampaignProgress.ts` + claim action in `islandRunStateActions.ts`).
- Lucky Roll reward banking can grant dice (`islandRunLuckyRollAction.ts`).
- Event tickets are primarily sourced by reward-bar token claims and spent in timed minigames.

### Other gameplay-linked inflows
- Passive dice regeneration (`islandRunRuntimeRegen.ts` / `islandRunDiceRegeneration.ts` path).
- Daily treat dice (verified by tests in minigame consolidation phase 2).
- First-session/tutorial/welcome pack rewards grant dice in dedicated actions.
- Dev/admin grant paths exist (dev-only, not economy baseline).

### Important non-inflow clarification
- Board tiles do **not** directly award dice in canonical contract paths; dice gains come through claims/rewards/minigames/etc.

## 7) High-dice max-multiplier safety reasoning

Assumption model for this investigation:
- Start dice = 2,500.
- Player uses max available multiplier continuously (initially ×200).
- Focus loop = roll spend + reward-bar progress + chained reward-bar claims.
- Additional systems considered qualitatively: Lucky Roll, Space Excavator milestones, daily treats, passive regen.

### Evidence from existing tests

There is a direct economy test in reward-bar tests:
- Scenario: starting dice 2,500; multiplier ×200; 30 rolls on progress tile flow.
- Assertion: dice awarded from reward-bar claims remains below dice spent.
- Assertion: final dice pool < starting pool.

### Extrapolated trend estimates

Using the tested behavior as anchor (dice burn remains net-negative at x200 pure farming), expected direction for larger roll counts:

- **500 rolls equivalent activity**: strong downward dice trend unless external event payouts are heavily harvested in parallel.
- **1,000 rolls**: continues downward in core loop; occasional positive bursts from sticker-completion and event claim clusters do not offset linear spend at ×200 under current threshold growth.
- **2,000 rolls**: still expected net-negative in pure board/reward-bar loop; risk shifts to whether side systems are infinitely repeatable with net dice yield per ticket/roll cycle.

Because available in-repo tests only hard-assert the 30-roll x200 case, these 500/1000/2000 projections are directional extrapolations rather than full Monte Carlo outputs.

## 8) PASS/FAIL against requested conditions

- **PASS (core reward-bar + max-roll farm loop)**: Existing explicit test evidence indicates x200 reward-bar farming burns dice overall.
- **FAIL-RISK (full connected economy graph)**: Multiple ancillary inflow systems can stack in the same session (reward-bar dice + sticker bonuses + minigame milestone dice + Lucky Roll + daily treat + regen). No single global “dice EV budget guard” currently appears to cap aggregate expected return per roll-cycle.

## 9) Root-cause hypotheses for potential snowballing

1. **No centralized economy governor** across all dice-producing systems.
2. **Reward-bar progression scales linearly with multiplier**, enabling fast claim cadence at high dice pools.
3. **Sticker completion bonus is chunky (+100 dice)** and can synchronize with high-cadence loops.
4. **Event systems award dice via separate channels** and are not visibly constrained by a shared net-dice-per-roll budget framework.

## 10) Safest minimal fix plan (architecture-preserving)

No implementation in this PR; recommendation slices only:

1. **Instrumentation slice (lowest risk):** Add economy telemetry counters per source (roll spend vs dice grants by source) and session-level EV reports.
2. **Simulation harness slice:** Add deterministic service-level economy simulation tests for 500/1000/2000 roll windows including event ticket spend/claim loops.
3. **Budget guard slice:** Add a single soft cap policy layer that limits aggregate dice grant rate per rolling window (source-agnostic), without altering architecture.
4. **Reward-bar tuning slice (optional, after telemetry):** adjust high-tier dice payout slope and/or sticker completion trigger frequency if simulations show positivity.
5. **Event payout harmonization slice:** normalize dice-per-ticket expected value across Lucky Spin/Space Excavator/Lucky Roll chains.

## 11) Recommended next PR slices (ordered by safety/risk)

1. Telemetry-only economy accounting (no gameplay behavior change).
2. Deterministic long-horizon economy test harness (no gameplay behavior change).
3. Add failing tests for any discovered positive loop combinations.
4. Apply minimal payout/ticket tuning in smallest target surface that flips failing loops to non-positive.
5. Re-run regression + build, then ship incremental adjustments.

## 12) Relevant files reviewed

- `src/features/gamification/level-worlds/services/islandRunContractV2RewardBar.ts`
- `src/features/gamification/level-worlds/services/islandRunClaimRewardAction.ts`
- `src/features/gamification/level-worlds/services/islandRunEventEngine.ts`
- `src/features/gamification/level-worlds/services/islandRunTileRewardAction.ts`
- `src/features/gamification/level-worlds/services/islandRunRollAction.ts`
- `src/features/gamification/level-worlds/services/spaceExcavatorCampaignProgress.ts`
- `src/features/gamification/level-worlds/services/islandRunLuckyRollAction.ts`
- `src/features/gamification/level-worlds/services/islandRunRuntimeRegen.ts`
- `src/features/gamification/level-worlds/services/__tests__/islandRunContractV2RewardBar.test.ts`
- `src/features/gamification/level-worlds/services/islandRunIntegratedEconomySafetyModel.ts`
- `src/features/gamification/level-worlds/services/__tests__/islandRunIntegratedEconomySafety.test.ts`

## 13) Follow-up: deterministic high-dice safety regression tests (2026-05-28)

### Existing coverage found before this follow-up

- `islandRunContractV2RewardBar.test.ts` already covered multiplier tier availability, max multiplier resolution, dice-cost scaling, chained reward-bar claims, high-tier overflow behavior, sticker-completion bonus dice/essence, and a short-window pure x200 farming assertion from 2,500 dice.
- That short-window economy test showed x200 progress-tile farming burns dice overall over 30 modeled rolls, but it did not explicitly cover longer 500/1,000/2,000 roll-action horizons.

### New deterministic regression coverage added

The reward-bar service test suite now includes deterministic high-dice economy safety scenarios that model chest/progress-tile farming with:

- Starting dice: `2,500`.
- Maximum currently available multiplier on each roll attempt, clamped to the current dice pool.
- Dice spent on rolls.
- Reward-bar progress from farming tiles.
- Chained reward-bar claim draining with a hard fail if drain batches exceed the bounded loop guard.
- Reward-bar dice payouts.
- Sticker-completion bonus dice included in total dice awards.

Scenarios covered:

| Scenario | Modeled horizon | Expected safety signal |
|---|---:|---|
| A | Repeated max-available reward-bar farming from 2,500 dice | Dice awards, including sticker-completion bonuses, stay below dice spent; final dice remains below the starting pool. |
| B | 500 roll-action attempts from 2,500 dice | Dice awards stay below dice spent; pool exhausts before 500 rolls; no pending claimable reward-bar overflow remains. |
| C | 1,000 roll-action attempts from 2,500 dice | Exhausted dice stay exhausted across the longer horizon; no reward-bar revival loop. |
| D | 2,000 roll-action attempts from 2,500 dice | No self-sustaining dice-positive loop and no infinite reward-bar chain. |

## 14) Integrated economy safety follow-up (2026-05-28)

### Investigation update

A focused integrated model was added to cover the highest-risk stackable dice inflows without changing gameplay tuning:

- **Reward-bar farming baseline**: still modeled as chest/progress-tile rolls at the maximum multiplier currently available from the live dice pool.
- **Lucky Roll**: modeled as a conservative one-session sum of every unique dice reward on the production Lucky Roll board. Current deterministic total: `16` dice.
- **Space Excavator campaign milestones**: modeled as the full dice-bearing campaign milestone total. Current deterministic total: `145` dice.
- **Passive dice regeneration**: modeled as one bounded catch-up refill to the level-band max after the roll pool can no longer afford the next roll. At player level `125`, this contributes `200` dice.

The integrated stack therefore adds `361` modeled external dice on top of reward-bar dice/sticker-completion payouts (`16 Lucky Roll + 145 Space Excavator + 200 passive regen`).

### New deterministic regression coverage added

A new service test file, `islandRunIntegratedEconomySafety.test.ts`, covers the required long-horizon attempts from `2,500` starting dice:

| Modeled horizon | Included repeatable/gameplay-connected sources | Expected safety signal |
|---:|---|---|
| 500 attempts | Reward bar + sticker bonus dice + Lucky Roll production board + Space Excavator campaign dice milestones + one passive regen refill | Total dice awarded remains below dice spent; final dice exhausts; reward-bar drain leaves no claimable overflow. |
| 1,000 attempts | Same stack | Exhausted dice do not revive into a positive loop across the longer horizon. |
| 2,000 attempts | Same stack | No self-sustaining dice-positive loop and no infinite reward-bar chain. |

The model also asserts the source budget values directly so future config changes to Lucky Roll or Space Excavator dice payouts surface in this safety suite instead of silently changing the integrated economy assumptions.

### Explicit exclusions

Excluded from repeatable economy-loop income:

- **Welcome pack / tutorial / first-session grants**: one-time onboarding grants, not repeatable farming sources.
- **Admin/dev grants**: non-production economy sources.
- **Daily Treats and calendar streak bonuses**: time-gated rewards. They can connect into Island Run dicePool through `awardDailyTreatDice`, but treating every roll attempt as a fresh daily claim would be an unsafe model. This remains a time-window modeling gap rather than a per-roll loop input.
- **Shop purchases / dice packs**: external purchase/grant systems, not gameplay-earned repeatable loop income.
- **Other minigame reward adapters outside the modeled Island Run event stack**: not included unless they have a deterministic, directly claimable Island Run dice budget comparable to the Space Excavator milestone table.

### Remaining gaps / recommended future work

- Add a separate time-window model for Daily Treats/calendar streak rewards if economy safety needs to reason about multi-day sessions rather than per-session roll/action loops.
- Add more event/minigame dice sources only after each source has a deterministic budget and repeatability contract; do not guess expected value from UI-only or random reward paths.
- No reward tuning, gameplay logic, UI, schema, or architecture changes were made in this follow-up.
