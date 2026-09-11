# Wisdom Archive V2 — complete model v01

Frozen authored model for whole-island integration and independent visual review. The original approved landmark sheet's lower-left library and the overview's front-left library remain the design authority. This is a complete finished model delivery, not a claim of final integrated visual approval.

## Architecture and finish

The archive is a broad, asymmetrical library with a curved ground-floor frontage, a sweeping upper reading wing, and a higher elongated west reading gallery. All three are real rooms with continuous floors, positive stone piers and arch spandrels, occupied roofs, transparent glazing in actual arch openings, and visible coloured books on walnut shelves. The facades are library windows and reading rooms, with flat furnished roof gardens.

Continuous masonry stair flights connect the ground arrival, lower terrace, main upper roof and west roof edge. Roof reading areas include tables, chairs, open books, potted small trees, fine brass rails, hanging plants and flowers. Foundation rocks and gardens soften the perimeter.

The rooftop pool supports a deep-blue celestial globe with gold meridians, latitude lines, two inclined orbital rings, star beads and a north-star finial. Warm emissive strips light the library interiors. No real point lights or temporary construction rigs are exported.

Rear shelf layout, exact floor plans, plant positions and constellation details are authoring inferences from the original images. They remain subject to whole-island review.

## Contract and stages

The root `ISLAND_001_V2_WISDOM_ARCHIVE` has `id` and `landmarkId` equal to `wisdom`. It exports Y-up, front+Z, ground zero and the fixed lift socket `[0.72, 0.15, 1.07]`. Semantic owners are `archive-wings`, `archive-terraces` and `archive-globe`.

All level additions include stages 1 through 5: foundation/floors, positive room structure, books/furniture and globe support, planting/water/globe, then glazing/rails/lighting/celestial details. Every mesh carries `buildLevel`, `constructionStage`, `semanticOwner` and `sourceParts`. Previously funded meshes keep their exact geometry and transforms in subsequent levels.

| Level | Added triangles | Cumulative triangles |
|---|---:|---:|
| 1 | 6,999 | 6,999 |
| 2 | 10,838 | 17,837 |
| 3 | 6,798 | 24,635 |

The source has 47 mesh nodes to retain stage/level control. Completed runtime batching needs 12 owner/material combinations. Eight shared materials cover limestone, walnut and book colours, warm gold, reading lights, clear glazing, garden colours, rooftop water and celestial blue.

## Verification and reproduction

The actual GLB has radius 1.451387, height 2.455001, 24,635 triangles, zero degenerate triangles and a size of 1,593,864 bytes. Finite geometry, valid indices, identity transforms, owner ancestry, root/socket metadata and additive level signatures passed. All three rooms retain explicit full-height roof piers; their positive support geometry is recorded in `wisdom-v01-support-checks.json`.

```sh
/Applications/Blender.app/Contents/MacOS/Blender --background --python scripts/island001-v2-blender/archive.py
python3 docs/gauntlets/island-001-v2/whole-island/models/wisdom/verify-wisdom-v01.py
```

`wisdom-v01.py` is the frozen source snapshot. `wisdom-v01.blend` and `wisdom-v01.glb` contain the authored scene and exported asset. Metadata and actual-binary checks are adjacent. Runtime integration, browser capture, overall performance measurement and independent visual review belong to the root task. This worker made no TS, public-asset, runtime or manifest edits and is now holding geometry ownership for the root's next milestone.
