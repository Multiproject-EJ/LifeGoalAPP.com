# Island 016 Fisherman's Village — 6/10 to 10/10 visual Gauntlet

Date: 2026-08-28
Status: live baseline preserved; post-release real-3D scenery/material correction active
Owner: Eivind

## Mission and observable outcome

Upgrade the current playable Island 016 Fisherman's Village from an honest 6/10 baseline to a source-faithful premium stylized Three.js world. The complete island must read clearly on a portrait phone: bespoke occupied landmarks, layered coastal scenery, a tactile in-world fishing catch, and a genuinely colossal detailed water dragon whose complete eruption, flight, wing fold, head-first dive and impact remain readable.

## Evidence and authority

- Exact village authority: `docs/visual-references/island-016-fishermans-village/goals/exact/016-fishermans-village-approved-v004.png`, SHA-256 `a631297b2d2c11fcb3939de8ccc5bcdd69c52ab3bd12d40597859fbb6019ae65`.
- Secondary dragon identity: `docs/visual-references/island-016-fishermans-village/goals/secondary-inferred/water-dragon-four-view-v001.png`, SHA-256 `051c1577841f4479f3fceaf1d4a53d3a68dd6c68ca5434eb717228e1fc86c642`.
- Thirteen current matched captures and their hashes are locked in `baseline.v1.json`.
- The current implementation is baseline evidence only and must not contaminate generated goal studies.

## Non-negotiables

- Preserve the canonical 36-tile circle, fishing/mission state, one-renderer architecture and quality tiers.
- Keep the Guild Hall upper-right and the fish-market dock upper-left behind the lighthouse lantern.
- Use code-native procedural Three.js; the user explicitly rejected Blender for this route.
- Never overwrite approved goals or accepted evidence.
- Keep continuous island, dragon torso and wing membrane masses continuous; split only where ownership, attachment or motion genuinely differs.
- No generated study or geometry begins until the 32-part inventory is explicitly approved.
- No detail polishing before naked macro silhouette, volume, socket and cross-view coherence pass 0.85.
- Each family receives one blockout and at most one bounded correction before retirement/escalation.

## Proposed route

1. Generate source-grounded, isolated multi-view goal sheets for approved coupled groups only.
2. Prove the representation route with the Guild Hall macro/detail family in its real upper-right assembly socket.
3. If approved, serialize the other four landmarks, fish-market/harbour and village/environment systems.
4. Build the fisher, rig and catch fish family as an in-world interaction, not a modal catch animation.
5. Rebuild the dragon from the accepted identity and aperture contract, then separately gate eruption and flight/dive/impact choreography.
6. Assemble, review the least flattering views first, then test phone PWA and local Capacitor development builds.

## Stop condition

The 3D Asset Gauntlet admission checkpoint was approved by Eivind on 2026-08-28. The approved correction adds one explicit identity requirement: the water dragon's face must become substantially more iconic through a strong crown/horn silhouette, memorable expressive eyes, powerful aquatic jaw, distinctive whiskers and fin-frills, while preserving the accepted teal aquatic identity and friendly HabitGame readability. Reference generation and the Guild Hall representative vertical slice are now authorized.

## Post-release correction — real 3D scenery and tactile materials

Eivind's 2026-08-28 phone review identifies the environment/material layer as the next honest weakness: background scenery should be actual world-space 3D, and island stone, grass and wood should have stronger form and material response. This correction remains inside the already-approved p01, p04, p05, p06, p09 and p11 inventory ownership.

Representative vertical slice:

- replace the flat-only horizon read with world-space sky, cloud, rocky-islet and foam geometry while retaining the current plate only as a load fallback;
- replace the stacked-cylinder island read with a low-poly irregular shoreline/terrace silhouette;
- prove procedural PBR separation on one coupled surface set: layered stone, tufted grass and plank-built weathered wood;
- capture the canonical phone overview plus left, right and rear surveys before scaling any further detail family.

Acceptance cues:

- distant islets exhibit parallax and remain fixed in world space across orbit/fishing cameras;
- rock uses distinct cliff, sunlit-face and moss/grass contact bands instead of one flat grey mass;
- grass reads as clustered blades/tufts with palette and height variation, not green cones or a painted disc;
- docks and boardwalks show separate irregular planks, end grain, pegs and wet/dry value separation;
- the complete 36-tile route, landmarks, pond fishing, dragon aperture and all interaction targets remain unobstructed;
- Low/Medium/High tiers reduce instance counts and segments materially, with High remaining under the established mobile ceiling.

### 2026-08-29 correction result

- Final overview evidence: `artifacts/island-016-gauntlet/assembled-current-v004/scenery-overview-v004.png`.
- Least-flattering harbour/material evidence: `artifacts/island-016-gauntlet/assembled-current-v004/market-material-v006.png`.
- The texture plate is now fallback-only in the assembled world; the live horizon uses a gradient sky dome, volumetric cloud clusters, sun, gulls, world-space rocky islets and broken foam arcs.
- The island now has one continuous irregular wet-rock foundation, a connected dry-stone terrace, embedded detail stones, irregular moss caps and clustered multi-blade grass tufts. The rejected green perimeter wafer and detached lower rock batch were removed.
- Harbour timber now separates dark wet underframes and piles from individually instanced weathered planks, colour variation and hand-driven pegs.
- Independent read-only Quality Lord result: **PASS, 8.6/10 for the scoped scenery/material gate, no hard blockers**. Earlier 7.6 and 8.3 failures were retained as evidence of the two corrective loops rather than overwritten.
- Production compile and the canonical Island Run regression suite remain mandatory before merge or release; no publish action is authorized by this correction alone.

## 2026-08-29 dynamic harbour weather correction

Eivind's follow-up asked for clouds with more believable mass and a living sea that naturally cycles from quiet water through rising wind and waves, then settles again. This remains presentation-only: it may animate environment meshes and materials, but it must not advance, persist or derive gameplay state.

Implementation contract:

- deterministic 96-second `calm → building → windy → easing` envelope with bounded gust modulation;
- cohesive shaded cumulus clusters with joined shadow underbellies, weather-driven depth, descent, drift and clearing behavior;
- a radially subdivided ocean surface with vertex displacement rather than a flat lid;
- small whitecaps plus connected foreground swell fronts, stronger shoreline foam, and weather-linked boat bobbing;
- shared wind response for grass blades, foliage and conifer crowns;
- reduced motion remains respected by the existing production renderer because its ambience animation gate is unchanged;
- `weatherTime` exists only in the local fishing interaction lab for deterministic visual evidence.

Immutable evidence:

- first pass (retained failure): `artifacts/island-016-gauntlet/weather-current-v001/`;
- accepted calm/build/peak/ease set: `artifacts/island-016-gauntlet/weather-current-v002/`;
- independent Quality Lord first pass: **FAIL, 7.4/10** because the temporal arc was too subtle and foam read as detached strokes;
- independent Quality Lord corrected pass: **PASS, 8.7/10, no blockers**. Peak wind is independently readable through deeper clouds, darker atmosphere, connected swell fronts and stronger whitecaps; easing restores the sun and leaves fading residual swells while the board and landmark silhouettes remain unobstructed.

Release note: this correction does not authorize a push, merge, PWA deploy or Capacitor/Xcode copy by itself.

## 2026-08-29 full-horizon cloud-belt correction

Eivind's phone review identified an implausible weather composition: one dense cloud collection surrounded by an otherwise empty horizon. The environment now includes a separate 360-degree distant cloud belt behind the existing local weather bank.

Implementation contract:

- Low/Medium/High use 14/24/32 distant clusters respectively, retaining material tier reductions;
- distant clusters sit outside the overview camera and remain smaller, softer and more translucent than the local weather bank;
- deterministic 2/3/4-puff topologies, unequal angular gaps, varied elevation/radius/scale and occasional larger silhouettes prevent a repeated wallpaper row;
- the distant layer drifts independently and responds to the same calm/building/windy/easing envelope without advancing gameplay state;
- the harbor sun was reduced and moved inside a camera-safe high-sky chord so landmark orbits do not produce a clipped foreground disc;
- the board, landmarks, fishing targets and horizon islets remain unobstructed.

Immutable evidence:

- first four-azimuth pass, retained failure: `artifacts/island-016-gauntlet/horizon-cloud-belt-v001/`;
- corrected four-azimuth pass: `artifacts/island-016-gauntlet/horizon-cloud-belt-v002/`;
- first independent Quality Lord result: **FAIL, 0.79**. Continuity passed, but the fixed three-puff topology still read as wallpaper and the reverse-angle sun clipped;
- corrected independent Quality Lord result: **PASS, 0.86, no hard veto**. Continuity 0.93, variation 0.86, depth separation 0.91, island/sun/islet readability 0.87, likely phone readability 0.85.

Release note: this correction does not authorize a push, merge, PWA deploy or Capacitor/Xcode copy by itself.

## 2026-08-29 working fish-market harbour exploration

Independent triage identified the upper-left fish-market harbour as the next largest exact-goal mismatch after the accepted cloud belt. The bounded objective was a phone-readable working chain—two distinct boats, unloading, catch/cargo, workers and the market door—without touching the board, landmark hierarchy, weather, fishing or dragon systems.

Immutable evidence and decisions:

- Family 1 evidence: `artifacts/island-016-gauntlet/working-harbor-v001/`.
- Family 1 independent result: **RETIRE FAMILY, strict 0.56**. Both boats were buried beneath the dock and the water-contact ribbons read as detached graphic loops.
- Family 2 blockout evidence: `artifacts/island-016-gauntlet/working-harbor-v002/`.
- Family 2 first independent result: **BOUNDED CORRECTION, strict 0.72**. Close-up identity, work chain, distinct boats and attached foam passed, but the 390px overview compressed the harbour into one small orange protrusion.
- Family 2 single correction evidence: `artifacts/island-016-gauntlet/working-harbor-v003/`.
- Family 2 corrected independent result: **RETIRE FAMILY, strict 0.76**. Lateral separation and 20% larger hull footprints improved close-up separation without regression, but the locked 390px overview rose only +0.04 rather than the required +0.10 and remained below the 0.85 phone gate.

Both rejected geometry families were removed from the executable scene after review. Their evidence remains immutable. The last accepted island, including the 360-degree horizon cloud belt, remains the active visual baseline. Any future harbour attempt must use a genuinely different phone-scale representation and requires a new approval; further correction of either retired family is prohibited by the Gauntlet economics.

Verification after cleanup: patch integrity passed, Island Run architecture guards passed with zero violations, and the canonical Island Run suite passed **1899/0**. No push, merge, PWA deployment or Capacitor/Xcode copy is authorized by this exploration.

## 2026-08-30 real-3D-only release correction

The production and Island 016 lab scene no longer import, load or assign the generated ocean/sky PNG. The file is retained only as archived provenance in the reference packet. A plain clear colour now sits behind the enclosing Three.js gradient sky sphere, while all visible atmosphere and scenery remain world-space geometry: the 360-degree distant cloud belt, local volumetric weather bank, sun, gulls, horizon islets, animated radial ocean, whitecaps, shoreline foam, terrain and vegetation.

The dynamic ambience remains presentation-only and deterministic. Production advances the sky, cloud, ocean, grass, foliage, conifers, boats and foam through the shared elapsed-time animation path when motion is enabled; the existing reduced-motion gate freezes it without changing gameplay state. A structural Island Run contract test prohibits reintroducing the retired 2D plate in either production or the evidence lab.

Final release-gate evidence is retained in `artifacts/island-016-gauntlet/real-3d-only-v001/`: calm front, windy front and easing reverse-azimuth phone captures. The production Vite build passed with 1,360 modules transformed, the Island Run architecture guard passed with zero violations, the canonical Island Run suite passed **1,900/0**, and `git diff --check` passed.
