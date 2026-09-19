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
