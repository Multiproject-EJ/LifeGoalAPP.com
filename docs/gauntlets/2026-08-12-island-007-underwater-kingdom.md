# Island 007 — Abyssal Pearl Kingdom Gauntlet

Status: active — pass 13 complete; final art score and physical-device performance gates remain open
Reference: `docs/visual-references/island-007-underwater/island-007-underwater-goal-v1.png`
Runtime island: 007 (ordinary, non-arena)
Primary viewport: 390×844 CSS pixels, portrait phone

## Outcome

Create a fully procedural, interactive Three.js underwater kingdom that preserves the canonical 36-tile Island Run route and the shared camera/gameplay contracts. The result must read as a complete underwater civilization rather than an existing island with a blue color grade.

## Reference analysis

### Identification and form

The target is a compound architectural environment with one central radial board plate, a tall central pearl palace, and four distinct satellite districts. Its bounding volume is a vertically layered oval: deep seabed/root below, gameplay ring in the middle, five architectural silhouettes above, and open-water ambience surrounding it. It combines radial symmetry at the route with deliberate asymmetry in reefs, fauna, coral growth, and distant life.

### Macro hierarchy

1. Underwater volume: cyan-to-indigo depth, surface light, particulate haze, distant silhouettes.
2. Seabed island: layered rock/root, reef shelves, sandy terraces, ruins, and a protected route corridor.
3. Canonical route: exactly 36 solid wedge tiles, narrower inside and wider outside, owned by the shared renderer.
4. Central Pearl Palace: shell-like tiered temple, giant pearl, five towers, arched entries, warm windows.
5. Hatchery Grotto: nautilus shell silhouette, visible nest and eggs, amber sheltered interior.
6. Habit Sanctuary: open living-reef pavilion, kelp ribbons, bubble/water mechanisms, turquoise-gold frame.
7. Wisdom Archive: ribbed glass-shell dome, books, brass instruments, charts, warm study light.
8. Compass Portal: crystal arch, rotating compass rose, violet energy surface, navigation instruments.

### Meso and micro systems

- Architecture: stepped foundations, stairs, arches, columns, ribs, shell roofs, finials, railings, pearl nodes, coral trims, windows, runic bands.
- Reefs: branching coral, sea fans, anemone bulbs, kelp blades, shell clusters, sand patches, ruin fragments.
- Life: three fish-school layers, solitary reef fish, jellyfish, manta, whale silhouette, bubble streams, drifting motes, fantasy submarine.
- Lighting: broad surface shafts, animated caustic projection, warm window lights, cyan/violet emissive accents, fog depth.
- Motion: fish paths, fin/tail oscillation, jellyfish pulse, manta glide, kelp sway, bubbles rise/reset, caustics drift, surface-ray drift, compass rotation, portal pulse, pearl breathing glow, submarine orbit.

### Materials

- Ocean stone: dielectric, roughness 0.72–0.9, low metalness, meso striation and cavity-darkened relief.
- Pearl/shell: dielectric physical material, roughness 0.12–0.28, clearcoat 0.75–1, subtle iridescent emissive response.
- Antique gold/brass: metalness 0.78–0.9, roughness 0.2–0.34, brushed relief.
- Turquoise enamel: roughness 0.22–0.38, clearcoat, moderate cyan emissive response.
- Crystal/portal: transparent/additive, depth-write disabled, cyan/violet emissive core.
- Coral/kelp: matte-to-satin dielectric with local hue variation and restrained emissive tips.
- Warm windows: tone-map-independent amber emissive planes and low-count real point lights.

### Identity-defining features

1. The giant central pearl set into a tall shell palace.
2. A protected nautilus hatchery with visible eggs.
3. Five unmistakably different silhouettes, not repeated domes.
4. A clean sapphire/aqua 36-tile ring with pearl-and-gold accents.
5. Dense but composed reef terraces around, never on, the route.
6. Moving surface caustics and diagonal light shafts that immediately establish underwater depth.
7. Layered fish, jellyfish, manta, whale and submarine movement at different distances.
8. Warm inhabited interiors against cool blue water.

### Reference limits

The single generated view does not define rear architecture, exact building dimensions, or hidden reef topology. Those regions are authored as coherent stylized continuations and validated from front, rear, left-orbit, and right-orbit views. Exact pixel matching is neither possible nor desirable because the runtime must preserve the real board and animate in 3D.

## Quality contract

The island may pass only when all of the following are true:

- Full island and all five landmarks fit in the phone play window at the establishing camera.
- The canonical route remains unobstructed and all 36 real tile tops remain readable with no z-fighting.
- Each landmark reads by silhouette at phone scale and L1→L2→L3 is additive, footprint-stable growth.
- At high quality, at least 12 reef clusters, 24 coral/plant clusters, three fish schools, jellyfish, manta, whale, submarine, bubble fields, motes, caustics, and surface rays are present.
- Low/medium/high tiers materially reduce mesh/particle/light cost while preserving composition.
- Reduced motion disables travel/orbit/sway and keeps a dignified static scene.
- No ambient scenery enters the protected route annulus.
- No gameplay state or writes are added to the 3D factory.
- Phone screenshots exist for overview, four orbits, and all five landmark focus views.
- Typecheck, production build, Island 007 routing/visual contracts, architecture guards, and template geometry pass. The broader Island Run suite remains 1726 pass / 3 fail solely on the pre-existing Island 1 fixed-plot migration baseline, which is outside this island branch and must be explicitly fixed or waived before release.
- Runtime inspection shows no console errors, missing assets, or persistent frame instability on the high-tier phone target.

## Blocking defects

- Generic blue recolor; insufficient underwater depth.
- Similar repeated landmark silhouettes.
- Flat terrain plate, sparse edge treatment, or empty background.
- Fish that translate rigidly with no tail/body articulation.
- Light shafts intersecting the board as opaque slabs.
- Coral, rails, ruins, or buildings placed over playable tiles.
- Missing solid tile tops or tile overlap/flicker.
- High quality achieved by unconstrained point lights or draw calls with no lower-tier plan.
- Calling the result “10/10” without screenshot and gate evidence.

## Pass order

1. Blockout and camera composition.
2. Structural terrain and five landmark silhouettes.
3. Landmark form/detail and three build levels.
4. PBR material separation and architectural lighting.
5. Reef, ruins, plants and edge density.
6. Living ambience and underwater light movement.
7. Interaction, quality tiers, reduced motion and optimization.
8. Multi-angle/phone comparison loop and final integration gates.

## 2026-08-12 evidence ledger

Completed:

- Authored Island 007 routing, five L1–L3 landmark families, canonical 36-tile integration and camera presets.
- Added optimized 132 KB WebP cavern/surface backdrop, layered seabed roots, large reef clusters, kelp, caustics, bubbles, fish schools, foreground fish, jellyfish, manta, submarine, whale silhouette and animated water surface.
- Added low/medium/high density tiers and reduced-motion gating.
- Batched landmark/scenery meshes, instanced bubbles and fish schools, shared tile-edge geometry, line-resource disposal, time-based animation and cadence-limited surface deformation.
- Captured overview, orbit and five landmark-focus evidence; reviewed against the goal with three independent Gauntlet QC agents.
- TypeScript, production Vite build, Island Run architecture guard and template geometry gate pass.

Open gates — do not call the island 10/10 yet:

- Pass 11 independent landmark fidelity review reached 7.3/10 before the final enclosed Archive dome and jewel-material pass. Hatchery and portal are structurally strong; palace, sanctuary and especially archive still remain below the generated target's sculpted density.
- Pass 11 independent ambience review reached 8.1/10. Organic reefs, broken caustics, vent bubbles, whale, hero fish, motion and 360 composition are verified; architectural reef integration and distributed warm light remain the largest visual gaps.
- The authored budget is 175 calls / 180k triangles / 50 FPS. The final pass-11 high-tier desktop-browser choreography records 41.3 FPS average, 34.3 ms p95, 172k max triangles and exactly 175 max calls, correctly rated REVIEW: geometry passes, timing does not.
- Required physical-iPhone 30-second profiler runs at Auto and forced High are not yet recorded.
- The procedural result preserves gameplay and animation but still cannot match the generated goal image's sculpted micro-detail without a materially different asset pipeline (authored/AI-generated meshes and baked textures).

### Pass 13 checkpoint

- Rebuilt the shell-roof language with curved spline ribs, strengthened the palace/archive/sanctuary facade hierarchy, enlarged architecture-integrated reef gardens, and removed the Hatchery's obstructing L3 chamber blade.
- Rejected an oversized palace gable during the self-critique loop because it buried the pearl and windows at phone scale; the committed direction keeps the clearer pearl-arch facade.
- A complete current High desktop choreography records 54.7 FPS average, 33.3 ms p95, 9.8% slow frames, 163 maximum calls and 175k maximum triangles. Geometry is within the authored 175/180k ceiling; timing remains honestly `REVIEW` rather than `PASS`.
- TypeScript, Island Run architecture guard and template geometry gate pass. Physical iPhone Auto and forced-High 30-second runs remain required.
- Goal comparison still exposes a substantial authored-detail gap, especially in building meso ornament, reef integration and jewel-dark material contrast. Pass 13 is an improvement checkpoint, not a 10/10 claim.
- A generated 73 KB ornament-atlas experiment was reviewed in the actual phone camera and deliberately rejected from runtime: without authored UV islands it collapsed the buildings into dark visual noise. The rejected asset is retained as evidence so a later mesh/UV pipeline does not repeat that dead end.
- A second controlled 45 KB facade-panel crop was tested only on the palace front and also rejected: even with bounded UVs, the flat insert did not integrate with the curved shell mass. Further image-projection experiments are closed; the remaining goal-fidelity gap requires authored UV'd/glTF landmark meshes or deliberate baked facade geometry.
- The final Compass Current rings are preserved outside the static batch and counter-rotate at runtime, restoring visible current depth over the opaque anti-bleed backplate with only two existing draw calls. The post-change desktop run stays inside geometry limits at 165 calls / 176k triangles, but its timing run was noisy (44 FPS average, 34.3 ms p95) and remains `REVIEW`; device proof is still authoritative.
- A final geometry-native palace pass adds a shallow pointed nave behind the existing doorway, pearl and flanking bays. Unlike the rejected texture/gold-frame experiments, it strengthens front-to-back mass without burying the hero cues or changing the footprint.

### Pass 14 performance and 360 checkpoint

- Added semantic camera culling without changing gameplay or board authority. Landmark close-ups now omit only the distant transparent water/fauna layers that cannot contribute to the selected facade, and side orbits omit off-camera hero fauna while retaining the water surface, reef, architecture and light shafts.
- Expanded the canonical 30-second choreography to sample Overview, Pearl Throne, Left orbit, Hatchery, Right orbit, then Overview. Right orbit was previously the most expensive unmeasured view, so maxima now cover the full authored camera set rather than a favorable endpoint.
- Added refresh-band evidence beside the unchanged raw frame target. The profiler still rates raw p95 honestly, but now records whether missed 60 Hz presentation bands normalize to an acceptable rendered-frame cost; this avoids relabeling a 32 ms raw p95 as a canonical pass.
- Added two broad asymmetric foreground seabed shelves to break the uniform root silhouette without entering the protected route or adding expensive reef bouquets.
- Final current High desktop-browser choreography: 55.9 FPS average, 32.5 ms raw p95, 16.3 ms refresh-normalized p95, 7.4% slow frames, 169 maximum calls and 170k maximum triangles. Geometry and refresh-normalized timing pass; the unchanged raw p95 keeps the overall result at `REVIEW` pending physical-device proof.
- TypeScript, production build, Island 007 contracts, architecture guard and template geometry gate pass. The full Island Run suite remains 1726 pass / 3 fail on the same unrelated Island 1 migration baseline.
- The img2threejs Tier-1 diagnostic correctly refuses to advance the old `blockout` state because the current proof is a fully shaded in-app render rather than the required map-stripped blockout capture. Its measured silhouette IoU is 0.9437, but the pass remains open; no false pipeline completion is recorded.
- Physical iPhone Auto and forced-High 30-second profiles remain the only device gate. Do not call the island 10/10 or release-ready until those runs are recorded.

### Pass 15 structural-evidence checkpoint

- Repaired the map-stripped evidence route. The previous single opaque `scene.overrideMaterial` turned the enclosing transparent water volume into a solid clay screen, hiding the entire island while still rendering its geometry. The corrected route strips texture/PBR influence with normal-facing materials, preserves transparent depth categories, hides particles and keeps the real camera and geometry.
- Tier-1 blockout diagnostics now pass with 0.9437 silhouette IoU, zero aspect/scale delta and no hard failures. Left and right map-stripped orbits remain non-degenerate, proving genuine volumetric geometry rather than a reference-camera facade.
- The final AI comparison remains below the 0.7 literal-goal threshold at 0.66: topology, underwater identity and landmark readability are strong, while handcrafted facade meso-detail and reef/architecture integration remain materially below the generated concept.
- A replacement-only jewel-dark palette experiment was captured, compared and rejected after two consecutive 30-second profiles dropped below the High 50 FPS target (44.9 and 47.3 FPS). The brighter Pass 14 runtime palette is retained; visual contrast is not permitted to replace performance evidence.
- The img2threejs correction action is therefore `stop`, not a false `continue`: a higher-fidelity jump requires authored UV'd/glTF landmark meshes or deliberately baked facade geometry, beyond this procedural branch's 180k-triangle mobile contract.
- Fresh High overview captures at L1, L2 and L3 verify additive three-level landmark progression across all five families without changing the canonical board footprint.

### Final action-readiness checkpoint

- The actual L3 High browser scene now exports its runtime part tree from the live canvas. The manifest contains all 25 specified component families across 33 runtime records, including the five independent landmark pivots, route integration, reef/terrain systems, animated portal and palace cores, fish/jelly/manta/submarine systems, bubbles, caustics and surface shafts.
- The img2threejs assembly gate passes: 25 specified, 33 built, 0 errors and 0 warnings. The 3×3 reference detail inventory is fully authored and every observed zone maps to a real spec feature.
- Each landmark root exposes `root.userData.sculptRuntime` with stable part IDs, a named focus socket, click/explode intent, a primitive focus trigger, a non-breakable destruction group, and an embedded seabed attachment contract. The shared route and landmark network expose equivalent runtime metadata without adding gameplay writes.
- The structural unit contract constructs all 25 runtime IDs and verifies selectable backing pivots, sockets, colliders and destruction metadata. The Island 007 contracts pass in the wider service run.
- Final local validation: TypeScript and production Vite build pass; Island Run architecture guard passes with 0 violations and 3 allowlisted legacy warnings; Island Run service tests are 1727 pass / 3 fail on the same unrelated Island 1 migration baseline.
- Physical iPhone Auto and forced-High 30-second profiles remain the only unavailable device evidence. The connected phone continues to report offline to Xcode, so release and literal 10/10 claims remain blocked.

Latest evidence:

- `docs/gauntlets/evidence/island-007-underwater-v1/final-overview-structural-upgrade.png`
- `docs/gauntlets/evidence/island-007-underwater-v1/final-goal-vs-current.png`
- `docs/gauntlets/evidence/island-007-underwater-v1/final-phone-app-board.jpg`
- `docs/gauntlets/evidence/island-007-underwater-v1/revised-nautilus-hatchery-grotto.png`
- `docs/gauntlets/evidence/island-007-underwater-v1/revised-living-reef-sanctuary.png`
- `docs/gauntlets/evidence/island-007-underwater-v1/revised-tidemind-archive.png`
- `docs/gauntlets/evidence/island-007-underwater-v1/gauntlet-pass9-overview.png`
- `docs/gauntlets/evidence/island-007-underwater-v1/gauntlet-pass9-motion-t6.png`
- `docs/gauntlets/evidence/island-007-underwater-v1/gauntlet-pass9-left-orbit.png`
- `docs/gauntlets/evidence/island-007-underwater-v1/gauntlet-pass9-right-orbit.png`
- `docs/gauntlets/evidence/island-007-underwater-v1/gauntlet-pass11-overview.png`
- `docs/gauntlets/evidence/island-007-underwater-v1/gauntlet-pass11-left-orbit.png`
- `docs/gauntlets/evidence/island-007-underwater-v1/gauntlet-pass11-right-orbit.png`
- `docs/gauntlets/evidence/island-007-underwater-v1/gauntlet-pass13-full.png`
- `docs/gauntlets/evidence/island-007-underwater-v1/gauntlet-pass13-phone-canvas.png`
- `docs/gauntlets/evidence/island-007-underwater-v1/gauntlet-pass13-goal-comparison.jpg`
- `docs/gauntlets/evidence/island-007-underwater-v1/gauntlet-pass13-left-orbit.png`
- `docs/gauntlets/evidence/island-007-underwater-v1/gauntlet-pass13-right-orbit.png`
- `docs/gauntlets/evidence/island-007-underwater-v1/gauntlet-pass13-motion-t0.png`
- `docs/gauntlets/evidence/island-007-underwater-v1/gauntlet-pass13-motion-t6.png`
- `docs/gauntlets/evidence/island-007-underwater-v1/final-committed-overview-post-nave.png`
- `docs/gauntlets/evidence/island-007-underwater-v1/gauntlet-pass14-overview.png`
- `docs/gauntlets/evidence/island-007-underwater-v1/gauntlet-pass14-left-orbit.png`
- `docs/gauntlets/evidence/island-007-underwater-v1/gauntlet-pass14-right-orbit.png`
- `docs/gauntlets/evidence/island-007-underwater-v1/gauntlet-pass14-motion-t0.png`
- `docs/gauntlets/evidence/island-007-underwater-v1/gauntlet-pass14-motion-t6.png`
- `docs/gauntlets/evidence/island-007-underwater-v1/gauntlet-pass14-profile.png`
- `docs/gauntlets/evidence/island-007-underwater-v1/gauntlet-pass15-map-stripped-overview.png`
- `docs/gauntlets/evidence/island-007-underwater-v1/gauntlet-pass15-map-stripped-left.png`
- `docs/gauntlets/evidence/island-007-underwater-v1/gauntlet-pass15-map-stripped-right.png`
- `docs/gauntlets/evidence/island-007-underwater-v1/gauntlet-pass15-map-stripped-phone.png`
- `docs/gauntlets/evidence/island-007-underwater-v1/gauntlet-pass15-jewel-goal-comparison.png`
- `docs/gauntlets/evidence/island-007-underwater-v1/gauntlet-pass15-jewel-profile.png`
- `docs/gauntlets/evidence/island-007-underwater-v1/gauntlet-pass15-jewel-profile-repeat.png`
- `docs/gauntlets/evidence/island-007-underwater-v1/gauntlet-pass15-level-1-overview.png`
- `docs/gauntlets/evidence/island-007-underwater-v1/gauntlet-pass15-level-2-overview.png`
- `docs/gauntlets/evidence/island-007-underwater-v1/gauntlet-pass15-level-3-overview.png`
