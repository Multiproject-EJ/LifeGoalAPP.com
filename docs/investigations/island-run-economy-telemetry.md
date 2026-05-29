# Island Run economy telemetry

Status: instrumentation-only baseline  
Scope: runtime/session visibility for dice and event-ticket flows; no economy tuning or gameplay balance changes.

## Purpose

Island Run now has a lightweight in-memory accounting layer for answering:

- Where did a player's dice come from?
- Where did a player's dice go?
- Which systems are generating the most dice?
- Which systems are consuming the most dice?
- What is the net dice delta for a session?

This is intentionally not an economy governor. It does not cap, reroute, tune, or change payouts.

## Architecture overview

The central helper lives in:

- `src/features/gamification/level-worlds/services/islandRunEconomyTelemetry.ts`

It provides:

- source/sink/counter constants (`ISLAND_RUN_ECONOMY_SOURCES`, `ISLAND_RUN_ECONOMY_SINKS`, `ISLAND_RUN_ECONOMY_COUNTERS`)
- append-only session events
- aggregate source/sink counters
- deterministic report helpers:
  - `getIslandRunEconomyTelemetryReport(sessionId?)`
  - `formatIslandRunEconomyTelemetryReport(sessionId?)`
  - `resetIslandRunEconomyTelemetry(sessionId?)`

The ledger is in-memory and session-scoped by user id when actions have a Supabase session. It is designed for tests and dev-tools inspection without adding persistence, database schema, or production gameplay dependencies.

Instrumentation is attached inside canonical action/service layers rather than React UI components. The helper records accounting metadata after the canonical action has computed the same next gameplay state it already would have committed.

## Tracked dice inflow sources

Current source constants include:

- `reward_bar_dice` — reward-bar claim dice excluding sticker-completion bonus dice.
- `sticker_completion_bonus_dice` — bonus dice from completing sticker sets during reward-bar claims.
- `lucky_roll_dice` — dice banked from Lucky Roll rewards.
- `space_excavator_milestone_dice` — dice from Space Excavator campaign milestone claims.
- `passive_regen_dice` — dice added by passive regeneration ticks.
- `daily_treat_dice` — dice awarded through Daily Treats Island Run bridge.
- `welcome_pack_dice` — dice from the welcome-pack reward bundle.
- `first_session_tutorial_dice` — dice from first-session onboarding creature-pack claim.
- `first_run_starter_dice` — first-run starter dice grants.
- `dev_admin_grant_dice` — dev/admin dice grants.
- `token_hop_dice` — generic canonical token-hop dice grants where a more specific source has not been passed.
- `egg_reward_dice` — dice from egg terminal reward resolution.
- `unknown_dice_delta` — reserved bucket for future reconciliation tooling.

## Tracked dice outflow sinks

Current sink constants include:

- `roll_spend_dice` — dice spent on Island Run rolls, including multiplier cost.
- `event_ticket_spend` — reserved for repeatable gameplay spends that are dice-denominated. Current event-ticket spends are counted separately as tickets, not dice.
- `unknown_dice_delta` — reserved bucket for future reconciliation tooling.

## Additional tracked counters

- `reward_bar_claims`
- `reward_bar_chained_claims`
- `event_tickets_earned`
- `event_tickets_spent`
- `multiplier_use`
- maximum `rewardBarTierReached`
- average and highest multiplier used

## Example output

`formatIslandRunEconomyTelemetryReport(userId)` returns deterministic JSON like:

```json
{
  "sessionId": "player-123",
  "diceInflowBySource": {
    "reward_bar_dice": 12,
    "sticker_completion_bonus_dice": 100,
    "passive_regen_dice": 3
  },
  "diceOutflowBySink": {
    "roll_spend_dice": 27
  },
  "counters": {
    "reward_bar_claims": 4,
    "event_tickets_earned": 12,
    "multiplier_use": 9
  },
  "totalDiceInflow": 115,
  "totalDiceOutflow": 27,
  "netDiceDelta": 88,
  "averageMultiplierUsed": 3,
  "highestMultiplierUsed": 10,
  "rewardBarTierReached": 4
}
```

For programmatic inspection, `getIslandRunEconomyTelemetryReport(userId)` also includes the append-only `events` array with timestamps and metadata for each recorded accounting event.

## Known limitations

- The ledger is in-memory only. It resets on page reload and is not a Supabase/audit-log replacement.
- It is best-effort session instrumentation; it does not backfill historical dice movements.
- Generic legacy paths may still land in `token_hop_dice` until they are given a more specific telemetry source.
- Event tickets are tracked as counters, not dice, unless a future gameplay path explicitly spends dice to buy tickets.
- This PR intentionally does not introduce economy governance, payout changes, multiplier changes, reward-bar pacing changes, schema changes, or UI redesign.

## Validation coverage

Tests cover:

- source/sink attribution and total reconciliation in the centralized ledger
- roll dice outflow and multiplier accounting
- passive regen and daily-treat inflow attribution
- event-ticket spend counters staying separate from dice outflow
- gameplay totals remaining unchanged while telemetry records accounting side effects
