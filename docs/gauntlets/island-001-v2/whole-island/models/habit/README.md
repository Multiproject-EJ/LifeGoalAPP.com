# Habit Oak V2 — complete model v01

Frozen authored model for whole-island integration and independent visual review. The user-approved whole-island workflow permits finished materials and landscaping and supersedes the former per-landmark admission gates. This delivery is not a claim of final visual approval.

The original approved landmark sheet's upper-right oak is the design authority. This asset includes all four Oak groups: flowing trunk/roots/branch forks; broad clustered leafy canopy; inhabited timber galleries; and sweeping stone stairs with landscaped root gardens. The visible branches, canopy gaps, asymmetrical right-hand gallery stack, two long stair flights, warm openings and hanging lanterns follow that image. Hidden rear architecture, individual branch paths and exact plant placement are inferred.

## Delivered geometry

- `oak-trunk`: fluted curved main trunk, spreading buttress roots, eight large flowing boughs and their smaller forks, and slender cypress stems.
- `oak-canopy`: clustered foliage masses with individual leaf surfaces, planted root beds, violet flowers, hanging plants and cypress foliage. One shared vertex-colour material carries their variation.
- `oak-galleries`: three real timber floors, full-height supports, knee braces, balustrades, inhabited rooms, warm windows, arched root openings, brass-framed hanging lanterns and blue habit banners.
- `oak-stairs`: continuous masonry support for two sweeping flights, rear garden stairs, individual treads, handrails, arrival court, stepping terraces and garden rocks.

No temporary construction rigs are included. The root `ISLAND_001_V2_HABIT_OAK` has `id` and `landmarkId` equal to `habit`, Y-up/front+Z logical axes, and lift socket `[0.72, 0.15, 1.07]`.

## Funded construction

Every level has stages 1 through 5. Stages broadly correspond to roots/stone foundation, structural tree growth, inhabited architecture, foliage/gardens, and warm lights/railings/banners. Meshes carry explicit `buildLevel`, `constructionStage`, `semanticOwner` and `sourceParts` extras. Levels are additive; the loader can select `buildLevel <= currentLevel` without scaling or moving previously funded parts.

| Level | Added triangles | Cumulative triangles |
|---|---:|---:|
| 1 | 9,741 | 9,741 |
| 2 | 7,539 | 17,280 |
| 3 | 6,227 | 23,507 |

There are 33 authoring mesh nodes to preserve independent stage/level control. The completed model reduces to seven semantic-owner/material combinations. Its seven materials are sculpted bark, warm timber, garden limestone, vertex-colour leaves/gardens, aged brass, emissive warm window light, and blue banners.

## Mechanical verification and reproduction

The actual GLB has radius 1.498270, height 3.623583, zero degenerate triangles, finite attributes, valid indices and identity transforms. All three level additions contain every construction stage and retain previous mesh signatures. The GLB's size is 1,436,736 bytes. `habit-v01-export-checks.json` contains the binary verification results; `habit-v01-metadata.json` contains authoring metadata and source-part names.

```sh
/Applications/Blender.app/Contents/MacOS/Blender --background --python scripts/island001-v2-blender/oak.py
python3 docs/gauntlets/island-001-v2/whole-island/models/habit/verify-habit-v01.py
```

`habit-v01.py` is the frozen source snapshot. `habit-v01.blend` and `habit-v01.glb` are the authored source and exported asset. Integration, actual browser captures, whole-board performance measurement and independent visual review remain with the root task. No runtime, public asset or unrelated landmark source was edited by this worker.
