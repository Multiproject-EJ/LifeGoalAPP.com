# Crystal Miners telemetry and release operations

Crystal Miners uses the existing consent-aware `island_run_gameplay_event` pipeline and the existing telemetry table, access policies, retention, rate cap and circuit breaker. Local previews do not upload data. Gameplay never depends on reporting succeeding.

## Player loop

The reward-bar Event details grid includes the original Crystal Miners icon and launches the canonical saved workshop. Preparation, ticket spend, terrain damage, rewards and permanent upgrades use the canonical action/store path. Continue and Try again return to preparation; neither starts another paid drop.

## Balance analysis

Admin → Telemetry → Crystal Miners shows the selected 7/30/90-day window. The query samples at most 1,000 recent mining events and explicitly indicates when capped. Counts describe telemetry-enabled players and are not whole-population conversion estimates. Attempts are deduplicated by player and event/revision identity. Lifecycle messages do not inflate attempt counts.

One compact `crystal_miners_attempt` includes schema/balance version, event, island, cavern, result, required/reached chests, lane power, tool tiers, forge level, gifts, ore, preparation actions, milestone claims, ticket availability, simulation duration and action duration. Preparation is aggregated; no per-frame reporting is emitted. Level outcomes and forge/tool levels allow difficulty and upgrade pacing to be compared. Entry, island-earning returns, supply visits, preparation, result and close events describe the surrounding loop. `ticket_pause` records an exhausted wallet even when Drop is disabled.

Changing balance constants requires a new `CRYSTAL_MINERS_BALANCE_VERSION`. Compare the same version/cohort before changing difficulty. Paid-offer visits are not purchases; existing commerce telemetry is authoritative for checkout/payment outcomes. This dashboard does not automatically tune outcomes or force purchase shortages.

## Failure diagnostics

`crystal_miners_error` identifies load, render, action and invalid-save failures. Error class, hashed fingerprint and up to five filename/line/column locations are sent; raw messages, URLs, tokens and player text are excluded. The local Island Run debug buffer also receives diagnostics. Rendering failures offer Return to island, and failed commands show a recoverable message.

`crystal_miners_sync_pending` means local state committed but cloud persistence did not confirm. The workshop displays that status. It is not a refund signal; retry must use the current revision to prevent duplicate reward/spend. Reporting failures are contained. The existing telemetry limits can suppress reports; no new external monitoring vendor or paging integration is configured.

## Persistence compatibility

The additive `crystal_miners_progress_by_event` JSONB column uses an empty-object default and accepts NULL for older clients creating runtime rows through JSONB_POPULATE_RECORD. New clients normalize missing/NULL data. Existing owner-only policies and the versioned commit RPC remain authoritative. Rollback can revert frontend code while retaining the harmless column and career saves.

## Per-game ticket quantities

`eventGameTicketEconomy.ts` specifies the play count per shared event funding ticket for every Arena game. Crystal Miners uses three; existing games retain one. The canonical mining action spends one shared ticket only when no already-funded drop remains, banks the other two in the permanent workshop, and consumes banked drops first. The combined write is revision-locked. A 10-event-ticket pack therefore provides 30 mining drops; earned and server-confirmed purchased tickets obey the same conversion. Switching games never duplicates the shared budget. Mining milestone prizes fund exact mining drops directly, not transferable event tickets.

The existing `minigameTicketPurchasesReady` flag remains false: pack equivalence is supported, but checkout is not claimed to be enabled or payment-tested. No new Stripe price or product is invented. The checkout pack quantity remains server-owned. Preparation still spends ore, not tickets.

## Animation and convenience telemetry

Balance version 2026-09-19.3 adds rare exact drop-ticket rewards and bounded temporary picks. Attempts include `drop_tickets_gained` and `spawned_tools`; preparation includes group-merge counts. `tail_accelerated` records replay compression without changing deterministic outcomes. Group merge unlocks at cavern 25 and performs only one pass over the chosen tier. Special reward displays read the committed receipt; flight animations cannot mutate balances. Save format 7 migrates earlier terrain while retaining the career and already-funded drops.

Balance version `2026-09-19.4` adds `boss_shots` and `boss_tools_destroyed` to attempts, covering actual canonical weapon hits rather than animation counts. Guardian shots select a lane without consulting occupancy or tickets; equipment investment is never deleted by a shot. Late-stone rebound pacing is now independent of tool tier.

Balance version `2026-09-19.5` identifies the tougher terrain/endurance tuning and six-theme focused presentation. Theme is deterministic from level (six-level rotation), so analysis can group without extra per-frame events. Result telemetry is emitted after the new-chest celebration; rewards remain atomically settled before playback. Admin/dev inspection is presentation-only and does not bypass canonical actions.


## Authored progression — balance 2026-09-19.6

New boards use save/layout 10, eight encounter recipes, short sparse onboarding and denser late caverns. Existing layouts 1–9 are admitted unchanged until cleared, including exact HP, opened chests and terrain geometry. Layout definitions are save validators: future HP/layout tuning must introduce a new layout version rather than invalidating an active board. A rollback must retain the schema-10 reader; older clients cannot safely read new saves.

Each attempt additionally records `layout_version`, `course_recipe`, `course_height`, `remaining_blocks`, `lane_capacity`, `lane_resistance`, `charges_collected`, `impacts_restored`, `keys_collected` and `gates_opened`. Capacity is a conservative guidance estimate, not a win prediction: cannon attacks, deflection, bonus tools, impact rounding and key timing can change the result. Compare outcomes by layout/balance version, level and equipment before changing the fixed curve. Never condition difficulty or gift rolls on a player's wallet or checkout behavior.

`node scripts/audit-crystal-miners-balance.mjs` runs nine deterministic headless campaigns: no purchases/forge, up to two purchases per drop plus affordable forge, and up to eight plus forge; three gift seeds each. All policies open gifts and merge. This measures progression and resource flow, not human enjoyment or conversion. Canonical action campaigns in `scripts/test-crystal-miners.mjs` separately test actual ticket spending, all 40 transitions, persistence and exact milestone wallets. The suite also gates positive merge value at every tier, late weak-rack failures, invested clears, bounded effects/replays and legacy save admission.

The admin panel defaults to the latest observed balance version, provides an explicit version selector and a new-layout-only filter, and shows preparation ore per drop and zero-ore drops. This prevents the old easy boards from being averaged into the new curve. These are observational proxies; they do not establish that spending causes enjoyment.
