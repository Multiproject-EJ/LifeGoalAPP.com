# Island 002 Sky-Root and Living Horizon Gauntlet

## Status

Implementation and local phone-format QA complete. Authorized by Eivind on
2026-08-11. Held at the visual-review gate before a separate production push.

## Goal

Make Celestial Sky Kingdom read unmistakably as a living floating kingdom on a
phone: a sculpted, tapered rock root beneath the playable plateau; a readable
spring and waterfall system; naturally drifting cloud depth; a memorable
airship crossing the horizon; and surrounding islands whose silhouettes,
heights, structures, and ecology do not repeat mechanically.

## Locked gameplay contract

- Keep the canonical 36-tile route, tile transforms, stop semantics, bridges,
  five landmark roots, click metadata, camera targets, and L1-L3 build states.
- New elements are scenery only and may not become gameplay hit targets.
- Do not add Island Run state mirrors or writes to the renderer.
- Preserve the existing overview, orbit, focus, build, and token cameras.

## Visual acceptance gates

1. The main island has a visible multi-layer tapered underside from the start
   camera and both orbit directions; it must not read as a flat plate.
2. One authored spring pool feeds a surface runnel and a broad waterfall that
   falls past the rock root, with foam and greenery framing its source.
3. Near and distant clouds move slowly in coherent wind lanes, with different
   speeds for parallax, without crossing the playable board.
4. A sapphire, ivory, gold, and timber airship is visible on a slow background
   route. Its propellers and suspension details animate on Medium and High.
5. Distant floating islands vary in radius, depth, elevation, vegetation, and
   architectural silhouette; no adjacent pair may be identical.
6. Low quality retains the root, principal waterfall, one cloud lane, the
   airship silhouette, and at least three varied distant islands.
7. Reduced motion freezes decorative animation while keeping the composed
   scene attractive.

## Performance budgets

- High phone proof target: 50-60 FPS.
- Low phone proof target: 55-60 FPS.
- Reuse materials and simple primitives. Prefer shared geometry/instancing for
  repeated greenery. Remove micro-detail before removing macro silhouettes.

## QA sequence

1. Phone overview: High, L3, Island 002.
2. Left and right orbit: root, waterfall continuity, satellite variety.
3. Focus each landmark: no obstruction or false click target.
4. Low quality: silhouette and motion identity retained.
5. Reduced motion: no decorative drift.
6. TypeScript, production build, Island visual contract tests, architecture
   guard, browser console, and `git diff --check`.

## QA record — 2026-08-11

- High overview and left-orbit phone proofs captured in
  `docs/gauntlets/evidence/island-002-sky-root-airship-v1/`.
- High warmed to 60 FPS at roughly 94-96k triangles.
- Low warmed to 60 FPS at roughly 45k triangles.
- TypeScript, production build, Island visual validation, production-brief
  validation, architecture guard, browser console, and `git diff --check`
  passed.
- The full Island Run suite reported 1723 passing tests and the same three
  pre-existing Island 001 camera/fixed-plot baseline failures. No Island 002
  regression was introduced.

## Rollback

Revert the isolated Island 002 visual commit. This pass changes no persisted
gameplay or user data.
