# Combined Journey Level & Rewards — Design & Architecture Plan

Date: 2026-06-20
Scope: Documentation-only design/architecture plan. No runtime code, schema
migrations, or grants are introduced by this document.

## Relationship to the dual-track overlay plan

This extends `docs/investigations/my-quest-dual-track-progress-overlay-v2-plan.md`
(Slices 1–6, all shipped). Those slices kept the overlay strictly **read-only**.

This plan **deliberately crosses that read-only boundary** for one narrow,
well-guarded purpose: turning the center spine into a **Combined Journey Level**
that releases real in-game rewards at thresholds. Everything else about the
overlay (controller/menu/PLAY, the ladders, the Slice 6 animations) stays as-is.

## Concept

The thin center spine becomes a meter for an **overall "Journey Level"** that
rises as **both** tracks improve:

- Left (Real Life): completed goals + habit consistency.
- Right (Game): islands completed + in-island progress.

When the meter crosses a **threshold**, it releases a **chest** that grants
**exactly one reward** (dice, essence, an egg, or a reroll-capacity upgrade).

### The "rise together" mechanic (balance synergy)

The product thesis is "life growth and adventure progress rise together." Make
that mechanical, not just copy:

- Each side contributes XP independently.
- A **balance multiplier** rewards progressing **both** sides over a window.
  Pushing only one side earns diminishing returns; alternating/advancing both
  earns the full rate (and a small synergy bonus).

This makes the optimal play "do a bit of both," which is exactly the behavior the
app wants to encourage.

## Non-negotiable constraints

1. **Server-authoritative grants only.** Rewards are decided and recorded on the
   server. The client never mints currency.
2. **Idempotent claims.** A threshold chest can be granted **at most once** per
   user, enforced by a unique claim record — not by client state.
3. **No client-trusted reward state.** Unlike the Slice 6 "last-viewed island"
   value (a presentational `localStorage` flag), nothing about XP, levels, or
   claims may be trusted from the client.
4. **Reuse existing economy choke points** (`outsideRewardGateway`, claim-action
   pattern) rather than inventing new write paths in UI.
5. **Overlay does not mutate directly.** The overlay calls a dedicated claim
   action service; it never calls `persistIslandRunRuntimeStatePatch` or writes
   runtime state (respecting `check:island-run-architecture-guards`).
6. **PLAY is never blocked or changed.** Reward loading/claiming is async and
   independent of the PLAY button.
7. **Feature-flagged.** Ships dark behind an Island Run feature flag; the
   read-only meter can appear before grants are enabled.
8. **Derived, recomputable XP.** Level is a pure function of durable milestones,
   so it can always be recomputed and never silently corrupts.

## XP / source-of-truth model (derived)

Combined level is **derived server-side** from durable milestones, not an
accrued balance. Claimed chests are tracked separately.

```text
journeyXp = round(
    gameXp        // islands completed * W_ISLAND + currentIslandProgress * W_PROGRESS
  + lifeXp        // completedGoals * W_GOAL + habitConsistencyScore * W_HABIT
) * balanceMultiplier
```

- `balanceMultiplier` ∈ [1.0 .. ~1.25], based on how recently/!evenly both sides
  advanced (the "alternation" bonus). It can only *raise* XP, never remove earned
  levels (so the displayed level is monotonic for a given milestone set).
- `journeyLevel = levelForXp(journeyXp)` via a fixed XP-per-level curve.

### Anti-abuse (critical for the life side)

- Count **completed** goals only — never "goal exists." Creating/deleting goals
  must not move XP (defeats create/delete farming).
- Habit contribution uses a **capped consistency score** (e.g., active-streak
  days capped per period), not raw habit count.
- Because XP is derived and claims are unique per threshold, replaying or
  reloading cannot double-grant.

### Relationship to the existing global level

Keep the Journey Level **separate** from `gamification.total_points` /
`levelInfo` so the "two sides together" story stays distinct. (Reusing the global
level remains an option but is not the recommendation.)

## Reward ladder (one reward per chest)

Each threshold grants a **single** reward (per product decision). Rewards rotate
so progression feels varied, with rarer **upgrade** payoffs at milestone levels.

| Threshold band | Typical reward (one per chest) |
| --- | --- |
| Early, frequent | Dice (small), Essence (small) |
| Mid | Egg, Dice (medium), Essence (medium) |
| Milestone levels (e.g., 5/10/20…) | **Reroll-capacity upgrade** (+max dice) |

Exact amounts/curve are a later balance pass (see slices).

### Reward integration map

| Reward | Existing path to reuse | Notes / gaps |
| --- | --- | --- |
| **Dice** | `outsideRewardGateway` (`kind: 'dice'`) | Already a supported outside-reward intent. |
| **Essence** | `islandRunEconomy` / contract essence build | Grant via economy service through a claim action. |
| **Eggs** | `eggService` / `islandRunEggRewardInventoryAction` (`openEggRewardInventoryEntry`) | Grant one egg into inventory. |
| **Reroll capacity** | `islandRunDiceRegeneration` (`maxDice` is **level-derived** today) | **Gap:** needs a new persistent additive modifier (e.g., `bonusMaxDice`) layered on the level tier, since capacity is currently a pure function of level. Design this explicitly. |
| Puzzle pieces | — | **Deferred:** no first-class puzzle-piece currency/grant path exists today (only `islandRunTrafficLightTile`). Add only if/when a grant path exists. |

If `outsideRewardGateway` should be the single choke point, consider extending
its allowed `kind`s to cover `essence` and `egg` so every chest grant flows
through one validated gateway.

## Data model (proposed)

No migration is applied by this doc; this is the target shape.

- **Derivation inputs** already exist (islands completed, completed goals, active
  habits). The level is computed, not stored — optionally cache a snapshot for
  fast display.
- **New: claims ledger** — the idempotency backbone.

```text
combined_journey_reward_claims
- id
- user_id            (FK)
- threshold_level    (int)         -- which chest
- reward_kind        (enum: dice | essence | egg | reroll_capacity)
- reward_amount      (int)
- claimed_at         (timestamptz)
- UNIQUE (user_id, threshold_level)   -- the idempotency guarantee
```

- Optional `combined_journey_level_snapshot` (user_id, level, xp, computed_at)
  purely for display/perf; never the source of truth for claims.
- **RLS:** user can read their own rows; inserts happen only via the
  server-authoritative claim action.

## Server-authoritative claim action

Model it on `islandRunWelcomePackClaimAction` / `islandRunClaimRewardAction`:

```text
claimJourneyLevelReward({ session, thresholdLevel }):
  withIslandRunActionLock(userId):
    1. Recompute journeyLevel from milestones (server-trusted inputs).
    2. Guard: thresholdLevel <= journeyLevel           -> else 'not_yet_unlocked'
    3. Guard: no existing claim row for (user, threshold) -> else 'already_claimed'
    4. Resolve the single reward for that threshold (deterministic table).
    5. Grant it through the existing economy path
       (outsideRewardGateway / eggService / bonusMaxDice modifier).
    6. Insert the claim row (unique constraint = belt-and-suspenders).
    7. Return { status: 'claimed', reward } | 'already_claimed' | 'not_yet_unlocked'
```

- The unique `(user_id, threshold_level)` constraint makes a race or replay a
  no-op (`already_claimed`).
- All amounts/kinds are decided server-side from the deterministic reward table;
  the client only says *which threshold* it's claiming.

## Overlay / UI wiring

- **Read-only meter (no grants):** the spine shows the real Journey Level, fill
  toward the next threshold, and "next chest at level N." Pure display; reuses
  the existing adapter shape (extend the view model with a `journeyLevel`
  summary).
- **Claim CTA:** when a chest is unlocked-and-unclaimed, show a claimable chest
  on/near the spine. Pressing it calls `claimJourneyLevelReward` and shows the
  granted reward. The overlay never writes directly.
- Respect `prefers-reduced-motion` for any chest/celebration animation.
- PLAY remains independent and always reachable.

## Feature flag

Gate the whole subsystem behind an Island Run feature flag (pattern:
`isIslandRunFeatureEnabled('combinedJourneyRewardsEnabled')`), so:

- the read-only meter can ship first,
- grants can be enabled separately after balance review.

## Risks & open questions

1. **Reroll-capacity modifier**: capacity is level-derived today. Confirm the
   additive `bonusMaxDice` approach and how it interacts with passive regen caps.
2. **Gateway coverage**: extend `outsideRewardGateway` to `essence`/`egg`, or
   grant those via their own services? (One choke point is cleaner/auditable.)
3. **Balance curve**: XP weights, level curve, and the `balanceMultiplier`
   window need a dedicated balance pass + telemetry before enabling grants.
4. **Snapshot vs pure derive**: do we need a cached level snapshot for perf, or
   is on-demand derivation cheap enough?
5. **Real-life signal fidelity**: which goal status counts as "completed," and
   how is habit consistency scored/capped?
6. **Backfill**: existing users already have islands/goals — decide whether
   pre-existing thresholds are immediately claimable or granted via a one-time
   reconciliation.

## Implementation slices

> Status legend: ✅ shipped · 🔜 next · ⏳ planned.

### R1 — this design & architecture plan 🔜 (current)

- Document concept, constraints, derived model, reward map, schema, claim action,
  UI wiring, flag, risks. No runtime code.

### R2 — read-only Journey Level meter ⏳

- Derive `journeyLevel` (server-trusted inputs) and surface it in the overlay
  view model; render real level + next-threshold on the spine. No grants.
- Adapter unit tests for the derivation/curve.

### R3 — claims ledger schema ⏳

- Add `combined_journey_reward_claims` (+ optional snapshot) with RLS. Migration
  only; no grants wired.

### R4 — server-authoritative claim action ⏳

- `claimJourneyLevelReward` with `withIslandRunActionLock`, deterministic reward
  table, idempotent claim, one reward per chest. Behind the feature flag.
- Service tests: claimed / already_claimed / not_yet_unlocked / race no-op.

### R5 — overlay claim UI ⏳

- Claimable chest CTA on the spine wired to the claim action (flag-gated). No
  direct writes from the overlay. Reduced-motion safe.

### R6 — reroll-capacity reward integration ⏳

- Introduce the persistent `bonusMaxDice` modifier and wire the upgrade reward to
  it; integrate with `islandRunDiceRegeneration` caps.

### R7 — balance & telemetry ⏳

- Tune XP weights/curve/`balanceMultiplier`; add economy telemetry; review before
  enabling grants in production.

## Testing strategy

- **Derivation**: deterministic XP/level for fixed milestone inputs; monotonic in
  milestones; balance multiplier within bounds; create/delete goal loop does not
  change XP.
- **Claim action**: unlocked threshold grants exactly one reward; second claim →
  `already_claimed`; locked threshold → `not_yet_unlocked`; concurrent claims →
  single grant (unique constraint).
- **Idempotency/abuse**: reload/replay cannot double-grant; client cannot choose
  reward kind/amount.
- **Architecture guards**: overlay/adapter never import mutation/runtime-state
  writes; grants only via the claim action/gateway.
- **Overlay**: PLAY still fires once and is unaffected; opening/closing without
  claiming mutates nothing.

## Launch status (delivered)

The feature shipped across slices R1–R8. Notes where the build diverged from the
original plan above:

- **Rollout (final slicing).** R1 plan · R2 read-only meter · R3 claims ledger ·
  R4 server-authoritative claim (dice/essence) · R5 overlay claim CTA · R6 eggs ·
  R7 reroll-capacity (`bonus_max_dice` column) · R8 balance/telemetry + launch.
  Reroll-capacity was split into its own slice (R7) once it became clear the
  runtime state is columnar and needed a new persisted column.
- **Reward ladder (live).** Priority: level ÷5 → reroll-capacity (+5 max dice);
  else ÷3 → egg; else even → dice (`10 + 5·band`); else odd → essence
  (`5 + 3·band`), `band = ⌊level/5⌋`. The TS table
  (`combinedJourneyRewardLadder.ts`) and the SQL RPC are kept in exact lockstep.
- **Grants path.** `outsideRewardGateway` turned out to be a request *validator*,
  not a granter, so rewards apply through the standard `commitIslandRunState`
  path (same as welcome pack / eggs). Reward kind/amount are resolved
  authoritatively in SQL, so the client cannot choose them.
- **Reroll-capacity.** Added a persistent `island_run_runtime_state.bonus_max_dice`
  column (migration 0260), threaded through the dice-regen system as an additive
  bonus on top of the level tier.
- **Launch reconciliation (decision).** Existing players get chests **only from
  launch onward**: a per-user baseline (`combined_journey_reward_baseline`,
  migration 0262) records their journey level at first post-launch open via the
  idempotent `ensure_combined_journey_baseline` RPC; the overlay only offers
  chests for thresholds strictly above that baseline.
- **Balance pass.** XP weights, level curve, and the balance multiplier were
  reviewed and locked at their launch values (constants in
  `combinedJourneyLevel.ts`).
- **Telemetry.** Successful claims emit a `combined_journey_reward_claimed` entry
  (threshold, derived level, reward kind/amount) via `logIslandRunEntryDebug`.
- **Flag.** `combinedJourneyRewardsEnabled` is **on** as of R8.
