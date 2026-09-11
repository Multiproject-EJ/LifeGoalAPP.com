# Hatchery V2 — complete whole-island model v01

Complete authored candidate for the user-approved whole-island workflow. The original approved overview and upper-left landmark study remain immutable design authority. This asset completes the nursery, glass shelter, egg, pools and landscaping for integration; it does not relabel any previous failed draft as approved or claim final visual approval.

## Complete composition

The nursery has a broad connected lower arched room, a fully supported higher right nursery and a localized planted west roof shoulder. Actual counters, warm work-light strips and small nursery eggs occupy the arched interiors. The rooms use positive piers and spandrels; no Boolean subtraction can remove their roof supports.

Two continuous sweeping stair flights reach the egg court. Connected shallow pools and broad stone landings descend toward the arrival court, with two visible water sheets and a small side rill. The canonical lift position is kept clear.

The lotus shelter contains seven separate blue glass envelopes with finite rooted bases, a broad middle and pointed upper return. A dominant rear petal vault reaches over the egg; lower side and front petals retain their individual brass edges and finials. The foreground panels stop outside a real opening around the egg. Fine cross-ribs articulate the glazing. Paired surfaces preserve thickness and two-sided rendering.

One smoothly oval opal egg sits in a low gold cradle. Its subtle pastel vertex colours and reflective material suggest the original iridescent surface. Roof gardens include reading/tending tables, chairs, potted trees, cypress, violet flowers, hanging ivy and foundation rocks. No temporary construction rigs or runtime lights are exported.

Hidden room arrangement, individual petal profiles, rear glazing overlap and plant placement are authoring inferences and remain subject to the integrated review.

## Runtime contract

The root is `ISLAND_001_V2_LOTUS_HATCHERY`, with `id` and `landmarkId` equal to `hatchery`, Y-up/front+Z axes, ground zero and lift socket `[0.72, 0.15, 1.07]`. Semantic owners exactly match the existing checker:

- `hatchery-terraces`: floors, stairs, water, gardens and outdoor furnishings.
- `hatchery-wings`: occupied arched nursery rooms and their interiors.
- `hatchery-conservatory`: seven paired glazing envelopes, structural brass and cross-ribs.
- `hatchery-egg`: fixed opal egg, cradle and additive gold surface accents.

All three level additions contain construction stages 1–5. L1 provides the broad nursery, first stair/pool, rear shelter and egg. L2 adds the upper right nursery, second stair/pool and front glazing. L3 adds the raised west garden, side glazing, rill and final landscaping. Every previously funded mesh retains its geometry and transform. Each mesh exports `buildLevel`, `constructionStage`, `semanticOwner` and `sourceParts`.

## Evidence and reproduction

The authoring report, actual-GLB verification, positive roof-support checks, overhead-glass intersections and tested lift clearance are adjacent. These are mechanical checks, not a likeness score. The original procedural and Blender-route draft history is unchanged.

```sh
/Applications/Blender.app/Contents/MacOS/Blender --background --python scripts/island001-v2-blender/hatchery.py
python3 docs/gauntlets/island-001-v2/whole-island/models/hatchery/verify-hatchery-v01.py
```

`hatchery-v01.py` is the frozen source snapshot; `.blend` and `.glb` contain the authored scene and exported asset. Root handles actual browser captures, runtime integration, whole-island quality review and performance validation. No runtime, public asset, manifest or sibling geometry was edited by this worker.

## Frozen metrics

The actual GLB has **24,710 triangles**, **50 stage-controlled authoring nodes**, and **12 completed owner/material batches**. Radius is **1.508012**, maximum height **2.514297** and degenerate triangle count is **0**. L1 adds 11,650 triangles; L2 adds 7,672 (19,322 cumulative); L3 adds 5,388 (24,710 cumulative). All five stages occur in each addition and earlier mesh signatures remain unchanged. GLB size is 1,208,712 bytes.
