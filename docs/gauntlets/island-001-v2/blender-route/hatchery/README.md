# Authored Blender hatchery — draft macro review

Current review candidate: **blockout-b02.glb**, frozen after the one bounded correction. Its source is `blockout-b02.blend` / `hatchery-b02.py`; hypothesis and mechanical evidence are in `correction-b02.md` and `blockout-b02-export-checks.json`. b01 assets below remain unchanged audit evidence. No visual approval is claimed.

Status: **frozen for first independent browser review**, not visually approved. This is the first blockout of the newly user-approved Blender/GLB route. The retired four Three.js reviews remain part of the audit; none of their source geometry or procedural formulas were imported or translated into this asset.

## Source and reproduction

Authoring source: `scripts/island001-v2-blender/hatchery.py`.

From the isolated worktree root:

```sh
/Applications/Blender.app/Contents/MacOS/Blender --background --python scripts/island001-v2-blender/hatchery.py
```

Blender5.2.0 LTS creates `blockout-b01.blend`, `blockout-b01.glb`, and `blockout-b01-geometry.json` in this directory. The GLB is deliberately outside public runtime assets pending approval. `blockout-b01-export-checks.json` records the actual binary's hashes, node extras and glTF bounds. No cameras, lights, textures, foliage or furniture are exported.

## Observations and authored representation

The approved hatchery image has a broad low nursery with real open rooms, a raised room on the opposite side, a usable roof court, winding stair approaches, shallow stepped pools and a layered pointed glass shelter around one egg. The overview confirms its role as a continuous terraced garden complex, rather than several round towers.

This draft uses a single hollow perimeter nursery shell, exact Boolean arch cuts around every elevation, a transverse vaulted interior gallery, a complete interior floor and a thin broad roof court. There is no solid central retaining block beneath the egg court. The additional right upper room uses the same open-room construction. The two winding stairs have continuous load-bearing supports and curved parapets. The middle basin sits on a low vaulted landing; the lower basin belongs to the arrival court.

Seven glass petals are independently authored Bezier loft envelopes with sealed thickness. Forward leaves leave an actual entrance around the egg; paired brass boundary curves carry their silhouette. The egg is a smooth latitude-section ovoid. The palette is flat limestone, brass, cyan glass, pale egg and water. Hidden room plans and unseen rear construction are explicitly inferred from one view; browser comparison must decide whether the interpretation succeeds.

## Runtime contract

- Logical **Y up**, **front+Z**, root at ground0. Blender authoring maps logical coordinates to `(X,-Z,Y)`; standard glTF Y-up export reverses that mapping. All exported node transforms are identity; no loader rotation is required.
- Root: `ISLAND_001_V2_LOTUS_HATCHERY`.
- Four owner nodes: `hatchery-terraces` (constructionStage1), `hatchery-wings` (2), `hatchery-conservatory` (3), `hatchery-egg` (4).
- Every mesh has `buildLevel`, `constructionStage`, `semanticOwner` and a `sourceParts` array in glTF extras.
- One maximal asset: L1 retains eight mesh nodes; L2 adds four nodes (upper-right room and remaining four petals/ribs). Filter only nodes with buildLevel greater than the requested level. L1 buffers/transforms remain identical. L3 equals L2 for this macro gate; commissioning/detail additions remain deferred.
- Root socket extras: lift `[.72,.15,1.07]`, egg `[0,1.365,-.2]`.
- Glass exports `alphaMode: BLEND`, `doubleSided: true`; glass has real closed thickness rather than depending on this flag for volume.

## Mechanical result

GLB is1,247,700 bytes with12 mesh nodes and37,356 triangles. Maximum radial footprint1.575868 is inside1.6. Exported bounds: min`[-1.480000,0,-1.110000]`, max`[1.537744,2.420943,1.290000]`. All vertices are finite, owner/level extras survive, and GLB triangle counts agree with the authored Blender report. The source .blend is474KiB.

These are structural/export checks, not likeness or performance acceptance. Root owns actual browser loading, fixed raw captures, independent visual review and any later publishing decision. Do not amend this frozen draft until the reviewer explicitly authorizes its one bounded correction.
