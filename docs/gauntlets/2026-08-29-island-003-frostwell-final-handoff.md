# Island 003 — Frostwell final upgrade handoff

## Outcome

Frostwell Iceworks is now a production-shaped, phone-readable 3D signature mission. The camera leaves the board for a side cutaway, shows the complete surface rig, descends through five volumetric ice strata with the drill, signals proximity to freshwater, and resolves with ripples, chips and a bounded breakthrough burst. The completed landmark returns as a working seafood facility.

The wider Frostmoon presentation retains the approved day-to-short-blizzard-to-cozy-night arc, has no northern lights, uses warm window/fireplace practicals at night, removes Frostwell's blue fishery roof in favour of aged copper, and keeps the completed seafood trade/freighter departure connected to canonical completion.

## Runtime work

- `FrostwellIceworksThreeModel.ts` owns the named 3D part hierarchy, five-layer ice volume, section frame, bore, collars, helical cutter, chips, inclusions, freshwater lens, ripples, proximity and breakthrough cues, local lighting, quality scaling, action sockets and operating seafood facility.
- `Island5ThreePilot.tsx` reads canonical mission state, controls the bounded camera handoff and deterministic evidence mode, and never writes gameplay progress.
- `IslandTemplateKitPage.tsx` exposes dev-only cutaway depth, loop time and fixed review views for repeatable visual QA.
- `island5ThreePilotContract.test.ts` covers deterministic evidence framing and fixed review-camera distance.

## Mission sequence

1. The canonical mission becomes active and the presentation hands the camera to the Frostwell side socket.
2. A 1.8-second bounded transition moves the segmented shaft and copper helical cutter toward the committed depth.
3. Five extruded ice strata, seams, inclusions and compressed depth ticks provide true side-on depth context.
4. Cutter task light, chips and helical bore scoring communicate active drilling.
5. Cyan water bounce, proximity glow and concentric ripples intensify as the cutter approaches the freshwater lens.
6. At breakthrough, water droplets and the bounded burst resolve the cinematic; completed operating state then exposes reservoir, flow, fishery, conveyor and seafood carriers.
7. Reduced-motion mode snaps to committed progress and freezes optional ambient motion.

## Visual evidence

- Final phone frame: `docs/visual-references/island-003-frostmoon-upgrade/runtime-evidence/2026-08-29-frostwell-final/frostwell-front-t040-phone.png`
- True PNG pipeline capture: `docs/visual-references/island-003-frostmoon-upgrade/runtime-evidence/2026-08-29-frostwell-final/frostwell-front-t040-pipeline.png`
- Form comparison: `docs/visual-references/island-003-frostmoon-upgrade/runtime-evidence/2026-08-29-frostwell-final/frostwell-form-refinement-comparison.png`
- Material comparison: `docs/visual-references/island-003-frostmoon-upgrade/runtime-evidence/2026-08-29-frostwell-final/frostwell-material-comparison.png`
- Palette target: `docs/visual-references/island-003-frostmoon-upgrade/runtime-evidence/2026-08-29-frostwell-final/frostwell-material-palette.png`
- 500m breakthrough study: `docs/visual-references/island-003-frostmoon-upgrade/runtime-evidence/2026-08-28-frostwell-cutaway/frostwell-cutaway-upgraded-500m-crop.png`

## Quality gates

- Form Tier 1: silhouette IoU 0.9885; multi-angle degeneracy false.
- Material/surface/lighting Tier 1: palette max delta-E 0.0 in the deterministic diagnostic.
- Part coverage: 19 specified, 33 built, 0 errors, 0 warnings. Extra built parts are intentional named cutaway details.
- Architecture guard: 0 violations; 3 existing allowlisted warnings.
- Island Run service suite: 1,850 passed, 0 failed.
- Full sculpt specification validates in strict-quality mode.

## Honest constraints

Frostwell is an original mission design not present in the old contextual island screenshot, so material evidence is based on the user-approved visual direction and runtime palette rather than fabricated photographic PBR extraction. The compressed 500m geological section is intentionally diagrammatic for phone readability. Renderer call figures are full-scene observations, not isolated Frostwell-only measurements.
