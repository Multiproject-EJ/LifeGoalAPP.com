# Assembly upgrade — 2026-09-09 review packet

Owner direction: ten charges, in batches of 3 + 5 + 2; a grand diplomatic assembly and fast robotic build. This is an implementation review packet, not an approved visual master.

## Preview

- Integrated: `/dev/island-template-kit?mode=3d&island=1&level=3&assemblyCharges=10&guides=0`
- Replay: use `Play 3 + 5 + 2` in that workbench.
- Focused geometry/animation review: `/island001-assembly-review.html` (development-only entry, excluded from the ordinary production HTML entry).

The focused review uses the exact Assembly runtime and materials, with a separate inspection camera and lighting. It does not demonstrate the real HUD, controller, board integration or phone performance. Its buttons exercise presentation only and never write a player save.

## Geometry render provenance

Any `hall-geometry-review.png` is an offline rendering of exported live Three.js triangles and transforms. Instanced geometry is expanded for the offline renderer. It retains shape and material colors but uses Blender illumination and does not include the browser's procedural canvas textures. It is geometry evidence, not an in-game screenshot or physical-device result.

## Acceptance still required

Review the complete island with all four outer L3 landmarks, the three blast beats, robot construction, left/right hall inspection, reduced motion, and a real phone performance sample. Do not declare 10/10 or production approval from these local test artifacts.

## Landmark access pass

`hall-geometry-review-v4-access.png` shows the first four-landmark integration, including the foreground observatory occlusion. `hall-geometry-review-v5-access.png` is the corrected cutaway: rear landmarks retained, near buildings cut away with the terrain, all four lift stations retained. Ordinary surface view retains all four buildings. These are offline geometry renders; translucent glass and procedural textures are omitted by the exporter. The review page's cutaway toggle also toggles the near buildings.

After V5 was exported, the two foreground gallery arrivals were also given seating gaps in the outermost row. That small clearance change is covered by the current runtime but not depicted in V5.

## Environment refinement, 2026-09-10

V6 tested discrete rock blocks and exposed an overly regular masonry grid. V7 replaces them with continuous, uneven mineral bands across the two cut faces. Both use the same actual-runtime triangle export and the V5 camera/lighting. The lift pavilions also have brass canopy edges, illuminated thresholds and civic roundels. All original presentation caveats apply: offline geometry evidence, not browser animation or phone performance approval.

## Coast V8

`island-coast-review-v8.png`: offline surface composition with the new spring-fed waterfall, authored Assembly terrain, ocean and all four original L3 landmarks. Unlike the earlier cutaways, this shows the surface. Export includes the runtime waterfall at elapsed 2 seconds. Grass/cliff/sea materials are review substitutes; the live route, HUD, shared ambient cascades, sky and living-world details are excluded. Translucent foam is rendered opaque by this exporter. Use it to inspect proportions and continuity, not final lighting, animation or device performance. The focused review page's surface toggle now includes terrain and sea.
