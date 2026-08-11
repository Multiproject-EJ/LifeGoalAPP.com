# Shared 3D Radial Tile Fix and Live Release Gauntlet

## Mission

Remove the inner-ring tile overlap and depth flicker shared by the actual-3D Island 001, 002, and 005 worlds, then publish the verified islands to the production PWA and refresh the Capacitor iOS app.

## Root cause

The 36 tiles are positioned and rotated around a circular route but use one rectangular box. A rectangle keeps the same tangential width at both radii, although the available arc length becomes smaller toward the centre. Adjacent inner corners therefore intersect and render on almost coincident surfaces.

## Required solution

- Replace the shared box with one radial trapezoid prism.
- Derive inner and outer widths from the canonical route radius, tile count, radial depth, and a fine joint allowance.
- Keep the outer edge wider than the inner edge.
- Keep 36 canonical transforms, token positions, gameplay indices, hit behaviour, materials, and island-specific palettes unchanged.
- Prevent landing-impact deformation from expanding a tile far enough to recreate overlap.
- Apply through the shared renderer so Islands 001, 002, and 005 receive exactly the same geometry fix.

## Evidence gates

1. Pure geometry tests prove `innerWidth < outerWidth`, both widths fit their available polar sectors, and the joint remains positive.
2. Existing token, movement, camera, build, and Island Run tests do not regress.
3. Phone screenshots for Islands 001, 002, and 005 show a stable inner ring without intersecting top faces.
4. Production build and Island Run architecture guard pass.
5. Only verified release files are committed; large source/evidence work products remain outside the runtime commit unless intentionally selected.
6. Production main/PWA deployment completes successfully.
7. Capacitor sync completes and the updated iOS app launches on the connected device when available.

## Authority

Eivind explicitly authorized publishing these island changes to main/PWA and the iOS Capacitor app. No database, payment, account, or gameplay-state migration is included.

## Rollback

Revert the release commit to restore the rectangular tile mesh. The change contains no persistence or data migration.

## Stop conditions

- Stop before publishing if neighbouring tile faces still overlap or the token no longer lands centrally.
- Stop before publishing on new architecture violations, build failure, or a new Island Run test failure.
- Report rather than conceal unavailable GitHub authentication, failed Pages deployment, or unavailable iOS device/install tooling.

## Verification evidence — 2026-08-11

- The shared 36-tile route now uses `ISLAND_SHARED_RADIAL_TILE_TRAPEZOID` instead of the former rectangular `BoxGeometry(0.62, 0.18, 0.92)`.
- At the canonical route radius, both inner and outer edges are derived from their polar-sector widths with the same `0.018` world-unit joint. The inner edge is therefore narrower by construction.
- Peak landing deformation is capped below one percent in the horizontal plane, and contract tests prove that the animated footprint remains inside both radial boundaries.
- Phone-sized 390×844 live-shell inspections passed for Islands 001, 002, and 005. Each showed separated inner joints with no intersecting top faces.
- Production TypeScript and Vite builds passed. Audio validation passed for all 13 bundled files.
- The Island Run architecture guard passed with zero violations and the three existing allowlisted warnings.
- The full Island Run corpus finished at 1,696 passing tests and the same three pre-existing Island 1 camera-anchor failures present before this change. The new radial geometry contract test passed.
- `cap sync ios` copied the verified production bundle into `ios/App/App/public` and synchronized all seven installed Capacitor plugins.
