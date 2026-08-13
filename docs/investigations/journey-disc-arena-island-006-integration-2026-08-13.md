# Journey Disc Arena — Island 006 Integration Investigation

Date: 2026-08-13

## Finding

Most integration plumbing already exists, but the current entrance is the
ordinary Mystery/Event Arena stop. With `journeyDiscArenaEnabled` on, the
deterministic Arena catalogue permits Journey Disc only on Islands 006, 011,
016, 021 and onward. Choosing it launches the fullscreen 3D minigame through
the normal `IslandRunMinigameLauncher`; start, ticket spend, score bank and
claims all route through canonical `islandRunStateActions`.

This does **not** yet create the desired center-island transformation.

## Contract conflict

- `isJourneyDiscArenaIsland` deliberately schedules this exhibition on the
  island immediately after every five-island boss: 006, 011, 016, etc.
- The authored-world routing contract classifies Island 005 as `arena` and
  Island 006 as `ordinary`.
- Island 006's approved visual Gauntlet requires Noctyra's Moon Gate at the
  centre and explicitly forbids disguising it as the Island 005 creature arena.

Therefore the event cannot permanently replace Moonveil Nexus, change Island
006's world role, or attach its progression to board-tile indices.

## Recommended product architecture

Treat Journey Disc as a **chapter-opening Concourse Exhibition** on the ordinary
island after each fifth-island boss:

1. On arrival to eligible Island 006/011/016, the Moon Gate or equivalent centre
   landmark receives a temporary event beacon when a canonical timed event and
   at least one event ticket are available.
2. Tapping the beacon focuses the existing centre camera, applies the tinted
   island/crowd backdrop, and opens a small invitation card.
3. Accepting uses the existing `handleLaunchArenaGame('journey_disc_arena')`
   path. The minigame remains a top-level fullscreen overlay/portal, so the full
   ring can fit portrait and the 3D island stays mounted behind its transparent
   surround.
4. Returning closes the overlay back to the unchanged Moon Gate. No stop index,
   world role, boss cadence, or island completion rule changes.

This realizes the requested “centre transforms and zooms end-to-end” feeling
without violating the ordinary-island or fifth-island Arena contracts.

## Persistence decision

- Permanent across islands and event rotations: fighter rank, weapon levels,
  highest Guardian clearance.
- Event-scoped: Disc Points, milestone claims, round ids, event tickets.

The 10/10 pass closes the prior gap by persisting rank in
`journeyDiscArmory`; legacy profiles without `rank` sanitize to Rank 1 and
monotonic merge prevents regression.

## Remaining integration slice

- Add an eligible-island centre beacon/invitation presentation owned by the 3D
  world/overlay layer, not the gameplay store.
- Reuse the existing launch handler rather than creating a second ticket or
  reward path.
- Decide whether the first Island 006 arrival grants a clearly labelled one-time
  exhibition ticket. Current production contract correctly refuses entry at
  zero tickets; silently minting one is an economy decision and was not assumed.
- Capture a 390×844 composite with Moonveil visible behind the transparent arena
  surround and verify back/return behavior on Capacitor.

## Release boundary

The feature flag remains off. This investigation does not apply the Supabase
migration, enable the event, alter Island 006 art, merge, push or deploy.
