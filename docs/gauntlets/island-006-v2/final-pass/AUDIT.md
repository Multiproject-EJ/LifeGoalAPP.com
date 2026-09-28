# Island 006 final-pass visual audit

Date: 2026-09-28. Independent read-only audit; this document is a work queue and acceptance checklist, not a final visual approval. User has authorized internal approvals through the complete island. No production source was edited for this audit.

## Scope and evidence

Keep the nine accepted modules frozen: boatwright, hatchery, tavern, lighthouse/library, guild hall, fish market, north cottage, net-mender cottage, and smokehouse cottage. Reopen only a demonstrated defect, with its exact affected views. The remaining cottage indices 3, 4, 6–11 already have a separate pipeline; index 5 was omitted for the accepted tavern footprint and must not be silently restored.

Pixels reviewed before implementation diagnosis:

- Current assembled phone-shaped board: `../parts/cottage-03/qa/island-fit-v001/overview.png`. This is actual board rendering at a 390×844 canvas, DPR 2, **diagnostic distance scale 1.65**; it does not approve the default entry camera. Its metadata explicitly excludes physical-device acceptance.
- Earlier detail packet: `../final-details-v001/{fisherman,dragon-flight,eruption-8s,dive-20s,calm,squall,clearing}.png`. These are actual factory/mission renders, 900×900, medium quality, without the gameplay board.
- Current accepted cottage03 studio/world evidence and finish review provide local assembly authority; they do not prove the whole island's remaining elements.

Freshness matters: current HarborV2, FisherCrowdV2, DragonV2, and PremiumFishingActors hashes match the old detail packet (the first three were then named Island6*). IconicWaterDragonParts and WaterDragonMission hashes **differ**. Thus the old dragon images identify follow-up risks, not a current hard veto. The whole-world factory has also changed through building assembly. Recapture final environment, characters, and mission from frozen current sources.

Authority: `docs/gameplay/ISLAND_VISUAL_PRODUCTION_CONTRACT.md`; exact village source remains `docs/visual-references/island-016-fishermans-village/goals/exact/016-fishermans-village-approved-v004.png`. Generated part goals are secondary inferred references. Do not claim exact likeness to them or let them override gameplay topology.

## Concrete unfinished elements beyond cottages

| Priority / family | Visible gap and evidence | Bounded next objective |
| --- | --- | --- |
| 1. Hero fisherman and caught fish | Old reeling closeup exposes capsule sleeves, ball hands/cheeks, a broad simple beard patch and helmet-like hat. The catch has a very glossy balloon-like body and oversized spherical eyes. They appear simpler than the newly accepted architectural surfaces. | Author a coherent oilskin costume/head silhouette and readable fish gill/fin/body hierarchy. Establish macro and pose contacts before small surface detail. Preserve rod/reel/catch sockets and mission behavior. |
| 1. Crowd fishermen | Current overview repeats the same compact beard/cap/coat silhouettes around the pond. Source confirms palette variation around one geometry family and repeated arm construction. Static screenshots do not prove foot, grip, or evacuation contacts. | A small coherent cast with restrained silhouette/pose variation; all boots supported by their raft, both hands plausibly operating the rig, no detached faces or rods. Review fishing, alert, evacuation and return separately. |
| 1. Sea dragon | Older flight shows continuous body but a cluster-built face, needle-like horns/whiskers, and sail-like wing panels with weak shoulder/bone hierarchy. Eruption reads as a long straight pillar rising through hard stacked rings; dive gives a broad flat belly view. These are provisional until current-source recapture. | Gate head/body/wing anatomy as connected volumes in neutral views, then gate the existing eruption/flight/dive poses. Give the emergence fluid contact and splash breakup instead of a mechanical collar. Preserve recognizable teal sea-dragon identity and existing mission timing. |
| 2. Coastal terrain and public terrace | Current overview shows large repeating angular boulders, thin moss caps, broad regular radial steps and a strong layered disk foundation. Rich building quays make these simplified public surfaces conspicuous. | Improve the large coast-to-quay transitions and wet/dry material hierarchy first; preserve real support, pond and canonical route. Author rear and side rock continuation. Avoid adding detail that masks floating decks or blocks entries. |
| 2. Boats, public docks and pond rafts | Current board and old calm detail show oval bowl boats, loop-like gunwales, simple seats/posts and repeated raft disks. Public docks have much less construction hierarchy than the new boatwright/market. | One reusable closed hull family with legible inner/outer shell, stem, gunwale, seat contacts and supported oarlocks; finish public docks and raft edges with consistent wood/rope. Preserve placement and evacuation inputs unless a measured collision requires a local change. |
| 2. Scene cargo, racks and lanterns | Plain orange cylinders and cubes remain visible beside detailed houses. Source `addFishingProps` still uses a box and an eight-sided cylinder without stave/hoop structure. Ring lanterns and standalone racks also retain simple repeated construction. | Replace scene prop geometry with shared readable staves/hoops/slats, connected rack/net details and simple credible lantern hangers. Keep the accepted local cargo moves and all doorway/route clearances. Batch repeated surfaces. |
| 2. Ocean/weather integration | Calm, squall and clearing are visibly different; retain that achievement. Squall's long concentric white swell strokes read as drawn circular arcs, and shoreline foam still forms repeated dashes. Calm glints remain spatially regular. | Break up crest length, placement and opacity into believable water motion; keep wave/rain contrast legible without masking route/characters. Use current weather timing rather than another gameplay clock. |
| 3. Clouds, islets and vegetation | Current overview shows a repeated chain of large faceted white puff clusters; old cinematic shots expose a ring of small cloud clumps. Conifers and tiny islets are much simpler than the buildings. | Improve cluster hierarchy and horizon distribution at production and cinematic cameras. Maintain all local vegetation exclusions. Treat this as background support, not a reason to spend geometry that does not survive phone scale. |

A bright cyan/cream gabled surface beside the boatwright remains conspicuous in the current overview. It appears architectural rather than a water leak, but its owner was not established in this bounded audit. Identify it in the scene before editing; if it belongs to a queued cottage, absorb it there. Do not change the accepted boatwright to hide an unidentified neighbor.

Source diagnosis after pixels: `Island22FishermansVillageThreeWorld.ts` owns public terrain, sky, ocean crests, old boat/dock factories, scene cargo, raft platforms, lanterns and racks; `Island22HarborV2.ts` adds coastal rocks/foam/rain/water material detail; `Island22FisherCrowdV2.ts` owns batched crew geometry; `Island22PremiumFishingActors.ts` owns the hero fisherman/rig/catch; `Island22IconicWaterDragonParts.ts`, `Island22DragonV2.ts` and `Island22WaterDragonMission.ts` own dragon geometry and presentation. A V2 filename is not itself visual acceptance, and existing weather must be improved rather than duplicated.

## Final acceptance checklist

### Evidence and independent gates

- [ ] Finish every remaining part with critical scores ≥0.85. Preserve family/review counters. A bounded correction must improve its rejected criterion by ≥0.10 with no other criterion regression >0.05. Do not average a contact failure away with a good beauty view.
- [ ] Capture immutable current-source hashes, quality, viewport, camera and phase for every final packet. Retain matched before views. Reject stale evidence as final acceptance authority.
- [ ] Review front, rear, left, right, top, opposing obliques, clay and intended phone scale for static parts. Record occluded views as inconclusive; provide a visible angle instead.
- [ ] Final island sheet includes canonical overview and left/right/rear, plus close views of each coastline/harbor sector. Recheck accepted buildings only for new assembly conflicts caused by surrounding changes.

### Terrain, harbor and assembly

- [ ] All quays, cottage terraces, public stairs, piers and moved cargo rest on visible support; no daylight under foundations, terrain through doors, coplanar masonry, unsupported bridge landings or hull/neighbor collisions.
- [ ] Walkable visual approaches remain clear. Preserve the 36-tile Spark36 route, route corridor, pond footprint, landmark roots and authoritative game stop semantics. Never replace route/UI with painted artwork.
- [ ] At all four orbit directions, coast reads as one supported landmass with wet contact, rock strata and coherent rear treatment. No empty backs, detached moss wafers or foam clipping through piers.
- [ ] Boats have joined hull/gunwale/seats; oars meet shafts and locks. Fisher rafts support feet through motion; mooring/net/rope endpoints terminate visibly.
- [ ] Public surfaces and props share the accepted building palette and material hierarchy without checkerboard tiles, repeated bright grid glints or detail noise.

### Dragon poses and motion

- [ ] First capture current neutral front/side/rear/top and clay before deciding whether older anatomy concerns still apply.
- [ ] Capture emergence before and after water contact (including former 7 and 8.8 s points), flight at multiple wing extremes (including 12 and 15 s), and dive entry/exit (including 18.5 and 20.5 s). Use current phase authority if those times changed.
- [ ] Head/neck/body/tail remain continuous; horns, whiskers, teeth, gills, fins and wings attach in every extreme pose. No underside holes, root kinks, detached scale clumps, inverted membranes or wing/body intersections.
- [ ] Water emergence and re-entry show a coherent origin and contact, with readable fluid breakup and no hard hollow collar masquerading as spray. Dragon motion, spray and vortex remain coordinated.
- [ ] Inspect a short real-time clip as well as stills: no camera snap, sudden scale change, clipping, discontinuity or returning from the cinematic to the wrong board framing. Capturing one good flight frame is insufficient.

### Fishermen and mission

- [ ] Hero neutral, waiting/cast, bite, reeling, catch/recovery and success/failure poses retain supported boots, attached anatomy and legible face/costume from front/side/rear. Use only phases actually present in the mission.
- [ ] Both rig hands contact rod/reel through pose extremes; line runs from rod tip to its intended bobber/hook/catch point; no body/coat/boat penetration. Fish mouth, gills and fins remain coherent while bending.
- [ ] Crowd fishing, alert, evacuation and return have plausible supported motion and do not cross the route or new buildings. Check low/medium/high crowd counts; no crew left behind on vanished support.
- [ ] Existing fishing controls, prompts, rewards and progression remain authoritative and usable at phone size. Visual work must not alter success timing or state writes.

### Weather and camera

- [ ] Current calm, building wind, peak squall and clearing captures share a locked camera; include former 4/50/80 s reference points and inspect transitions in motion. No hard phase pop or sunny lighting/rain mismatch.
- [ ] Rain, moving water, flags/foliage and clouds form one readable weather state. Wet/dry contact remains visible. Rain and crest brightness never obscure labels, pawn, route or mission prompts.
- [ ] Default first-entry camera, not distanceScale=1.65 evidence framing, fits the full route beneath HUD and above controls. Preserve the contract's 47° board tilt and canonical layout; focus starts after the establishing view.
- [ ] Capture actual 390×844 production UI, a shorter phone, a wider phone and desktop; include stop focus and cinematic return. Wide diagnostic board screenshots do not substitute for these views.
- [ ] Reduced motion removes nonessential ambient/camera motion while preserving mission readability and controls. Verify final resting visuals rather than assuming the flag's existence proves behavior.
- [ ] Keep physical-device acceptance separate from desktop-hosted phone evidence; report it honestly if a physical device was not used.

### Progression, engineering and delivery

- [ ] Inspect all-L3 clean art and all authored landmark levels. Required 5 landmarks × 3 build transitions retain funded geometry and five semantic reveal stages; completion view remains unobstructed. Do not let final-L3 quality hide incomplete lower levels.
- [ ] Run applicable architecture/runtime/visual-wiring and build checks. Measure final low/medium/high render cost and a representative mission/weather peak; existing part budgets and final capture statistics remain visible. Tests cannot replace visual gates.
- [ ] Confirm no accidental changes to frozen sibling hashes, gameplay services, authoritative transforms or unrelated parallel work. Explicitly document approved assembly adjustments.
- [ ] Deliver matched before/after at the same production camera and lighting, plus least-flattering orbit and character/action comparisons. State remaining limits; do not present a diagnostic zoom, generated target or passed compile as a finished-island screenshot.

## Recommended order

Complete queued cottage macros/finish while defining character targets. Then finish shared harbor/terrain families, hero/crowd fishermen and dragon with their own bounded gates. Weather/background refinement follows the large scene and actor silhouettes. End with one frozen whole-island assembly, motion and production-camera gate, followed by matched before/after delivery. No additional user approval pause is required inside the scope already authorized.
