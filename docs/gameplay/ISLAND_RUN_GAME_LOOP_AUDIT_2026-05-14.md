# Island Run game-loop audit: economy, retention, friction, and risk map

Date: 2026-05-14

Scope: investigation-only audit of the current Island Run loop before adding more features. No gameplay authority, economy values, or feature behavior were changed.

## Files and functions inspected

- Architecture/contracts: `docs/gameplay/ISLAND_RUN_ARCHITECTURE_CONTRACT.md`, `docs/gameplay/CANONICAL_GAMEPLAY_CONTRACT.md`, `docs/gameplay/ISLAND_RUN_GUARDRAILS_AND_CONFLICT_MATRIX_2026-04-24.md`
- Core state/action services: `islandRunGameStateStore.ts`, `islandRunStateStore.ts`, `islandRunStateActions.ts`, `islandRunRuntimeState.ts`
- Roll/dice/reward bar: `islandRunRollAction.ts`, `islandRunContractV2RewardBar.ts`, `islandRunClaimRewardAction.ts`, `islandRunDiceRegeneration.ts`, `islandRunEconomy.ts`
- Tile loop: `islandBoardTileMap.ts`, `islandRunTileRewardAction.ts`, `islandRunContractV2EssenceBuild.ts`, `islandRunBonusTile.ts`, `encounterService.ts`
- Stop/build/island clear: `islandRunStopTickets.ts`, `islandRunStopCompletion.ts`, `islandRunContractV2StopResolver.ts`, `islandRunBossEncounter.ts`, `bossService.ts`
- Event/minigames: `islandRunEventEngine.ts`, `islandRunMinigameLauncherService.ts`, `islandRunMinigameManifests.ts`, `IslandRunMinigameLauncher.tsx`, `spaceExcavatorCampaignProgress.ts`
- Lucky Roll / daily treats / legacy game rewards: `islandRunLuckyRollAction.ts`, `islandRunLuckyRollBoardConfig.ts`, `LuckyRollBoard.tsx`, `LuckyRollDiceShop.tsx`, `dailyTreats.ts`, `gameRewards.ts`
- Creature/sanctuary: `creatureCollectionService.ts`, `creatureTreatInventoryService.ts`, `creatureCatalog.ts`, `islandRunEggRewardInventoryAction.ts`
- Board/UI: `IslandRunBoardPrototype.tsx`, `OutOfDiceRegenStatus.tsx`
- Real-life action entry points: `DailyHabitTracker.tsx`, `CountdownCalendarModal.tsx`, `ActionsTab.tsx`, `TaskTower.tsx`, `ShooterBlitz.tsx`

## Current full loop map

1. **Enter Island Run.** The board uses canonical store reads via `useIslandRunState`; critical gameplay writes are increasingly routed through `islandRunStateActions`, roll/tile services, and mutex-protected services. Legacy shims still exist in `IslandRunBoardPrototype.tsx`.
2. **Roll.** `executeIslandRunRollAction` validates dice, deducts `1 × multiplier`, rolls two dice, advances across profile-derived topology, and persists token/dice state. Movement is always tile movement; landmarks/stops are external.
3. **Land on tile.**
   - `currency`, `chest`, and `micro` award essence and feed reward-bar progress.
   - `hazard` deducts essence, clamped at zero.
   - `encounter` opens a low-friction challenge modal; completion can award essence, dice, spin tokens, shard, and reward-bar progress.
   - Contract docs mention `bonus`, but the current production tile map type list does not include `bonus`.
4. **Reward bar.** Feeding/event progress is amplified by dice multiplier, fills escalating thresholds, and auto-claims/chains up to 10 times. Payouts rotate dice → essence → minigame tickets → sticker fragments, with sticker completion bonuses.
5. **Spend essence.** Essence opens landmark tickets and funds 5 buildings. Build panel lets players tap/hold to spend in 10-essence steps and batches repeated/held activation.
6. **Complete landmarks.**
   - Hatchery objective completes when egg is set.
   - Habit/Mystery/Wisdom objectives are sequential.
   - Boss objective is final; boss creature only awakens after the boss arena is fully built.
7. **Resolve egg.** Island clear requires the hatchery egg collected or sold, not merely set. Selling offers reward choice; collecting adds creature collection progress.
8. **Claim island clear.** Full clear requires all 5 stop objectives, egg resolved, and all 5 buildings at Level 3. Claim then travels to the next island and resets stop/build state for the new island.
9. **Timed event loop.** One active event rotates globally; reward bar emits event tickets. Event launchers route to Lucky Spin, Space Excavator, or Partner Wheel where wired, with safe fallback when missing.
10. **Creature/sanctuary loop.** Eggs and Treasure Path rewards feed creature collection; active companion and bonding can add encounter bonuses and daily companion quests.
11. **Real-life action loop.** Daily treat dice now dual-write to canonical Island Run dice when a session is available. Task Tower/Shooter Blitz/Vision Quest still award legacy local game currency, not canonical Island Run dice.

## Currency flow diagram

```text
Real-life actions
  ├─ Daily treats → legacy gameRewards dice + canonical Island Run dicePool
  ├─ Task Tower / Shooter Blitz / Vision Quest → legacy gameRewards dice/tokens only
  └─ Habits/check-ins/actions → XP/gold/celebrations, not consistently Island Run economy

Island Run board
  Dice pool --roll cost (1 × multiplier)--> movement
  Movement → tile landing
    currency/chest/micro → Essence + reward-bar progress
    hazard → Essence loss
    encounter → Essence + direct dice/spin/shard chance + reward-bar progress
    bonus tile service → Essence + direct dice + reward-bar progress, but not in production tile map

Reward bar
  Progress × multiplier → escalating threshold → claim/cascade
  Claim → Dice / Essence / minigameTicketsByEvent / sticker fragments
  Sticker completion → +100 dice +50 essence per completed sticker

Essence
  Essence → stop tickets + building funding + market dice bundle
  Essence hoards above 150% remaining build cost → 0.5%/hour drift, max 20% excess/session

Events/minigames
  minigameTicketsByEvent → event launch / Space Excavator digs
  Space Excavator milestones → Essence / dice / shards
```

## Dice inflow/outflow table

| Flow | Current implementation | Notes / audit finding |
|---|---|---|
| Starting dice | `ISLAND_RUN_DEFAULT_STARTING_DICE = 30` in `islandRunEconomy.ts`. | Starts at the same 30-dice baseline as both the contract's level-1 formula and the implementation's first regen band; later-level regen tuning is where the contract/implementation diverge. |
| Roll cost | `executeIslandRunRollAction` uses `DICE_PER_ROLL = 1` and `diceCost = multiplier`; movement remains 2–12 tiles. | Good sink; high multipliers burn linearly. |
| Multiplier ladder | `MULTIPLIER_TIERS`: ×1, ×2, ×3, ×5, ×10, ×20, ×50, ×100, ×200 gated by dice pool. | High multipliers are gated but can amplify reward-bar progress heavily. |
| Reward bar dice | Rotation starts with dice; dice base is `5 + tier * 3`, plus small dice side-payouts on other reward kinds. | Primary legal short-loop dice source. |
| Sticker completion | `STICKER_COMPLETION_BONUS_DICE = 100`. | Powerful spike; risk if fragments cascade frequently. |
| Daily treats | `awardDailyTreatDice` calls legacy `awardDice` and `applyTokenHopRewards` when Island Run session exists. | Good canonical bridge when session provided. |
| Passive regen | `applyPassiveDiceRegenTick` uses `resolveRuntimeDiceRegenUpdate`; `islandRunDiceRegeneration.ts` has bands from 30 to 200. | Contract says continuous logarithmic formula; implementation still uses bands. |
| Shop/market | Island Run market spends 30 essence for +6 dice once per island; legacy Lucky Roll dice shop uses retired hearts/legacy balances. | Island Run market is canonical-ish via `setDicePool` shim, but shop surface remains split. |
| Lucky Roll / Treasure Path | Pre-island Lucky Roll has zero normal dice cost and can bank bounded dice rewards; finish bundle includes +5 dice. | Contract allows lucky spin; this is a controlled source, not a board roll sink. |
| Space Excavator | Milestones include +5 dice at clear 2 and +25 dice at clear 10. | Event source is canonical. |
| Encounter tiles | `rollEncounterReward` can award 2/4/6/8 dice, and UI applies it through `setDicePool`. | **Contract contradiction:** tiles should not award dice directly; see Risk #1. |
| Bonus tile service | `BONUS_BASE_RELEASE_PAYOUT.dice = 4`. | **Contract contradiction in docs/service**, but production tile map currently excludes `bonus`; see Risk #1. |
| Legacy minigames | Task Tower, Shooter Blitz, Vision Quest use `gameRewards.awardDice`, not Island Run `dicePool`. | User-facing dice may diverge from Island Run dice. |

## Essence inflow/outflow table

| Flow | Current implementation | Notes / audit finding |
|---|---|---|
| Tile earn | `currency` 5–15, `chest` 20–40, `micro` 3–10, scaled by island multiplier and roll multiplier. | Main board-loop source. |
| Hazard loss | `hazard` −10 to −3, scaled by multiplier and wallet-clamped. | Good risk sink; no debt. |
| Reward bar | Essence reward kind base `3 + tier * 2`, plus side-payouts. | Secondary source. |
| Sticker completion | +50 essence per completed sticker. | Spike source. |
| Encounter | 5+ essence plus rarity/tier spread; companion bonuses can add essence. | Source, but coexists with direct dice issue. |
| Lucky Roll / Treasure Path | Essence budget is a percentage of next island build cost: 4% intro, 7% early, 10% rare, distributed by tile weights. | Strong accelerator; controlled by milestone cadence. |
| Space Excavator | +25 essence at clear 1 and +75 at clear 5. | Event support source. |
| Stop tickets | Base vector `[0, 30, 70, 130, 220]`, scaled by island multiplier. | Strong pacing gate; total island-1 tickets = 450 essence. |
| Buildings | Costs `[50, 120, 300]`, scaled by stop and island; boss stop is 4× base. | Major sink and island-clear gate. |
| Market dice bundle | 30 essence → 6 dice once per island. | Useful out-of-dice bridge; could obscure build/ticket priorities. |
| Drift | Above 150% remaining build cost, lose 0.5%/hour of excess, max 20% excess/session. | Soft anti-hoard pressure; needs clear UI to preserve trust. |

## Reward bar input/output table

| Area | Current behavior | Audit finding |
|---|---|---|
| Tile progress | `chest = 2`, `micro = 1`, `currency = 1`; progress multiplied by selected multiplier. | High multipliers intentionally accelerate fills. |
| Encounter progress | Encounter completion records `encounter_resolve` progress with multiplier. | Good loop support, but implemented partly in UI. |
| Event/minigame progress | `recordEventMinigameCompletion` routes event minigame completion to reward-bar progress. | Good direction; launch availability is uneven. |
| Threshold ladder | 4, 6, 8, 12, 16, 24, 32, 48, 64, 80, then quadratic tail. | PR #2208-style fix appears present; high-tier overflow test prevents endless cheap cascades. |
| Claim chaining | `resolveChainedRewardBarClaims` caps chain length to max 10. | Good runaway guard; still creates satisfying burst. |
| Reward rotation | dice → essence → minigame tickets → sticker fragments. | Clear, deterministic. |
| Dice payout | Dice base grows by +3 per tier; side dice paid on non-dice claims. | Needs telemetry after high-multiplier fix to ensure not too generous/slow. |
| Sticker bonus | Every 5 fragments grants a sticker and +100 dice/+50 essence. | Strong retention spike; economy risk if fragment pacing is high. |
| Event tickets | Reward bar dual-writes minigame tickets by active event id. | Good canonical migration; legacy `spinTokens` remains compatibility. |

## Top 10 risk factors ranked by severity

1. **Direct dice from tile-adjacent gameplay violates the canonical contract.** Encounter completion can award dice, and the bonus-tile service defines a dice kicker, while the contract says tiles never award dice directly.
2. **Canonical contract and implementation disagree on dice regen math.** Contract says continuous logarithmic minimum-roll floor; implementation uses level bands with fixed intervals.
3. **Creature/sanctuary authority remains split.** LocalStorage services are explicitly non-authoritative but still used for collection, active companion, and treat fallbacks.
4. **Legacy game rewards create a parallel dice economy.** Task Tower, Shooter Blitz, Vision Quest, Lucky Roll standalone, and dice packs use `gameRewards` localStorage dice/tokens instead of canonical Island Run dice.
5. **Reward-bar sticker completion can create large dice spikes.** +100 dice per sticker can dominate ordinary dice burn if sticker fragments become too available.
6. **High-multiplier tuning is guarded for ×200 chest farming but not fully telemetry-backed.** Unit test covers one scenario; live tile mix, encounters, market, sticker, events, and auto-roll need dashboard tracking.
7. **Market and shop messaging may confuse currency roles.** Island Run market uses essence for dice; legacy Lucky Roll shop still displays hearts even though the canonical gameplay contract says hearts are fully retired from the island game economy.
8. **Island clear can feel like a hidden checklist.** Boss defeat may not clear island if egg/builds remain; current copy helps, but users can still ask “what next?” across hatchery/build/boss states.
9. **Event loop feels uneven.** Feeding Frenzy intentionally has no minigame, Space Excavator spends per action, and launchers rely on registry/fallback behavior.
10. **Build loop is central but modal-heavy.** Tap/hold is thumb-friendly once discovered, but it competes with roll/stop/market panels for the primary next action.

## Top 10 attractiveness opportunities ranked by impact

1. **Make the next action unmistakable.** One persistent “best next step” CTA should prioritize roll, pay ticket, build, hatch/collect egg, challenge boss, or claim island clear.
2. **Turn build into a satisfying core loop.** Keep tap/hold building prominent, add clearer “next cheapest” and “island clear requires all L3” guidance without extra friction.
3. **Use reward bar as the cozy burst center.** Preserve cascades, but frame payouts as predictable progress instead of casino ambiguity.
4. **Unify real-life actions into canonical Island Run rewards.** Daily treats are a good template; Task Tower/Shooter Blitz/actions should route intentionally if they are meant to feed Island Run.
5. **Cleanly separate “event support” from “event distraction.”** Event tickets and minigames should always point back to more rolls/building.
6. **Make egg resolution emotionally central.** Hatchery already gates island clear; better surface “collect/sell egg to clear island” when ready.
7. **Clarify companion bonuses.** Show which bonuses affect dice/essence/spin and whether they are active now, especially because companions can influence encounter payouts.
8. **Soften out-of-dice moments.** Out-of-dice prompt plus regen ETA should feel like “come back soon or spend essence intentionally,” not a paywall.
9. **Celebrate non-monetized small actions.** Real-life habits/check-ins should feel like gentle contributions, not obligation chains.
10. **Audit modal cadence.** Keep locked/demo/unavailable states safe, but avoid burying roll/build/claim behind too many overlays.

## Immediate bug audit checklist

- [ ] Decide whether encounter tile dice rewards are allowed; if not, remove/reroute them through reward bar or non-tile sources.
- [ ] Decide whether bonus-tile dice kicker is allowed; if not, update `islandRunBonusTile.ts` and the canonical docs before wiring bonus tiles into production.
- [ ] Reconcile dice regen contract vs implementation: continuous formula in docs versus banded implementation.
- [ ] Verify all “dice” UI surfaces refer to the same wallet or explicitly label legacy/local minigame dice.
- [ ] Audit `setDicePool` shim call sites in `IslandRunBoardPrototype.tsx` for remaining non-service dice grants.
- [ ] Confirm market dice bundle cannot be bought more than once per island across hydration/sync edge cases.
- [ ] Verify reward-bar cascade max and high-tier tail with mixed real tile distribution, not only chest-only simulation.
- [ ] Confirm island-clear CTA appears after all three conditions: objectives, egg resolved, all buildings L3.
- [ ] Confirm event minigame launch fallback never spends tickets when the minigame is unavailable.
- [ ] Confirm companion localStorage fallback cannot overwrite newer canonical creature state.

## Later tuning dashboard metrics

- Dice balance distribution by player level/island/cycle.
- Dice inflow by source: regen, reward bar, stickers, daily treats, lucky roll, shop/market, Space Excavator, encounters.
- Dice outflow by multiplier tier and session.
- Net dice per session, segmented by selected multiplier and board tile mix.
- Reward-bar fills/claims/cascades per 10 rolls.
- Reward-bar claim tier reached per timed event.
- Sticker completions per event and dice from sticker bonuses.
- Essence earned/lost/spent by source/sink: tiles, hazards, reward bar, tickets, builds, market, drift.
- Time/rolls from opening an island to each stop objective complete.
- Time/rolls from objective completion to ticket payment.
- Time/rolls from boss defeat to claim island clear.
- Build panel opens, build taps, hold duration, and abandoned insufficient-essence build attempts.
- Egg set-to-ready, ready-to-collected/sold, and unresolved-ready dwell time.
- Event tickets earned, spent, expired/unspent, and event minigame completion rate.
- Out-of-dice prompt opens, shop opens, regen waits, and return-after-regen rate.
- Modal opens per session by modal type and close-without-action rate.
- Real-life action completions that produce canonical Island Run rewards versus legacy-only rewards.

## Notes on “critical contradiction” status

The audit found contract contradictions around direct dice from tile-adjacent rewards, especially encounters and the bonus-tile service. Because the requested task is investigation-only and explicitly says not to alter economy values yet, this document records those contradictions as immediate audit items rather than changing behavior.

### Follow-up status (2026-05-15 docs alignment)

- Canonical docs now explicitly preserve the no-direct-tile-dice rule for both encounter and bonus semantics.
- Encounter direct dice remains a known **live** implementation contradiction and requires a dedicated behavior cleanup PR.
- Bonus tile direct dice remains **dormant** (bonus tiles are not active in the production tile map), and the canonical payout no longer treats direct dice as allowed before go-live.
