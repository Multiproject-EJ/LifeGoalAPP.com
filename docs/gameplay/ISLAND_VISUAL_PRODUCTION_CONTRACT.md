# Island Visual Production Contract

For a new interactive actual-3D world, begin with
[`ISLAND_ACTUAL_3D_PRODUCTION_PLAYBOOK.md`](./ISLAND_ACTUAL_3D_PRODUCTION_PLAYBOOK.md).
This contract remains the visual authority; the playbook supplies the reusable
reference → img2threejs → implementation → Gauntlet → physical-phone sequence.

The reusable camera, footprint and phone-validation scaffold is defined in
[`ISLAND_CAMERA_LOCKED_KIT.md`](./ISLAND_CAMERA_LOCKED_KIT.md). New island
production must begin from that kit rather than inventing scene geometry per
biome.

The mass-production handoff, layer stack, fixed landmark envelope, screenshot
folders, and all-L3 acceptance sequence are defined in
[`ISLAND_120_PRODUCTION_SYSTEM.md`](../../work/island-visual-library/ISLAND_120_PRODUCTION_SYSTEM.md).

The approved multi-volume reuse, downloadable-pack, cache and exception-budget
strategy is defined in
[`2026-08-16-island-content-pack-reuse-and-volume-strategy.md`](../gauntlets/2026-08-16-island-content-pack-reuse-and-volume-strategy.md).
Every new island brief must classify its reuse model and delivery tier.

Status: **Active production contract**
Pilot foundation: Islands 1–5
Scale target: Islands 1–120 and later volumes

## Purpose

This contract turns the first five island art sets into the repeatable rules for producing the remaining 115 islands. It is subordinate to the canonical gameplay and art-positioning contracts. Artwork may change the world, materials, landmarks, boss, and atmosphere; it must never change the board topology or gameplay authority.

## One board, 120 worlds

The live board UI is the composition authority:

- profile: `spark36_ring`
- tile count: 36
- canonical board space: 1000×1000
- production scene space: 1400×1600
- playable board rectangle: x 200, y 300, width 1000, height 1000
- board-plane tilt: 47°
- board rotation: 0°
- primary approval viewport: 390×844 CSS pixels (portrait phone)

The actual React-rendered tile route, pawn, labels, landmark controls, progress UI, and HUD must remain unchanged. Generated artwork must be composed around that UI. Never paint replacement tiles, tile icons, token, labels, buttons, counters, or HUD into a runtime art asset.

At first entry the camera must show the complete route in the clear phone play window: below the top HUD and above the controller. The fitted scene is biased slightly upward so the lower route is not hidden by the controller. Stop-focus and travel close-ups begin only after this establishing view.

## Layer model

Every island uses the same five production layers:

1. **Ambient background** — full-container atmosphere. It may contain distant terrain, sky, sea, haze, and non-interactive depth, but no fake board or UI.
2. **Board plate** — transparent organic island terrain beneath the canonical
   route. It may vary radically in silhouette, but must not contain a baked
   route, tile circle, arena circle, or landmark platform.
3. **Landmark plots and cutouts** — four persistent external terrain plots plus
   four structures (`hatchery`, `habit`, `mystery`, `wisdom`), each with three
   bottom-anchored build levels. Plots and structures are visual-only and never
   become tile geometry.
4. **Boss and arena** — boss cutouts have at least idle and defeated states; the arena is separate scenery so the boss can disappear or change state without removing the location.
5. **Optional scenery** — waterfalls, bridges, reefs, lantern paths, vegetation, clouds, or other non-interactive composition pieces.

The base board set is therefore 17 required images per island:

- 1 ambient background
- 1 board plate
- 12 landmark levels (4 landmarks × 3 levels)
- 2 boss states
- 1 arena/scenery image

An outer-board accent, inhabitants, narrative panels, technology fragments, creature art, and animation states are additional packs. Across 120 islands the base board set alone is 2,040 runtime images, so production must be manifest-driven and batch-validatable.

## Camera and style lock

All board-attached art must share one camera and lighting model:

- polished stylized 3D mobile-game rendering
- orthographic three-quarter/isometric presentation matching the 47° live board plane
- north/top of the island recedes away from the viewer
- forms remain readable at phone scale; silhouettes beat tiny detail
- primary light comes from the upper-left/front-left unless a brief explicitly defines a story-motivated effect
- grounded contact shadows may exist inside the asset, but no black or opaque rectangular background
- no text, numbers, logos, watermarks, UI, fake tile icons, or baked-in status labels

The approved Island 1 tropical waterfall image is a **composition reference**, not permission to replace the real tile UI. Its terrain terraces, waterfall integration, path flow, and landmark clearings are preserved as the Island 1 pilot language while Luma Isle's crystal, moonstone, brass, and observatory identity is layered into it.

## Ring readability rule

The canonical circular route is derived directly from the live 36 tile anchors.
Its foundation, tiles, and central arena share that exact center and transform.
Generated art may supply the route material palette through the manifest, but
must never supply a second approximate geometry. Its 36 runtime tiles form a
**seamless connected circle of individual raised blocks**. Every block needs a
readable top face, a fine joint at each neighbour, a visible darker side wall,
and one shared perspective-correct depth and lighting model.

Four landmark plots sit beyond a protected visibility gutter. Manifest
validation checks both each plot rectangle and each largest scaled L3 building
rectangle against that gutter. An island cannot be approved from an L0-only or
fog-obscured screenshot.

Every production asset must be generated directly in the circular board's
finished camera angle. The board is the immutable camera reference: its center,
ellipse, receding top edge, visible front depth, rotation, light direction, and
shadow direction are copied into the outer island, landmark foundations,
buildings, boss, arena, and scenery before export.

Production manifests must set `assetCameraMode` to `final-angle`. In that mode
the runtime may translate and uniformly size the raster, but it must not apply
the board-plane `rotateX`, a compensating vertical scale, or any second
perspective transform. Never generate a top-down island and squash or tilt it
after import. Never generate a partially tilted asset and tilt it again. Legacy
camera normalization remains compatibility-only and is not an approved path
for Islands 1–120 production art.

During pilot migration only, an individual scenery entry may declare
`assetCameraMode: "final-angle"` before the rest of its legacy island has been
regenerated. The renderer places that asset in the unsquashed world root while
the remaining legacy assets stay in their compatibility root. The converted
asset must carry explicit manifest size and offset values; renderer logic may
not infer placement from an asset ID. This is a migration bridge, not a reason
to ship newly generated mixed-camera islands.

Runtime board-plate art must avoid high-contrast radial seams, text, small props, or fake paving inside the tile corridor. The real blocks, highlights, token, 3D caretaker, technology fragments, and traffic-light tile must remain legible in every state.

## Caretaker rule

The board caretaker uses a polished 3D character cutout, never the retro/pixel sprite. It stands behind the back edge of the route near the start tile, on a small grounded stone footplate with a contact shadow. The feet may not sit on a playable tile or on the boss affordance, and the character may not collide with the HUD. At the 390×844 approval viewport the character must remain recognizable without dominating the island.

## Landmark progression rule

Each landmark uses three images with a clear additive build story:

- **L1 — foundation:** recognizable function, incomplete silhouette, low glow, limited vertical height
- **L2 — operational:** complete core function, stronger silhouette, active island material or light
- **L3 — restored:** celebratory but not oversized; full architectural identity, story motif, and restrained premium glow

Levels must read as the same structure growing. Do not swap to a different building, camera, footprint, lighting direction, or color identity between levels.

### Build-modal construction time-lapse

The build modal presents the funded level as fully opaque geometry and reveals
only the additive parts of the next level. A target-level ghost of the whole
building is not an acceptable substitute: unchanged walls, foundations and
props must remain the current physical structure while new parts appear in a
deterministic bottom-to-top sequence.

Every actual-3D island must ship an authored construction profile for all five
landmarks and all three transitions (L0→L1, L1→L2, and L2→L3). Each transition
uses five semantic reveal stages—foundation, body, upper silhouette, working
mechanism, and commissioning detail—and one compact, landmark-local façade rig.
An island is not production-complete while any landmark falls back to an
un-authored whole-model fade.

The façade rig must match the island's materials and story. The live modal must not generate a second
rectangular scaffold cage around the real landmark envelope. Façade
scaffolding, dust, materials, tool motion and relocation are visible only while
auto-build is held or during the short presentation tail after a part purchase.
They disappear when the construction burst ends and after a level is complete.

An open but inactive build modal is a resting scene: the three miniature
robots slow-hover without relocating, use no active construction effects, and
cycle among at least five face states at roughly fifteen-second intervals. One
robot may occasionally perform a short camera-forward spin and return. Only an
active, contact-capable tool such as a drill, hammer or saw may add vibration;
the robot root may not receive competing per-frame transform writers.

Robot bodies use conservative presentation occupancy volumes. They must remain
outside a height-aware landmark shell and outside one another during station
holds and relocation interpolation; only hands, tools and carried workpieces
may enter the authored contact zone.

Construction input locks the current POV for the active burst and a seven-second
recent-work window. After that, an idle modal may make a small orbit around the
same landmark. The main board may begin ambient POV variation only after forty
seconds without interaction. Reduced-motion mode disables these ambient changes.

All construction choreography is presentation-only. It may read canonical
build state and modal input state, but it may not write gameplay progress.
Reduced-motion mode removes relocation, vibration, camera-forward beats and
non-essential effects while preserving the current/next-level read.

Every manifest may define a separate `levelZeroPlacement` for its persistent
terrain plot and `levelScales` for L1/L2/L3. The renderer bottom-anchors building
growth to the building placement box. Island-specific ladders are permitted,
but every level must be explicit and checked at 390x844. The acceptance case is
all four L3 buildings rendered simultaneously in clean-art mode.

The MVP motion pass uses restrained runtime animation for ambient drift,
landmark lift/glow, arena pulse, and boss breathing. Motion must not move hit
targets or gameplay geometry, and `prefers-reduced-motion` must disable it.
Short authored video/image-sequence loops (including future Firefly exports)
may replace or augment these effects later, provided they keep the same stable
manifest placement and transparent-edge rules.

## Source library versus runtime assets

The master source library and the PWA have different naming needs.

### Master source library

Store prompts, references, drafts, selected variants, masks, and full-resolution masters outside the deployed PWA. Recommended root:

`HabitGame/Island Visual Library/`

Recommended source filename:

`isl-001_landmark-hatchery_l03_v003_approved.webp`

Pattern:

`isl-{NNN}_{asset-family}-{slug}[_lNN][_state]_v{NNN}_{draft|selected|approved}.{ext}`

Source status is explicit and immutable. A new revision creates a new file; it never overwrites an approved master.

### PWA runtime assets

Only optimized approved exports belong under:

`public/assets/islands/island-NNN/`

Runtime filenames are stable and status-free so approving a better revision does not require code churn:

- `background/ambient-background.webp`
- `board/board-plate.webp`
- `board-outer/board-outer-circle.webp` (optional)
- `landmarks/{stopId}/{stopId}-l1.webp` through `-l3.webp`
- `bosses/{boss-slug}-idle.webp`
- `bosses/{boss-slug}-defeated.webp`
- `scenery/{arena-slug}.webp`

The manifest is the only runtime mapping authority.

## Reusable world families and variants

Reuse shared geometry, materials, vegetation, audio and construction primitives
through explicit dependencies rather than copied files. A later island may
reuse a base world family when its brief declares a `variant-overlay` and the
result changes at least two sensory systems plus one experiential system under
the approved strategy. A dark, illuminated, seasonal, damaged or restored
state can feel substantially different while remaining a small delta pack.

Reuse is not permission to recolour an existing island and call it finished.
Phone side-by-side review must demonstrate a distinct emotional read,
civilization/story consequence and landmark or mission identity. If it does
not, keep the work as another state of the original island.

Runtime assets must be referenced once through dependency-aware manifests.
Never duplicate the same binary into several island folders merely to make
each pack self-contained.

## Pack budget and hero exceptions

Before production, classify the island as:

- `new-base` — a new world family;
- `variant-overlay` — a small delta over a declared base;
- `hero-exception` — an entry, arena or major story world with explicit extra
  quality/value justification.

Normal islands target a 2–5 MiB deployed island-specific delta and trigger
review above 8 MiB. Variant overlays target 1.5 MiB and trigger review above
3 MiB. Hero islands target 8–15 MiB and trigger an explicit exception review
above 25 MiB. These are production guides, not hard creative ceilings.

Every exception must remain optimized and record compressed/installed bytes,
reuse attempts, cache impact, download behavior and physical-phone evidence.
Island 001 is the essential Hero Entry: it is available before first play and
receives a dedicated visual/onboarding quality pass because first-session
retention is more important than forcing it into the Standard tier.

## Approval gates

An asset moves from draft → selected → approved only after all applicable gates pass:

1. **Identity:** matches the island brief, civilization, guardian problem, palette, and material language.
2. **UI fit:** composited with the actual current 390×844 board screenshot; the full route fits between top HUD and controller with no overlap against tiles, landmark controls, caretaker, or boss label.
3. **Geometry:** uses the fixed board rectangle and camera; no per-island tile movement changes.
4. **State continuity:** landmark L1–L3 and boss states preserve identity, footprint, camera, and lighting.
5. **Technical:** correct alpha behavior, dimensions, file type, color consistency, and no placeholder filename.
6. **Runtime:** `check:island-art-assets`, `check:island-art-render-wiring`, and Island Run tests pass after wiring.
7. **Responsive QA:** 390×844 portrait phone is the primary approval view; a shorter phone, a wider phone, desktop preview, and reduced-motion states receive spot checks.
8. **Delivery:** pack classification, dependency list, compressed/installed
   bytes and any approved exception are recorded; no avoidable duplicate binary
   is introduced.
9. **Construction authoring:** every actual-3D landmark passes the 15-transition
   island audit: all five reveal stages exist, funded L1/L2 geometry is retained,
   temporary rigs appear only during active work, and funded models contain no
   construction dressing.

## Pilot roles for Islands 1–5

The five pilots intentionally exercise different production problems:

| Island | Production case | What it proves |
| --- | --- | --- |
| 1 — Luma Isle | approved waterfall composition + crystalline observatory identity | adapting a chosen concept to the real board without replacing UI |
| 2 — Pebble Bay | water, mist, rounded stone, slow mechanical motion | low-contrast atmospheric readability |
| 3 — Coconut Cove | dense tropical abundance and wooden vertical structures | foliage control and warm material separation |
| 4 — Driftwood Isle | patched timber, sails, visible repair seams | irregular silhouettes without visual clutter |
| 5 — Crown of Tides | luminous reef, translucent light, ceremonial forms | bright emissive materials while preserving tile contrast |

Once all five pass the same approval gates, their briefs and templates become the production baseline for Islands 6–120.

## Mass-production rule

Do not generate 115 islands from one generic prompt. Each island must have one validated production brief that supplies identity, palette, materials, landmark names, boss, arena, restoration change, and avoid list. A production worker combines that brief with the shared layer/camera/state templates, exports stable runtime filenames, and runs the validators before an island can be marked complete.
