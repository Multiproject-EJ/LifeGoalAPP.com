# Egg Mania Triple-Set Spec (Island Run)

Status: Proposed for implementation  
Date: 2026-05-24

## Goal
Introduce a rare, island-scoped **Egg Mania** mode where Hatchery Set Egg becomes **Set 3 Eggs** for one island only.

## Confirmed product decisions
1. Mania consumption model: **one triple-set per Mania island**.
2. Base schedule: **deterministic** Mania islands.
3. Reactivation trigger: **7+ days inactive**, with capped bonus uses.
4. Collision rule: if scheduled + reactivation collide, **preserve reactivation credit** for later.
5. Eligibility timing: reactivation Mania applies on **next island start**.
6. Hatch outcomes: each egg resolves independently; collect = creature, sell = sell payout.

## Core rules
- Egg Mania applies only to the current island where it was activated.
- Mania never transfers across island travel.
- Mania has no wall-clock timeout; expiry is island transition.
- While Mania is active and unused, Hatchery primary CTA is `Set 3 Eggs`.
- Triple-set consumes Mania for that island immediately after successful set.

## Frequency model
### Scheduled rare Mania
- Exactly 4 Mania islands per 120-island cycle.
- Islands are deterministic per player and cycle (seeded by user id + cycle index).
- Suggested spacing guard: keep picks spread out to avoid clustering.

### Reactivation Mania
- Up to 2 extra Mania credits per 120-island cycle.
- Trigger condition: player returns after >= 7 full days since last login.
- Credit is applied on the next island start.
- If current island already has Mania (scheduled), preserve credit for next eligible island.

## Reward semantics
Each egg is an independent terminal resolution:
- **Collect** => 1 creature.
- **Sell** => that egg's sell payout bundle + choice reward.

Therefore on Mania triple-set:
- Collect all 3 => 3 creatures.
- Sell all 3 => 3 sell payouts (sum of all 3 eggs).
- Mixed resolution is supported (per-egg actions).

## Data model changes (proposed)
Current runtime assumes one active egg slot per island. To support triple-set, migrate to per-island egg slots.

### Proposed shape additions
- `eggManiaByIsland: Record<string, { source: 'scheduled' | 'reactivation'; consumed: boolean }>`
- `pendingReactivationEggManiaCredits: number`
- `reactivationEggManiaCreditsUsedThisCycle: number`
- `lastIslandRunLoginAtMs: number`

### Egg slot model
Replace/augment single-per-island egg entry with slots:
- `perIslandEggSlots: Record<string, PerIslandEggEntry[]>` (max length 3 for Mania islands, 1 otherwise)

Compatibility/migration:
- Keep legacy `activeEgg*` fields through migration bridge.
- Hydration should normalize legacy single egg entries into slot arrays.

## UX flow (Mania)
1. Island start banner: `🔥 Egg Mania Active on this island`.
2. Hatchery empty state CTA: `Set 3 Eggs`.
3. Post-set state: show 3 egg cards with independent timers and tiers.
4. Ready state: if multiple eggs ready, show combined header (`2 Eggs Ready`, `3 Eggs Ready`) and actions:
   - Collect all
   - Review / resolve per egg
   - Sell per egg
5. Completion state: after all eggs terminal (collected/sold), hatchery shows island-complete state.

## Technical constraints
- Gameplay writes must flow through canonical action services/store commit path.
- No new direct gameplay writes in React UI components.
- Add tests for scheduling, trigger, collision handling, and 3-egg resolution.

## Test matrix (minimum)
1. Scheduled Mania appears exactly 4x across 120 islands.
2. Reactivation credit granted after >= 7 days inactive, capped at 2/cycle.
3. Collision preserves reactivation credit.
4. Mania does not carry to next island.
5. Triple-set creates 3 eggs with independent hatch windows in [24h,72h].
6. Collect-all grants 3 creatures.
7. Sell-all grants 3 summed payouts.
8. Mixed actions resolve correctly and are idempotent.
