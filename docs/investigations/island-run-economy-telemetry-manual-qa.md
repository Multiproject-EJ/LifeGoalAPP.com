# Island Run economy telemetry manual QA checklist and interpretation guide

Status: manual QA guide only
Scope: real-app economy observation and interpretation for Island Run telemetry; no gameplay, UI, telemetry behavior, reward-bar pacing, reward payout, or schema changes.

## Purpose

Use this checklist to test Island Run in the real app and decide whether the current dice economy looks healthy before adding any economy governor or additional tuning. The goal is to separate repeatable economy behavior from one-time grants, identify source/sink mismatches, and confirm whether high-multiplier play burns dice over time.

This guide assumes the existing dev-only economy telemetry readout is available in the Island Run debug panel. The telemetry ledger is an in-memory testing aid, so record results before reloading the page.

## Setup checklist

Complete this setup before each manual run so sessions are comparable.

1. Open Island Run in the app.
2. Open the top-right Island Run menu and choose **🔧 Debug panel**.
3. In **🧪 DEV MODE**, unlock or enable dev mode for the current browser profile.
4. In **📊 Economy Telemetry**, click **Reset telemetry**.
5. Confirm telemetry totals are cleared:
   - total dice inflow = `0`
   - total dice outflow = `0`
   - net dice delta = `0`
   - source/sink buckets are empty or zeroed
6. Note the visible starting dice balance before the first roll or claim.
7. Run each scenario twice when possible:
   - once with a normal casual multiplier, such as `x1`, `x2`, `x3`, or the user's normal selected tier
   - once with the maximum available multiplier for the current dice balance
8. Do not reload the page during a run unless the scenario is explicitly testing reload/session behavior. Reloading clears the in-memory ledger.
9. Avoid mixing scenarios in the same telemetry window unless the scenario intentionally tests combined systems. Reset telemetry between isolated scenarios.

## Manual test scenarios

### 1. Normal casual session

Goal: confirm ordinary play has understandable spend, reward-bar progress, and small/temporary inflow without suspicious self-sustain.

Checklist:

- Reset telemetry.
- Record starting dice.
- Play Island Run normally for 10-20 rolls using a casual multiplier.
- Claim reward-bar rewards when they become available.
- Complete normal stop/building interactions if they naturally occur, but do not trigger dev grants.
- Record ending dice and telemetry totals.

Interpretation focus:

- Roll spend should appear under `roll_spend_dice`.
- Reward-bar dice should appear under `reward_bar_dice`.
- Net delta may be positive or negative for a short session, but it should reconcile with visible dice changes once one-time/non-roll grants are accounted for.

### 2. Max-multiplier burn session from high dice balance

Goal: verify high-balance, high-multiplier play trends net-negative over time rather than becoming a repeatable dice engine.

Checklist:

- Start from a high dice balance, either an existing test profile balance or a clearly recorded setup state.
- Reset telemetry after the high balance is present.
- Record starting dice and the maximum multiplier available.
- Select the highest available multiplier.
- Roll repeatedly until one of these stop conditions is reached:
  - dice can no longer afford the selected high multiplier
  - 30-50 high-multiplier rolls have been completed
  - the reward bar has produced several claim opportunities
- Claim reward-bar rewards as soon as they become available.
- Record ending dice, highest multiplier, average multiplier, total inflow, total outflow, net delta, reward-bar claims, and chained claims.

Interpretation focus:

- Healthy max-multiplier play should trend net-negative across repeated runs.
- A single burst can look positive if a sticker bonus, event milestone, or one-time grant lands, so classify sources before deciding.
- Repeated positive max-multiplier runs are a warning sign, especially if inflow comes from repeatable sources.

### 3. Reward-bar claim burst

Goal: ensure reward-bar overflow/chained claims drain and do not become infinite or self-sustaining.

Checklist:

- Reset telemetry.
- Record starting dice and current reward-bar tier/progress if visible.
- Use a multiplier that can generate enough progress to create one or more reward-bar claims.
- Trigger a burst by landing on reward/progress-feeding tiles and claiming all available reward-bar rewards.
- Continue claiming until no claim is available.
- Record reward-bar tier reached, number of reward-bar claims, chained claims, dice inflow by `reward_bar_dice`, any `sticker_completion_bonus_dice`, and ending dice.

Interpretation focus:

- Claims should eventually drain.
- Chained claims are acceptable when overflow is finite and explainable.
- Reward-bar dice plus sticker bonuses should not repeatedly exceed roll spend in a way that enables endless rolling.

### 4. Lucky Roll interaction

Goal: determine whether Lucky Roll dice inflow stacks safely with normal roll spend and reward-bar rewards.

Checklist:

- Reset telemetry.
- Record starting dice.
- Perform a short Island Run roll session that earns or interacts with Lucky Roll access in the normal way.
- Use Lucky Roll if available during the test.
- Return to Island Run and continue a small number of rolls.
- Record `lucky_roll_dice`, total inflow, total outflow, net delta, event tickets earned/spent if relevant, and ending dice.

Interpretation focus:

- Lucky Roll dice should be distinguishable from reward-bar dice.
- Lucky Roll plus event systems should not refill dice faster than rolls spend them across repeatable sessions.
- If Lucky Roll is unavailable, record the scenario as blocked/unavailable rather than substituting dev grants.

### 5. Space Excavator/event interaction

Goal: confirm event-ticket and Space Excavator rewards are visible, attributable, and not hiding a repeatable dice-positive loop.

Checklist:

- Reset telemetry.
- Record starting dice and starting event-ticket balance if visible.
- Play Island Run until event tickets are earned or use an existing account state that already has tickets.
- Spend event tickets in Space Excavator or the relevant event flow.
- Claim any available Space Excavator/event milestone rewards.
- Record `space_excavator_milestone_dice`, event tickets earned, event tickets spent, total inflow, total outflow, net delta, and ending dice.

Interpretation focus:

- Event tickets are counters, not dice, unless a flow explicitly spends dice.
- Space Excavator dice should be attributable to event milestone dice, not hidden inside generic repeatable income.
- If event rewards plus Lucky Roll repeatedly refill dice faster than rolls spend them, investigate external inflow tuning/gating before changing reward-bar pacing.

### 6. Passive regen check

Goal: verify passive regen is identifiable and does not obscure roll-session accounting.

Checklist:

- Reset telemetry.
- Record starting dice and visible dice cap/level context if available.
- Lower the dice balance through normal rolls or use an existing low-balance test state.
- Wait long enough for passive regen to run, or return after the app's expected regen interval.
- Record `passive_regen_dice`, total inflow, ending dice, and any simultaneous sources.

Interpretation focus:

- Passive regen should appear as `passive_regen_dice`.
- Passive regen may produce a positive net delta when the player is below cap; that is not automatically unhealthy.
- Do not treat passive catch-up refill as proof that high-multiplier play is sustainable unless it repeatedly offsets roll spend in normal play windows.

### 7. Daily treat/welcome-pack/dev grant exclusion check

Goal: confirm one-time or admin grants are distinguishable from repeatable normal income before evaluating economy health.

Checklist:

- Reset telemetry.
- Record starting dice.
- Trigger or observe only the grant flow being tested:
  - Daily Treat
  - welcome pack
  - first-session tutorial or starter grants
  - dev/admin grant
- Avoid normal rolls until after recording grant attribution.
- Record the relevant source bucket:
  - `daily_treat_dice`
  - `welcome_pack_dice`
  - `first_session_tutorial_dice`
  - `first_run_starter_dice`
  - `dev_admin_grant_dice`
- Then run a separate telemetry-reset session for normal economy testing.

Interpretation focus:

- One-time grants can create positive net delta without implying the repeatable economy is broken.
- Dev/admin grants must not be counted as normal player income.
- If daily/welcome/dev grants appear as repeatable normal income in analysis, correct the interpretation before tuning gameplay.

## What to record

Record these fields for every scenario:

- scenario name
- date/time
- build/environment
- tester
- account/profile notes
- starting dice
- ending dice
- visible dice delta (`ending dice - starting dice`)
- total inflow
- total outflow
- net dice delta
- inflow by source
- outflow by sink
- average multiplier
- highest multiplier
- reward-bar claims
- chained reward-bar claims
- event tickets earned
- event tickets spent
- reward-bar tier reached
- one-time grants observed
- notes about blocked/unavailable systems
- reconciliation notes if visible dice delta differs from telemetry net delta

## Healthy signals

The economy is showing healthy signs when:

- Max-multiplier play trends net-negative over time across repeated sessions.
- Reward bursts are temporary and do not become self-sustaining.
- One-time grants are clearly distinguishable from repeatable income.
- Reward-bar claims do not create infinite chains.
- High target milestones do not automatically create huge dice payouts.
- Telemetry source/sink totals reconcile with visible dice changes after accounting for starting state, one-time grants, page reloads, and blocked systems.
- External systems such as Lucky Roll, Space Excavator, passive regen, and Daily Treats are attributable in separate buckets rather than blending into reward-bar income.

## Warning signs

Investigate before adding more rewards or tuning up payouts if any of these appear:

- Repeated max-multiplier sessions trend positive.
- Lucky Roll plus event systems refill dice faster than rolls spend them.
- Daily, welcome-pack, first-run, tutorial, or dev grants appear as repeatable normal income.
- Chained reward-bar claims never drain.
- A `725`-style milestone causes an outsized dice payout automatically.
- Telemetry totals do not reconcile with visible dice changes.
- Reward-bar-only testing is negative, but integrated app sessions are strongly positive from external systems.
- `unknown_dice_delta` or generic attribution buckets become large enough to hide the real economy source.

## Recommended decision rules

Use these rules before deciding whether to add an economy governor or tune payouts:

1. If reward-bar-only is negative but integrated systems are positive, tune or gate external inflows first.
2. If all repeatable systems are negative but players feel starved, improve pacing, feedback, event cadence, cosmetics, or perceived reward quality before increasing dice.
3. If net positive only comes from one-time grants, no economy governor is needed for that source.
4. If max-multiplier is positive repeatedly, add an economy guard before adding more event rewards.
5. If telemetry does not reconcile with visible dice changes, fix attribution or documentation before making balance decisions.
6. If chained reward-bar claims are finite but emotionally exciting, preserve the burst feel and tune only the repeatable positive loop if one exists.
7. If Space Excavator or Lucky Roll is the positive driver, evaluate ticket earn/spend cadence and event milestone payout frequency before changing base roll cost or reward-bar pacing.

## Copyable QA table/template

Copy this table once per scenario or paste it into a spreadsheet.

| Field | Value |
|---|---|
| Scenario |  |
| Tester |  |
| Date/time |  |
| Build/environment |  |
| Account/profile notes |  |
| DEV MODE enabled? |  |
| Telemetry reset before run? |  |
| Starting dice |  |
| Ending dice |  |
| Visible dice delta |  |
| Total dice inflow |  |
| Total dice outflow |  |
| Net dice delta |  |
| Dice inflow by source |  |
| Dice outflow by sink |  |
| Average multiplier |  |
| Highest multiplier |  |
| Reward-bar claims |  |
| Chained reward-bar claims |  |
| Event tickets earned |  |
| Event tickets spent |  |
| Reward-bar tier reached |  |
| One-time grants observed |  |
| Lucky Roll used? |  |
| Space Excavator/event used? |  |
| Passive regen observed? |  |
| Reconciles with visible dice? |  |
| Healthy signals observed |  |
| Warning signs observed |  |
| Decision/recommendation |  |
| Notes/screenshots/log links |  |

## Quick scenario matrix

| Scenario | Reset telemetry first? | Primary sources/sinks to inspect | Healthy outcome |
|---|---:|---|---|
| Normal casual session | Yes | `roll_spend_dice`, `reward_bar_dice`, reward-bar claims | Spend and rewards are attributable; no unexplained positive loop. |
| Max-multiplier burn | Yes | `roll_spend_dice`, highest multiplier, average multiplier, all dice inflows | Repeated sessions trend net-negative. |
| Reward-bar claim burst | Yes | `reward_bar_dice`, `sticker_completion_bonus_dice`, chained claims, tier reached | Burst drains and does not sustain infinite rolling. |
| Lucky Roll interaction | Yes | `lucky_roll_dice`, event-ticket counters, total net | Lucky Roll is attributable and not repeatedly refill-positive with rolls. |
| Space Excavator/event | Yes | `space_excavator_milestone_dice`, tickets earned/spent | Event milestone dice are explainable and not hiding repeatable excess. |
| Passive regen | Yes | `passive_regen_dice`, ending dice, cap context | Regen is attributable catch-up, not mistaken for roll-loop profit. |
| Grant exclusion | Yes | `daily_treat_dice`, `welcome_pack_dice`, `first_session_tutorial_dice`, `first_run_starter_dice`, `dev_admin_grant_dice` | One-time/admin grants are excluded from repeatable economy conclusions. |
