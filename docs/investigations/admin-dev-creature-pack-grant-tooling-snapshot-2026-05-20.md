# Admin/Dev Creature Pack Grant Tooling Snapshot — 2026-05-20

## Final PR scope

This PR completes a dev/admin-only Island Run pack grant path that evolved from the creature pack purchasing investigation. It adds fixed demo grant tooling for testing/support workflows only and does not add any public pack purchase implementation.

## Files changed

- `src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx`
- `src/features/gamification/level-worlds/components/IslandRunDebugPanel.tsx`
- `src/features/gamification/level-worlds/services/islandRunAdminDevPackGrantAction.ts`
- `src/features/gamification/level-worlds/services/islandRunCreatureCollectionLedger.ts`
- `src/features/gamification/level-worlds/services/islandRunGameStateStore.ts`
- `src/features/gamification/level-worlds/services/islandRunGrantIdUtils.ts`
- `src/features/gamification/level-worlds/services/__tests__/islandRunAdminDevPackGrantAction.test.ts`
- `src/features/gamification/level-worlds/services/__tests__/runIslandRunServiceTests.ts`

## Supported grant types

- Fixed creature pack
- Fixed egg reward pack
- Optional dice bonus
- Optional essence bonus

## Dev/admin gating mechanism

- The canonical grant service requires `allowGrant: true`.
- The canonical grant service only accepts `grantSource: 'dev' | 'admin'`.
- The Debug Panel buttons are rendered only after DEV MODE is unlocked in the Debug Panel.
- Board-level handlers also short-circuit when `isDevModeEnabled` is false.

## Idempotency behavior

Grant IDs are trimmed, lowercased, validated, and recorded on granted ownership artifacts. Repeating a previously applied grant ID returns `already_granted` and does not create another runtime commit or grant additional creatures, egg vouchers, dice, or essence.

## Duplicate creature behavior

Duplicate creature IDs are handled by the canonical creature collection ledger. They increment `creatureCollection` copy counts while preserving existing bond XP, bond level, feed timestamps, and claimed bond milestone fields.

## Canonical state fields touched

- `creatureCollection`
- `eggRewardInventory`
- `dicePool`
- `essence`
- `essenceLifetimeEarned`
- `runtimeVersion`

All writes flow through the Island Run action service and `commitIslandRunState`; `creatureCollection` remains the only creature ownership authority.

## Explicit non-goals

- No Stripe changes
- No public purchase UI
- No paid random packs
- No Supabase migrations
- No new creature inventory authority

## Validation results

- `npm run build` — passed
- `npm run test:island-run` — passed, 689 passed and 0 failed
- `npm run check:island-run-architecture-guards` — passed, 0 violations and 3 existing allowlisted warnings
- `git diff --check` — passed

## Remaining blockers before public/paid packs

- Server-side entitlement and grant ledger with durable idempotency.
- Admin identity and audit persistence beyond local debug logging.
- Fixed SKU/catalog, duplicate, refund, and reversal policy.
- Public UX disclosure and support flows for pending/synced/refunded grants.
- Legal/platform review before any paid random pack or odds-based reward.
- Stripe SKU, checkout, webhook, and refund integration for fixed public packs only after the above blockers are resolved.
