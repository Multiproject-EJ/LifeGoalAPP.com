# Impact house integration diagnosis

Read-only recommendation. No production code changed.

## Finding

`Island22WaterDragonMission.ts:669–689` always creates a cyan proxy shed at [-4.35, .62, 6.92]. It is ordinary visible scene geometry even before the cinematic. This overlaps cottage10 and the boatwright. Deleting only its mesh or setting it invisible would remove the cinematic damage/repair payoff without replacing that presentation.

The public presentation API already supplies all required state: `Island22WaterDragonPresentation.impactRepairProgress`, `fishCaughtKg`, optional preview time and reduced motion. Keep that API and all phase/timing constants unchanged. No gameplay/service/UI writes are needed.

## Recommended visual-only seam

Add an optional visual binding to the private `MissionOptions` in `Island22WaterDragonMission.ts:53`, passed by `Island22FishermansVillageThreeWorld.ts` at the existing mission construction near line5041. Prefer an explicit binding over a magic name lookup:

- Static anchor object in the same island-root coordinate system, following cottage10 final placement.
- A resettable visual deformation callback receiving damage amount and impact age, or a dedicated damage group with captured baseline position/quaternion/scale.
- Optional roof-section bindings only if stable sections are deliberately preserved before compaction.

When this binding exists, do not construct the cyan body, door, window, sign or two proxy roof panels. Retain legacy fallback only for callers that do not provide a target. Debris and waves remain mission-owned. Use the actual cottage shell as the visible damage/repair subject.

Safest initial deformation is a dedicated child wrapper around the V2 cottage above-ground shell and finish, with static placement/foundation/quay outside it. Preserve full house identity; do not rebuild a second cheap house. Apply the existing sinking/tilting/squashing envelope relative to saved baseline transforms. The two old cyan roof panels need no synthetic replacement: whole-shell deformation plus retained debris already communicates damage. If separate roof breakup is required, expose named roof groups before mesh compaction; never infer roof vertices from compacted material batches.

## Exact assembly issues to handle

`createIsland22SecondaryCottage` near line2794 builds named root `ISLAND_22_AUTHORED_HARBOR_CLUSTER_10` for index9. It creates STRUCTURE and FINISH groups, then compacts each. `addAuthoredVillageClusters` near line2880 compacts the returned cluster again. That second compaction can erase the intended animation boundary. Mark/preserve the damage wrapper or skip recursive cluster compaction for this one actor; compact its static children separately. Otherwise moving a former child can do nothing, or move only some materials.

The current shell-diver module writes its terrace, plinth and body into the same macro group. To keep support fixed during damage, isolate terrace/foundation into a static group before compaction. Root should coordinate this bounded module edit with its owner; keep independent reviewer read-only.

**Low quality currently creates only placement indices0–7** (`count = quality === 'low' ? 8 : ...`). Index9 cottage10 is absent in low quality. Explicitly include this mission-essential house on low, using its reduced-quality geometry; otherwise the optional binding is missing and fallback cyan shed returns or the damage beat vanishes. Do not increase all other low-quality cottages unnecessarily.

## Mission update and camera

At lines1125–1140, preserve:
- impact contact21.45s; existing impactProgress and age;
- damageVisible / active / repairProgress formulas;
- existing damage envelope values unless separate visual review requests adjustment.

Replace direct hardcoded transforms with baseline-relative application. Existing `rotation.set(..., .38, ...)` and `scale.set(1,...,1)` would destroy cottage10 yaw and scale. Capture and restore full transforms; compose additional rotation with a saved quaternion, and multiply saved scale by the damage factor. Every update at damage0 must reset exactly, including replay/seeking and repair1.

`impactDebris.position` is copied once from the old building near line693. Set it from the new anchor after final placement, with appropriate local coordinate conversion. Update debris colors to cottage materials if useful, without mutating shared materials.

Damage camera near1201–1204 currently follows `impactBuilding.position` with fixed offset[6.8,4.8,8.6], target+.72Y, FOV44. Point it at the new actual house anchor. Do not accidentally feed world coordinates into the root-local camera convention, particularly because parent island recoil changes root position/rotation. A static anchor avoids camera jitter from deformed shell. Recheck framing against boatwright and new quay rather than assuming old offset remains unobstructed.

Washed fisher starts at hardcoded[-4.2,1.05,7.1] near1164. Derive its start from the relocated impact anchor plus a small local shoreward offset, retaining existing wash timing/path to pond. The splash and impact waves originate at pond impact and should remain there unless visual review demonstrates a need to adjust them.

## Verification

Capture calm0kg, preimpact21.3s, impact21.6s, damage-camera22.6s, repair progress0/.5/1, then scrub back to0 in medium and low quality. Assert one physical house at the plot, no cyan proxy when bound, finite transforms, exact baseline restoration, static quay/support, visible debris during its existing interval, and final camera framing. Include reduced motion and preview seek checks. Run existing mission phase tests; no canonical-state semantics or UI changes.

Independent gate should compare the relocated cottage10 context and cinematic damage/repair screenshots. This note is a diagnosis, not approval of a future implementation.
