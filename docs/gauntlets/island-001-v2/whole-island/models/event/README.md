# Observatory V2 — complete model v01

Frozen complete model for whole-island integration and independent visual review. The approved landmark sheet's lower-right observatory and overview's front-right landmark remain authority. Finished geometry and materials are included under the user-approved whole-island workflow; no isolated visual approval is claimed.

## Composition

A broad west/central hall and lower curved east instrument wing provide occupied arched rooms, transparent glazing, visible shelves and warm interior light. Their flat roofs form asymmetrical terraces. A smaller rear reading gallery occupies the space under the dome. Exterior stairs connect the arrival court, west terrace, east observation terrace and rear gallery.

The roof is a genuinely split ellipsoidal dome. Its two thick blue halves retain warm interior faces, gold structural cut-edge arches, restrained curved grids and constellation beads. The cut edges widen toward the front, keeping a central observing aperture open from court to sky. Each half is a complete separate funded surface; the second does not resize or replace the first.

The central armillary has a small gold sun, an upright axis, multiple inclined gold gimbals, a blue zodiac band and orbiting planetary beads. Its pedestal stands on the occupied hall roof. The terraces include a tripod telescope, reading tables, chairs, star charts, planted trees, cypress, flowers, hanging ivy and celestial banners. The architecture has flat reading terraces and large windows, without battlements or turret roofs.

## Semantic and funded contract

The root `ISLAND_001_V2_OBSERVATORY` has `id` and `landmarkId` equal to `event`, Y-up/front+Z axes, ground zero and lift socket `[0.72, 0.15, 1.07]`. Its front is intended for yaw 0 in the revised island composition.

- `observatory-wings`: occupied rooms, stairs, furniture, landscaping and warm glazing.
- `observatory-dome`: split roof surfaces, curbs, gold frames, blue banners and telescope enamel details.
- `observatory-armillary`: pedestal, sun, zodiac and tracking rings.

Every level addition contains all five construction stages and explicit `buildLevel`, `constructionStage`, `semanticOwner` and `sourceParts` metadata. Level 1 provides the first inhabited hall, instrument core, stairs and gardens. Level 2 adds the east wing, western blue shell and additional rings. Level 3 adds the rear gallery, opposing blue shell, further gardens and final celestial details. All prior funded mesh signatures and transforms remain fixed.

| Level | Added triangles | Cumulative triangles |
|---|---:|---:|
| 1 | 7,551 | 7,551 |
| 2 | 9,747 | 17,298 |
| 3 | 7,351 | 24,649 |

The source retains 48 authoring mesh nodes for independent stage/level control. Completed rendering uses 12 semantic-owner/material combinations. The two dome meshes contain separate blue and warm-interior primitives; their nearest ancestor carries the level/stage metadata. Vertex colours are neutral on these mixed-material shells to prevent double tinting.

## Verification and reproduction

The model remains within radius 1.6 and approximately 2.46 high. Actual-binary geometry, material, bounds, indices, owner hierarchy and additive-level checks are in `event-v01-export-checks.json`. Positive occupied-room roof supports are recorded separately. Five front-centre rays verify the split shell does not seal the opening. No mesh intrudes into the tested lift cylinder of radius 0.20 between heights 0.20 and 1.15.

```sh
/Applications/Blender.app/Contents/MacOS/Blender --background --python scripts/island001-v2-blender/observatory.py
python3 docs/gauntlets/island-001-v2/whole-island/models/event/verify-event-v01.py
```

`event-v01.py` is the exact frozen source snapshot, alongside the `.blend`, `.glb`, metadata and checks. Runtime integration, actual browser evidence, whole-island performance and independent review remain with the root. The builder did not edit TS, runtime, public assets, manifests or sibling models.
