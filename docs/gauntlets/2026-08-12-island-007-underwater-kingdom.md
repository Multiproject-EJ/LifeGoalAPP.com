# Island 007 — Abyssal Pearl Kingdom Gauntlet

Status: active — pass 9 complete; final art score and physical-device performance gates remain open
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
- Typecheck, build, Island Run routing tests, architecture guards, and relevant visual contracts pass.
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

- Independent landmark fidelity review reached 6.9/10 before the pass-9 archive roof and portal-current corrections. Hatchery and portal now clear macro readability; archive, palace and sanctuary still need authored material/detail depth before 10/10.
- Independent ambience review reached 7.7/10. Organic reefs, broken caustics, vent bubbles, whale, hero fish and 360 composition are verified; architectural reef integration and distributed warm light remain the largest visual gaps.
- The authored budget is 175 calls / 180k triangles / 50 FPS. The latest complete high-tier desktop-browser profile recorded 44.1 FPS average, 34.2 ms p95, 173k max triangles and 178 max calls, correctly rated REVIEW. A subsequent trim removed two surface-light shafts and one jelly draw family; it needs a fresh profile.
- Required physical-iPhone 30-second profiler runs at Auto and forced High are not yet recorded.
- The procedural result preserves gameplay and animation but still cannot match the generated goal image's sculpted micro-detail without a materially different asset pipeline (authored/AI-generated meshes and baked textures).

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
