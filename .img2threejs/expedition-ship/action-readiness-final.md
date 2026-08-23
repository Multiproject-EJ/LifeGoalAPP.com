# Expedition ship action-readiness audit

## Runtime hierarchy present

- Named transform roots: `LEFT_WING_PIVOT`, `RIGHT_WING_PIVOT`, four named walker-leg roots, knee and ankle pivots.
- Named propulsion sockets: left grip drive, right grip drive and `CENTRAL_KEEL_DRIVE_SOCKET`.
- Named shield systems: permanent pressure window, four retractable armor leaves, seam backstop and conformal field emitters.
- Named occupied volumes: sanctuary clearance, garden atrium, garage belly and port/starboard occupied decks.
- `root.userData.sculptRuntime` exposes poses, mode families, scale, sanctuary invariants, locomotion, propulsion, protection and the environment signal.

## Verification

- All evaluated ±30° orbit views remain volumetric.
- Low: 158 meshes / 40,764 geometry triangles / 25 materials.
- High: 158 meshes / 71,990 geometry triangles / 25 materials.
- TypeScript project check passes.
- Island Run service suite: 1,815 passed / 0 failed.

## Open gate

The assembly coverage script reports 24 spec-to-runtime naming/alias gaps. Much of
the corresponding geometry exists with a more specific runtime name, but those
aliases have not yet been reconciled with the sculpt specification. Therefore the
runtime hierarchy is animation-ready, but the stricter spec-defined
explodable/clickable assembly gate is not claimed as passed.

Checkpoint 10 adds segmented controller shoulder armor, consolidated observation
glazing, genuinely curved wraparound inhabited galleries, denser facade load
paths, walker service detail and stronger PBR material separation. The strict
naming/alias result remains open with 24 errors and 17 warnings, recorded in
`part-coverage-checkpoint10.json`.
