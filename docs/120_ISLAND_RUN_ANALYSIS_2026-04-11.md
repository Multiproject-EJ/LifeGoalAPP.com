# 120 Island Run Analysis (Canonical vs Current App)

Date: 2026-04-11

## Canonical gameplay contract (source of truth)

From `docs/gameplay/CANONICAL_GAMEPLAY_CONTRACT.md`:

- Island Run is driven by a stop-first loop: complete active stop objectives, move with dice, build reward bar via feeding tiles, spend Essence on stop/build upgrades, then defeat Boss to unlock the next island.
- Stops are strictly 5 and sequential: Hatchery → Habit → Breathing → Wisdom → Boss.
- Board topology is profile/config-driven and must not hardcode a fixed tile count.
- Dice is the only board energy. Essence is the board-loop build/upgrade currency.
- Reward bar must be fed by feeding tiles and pays out minigame tokens, occasional dice, and stickers.
- Island progression is explicitly not time-based; timer expiry must not auto-complete or auto-fail an island.

## What is built in the app today (implementation snapshot)

Based on `docs/MAIN_GAME_120_LEVEL_STATUS.md` and implementation files:

### Implemented

- `IslandRunBoardPrototype` is the production main-game surface.
- Fixed 60-tile gameplay profile (`spark60_preview`) is active.
- Dice movement, stop plan generation, egg/hatchery loop, boss/market/encounter stop flows, telemetry hooks, and runtime persistence are present.
- Runtime persistence is dual-layer (`localStorage` + Supabase `island_run_runtime_state`) with hydration source tracking.
- Contract-v2 systems are integrated in code paths (Essence earning/spending + reward bar + timed-event handling helpers).

### Not yet fully aligned with canonical contract

- The production loop still contains timer-based island expiry/auto-advance behavior (48h/72h) in docs and component logic, which conflicts with canonical no-time-based progression.
- Production board remains effectively 60-tile in current renderer/runtime, while canonical requires profile-driven variable board topology.
- Status doc still records several areas as incomplete (real stop objectives, progression gating across all 120 islands, richer narrative/world differentiation, full asset completeness, automation and balancing).

## Bottom line

The app has substantial Island Run functionality already built and running in production prototype form, but there is a documented and partially visible migration gap between legacy time-gated 60-tile behavior and the newer canonical contract (stop-sequential, Essence/reward-bar-first, non-time-gated island completion).
