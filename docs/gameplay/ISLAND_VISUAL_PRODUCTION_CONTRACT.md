# Island Visual Production Contract

The reusable camera, footprint and phone-validation scaffold is defined in
[`ISLAND_CAMERA_LOCKED_KIT.md`](./ISLAND_CAMERA_LOCKED_KIT.md). New island
production must begin from that kit rather than inventing scene geometry per
biome.

Status: **Active pilot contract**
Pilot scope: Islands 1–5
Scale target: Islands 1–120

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
2. **Board plate** — transparent, pre-rendered island terrain aligned beneath the canonical 36-tile ring. The tile corridor must remain visually quiet so the real tiles stay readable.
3. **Landmark cutouts** — four external structures (`hatchery`, `habit`, `mystery`, `wisdom`), each with three build levels. These are visual-only and never become tile geometry.
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

The canonical circular route is centered at (500, 500) in playable-board space with radius 340. Its 36 runtime tiles form a **seamless connected circle of individual raised blocks**. Every block needs a readable top face, a fine joint at each neighbour, a visible darker side wall, and one shared perspective-correct depth and lighting model. There must be no open gaps between tiles and no solid decorative backing ring or separate raised plinth beneath them.

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

Runtime board-plate art must avoid high-contrast radial seams, text, small props, or fake paving inside the tile corridor. The real blocks, highlights, token, 3D caretaker, technology fragments, and traffic-light tile must remain legible in every state.

## Caretaker rule

The board caretaker uses a polished 3D character cutout, never the retro/pixel sprite. It stands behind the back edge of the route near the start tile, on a small grounded stone footplate with a contact shadow. The feet may not sit on a playable tile or on the boss affordance, and the character may not collide with the HUD. At the 390×844 approval viewport the character must remain recognizable without dominating the island.

## Landmark progression rule

Each landmark uses three images with a clear additive build story:

- **L1 — foundation:** recognizable function, incomplete silhouette, low glow, limited vertical height
- **L2 — operational:** complete core function, stronger silhouette, active island material or light
- **L3 — restored:** celebratory but not oversized; full architectural identity, story motif, and restrained premium glow

Levels must read as the same structure growing. Do not swap to a different building, camera, footprint, lighting direction, or color identity between levels.

When the landmark is intended to grow dramatically without moving its terrain
foundation, manifests may define `levelScales` for L1/L2/L3. The renderer
bottom-anchors these sizes to the original placement box. Island 1 establishes
the phone-validated ladder `[0.5, 0.78, 1.1]`. L1 must remain large enough to
read beside the live landmark label at 390x844; smaller placements can render
successfully while appearing absent to the player. Future islands may tune the
ladder, but every level must be explicit and checked at 390x844.

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

## Approval gates

An asset moves from draft → selected → approved only after all applicable gates pass:

1. **Identity:** matches the island brief, civilization, guardian problem, palette, and material language.
2. **UI fit:** composited with the actual current 390×844 board screenshot; the full route fits between top HUD and controller with no overlap against tiles, landmark controls, caretaker, or boss label.
3. **Geometry:** uses the fixed board rectangle and camera; no per-island tile movement changes.
4. **State continuity:** landmark L1–L3 and boss states preserve identity, footprint, camera, and lighting.
5. **Technical:** correct alpha behavior, dimensions, file type, color consistency, and no placeholder filename.
6. **Runtime:** `check:island-art-assets`, `check:island-art-render-wiring`, and Island Run tests pass after wiring.
7. **Responsive QA:** 390×844 portrait phone is the primary approval view; a shorter phone, a wider phone, desktop preview, and reduced-motion states receive spot checks.

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
