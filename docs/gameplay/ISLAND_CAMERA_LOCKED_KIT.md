# Camera-Locked Island Kit

The dev-only island production workbench lives at:

`/dev/island-template-kit`

It is deliberately excluded outside Vite development mode. It is not a player destination and must not be linked from gameplay navigation.

## Immutable geometry

- Scene space: `1400 × 1600`
- Playable board: `x=200, y=300, width=1000, height=1000`
- Shared board, tile-ring and center-island anchor: `(700, 800)`
- Final baked ground-plane ratio: `0.73`
- Four mirrored landmark satellites: `550 × 402`
- Landmark envelope ladder: `120 → 240 → 480` (each level doubles)
- Camera mode: `final-angle`; runtime perspective correction is forbidden

The machine-readable source of truth is `camera-locked-kit-v1.json`. The image-generation reference is `public/assets/islands/_template/camera-locked-layout-v1.svg`.

## Required production sequence

1. Start from the master layout reference. Change biome, materials, silhouette and atmosphere, but never move or resize the locked footprints.
2. Generate the environment at the final camera angle. Do not generate one angle and tilt it in CSS afterward.
3. Keep the central tile-ring corridor free of buildings and high scenery. Generated art must not contain substitute tiles.
4. Place the real 36 connected tile blocks over the result in the workbench.
5. Check L0, L1, L2 and L3 envelopes. L2 is exactly twice L1; L3 is exactly twice L2.
6. Inspect the result at `390 × 844`. A desktop mockup is not acceptance evidence.
7. Run `check:island-template-kit` and the island-art validators before promotion.

## Useful dev URLs

- Blueprint: `/dev/island-template-kit?mode=blueprint&level=3`
- Neutral massing: `/dev/island-template-kit?mode=clay&level=3`
- Proof island: `/dev/island-template-kit?mode=proof&guides=0`
- Proof with geometry guides: `/dev/island-template-kit?mode=proof&guides=1`

## Proof world

`Starfall Foundry` is intentionally not a water island. It uses deep space, floating asteroid terrain and crystal/brass architecture while retaining the exact same board center, final camera, satellite symmetry and tile clearance. Its project asset is:

`public/assets/islands/_template/proof/starfall-foundry-camera-locked-v1.webp`

This proof stays dev-only. It validates the kit without consuming a numbered player island.

## Release gate

A candidate fails if any of these are true:

- the board center differs from `(700, 800)`;
- any asset needs a runtime tilt or vertical squash;
- the four satellite footprints are unequal or no longer mirrored;
- an L3 landmark leaves its protected footprint or phone safe area;
- generated terrain or architecture obscures the tile-ring corridor;
- generated substitute tiles appear beneath the real board;
- the result only works after non-uniform stretching.
