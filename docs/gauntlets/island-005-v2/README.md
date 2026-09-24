# Island 005 — Sunshore Atoll V2

Local implementation of the ImageGen direction approved on 2026-09-23. Runtime Island 005 uses the legacy-named `Island2ThreeWorld.ts` factory through the existing Sunshore aliases. This is a stylized procedural realization, not an exact reconstruction of the illustration.

## Scope

Four rebuilt outer landmarks, continuous limestone/sand shore, curved palms with camera-aware clearance, flower planting, open canoe with outrigger, irregular submerged reef patches, filtered natural surface textures and procedural shallow-water caustics. The current integrated Sunwheel Arena, canonical 36-tile route, five landmark transforms and gameplay actions retain authority over the painted concept. No deployment, merge or phone installation is included.

Code lives on `codex/island-005-v2-20260923`, based on `6a07260f`. V1 remains recoverable at that commit. The original dirty checkout was not used as the implementation target.

## Evidence

- Approved reference: `../../visual-references/island-005-sunshore-v2/005-source.png`.
- Actual V1 runtime: `baseline-v002/`.
- Geometry: `structure-v003/`, `form-v002/` and corresponding independent reviews.
- Materials: `material-v002/` and its scoped independent review.
- Relighting: `lighting-v002/` includes actual neutral/grazing runtime views. Its overall capture status is failed because the first sequential tap harness clicked an Overview control covered by the evidence viewport. Those interaction failures remain recorded.
- Corrected real canvas interactions: `interaction-v001/capture.json` passes all five landmarks from fresh canonical overviews. This tests pointer/raycast selection, not just selecting a dev dropdown.
- `lighting-v001/` is excluded as overview evidence: the harness omitted the explicit evidence distance scale and produced the wrong framing.

Raw captures remain immutable and initially marked unreviewed. Independent review records own visual decisions; raw screenshots do not automatically confer final acceptance. All browser timings are desktop-hosted phone-viewport evidence, not a physical-device result.

## Validation

Funded mesh retention across L1→L2→L3, additive construction stages, landmark envelopes and the existing Island 005 opening-arena contract pass. The broader pre-existing construction contract test logs a geometry-attribute merge warning from another tested factory; this is distinct from page/WebGL diagnostics. Architecture guard passes with zero violations and three existing allowlisted warnings.

Final TypeScript check and Vite production build pass. Final High browser evidence in `optimized-v002/` has zero page/WebGL errors, all five real landmark taps, L0–L3 views, all five construction targets, roof-stage and reduced-motion captures. The ordinary view uses 155 draw calls versus 1,452 in the initial V1 overview. The 30-second camera-profile route passes at 60 FPS average, 16.9 ms p95, maximum 163 draw calls and 107k triangles, with 0% slow frames. Those maximums apply to the profiler route: authored construction previews are a separate heavier view (210–383 calls), and map-stripped evidence deliberately disables batching.

The first optimized profile (`optimized-v001/`) was timing-safe but exceeded the draw-call budget at 285; its failure remains recorded. The final pass includes the existing canonical tile-instancing path and rigid batching of the arena creature's source pivots. The arena building itself remains outside those batches for focus-opacity behavior.

Production build emits existing bundle-size warnings. Browser diagnostics retain an unrelated unused landing-image preload warning. No GPU shader/context errors were observed. Physical-phone validation is not included in this local implementation acceptance.

Low quality with reduced motion (`low-reduced-motion-v001/`) also completed nine views with zero page/WebGL errors. The independent final High interaction and optimization review is recorded in `review-optimized-v002.json`. Physical-device performance remains unverified.

## Preview

Local route: http://127.0.0.1:5185/dev/island-template-kit?island=5&mode=3d&level=3&island3dQuality=high

Matched 376 × 830 viewport snapshots: `baseline-v002/overview.png` (V1) and `comparison-v001/overview.png` (V2). Final comparison capture has stable source hashes and zero browser errors. Low/reduced-motion also passed all five actual canvas landmark taps.

## Living ocean follow-up

User-requested sea-life and horizon polish is implemented. See [SEA-LIFE-FOLLOWUP.md](SEA-LIFE-FOLLOWUP.md) for the80-animal High/24-animal Low pool, varied encounter routing, softened horizon and new evidence. Visual/integration, TypeScript and build pass. The newer High timing remains REVIEW (45.1FPS latest desktop run); earlier60FPS evidence above predates this follow-up and is not final-delta acceptance.

## Archipelago follow-up

Seven larger surrounding islands replace the former distant cone rocks: four forested islands and three coastal settlements with houses and piers. The nearest forest and village are composed into the normal phone view; the others provide scenery through a full orbit. Each uses an irregular sand/limestone coast, grass, broadleaf trees and palms. Static geometry is merged by material and shadow casting is disabled for this distant scenery; Low retains every island with reduced tree density. No new gameplay destinations or controls are introduced.

Final close-view evidence: `archipelago-v002/` (overview, lodge focus and lodge rear/left orbits; stable source, zero browser errors). Full-board orbit evidence is separately captured in `archipelago-orbit-v003/`. The final production build passes (`archipelago-final-build.log`). The initial off-frame composition remains in `archipelago-v001/`. The previous High timing REVIEW remains unresolved; these screenshots are not a replacement performance profile.

Archipelago full-board orbit capture completed all eight angles with stable source hashes and zero browser errors. Root inspected the normal, side and rear views; no neighbouring scenery overlaps the playable board. Some directions intentionally look across open water. Independent overview/integration approval: `review-archipelago-v002.json`.

## Matching coast and creature celebration

Neighbouring island bases now reuse the main layered coastline builder and coastal crags. A presentation-only creature celebration follows successful existing max-dice hard-throw cues, with a workbench test button. See [COAST-AND-CREATURE-CELEBRATION.md](COAST-AND-CREATURE-CELEBRATION.md) for routing, sequence, validation and limitations. Final build, architecture guard, sequence tests and browser button/reduced-motion checks pass; independent visual/integration review approved.

## Magical building follow-up

The user-selected magical direction adds animated sunwheels, crystals, egg-halo stars, a floating star atlas and an oracle astrolabe. See [MAGICAL-BUILDINGS.md](MAGICAL-BUILDINGS.md) for construction retention, reduced motion, the corrected static-compaction integration and final evidence. `magic-v002/` has stable source hashes, zero browser errors and all five real landmark taps passing; independent review approved the bounded visual/integration change. Earlier High performance REVIEW remains unresolved.

## Palm-majority follow-up

Surrounding island interiors now use three palms per broadleaf tree, counting after village clearing exclusions. This gives at least 75% palms on each island across all quality modes, plus extra shoreline palms. Existing low-detail palm geometry and static material batching are reused; village-front clearings also apply to the extra palms. `palms-v001/` records the revised composition. The main-island flowers are existing 3D spherical petal meshes with shallow vertical scale and raised spherical centres; they were inspected but not changed.

## Parrots and seabirds

Replaced the two-cone birds with articulated 3D macaws, white gulls and white terns: rounded bodies/heads, eyes, beaks, layered primary feathers and distinct tails. Macaws reuse coral/teal/gold colours, gulls have dark wingtips, and smaller terns have dark caps. Quality counts are 12/8/4; existing rigid batching and reduced-motion ambience timing are retained. Independent flight phases, variable-radius paths and intermittent seabird flapping break up the old uniform circling. `birds-v002/` captures four views with zero browser errors; root inspected the overview silhouettes and colours. `birds-v001/` retains an initial evidence-control timeout and is not acceptance. No new performance claim.

The bird follow-up project-wide TypeScript check was stopped after approximately 30 minutes with no diagnostics; it is incomplete, not a pass. Browser compilation/rendering and four captured views passed. Existing performance review remains open.

## Island-wide polish and retracting arena

The user-approved critique pass is implemented: the arena crown rests at roughly 30% visible height, rises over 1.8 seconds on the existing battle-active signal, then sinks over 1.5 seconds on exit. The workbench offers **Test arena rise + return**, with a 6.5-second demonstration before automatic return. Reduced motion uses immediate poses. Funded construction models retain their full authored geometry; the settled crown is separately compacted and translated without squashing ornaments.

The same pass adds protected-route footpaths, less uniform coast strata and crags, taller clustered flowers, timber knee braces/bindings, thatch seams, an archive book sign, varied neighbour huts/clearings, smaller birds, deeper swimmers and stronger shallow/deep-water separation. See [POLISH-AND-RETRACTING-ARENA.md](POLISH-AND-RETRACTING-ARENA.md) for implementation, evidence and preserved diagnostic failures. No new gameplay writes or progression rules are introduced.

## Shared traffic signal and creature clearance

All islands using `IslandRunTileRewardThreeObjects` now get an eight-lamp red/amber/green traffic stack, rotated 180 degrees to face the intended board approach. Lamps fill cumulatively from canonical charge 0 through `TRAFFIC_LIGHT_CHARGE_TARGET` (8), reset with canonical charge, and remain outside static reward batching for independent emissive state. No gameplay charging/reward rules changed.

Sunshore creature clearance evaluates its current articulated world bounds after ordinary, celebration and battle transforms. A conservative annular envelope covers the posts/arches/coral; the creature lifts above the live crown height before its bounds overlap that ring. Bounds include wing spread and battle scale, and the lift fades on approach/departure. The existing rigid batch controller retains geometry bounds and syncs after clearance.

`traffic-clearance-tests.log` passes all three quality modes, three headings, charges0–8/reset, and18,000 size/height/position clearance cases. Vite's sandbox websocket warning remains recorded; assertions passed. `traffic-clearance-browser-v001/` has zero errors, stable captured source,374 arena timeline samples and reduced-motion checks. Root inspected resting and raised images; final source hashes including shared beacon/clearance helper are in `traffic-clearance-source.json`. Previous performance/typecheck limitations are separate from this bounded verification.

Independent bounded approval for the traffic/clearance follow-up: `review-traffic-clearance-v001.json`. The clearance envelope is authored for the current Sunshore annulus geometry and must be updated if that footprint changes; no new performance or physical-device acceptance is claimed.

Final production build now PASS: `traffic-clearance-build.log`, 2m18s, with existing bundle-size warnings. This builds the complete current worktree, including the preceding island polish, and supersedes the earlier incomplete production-build attempts. Full TypeScript and High performance review remain separate/open.

Traffic-light placement follow-up: the shared beacon now shifts radially inward by half `ISLAND_3D_TILE_RADIAL_DEPTH` (0.46 world units), placing its pole at the tile's inner edge and leaving the canonical player landing centre unchanged. Applies to all islands using the shared model; orientation and eight-charge lamps are retained. Placement and previous traffic/clearance checks are recorded in `traffic-inner-edge-tests.log`.
