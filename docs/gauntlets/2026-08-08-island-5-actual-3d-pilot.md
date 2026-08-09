# Island 5 actual-3D pilot Gauntlet

Status: M1–M18 IMPLEMENTED; Island 5 actual 3D is isolated on a clean integration branch based on current Git `main`. Representative iPhone and Android profiling remains required before template scale-up and release rollout.

Date: 2026-08-08
Owner: Eivind
Director: EJ-Jarvis / Codex
Scope: Actual-3D Island 5 pilot with dev/live-shell integration and canonical gameplay bridging. No release rollout in this slice.

## Mission

Prove that Crown of Tides can be rendered as an actual interactive 3D island
on a portrait phone while preserving Island Run's canonical 36-tile gameplay,
real UI, state ownership, landmark identities and camera-safe play window.

The pilot must answer the highest-risk questions before detailed modelling:

1. Can the island, route and five landmark masses coexist at readable scale?
2. Can one reusable camera rig provide overview, orbit and landmark close-ups?
3. Can touch interaction remain smooth and bounded on phones?
4. Can quality scale down on weak devices and up on strong devices without
   changing gameplay geometry?

## Sources of truth

1. `docs/gameplay/ISLAND_VISUAL_PRODUCTION_CONTRACT.md`
2. `docs/gameplay/ISLAND_CAMERA_LOCKED_KIT.md`
3. `docs/gameplay/CANONICAL_GAMEPLAY_CONTRACT.md`
4. `docs/gameplay/ISLAND_RUN_ARCHITECTURE_CONTRACT.md`
5. `src/features/gamification/level-worlds/dev/camera-locked-kit-v1.json`
6. `docs/gauntlets/2026-08-08-island-5-reference-pack.md` and its approved evidence
7. The live React Island Run UI and `spark36_ring` tile profile

## Locked decisions

- The pilot uses real GPU-rendered geometry, not another generated raster or a
  CSS perspective mockup.
- The dev-only camera/template workbench is the initial host. The live player
  board is not replaced until the pilot passes phone and performance gates.
- The route remains 36 tiles for this proof. A later topology decision may
  compare 30, but the pilot may not silently alter gameplay.
- The complete island massing and five placeholder landmarks come before a
  detailed center landmark. Camera composition must be proven against the
  whole world, not one attractive building.
- Three.js is dynamically loaded by the dev route. The pilot does not add a
  second gameplay store or write gameplay state.
- Island geometry is data-driven so Islands 1–4 and later islands can reuse the
  renderer and camera without per-island code forks.

## Non-negotiables and forbidden shortcuts

- Preserve the canonical island center, mirrored satellite footprints and
  protected route corridor.
- Render 36 deterministic connected tile blocks from the canonical anchors.
- Keep the five Island 5 landmark identities stable: central boss landmark,
  Hatchery/Coral Cradle, Habit, Mystery/Event and Wisdom.
- Camera movement may orbit and tilt in 3D, but must begin and return to a
  portrait-safe establishing shot.
- Controls must support pointer drag, touch drag and pinch/wheel zoom with
  bounded polar angle, distance and target.
- Landmark focus presets must be data, not separate ad-hoc camera code.
- Weak-device quality reductions may change pixel ratio, shadows, water detail,
  vegetation density and antialiasing; they may never change tile positions,
  landmark positions, hit targets or progression.
- `prefers-reduced-motion` disables autonomous camera and ambient motion while
  preserving manual navigation.
- No direct gameplay writes, replacement UI, deployment, publishing, paid
  asset generation or destructive asset replacement in this slice.

## Milestones and acceptance evidence

### M1 — actual-3D greybox

- A WebGL canvas renders Island 5 terrain, water, 36 tiles and five landmark
  masses at `/dev/island-template-kit?mode=3d`.
- Geometry derives from the locked kit and canonical tile anchors.
- Evidence: source tests, geometry tests and a phone screenshot.

### M2 — reusable camera rig

- Presets: overview, high survey, orbit-left, orbit-right/rear, boss, hatchery,
  habit, event/mystery and wisdom.
- Smooth transitions use one interpolation model and have a deterministic
  reduced-motion endpoint.
- Manual orbit/zoom remains bounded and an explicit reset returns to overview.
- Evidence: preset contract tests and visual capture of overview plus at least
  two landmark focuses.

### M3 — adaptive quality

- `low`, `medium` and `high` profiles control renderer cost without changing
  geometry authority.
- `auto` uses conservative device signals and can be overridden in the workbench.
- The workbench exposes live FPS, draw calls, triangles, renderer resolution
  and selected quality for evidence rather than subjective claims.
- Initial budgets at 390x844: low <= 1.0 device pixel ratio, medium <= 1.5,
  high <= 2.0; no profile renders above the smaller of its cap and device DPR.

### M4 — integration decision

- Critique the dev pilot against the approved reference pack and real phone UI.
- Record whether to proceed, revise massing/camera, or roll back.
- Production integration is a new bounded slice requiring a passing pilot; it
  is not implied by completing this file.

Decision: Eivind approved continuing from the passing greybox into the first
production-target hero landmark. This does not approve player-facing rollout.

### M5 — embellished Crown Citadel vertical slice

- Preserve one five-tower silhouette across low, medium and high quality.
- Author distinct L1 foundation, L2 operational palace and L3 restored crown
  states rather than scaling one finished mesh.
- Retain pale reef limestone, royal-purple roofs, warm gold, aqua glass and the
  Voice Prism story motif under the locked upper-left light.
- High quality may add smoother curves, windows, roof ribs, banners, shell
  ornaments and balustrades. Low quality removes small ornament while retaining
  footprint, silhouette, crown, hit bounds and camera target.
- Batch static architecture by material before rendering so embellishment does
  not create one draw call per decorative piece.
- Evidence: L1/L2/L3 phone captures, high/low captures, renderer diagnostics,
  contract tests, architecture guard and production build.

### M6 — material and reef-restoration pass

- Add deterministic reef-stone and purple roof-tile surface maps without adding
  downloaded assets or changing the approved silhouette.
- Texture resolution is quality controlled: Low receives no architectural
  texture allocation, Medium receives 128px maps and High receives 256px maps.
- L3 receives quality-scaled living-reef growth and pearl lanterns. These are
  absent on Low and restrained on Medium so they never become hit geometry or
  board obstruction.
- Window, pearl and Voice Prism emissive animation remains visual-only and is
  disabled by the existing reduced-motion branch.
- Procedural textures must be explicitly disposed with the scene and all new
  accent geometry must pass through the existing material batching step.
- Evidence: High and Low hero close-ups, overview capture, texture/detail
  contract tests, renderer diagnostics and production build.

### M7 — representative-phone performance gate

- Provide one foreground-only, fixed-duration 30-second profile from the live
  phone viewport. Leaving the foreground or changing the rendered scene cancels
  the run instead of recording misleading idle/background frames.
- Drive every run through the same deterministic camera sequence: Citadel
  close-up, left orbit, Coral Cradle close-up and overview. Manual camera and
  quality controls remain locked until the run completes or is cancelled.
- Report average FPS, p95 frame time, worst frame, slow-frame percentage,
  severe-jank count, draw calls, triangles, render resolution, selected quality
  and the device signals used by automatic quality selection.
- Evaluate results against explicit quality-specific targets. A desktop browser
  run proves the profiler itself; it cannot pass this milestone.
- M7 passes only after recording representative physical iPhone and Android
  results and either accepting the selected quality tier or tuning that tier
  and repeating the same profile.
- Evidence required: completed phone reports or captures, device models/OS,
  selected tier, and a short pass/revise decision for each device.

### M8 — sequential corner-landmark L1→L3 rebuild

- Eivind's 2026-08-08 visual correction is authoritative: the previous L3
  corner buildings read only as L1. Preserve those identities as the new L1
  baseline and replace scale-only progression with authored additive geometry.
- L2 must be an unmistakable architectural transformation (roughly 50–60% of
  the final visual ambition), not L1 with incidental decoration.
- L3 targets at least 85% of the approved Island 5 reference-pack quality in a
  390×844 landmark close-up: complete premium silhouette, layered foundation,
  entrance and stairs, water integration, windows, gold structure, purple roof,
  coral restoration and luminous focal ornament.
- Coral Cradle, Tidekeeper Hall, Pearl Archive and Concord Arena must remain
  distinct building families while sharing pale reef limestone, royal purple,
  warm gold, aqua glass/water and upper-left daylight.
- The L3 additions may not change the locked landmark anchor, satellite
  footprint, raycast identity, camera target, 36-tile route or gameplay state.
- Advanced geometry must be batched by material. High-detail visual ambition
  is not permission for one draw call per window, rib, baluster or coral branch.
- Work and approval are strictly sequential: M8A Coral Cradle, M8B Tidekeeper
  Hall, M8C Pearl Archive, then M8D Concord Arena. Only one landmark may be an
  active candidate; unapproved experiments for later landmarks are not evidence.
- Evidence per landmark: L1/L2/L3 phone close-ups, overview fit, High and Low
  renderer diagnostics, focused contract tests, production build, architecture
  guard and Eivind's explicit visual approval before the next landmark begins.

## Authority and safety boundary

Eivind authorised local implementation of the 3D pilot. Authority includes
reversible source changes, a standard local 3D dependency, tests and dev-only
preview routes. It excludes deployment, external publication, paid tools,
production activation, gameplay-topology changes, bulk model generation and
deleting or overwriting approved reference assets.

## Rollback and recovery

- Keep the existing blueprint/clay/proof workbench modes operational.
- The 3D renderer is isolated in new files and loaded only for `mode=3d`.
- Removing the new renderer component, its tests and the Three.js dependency
  returns the previous workbench without gameplay migration.
- If WebGL initialization fails, show a clear fallback state and leave the
  existing 2D production scaffold usable.

## Stop conditions

Stop and ask Eivind if the pilot requires changing the 36-tile gameplay route,
moving a locked landmark footprint, replacing the real UI, purchasing assets,
activating 3D for players, or accepting a phone frame that hides meaningful
board content. Performance or visual failure is a revision signal, not a reason
to weaken canonical contracts silently.

## Pilot evidence — 2026-08-08

- Actual Three.js/WebGL geometry renders at
  `/dev/island-template-kit?mode=3d&level=3`.
- A 390×844 browser capture verified the complete 36-tile route, central Crown
  Citadel and all four satellite districts in the establishing view.
- Automatic High selected on the emulated strong device: 780×1688 renderer,
  approximately 55–60 FPS, 189 visible draw calls and 25k visible triangles in
  overview after the static shadow-map optimisation.
- Forced Low rendered at 390×844, approximately 60 FPS, 189 visible draw calls
  and 19k visible triangles in overview. These are desktop-emulated signals,
  not a substitute for later tests on representative physical phones.
- Coral Cradle and Concord Arena close-ups were visually checked after the
  first too-tight Hatchery camera was rejected and all landmark-focus cameras
  were moved back to preserve the complete foundation and context.
- Pointer drag changed the true 3D orbit while remaining inside the polar and
  distance limits. Preset reset and landmark selection continued to work.
- The production bundler completed successfully. The camera-kit validator,
  visual-brief validator and Island Run architecture guard passed.
- Five new 3D contract tests passed. The full Island Run run reached 1,614
  passes with the same three unrelated pre-existing failures in Wisdom Tree
  visual QA, Build Modal focus selection and build-spend batching.

## Director critique

The pilot proves the architecture, composition, camera graph and adaptive
renderer path. It does not yet prove final Island 5 art quality. Buildings are
purposefully recognisable primitive greyboxes; water, terrain transitions,
vegetation, inhabitants, boss animation, landmark L1–L3 authored models and
the exact live player UI integration remain future slices.

Recommended next gate: model the Crown Citadel as the first production-quality
GLTF landmark while retaining the current greybox island and camera rig. Do not
model all five buildings until the Citadel's silhouette, materials, draw-call
budget and phone close-up pass against the approved reference pack.

## Crown Citadel evidence — 2026-08-08

- The central placeholder was replaced by an original procedural hero model
  with a stepped floodgate terrace, ceremonial stair, four corner spires,
  central crowned keep, pointed windows, roof ribs, banners, shell ornaments,
  gold balustrade and animated Voice Prism.
- L1 is a genuine floodgate foundation with tower bases; L2 is the operational
  palace; L3 adds the brighter roof, crown, prism, roof ribs and restored glow.
  All three states share one footprint and architectural identity.
- Low, medium and high detail profiles are data. Low keeps the five-tower
  silhouette while removing tiny railings, banners, shell ornaments and roof
  ribs. High uses smoother radial geometry and the complete embellishment set.
- The first unbatched high close-up reached roughly 378 visible calls. Static
  material batching reduced the same close-up to about 140 calls and the high
  overview to about 194 calls while retaining approximately 35k visible
  triangles. Low overview retained the complete composition at about 192 calls
  and 22k visible triangles.
- Current FPS readings were taken while several live WebGL pilot tabs were open
  in the desktop app and varied between the high 20s and high 30s. They are not
  accepted as physical-device evidence. The earlier single-pilot greybox result
  remains the clean browser baseline; representative iPhone and Android tests
  remain mandatory before player-facing integration.
- The revised boss-focus camera contains the complete Citadel, foundation and
  nearby route. Overview still shows the complete 36-tile route and all four
  satellite districts.
- Six focused Island 5/Citadel contract tests pass. The production preview
  build passes. The full Island Run runner is currently stopped before runtime
  tests by the same unrelated TypeScript errors in `checkins.ts` and
  `zenGarden.ts`; this slice adds no new TypeScript diagnostic.

## Updated director critique

The vertical slice now proves that the desired architectural embellishment can
coexist with the phone composition and can be reduced by device tier without
changing gameplay geometry. It is still an art-direction prototype rather than
the final shipped asset: it has clean procedural materials, not authored UVs,
normal maps, baked ambient occlusion, hand-painted wear, reef encrustation or a
compressed GLTF export. Those are available quality upgrades after the
silhouette is approved; they should not be multiplied across the other four
landmarks until this central building passes on representative physical phones.

## Material-pass evidence — 2026-08-08

- High now renders deterministic 256px reef-stone courses and purple roof-tile
  patterns. The maps are generated locally, require no network fetch and add
  surface richness without increasing draw calls.
- Restored L3 adds fourteen small reef-growth accents and eight pearl lanterns
  on High; Medium receives six and four respectively; Low receives neither and
  keeps flat architectural materials.
- High overview retained the complete route at approximately 198 visible calls
  and 37k triangles. High Citadel focus measured approximately 144 calls and
  30k visible triangles. Low focus retained the approved silhouette at roughly
  146 calls and 15k visible triangles.
- The high close-up visibly resolves stone courses, roof modulation, pearl
  lights and restored reef color. The overview remains quiet enough for the
  canonical tile ring. Low removes those small details cleanly rather than
  substituting a different building.
- The focused contract suite now covers texture memory, restoration-detail
  budgets, deterministic surface generation and explicit texture disposal.

The material pass succeeds as a phone-readable art-direction proof. Remaining
production upgrades are authored normal/roughness maps, baked ambient occlusion,
hand-painted weathering and a compressed GLTF/DCC source. Those should be added
only after representative physical-device profiling confirms the current High
budget.

## M7 profiler implementation evidence — 2026-08-08

- The dev workbench now provides a foreground-only 30-second run with locked
  controls, visible progress and deterministic Citadel/orbit/Coral Cradle/
  overview choreography.
- The completed report exposes average FPS, p95 frame time, worst frame and
  slow-frame percentage beside the existing renderer calls, triangle count,
  resolution, quality and device signals.
- The browser validation run completed end-to-end and correctly rated the busy
  desktop High run FAIL at 30.8 average FPS, 50.1 ms p95 and 77.2% slow frames.
  Several WebGL pilot tabs were open, so this result validates the profiler and
  its non-permissive rating—not Island 5 performance on a phone.
- Seven focused contract tests cover the 30-second duration, tier-specific
  targets, pass/review/fail summaries, deterministic geometry/cameras, quality
  authority and the no-gameplay-write boundary. The production preview build
  passes.
- M7 remains READY rather than PASS until the same workbench run is completed
  on representative physical iPhone and Android devices.

## M8A Coral Cradle candidate evidence — 2026-08-08

- Eivind rejected the previous global corner progression: its displayed L3
  read as L1. The existing pearl cradle/pool is now the authored L1 baseline.
- L2 is no longer a scaled copy. It adds an open ribbed sanctuary, four-tower
  hierarchy, ceremonial entrance and stair, gold balustrade, shells and active
  water channel while retaining the same footprint and hatchery identity.
- L3 adds the complete five-tower and purple-dome silhouette, window band,
  banners, gold spires, pearl cupola, shell pediments and branching living-coral
  crown taken from the approved Coral Cradle progression language.
- All static Coral Cradle architecture is merged into material batches after
  authoring. The High 390×844 close-up measured 49 visible calls and about 398k
  visible triangles; forced Low retained the identity at 49 calls and about 24k
  triangles by removing high-tier coral and reducing curved resolution.
- Phone close-ups are stored under
  `outputs/island5-3d-gauntlet/actual-3d-pilot/m8-coral-cradle/` for L1, L2 and
  L3. Eivind approved this progression on 2026-08-08 as the current baseline,
  explicitly allowing further detail to be revisited later. That reversible
  approval unlocks M8B Tidekeeper Hall; it does not make M8A immutable.

## M8B Tidekeeper Hall candidate evidence — 2026-08-08

- L1 preserves the compact purple-roof hall as the starting identity, now with
  a deliberate arched entrance and aqua facade windows rather than a blank box.
- L2 is an authored architectural transformation: a complete royal-purple tide
  rotunda with twelve High-tier gold dome ribs, a pearl oculus, active central
  tide pool, gold-and-window facade arcade, balustrade and alternating reef
  crescents. It no longer reads as L1 with incidental ribs.
- L3 expands the same family into a broad Tidekeeper palace with four domed
  pavilions, fourteen High-tier dome ribs, a luminous aqua-and-gold lantern
  cupola, pearl lamps, stronger facade arcade, ceremonial entrance and tall
  perimeter tide crescents. The previous tall generic-citadel silhouette was
  removed in favour of the approved low, broad domed sanctuary reference.
- The final High 390×844 close-ups measured 46 calls / about 12k triangles at
  L1, 32 calls / about 33k triangles at L2 and 46 calls / about 69k triangles at
  L3. The High island overview remained inside the locked satellite footprint;
  forced Low retained the full island identity at about 69k overview triangles.
  These browser figures are renderer diagnostics, not physical-device proof.
- Eight focused pilot contract tests pass, including the water-first L1/L2/L3
  split, completed L2 dome, L3 palace dome, facade arcade, four pavilions and
  tide-crescent motif. Production and profiler builds, architecture guard,
  camera-template validator, visual-production validator and diff check pass.
- Phone close-ups are stored under
  `outputs/island5-3d-gauntlet/actual-3d-pilot/m8-tidekeeper-hall/` for L1, L2
  and L3. This is a candidate record, not approval; M8C Pearl Archive may not
  begin until Eivind accepts this progression.

## M8D Concord Arena identity-correction evidence — 2026-08-08

- Eivind rejected the generic corner-landmark pattern in which the Arena, like
  the other buildings, inherited a large dome and four castle spires. His
  correction is authoritative: Concord Arena must read as a little sports
  arena. This user-directed correction temporarily superseded the original M8C
  then M8D review order; Pearl Archive remains deferred.
- The rejected nave, spherical roof and landmark towers were removed. L1 is now
  an open practice venue with a green oval pitch, midfield markings, pearl
  match ball, two gold goals, low spectator rail and player entrance.
- L2 is an operational tournament bowl with stepped limestone seating, purple
  seat bands, individual seat markers, front and rear tunnels, banners and a
  two-team score display. The pitch remains visibly open.
- L3 adds championship infrastructure around rather than over the playing
  field: three purple canopy sections with restrained gold edges, a raised
  scoreboard, royal viewing box, two rectangular floodlight rigs, trophy
  plinth and additional seating. It contains no dome and no palace towers.
- Final High 390×844 close-ups measured about 36k visible triangles at L1,
  110k at L2 and 156k at L3. High and forced-Low overview checks preserve the
  locked satellite footprint and make the Arena visibly distinct from every
  domed building. These browser diagnostics are not physical-device proof.
- Nine focused pilot contract tests pass. The Arena-specific test requires the
  playing field, spectator rings, tunnels, scoreboard and floodlights while
  explicitly rejecting `addLandmarkTower` and `SphereGeometry` in the Arena
  section. Production/profiler builds and all Island visual/architecture guards
  pass.
- Phone close-ups are stored under
  `outputs/island5-3d-gauntlet/actual-3d-pilot/m8-concord-arena/` for L1, L2 and
  L3. Eivind accepted the sports-arena correction on 2026-08-08 and directed
  work to proceed to the next landmark. This records Concord Arena as the
  current approved-for-now baseline and activates M8C Pearl Archive.

## M8C Pearl Archive identity-correction evidence — 2026-08-08

- Eivind's Arena correction established a broader production rule: Island 5's
  satellite landmarks may share materials but may not default to one large dome
  with four surrounding spires. Pearl Archive therefore uses the approved
  Crown-of-Tides material kit without copying the reference pack's palace
  silhouette.
- L1 is an open reading terrace with a shelf wall, visible coloured volumes,
  two reading columns, a gold desk and a pearl-lit open codex beneath the first
  narrow gable roof.
- L2 is an operational three-part archive hall with central ceremonial entrance,
  two shelf-lined library wings, purple gabled roofs, gold ridges, reading
  stairs, pearl lamps and a roof codex. It is wide rather than radial.
- L3 becomes a grand shelf-lined repository with taller centre and side wings,
  upper gallery, reading balcony, nested archive portal, scroll-columns, roof
  cornices, exterior benches and an enlarged illuminated codex with gold
  knowledge rays. It contains no central dome and no four-spire arrangement.
- Final High 390×844 close-ups measured about 32k visible triangles at L1, 99k
  at L2 and 147k at L3. High and forced-Low overview checks preserve the locked
  satellite footprint and keep the Archive visibly distinct from Tidekeeper,
  Coral Cradle and Concord Arena. These diagnostics are not physical-device
  proof.
- Ten focused pilot contract tests pass. The Archive-specific test requires
  visible shelves, gabled roofs, codex, ceremonial entrance and scroll-column
  detail while explicitly rejecting `addLandmarkTower` and `SphereGeometry` in
  the Archive section. Production/profiler builds and all Island
  visual/architecture guards pass.
- Phone close-ups are stored under
  `outputs/island5-3d-gauntlet/actual-3d-pilot/m8-pearl-archive/` for L1, L2 and
  L3. Eivind accepted this library direction on 2026-08-08 and directed work
  to proceed. Pearl Archive is therefore the current approved-for-now baseline.

## M9 — integrated island and cinematic camera

- Verify L1, L2 and L3 as complete Island 5 compositions at the locked 390×844
  viewport. The 36-tile route must remain visible and each landmark family must
  be identifiable from the overview without moving its anchor or footprint.
- Replace straight-line camera interpolation with a deterministic smooth arc
  that has zero velocity at both endpoints and rises above intervening geometry.
- Add one reusable cinematic tour that visits overview, survey, both island
  orbits, all four satellites and Crown Citadel, then returns to overview. The
  tour sequence uses semantic landmark roles so later islands can reuse it.
- Manual orbit, tap-to-focus, individual camera presets, reduced-motion endpoint
  behaviour and the 30-second profiler must remain intact. Tour and profiler may
  not run simultaneously.
- Evidence: L1/L2/L3 integrated phone captures, a completed tour endpoint,
  camera-contract tests, renderer diagnostics, production/profiler builds and
  Island architecture/visual guards.

### M9 implementation evidence — 2026-08-08

- Locked 390×844 High captures verify all three complete compositions. L1 is a
  sparse foundation state, L2 establishes all five building families and L3
  preserves the readable 36-tile route while making Coral Cradle, Tidekeeper
  Hall, Pearl Archive and Concord Arena distinct at overview distance.
- Camera transitions now use smootherstep timing for zero velocity and
  acceleration at both endpoints, plus an elevated quadratic Bezier control
  point that clears intervening architecture instead of cutting through it.
- The reusable ten-shot semantic tour establishes the overview and survey,
  crosses both orbits, visits every satellite and Crown Citadel, then returns
  to the exact canonical overview. The live browser run completed the full
  sequence and restored all manual controls.
- Tour controls, manual camera presets and the 30-second profiler are mutually
  exclusive while active. Tapping scene geometry is also ignored during the
  locked tour/profiler choreography, preventing an accidental camera fork.
- Ten focused Island 5 contract tests pass. Production and internal-profiler
  Vite builds pass; architecture guards report zero violations; camera-kit and
  visual-production validators pass; `git diff --check` passes.
- Evidence is stored under
  `outputs/island5-3d-gauntlet/actual-3d-pilot/m9-integrated-island/`: L1/L2/L3
  integrated frames, Crown Citadel tour close-up and final overview endpoint.
- This milestone is ready for Eivind's visual review. It does not authorize the
  production-player rollout or replace the pending representative-device M7
  profiling gate.

### M9 L3 Citadel hierarchy correction — 2026-08-08

- Eivind identified that Crown Citadel did not dominate the complete L3 island
  strongly enough. The correction keeps its anchor, authored geometry and L1/L2
  presentation unchanged while scaling only L3 to 1.16× width/depth and 1.24×
  height from its grounded origin.
- The locked 390×844 overview confirms the larger Citadel remains inside the
  central route, leaves all 36 tiles readable and establishes a clear hierarchy
  above the four satellite landmarks. The dedicated boss close-up remains below
  the HUD and does not clip the restored crown.
- Updated evidence is stored as
  `island5-integrated-l3-enlarged-citadel-390x844.jpg` and
  `island5-l3-enlarged-citadel-closeup-390x844.jpg` in the M9 evidence folder.

### M9 L3 Citadel architectural-detail correction — 2026-08-08

- Eivind clarified that L3 must become more architecturally detailed, not only
  larger. The Citadel now adds a ceremonial portal with illuminated arch and
  grille, layered facade cornice, reading balcony and colonnade, buttresses and
  pinnacles, two radial lancet-window bands, a drum gallery, gold roof tracery,
  dormer ornaments, restored tower bands/pilasters/lower windows and four
  structural flying buttresses.
- The detail is authored only for L3 and remains material-batched. At the locked
  overview, High measured about 201k visible triangles and 238 calls; forced Low
  retained the hero silhouette and primary tracery at about 93k visible
  triangles and 227 calls. These are browser diagnostics, not representative
  physical-device evidence.
- Final evidence replaces the intermediate detail capture with
  `island5-l3-detailed-citadel-overview-390x844.jpg` and
  `island5-l3-detailed-citadel-closeup-390x844.jpg` in the M9 evidence folder.

## M10 — dev-only live Island Run shell integration

- Mount the actual Island 5 renderer inside the real Island Run screen so its
  existing top bar, reward bar and footer/controller remain the UI authority.
- Gate the preview behind `import.meta.env.DEV`, Island 005 and an explicit
  board-menu toggle or `island3dPreview=1` QA query. Normal gameplay must retain
  an immediate 2D fallback and must not eagerly download the Three.js pilot.
- Keep canonical `BoardStage` mounted beneath the visual preview. It continues
  to own token animation completion and camera/gameplay callbacks while the 3D
  pilot remains presentation-only; the pilot must never persist or mutate game
  state.
- Embedded presentation removes workbench-only metrics, profiler and camera
  panels while retaining touch orbit, pinch zoom and building focus. A visible
  dev badge must prevent this slice being mistaken for player-ready gameplay.
- Preserve the 36-tile route, Island 5 landmark layout and L3 Citadel hierarchy.
  No Island 1–4 conversion or production-player rollout is authorized here.
- Evidence gate: locked 390×844 live-shell capture with real UI, instant 2D
  fallback check, focused contract tests, production and profiler builds,
  Island architecture/visual guards and clean diff validation.

### M10 implementation evidence — 2026-08-08

- The real Island Run screen now lazy-loads the embedded Three.js pilot only
  when Island 005's dev preview is explicitly enabled. The normal production
  route does not request that renderer chunk during ordinary 2D play.
- The existing top bar, reward bar and controller/footer remain unchanged and
  above the 3D surface. Canonical `BoardStage` stays mounted underneath so its
  roll animation completion and gameplay callbacks remain authoritative.
- The board menu exposes an Island-5-only `Preview Island 5 in 3D` / `Use 2D
  Island 5` switch in dev mode. Locked-phone browser QA confirmed the 3D region
  appears, the switch removes it immediately, and the untouched 2D board is
  visible without a reload. The 3D view was restored for handoff.
- The embedded renderer retains orbit, pinch zoom and tap-to-focus while hiding
  the standalone workbench's profiler, metrics and camera preset controls. It
  carries a `DEV · 3D VISUAL PREVIEW` badge and has no gameplay write path.
- Browser console errors: zero. Ten of ten focused actual-3D contract tests
  pass. Vite production and island-profiler bundles pass; architecture guards
  report zero violations; the template-kit and visual-production validators
  pass; `git diff --check` passes.
- The repository-wide TypeScript command remains blocked by existing unrelated
  Supabase/generated-type errors and previously known pilot typing debt. The
  M10 live-shell files add no new compiler diagnostic.
- Evidence is stored under
  `outputs/island5-3d-gauntlet/actual-3d-pilot/m10-live-shell/` as
  `island5-live-shell-3d-390x844.jpg` and
  `island5-live-shell-2d-fallback-390x844.jpg`.

## M11 — canonical 3D token movement bridge

- Render one phone-readable 3D player piece on the canonical current tile. Its
  tile index comes from the existing `useIslandRunState` read in the live board;
  the Three.js surface must not create a state mirror or write gameplay state.
- During a real dice roll, consume the exact canonical `pendingHopSequence`
  already returned by `islandRunRollAction`. Never re-roll dice, derive a second
  destination, infer stop progression from tiles or signal hop completion from
  the 3D renderer.
- Reuse the existing `computeHopDurations` camera/animation contract so the 3D
  piece stays synchronized with hidden canonical `BoardStage`, including the
  current movement-speed factor and pre-roll anticipation beat.
- Give each hop a readable arc, grounded shadow and restrained squash/stretch.
  Temporarily lock manual orbit while the piece is moving, smoothly follow the
  token without clipping buildings, then return to the canonical overview.
- Non-roll canonical token changes snap the 3D piece to the matching tile.
  Switching 2D/3D must never alter the canonical token index or replay a roll.
- Evidence gate: real Roll-button capture at 390×844 showing the token before,
  during and after movement; final 3D tile must match canonical board state;
  focused pure motion tests, Vite builds, architecture guards and zero browser
  errors. Landmark gameplay clicks remain a later milestone.

### M11 implementation evidence — 2026-08-08

- The embedded Island 5 renderer now displays a phone-readable navy, violet
  and gold player piece on the canonical `tokenIndex`. The renderer receives
  `tokenIndex`, `pendingHopSequence` and the canonical movement-speed factor as
  read-only props and contains no gameplay persistence or mutation path.
- Two real footer Roll actions were exercised in the locked 390×844 live shell.
  Rolls of 8 and 5 moved the visible 3D piece through the supplied canonical
  hop sequences. The second roll captured the smooth follow camera in motion;
  after landing, the camera returned to the canonical overview.
- The final hidden canonical 2D board and visible 3D board both reported tile
  29. Switching temporarily to the 2D fallback and restoring 3D preserved tile
  29 exactly and did not replay movement. That switch was an integrity check,
  not a change in visual direction; the handoff remains in 3D.
- The player piece uses an authored hop arc, grounded shadow and restrained
  squash/stretch. Orbit input and landmark focus are locked only while hopping,
  preventing camera forks without taking ownership away from `BoardStage`.
- Eleven of eleven focused actual-3D contract tests pass, including wrapped
  tile lookup and exact hop endpoints. Vite production and island-profiler
  builds pass; architecture guards report zero violations; template-kit and
  visual-production validators pass; browser console errors are zero; and
  `git diff --check` passes.
- The repository-wide TypeScript audit became unresponsive without emitting a
  diagnostic and was stopped after the focused checks and both bundles passed.
- Evidence is stored under
  `outputs/island5-3d-gauntlet/actual-3d-pilot/m11-token-movement/` as
  `island5-token-before-roll-390x844.jpg`,
  `island5-token-camera-follow-390x844.jpg` and
  `island5-token-after-roll-390x844.jpg`.

## M12 — Build modal 3D landmark reuse

- Replace Island 5's Build modal hero artwork with the exact authored 3D model
  for the canonical active landmark and target level. The mystery/event build
  stop must resolve to Concord Arena rather than generic battle imagery.
- Keep the modal presentational. Its 3D canvas may read `stopId`, target level
  and title only; the existing `onBuildActivePart(active.stopIndex)` callback
  remains the sole action boundary.
- Lazy-load the existing Island 5 Three.js chunk only when an Island 5 Build
  modal actually renders. Do not make Islands 1–4 pretend to have authored 3D
  assets; retain their current safe artwork/placeholder path until conversion.
- Present the building as a calm, automatically framed turntable with the same
  adaptive quality profiles, materials, level geometry and phone constraints as
  the playable island. Honour reduced motion and release renderer resources on
  close or landmark change.

### M12 implementation evidence — 2026-08-08

- `BuildModalV2` now selects a lazy-loaded 3D preview for Island 5 while keeping
  its existing artwork component as the fallback for islands without authored
  models. No global or eager Three.js import was added.
- The preview calls the same `buildLandmark` factory used by the playable Island
  5 scene. It maps Hatchery, Habit, Mystery, Wisdom and Boss to Coral Cradle,
  Tidekeeper Hall, Concord Arena, Pearl Archive and Crown Citadel respectively,
  and renders the canonical target level from the modal view model.
- Automatic bounds-based framing keeps differently proportioned landmarks in
  view. Adaptive pixel ratio, shadows and model detail follow the existing
  low/medium/high quality contract; reduced-motion users receive a static frame.
  Resize observers, animation frames, geometry, materials, textures and the WebGL
  context are released when the preview unmounts.
- The surrounding construction scene remains the accessible Build button and
  still calls only `onBuildActivePart(active.stopIndex)`. The preview canvas has
  no pointer or gameplay callback and introduces no persistence path.
- Twelve of twelve focused Island 5 actual-3D contract tests pass. Production
  and island-profiler Vite builds pass; architecture guards report zero
  violations; template-kit and visual-production validators pass; and
  `git diff --check` passes. The full Island Run runner remains blocked before
  execution by pre-existing `checkins.ts` and `zenGarden.ts` type diagnostics.

## M13 — living-island ambience system

### Mission and observable outcome

Turn Island 5 from an architectural model on plain terrain into the reusable
living-world benchmark for future 3D islands. At the canonical 390×844 opening
view, the player should immediately perceive a bright maritime kingdom with
depth, gardens, moving water and restrained life while every route tile, player
piece and landmark silhouette remains easier to read than the ambience.

### Sources of truth and non-negotiables

- The canonical 36-tile route, tile transforms, landmark anchors, build levels,
  token movement, camera presets and gameplay ownership remain unchanged.
- Ambience is read-only presentation. It may never create gameplay state, move
  hit targets, persist data, paint fake tiles/UI, or block landmark input.
- Island 5 remains the representative vertical slice. The system must be
  deterministic and quality-profile driven so future islands can replace its
  biome configuration without duplicating renderer logic.
- The opening overview, all landmark close-ups and the camera tour must keep the
  sky, ocean and horizon coherent; no flat screen-space backdrop that breaks
  when the camera orbits.

### Included in M13

1. A camera-rotating equirectangular sky environment using the optimized Island
   5 panorama, with real 3D cloud wisps supplying the parallax layer.
2. Layered ocean color, horizon haze, shoreline foam and shallow-water rings.
3. Sculptural reef shelves around the main and satellite islands.
4. Symmetrical château-garden planting: mirrored clipped hedges, parterres,
   topiary, cypress-like trees, reeds and pearl lantern axes placed outside the
   canonical route corridor and landmark footprints. Random wilderness scatter
   is explicitly rejected for this ceremonial island.
5. Lightweight water sparkle, drifting cloud wisps, birds, butterflies and
   architectural life motion, all disabled or frozen for reduced motion.
6. Low/medium/high population budgets carried by the existing automatic phone
   quality selector.

### Explicit exclusions

- No gameplay interactions, rewards, weather system, day/night progression,
  new island audio, NPC simulation or conversion of Islands 1–4 in this slice.
- No video sky, runtime generative AI, physics vegetation, per-object React
  state or one-off high-end-only composition that changes island identity.

### Visual and performance budgets

- Runtime sky asset: WebP, approximately 2:1, at most 250 KB; the generated PNG
  master stays outside the deployed app. Current approved export is 1774×887
  and 53 KB at quality 82, with its painted horizon normalized for correct
  equirectangular projection.
- Low: static sky, simplified water, at most 40 greenery instances, 2 cloud
  wisps and no wildlife flock. Target ≤140k visible triangles and ≤255 calls.
- Medium: at most 90 greenery instances, 4 cloud wisps, one bird flock and one
  butterfly group. Target ≤235k visible triangles and ≤270 calls.
- High: at most 170 greenery instances, 7 cloud wisps, two bird flocks, two
  butterfly groups and the richest shoreline. Target ≤320k visible triangles
  and ≤285 calls.
- Maintain the existing quality-specific FPS gates. Decorative motion must use
  shared meshes, instancing or batched groups; it must not add one draw call per
  tree, flower, bird or sparkle.

### Acceptance evidence

- Locked 390×844 overview plus at least one landmark close-up demonstrating sky
  depth, greenery, shoreline and life without route obstruction.
- Wider-phone and reduced-motion spot checks; browser console errors remain zero.
- Focused contract tests assert profile budgets, deterministic ambience and
  absence of gameplay writes.
- Production and island-profiler Vite builds, architecture guards, template-kit
  validator, visual-production validator and `git diff --check` pass.
- The 30-second profiler remains the representative-device gate before this
  ambience template is copied to another island.

### Rollback and stopping rules

- Every ambience layer is created beneath one scene group and may be removed
  without touching landmarks, route or gameplay.
- If the opening route loses readability, reduce density/contrast before adding
  detail elsewhere. If a quality tier misses its budget, reduce instance counts
  or animation first; do not silently lower the canonical island architecture.
- Do not mark M13 complete from code or a single beauty shot. Completion requires
  the phone overview, close-up, automated checks and recorded profiler status.

### M13 implementation evidence — 2026-08-08

- The living ambience is isolated beneath `ISLAND_5_LIVING_AMBIENCE` and adds
  an optimized panoramic sky cylinder, cloud wisps, layered shoreline rings,
  reef shelves, water sparkles, formal gardens, fountains, birds and
  butterflies without touching landmark anchors, the 36-tile route or gameplay
  ownership.
- The garden direction was corrected through visual critique from overlapping
  wilderness-like clusters to deterministic château landscaping: mirrored
  parterre bands, clipped hedges, paired topiary, cypress alleys, flower beds,
  fountains and pearl lantern axes. High retains 168 planting instances,
  Medium 88 and Low 40; Low removes airborne wildlife while preserving the
  island silhouette and route.
- The generated sky master remains outside the runtime. Its accepted runtime
  derivative is `public/assets/islands/island-005/background/sky-dome-v2.webp`:
  1774×887, approximately 53 KB, with no PNG/JPEG fallback shipped for this
  asset.
- Locked 390×844 browser evidence includes the approved High overview, the
  deliberately simplified Low-phone overview and a High Crown Citadel close-up.
  The High view was restored after the Low-tier comparison.
- Thirteen of thirteen focused Island 5 actual-3D contract tests pass. The
  production Vite bundle and dedicated island-profiler bundle pass after final
  garden polish. Architecture guards report zero violations; island-art,
  camera-template and visual-production validators pass; scoped
  `git diff --check` passes.
- The full Island Run runner still stops before tests on unrelated pre-existing
  `checkins.ts` and `zenGarden.ts` type diagnostics. The repository-wide mobile
  image audit flags five unrelated landing-page JPG/PNG assets; the new Island 5
  sky is WebP and is not among those failures.
- The internal 30-second profiler bundle is built and ready, but its local
  preview port was blocked by the in-app browser URL policy in this session.
  Representative-device profiling therefore remains the explicit rollout gate
  before copying the ambience template to another island; no performance result
  is claimed without that evidence.
- Accepted evidence is stored under
  `outputs/island5-3d-gauntlet/actual-3d-pilot/m13-living-ambience/` as
  `island5-m13-final-high-390x844.png`,
  `island5-m13-final-low-390x844.png` and
  `island5-m13-final-citadel-closeup-high-390x844.png`.

## M14 — authored Level 1 landmark detail

### Mission and user outcome

Keep the approved Level 1 footprints and overall sizes, but replace the
greybox/readability-only finish with deliberately authored architecture. At the
locked 390×844 High overview every L1 landmark must be recognizable, attractive
and materially specific while remaining visibly earlier than L2.

### Non-negotiables

- Preserve all five landmark anchors, foundations, hit targets and level scales.
- L1 remains the foundation/first-built state; detail may improve, but massing
  must not borrow L2 height, complete L2 wings or L3 celebration motifs.
- Reuse the exact landmark factories already shared by the playable island and
  Build modal. Add no raster substitutes, gameplay writes or local progression.
- Detail must be phone-readable: entrances, roof trim, windows, structural
  frames and identity motifs take priority over invisible micro-geometry.
- Continue material batching through `compactStaticGeometry`; quality tiers may
  remove tiny ornament without changing identity.

### Landmark-specific acceptance

1. **Coral Cradle:** an intentional open hatchery with framed bowl, coral ribs,
   pearl supports and a readable front threshold—not only a hemisphere.
2. **Tidekeeper Hall:** a finished compact hall with cornice, framed arched
   windows, pilasters, roof edging and restrained tidal crest.
3. **Pearl Archive:** a small open library pavilion with shelves, side reading
   bays, entrance steps, roof trim and codex identity.
4. **Concord Arena:** a believable practice sports ground with low seating,
   rail detail, team markers and ceremonial entry while keeping the pitch open.
5. **Crown Citadel:** a richly built floodgate foundation with framed portal,
   ground-floor windows, tower-cap detail, buttresses and cornice, without
   growing into the operational L2 castle.

### Evidence and stopping rules

- Capture a locked High L1 overview plus one close-up for every landmark.
- Compare L1 and L2 silhouettes to confirm progression remains additive.
- Extend focused contract tests so each L1 has explicit authored-detail helpers
  or motifs and scale values remain unchanged.
- Production and profiler builds, architecture guards and scoped diff checks
  must pass. If route readability degrades, remove ornament before changing the
  approved camera, board, footprint or building size.

### M14 implementation evidence — 2026-08-08

- All five L1 factories now have authored identity layers without changing
  anchors or approved scales: Coral Cradle gains gold/coral ribs, pearl
  supports and threshold; Tidekeeper Hall gains pilasters, framed windows,
  cornice, roof ribs and tidal crest; Pearl Archive gains reading bays,
  shelves, lamps and entry stairs; Concord Arena gains low seating, benches,
  rail, team standards and entry crest; Crown Citadel gains portal framing,
  windows, buttresses, tower caps, cornice and a ceremonial roof-deck inlay.
- The exact factories remain shared by the live Island 5 board and Build modal.
  All new geometry continues through static material batching and adds no
  gameplay writes, duplicate state or raster replacement.
- Locked High phone evidence and five High workbench close-ups are stored under
  `outputs/island5-3d-gauntlet/actual-3d-pilot/m14-level1-detail/`. The L2
  comparison confirms that L1 remains the lower foundation tier and does not
  borrow the completed L2 massing.
- Visual inspection uncovered a pre-existing non-integral RingGeometry segment
  count in the formal garden. Segment counts are now rounded before geometry
  construction; repeated live reloads finish with zero fresh browser/WebGL
  console errors.
- Fourteen of fourteen focused Island 5 3D contract tests pass. Architecture
  guards report zero violations; camera-template and visual-production
  validators pass; both production and island-profiler Vite builds pass.

## M15 — living horizon ambience

### Mission and user outcome

Make Crown of Tides feel quietly alive beyond the board: the sea should visibly
breathe, clouds and sky should drift, birds should pass occasionally rather
than orbit like permanent decoration, and a distant sailing ship should cross
the far water. Motion must remain subordinate to the route, buildings and UI.

### Non-negotiables

- Preserve all board, tile, landmark, camera, UI and gameplay authority.
- Ambient animation is presentation-only and remains under
  `ISLAND_5_LIVING_AMBIENCE`; no React frame state or gameplay persistence.
- `prefers-reduced-motion` disables all continuous ambience movement through
  the existing animation gate.
- Low, Medium and High share the same world identity. Quality changes density,
  subdivision and update cadence—not composition or landmark placement.
- No video sky, physics simulation, particle-per-wave objects, audio expansion
  or interactive ship in this slice.

### Quality and performance budgets

- **Low:** 12-segment ocean grid, 2 batched wave bands, 20 Hz ocean updates,
  no bird flock and no distant ship.
- **Medium:** 22-segment ocean grid, 4 batched wave bands, 30 Hz ocean updates,
  one occasional flock and a royal flagship with one small escort.
- **High:** 34-segment ocean grid, 6 batched wave bands, 45 Hz ocean updates,
  two occasional flocks, a royal flagship, two small escorts and one pirate
  brig on an opposing route.
- The royal armada and pirate brig are each statically material-batched and
  must remain outside the island route/hit area. Wave bands use one instanced
  draw call.

### Acceptance evidence and stopping rules

- Capture High phone overview frames at separated times showing a changed sea,
  bird/sky position and distant ship movement without route obstruction.
- Spot-check Low and reduced-motion: Low retains gentle water life without the
  ship; reduced-motion keeps the scene stable.
- Focused contract tests lock the tier budgets, ship gating, batched waves and
  absence of gameplay writes. Browser/WebGL errors remain zero.
- Production and profiler builds, architecture guard, template/visual
  validators and scoped whitespace checks pass.
- If motion reads as flicker, UI competition or a toy circling the board,
  reduce speed/opacity/visibility before adding more objects.

### M15 implementation evidence — 2026-08-08

- The outer sea now uses a quality-scaled subdivided plane with cadence-limited
  vertex swells and one instanced traveling-wave layer. Existing shoreline
  foam, sparkles, sky rotation and cloud drift remain complementary layers.
- Bird flocks now fade into occasional passes rather than living permanently
  in orbit. The existing reduced-motion gate continues to stop all continuous
  sky, ocean, wildlife and fleet updates.
- Medium receives a royal flagship and one small escort. High receives the
  richer two-mast purple-and-gold armada leader, two smaller depth escorts and
  a distinct dark pirate brig on an opposing slow route. Low spends no geometry
  or animation budget on ships or birds.
- Royal and pirate geometry is procedurally authored, grouped beneath
  `ISLAND_5_LIVING_AMBIENCE` and statically material-batched. It is visual-only,
  stays outside the route/hit area and introduces no gameplay writes.
- High and Low 390×844 live-shell evidence is stored under
  `outputs/island5-3d-gauntlet/actual-3d-pilot/m15-living-horizon/`. Repeated
  live navigation and reloads produced zero fresh browser/WebGL errors.
- Fifteen of fifteen focused Island 5 3D contract tests pass. Architecture
  guards report zero violations; camera-template and visual-production
  validators pass; production and island-profiler Vite builds pass.

## M16 — local performance certification

### Mission and gate

Profile the approved living Island 5 composition through the complete 30-second
camera choreography before adding further visual layers. Test both the detailed
L1 foundation state and the fully restored L3 state at forced High quality.
Record the result without treating a desktop browser as physical-phone proof.

### Evidence — 2026-08-09

- Test surface: local in-app browser, 698×1480 renderer buffer, High quality,
  full overview/landmark/orbit camera choreography.
- **L1 High:** PASS — 60 FPS average, 17.7 ms P95, 17.8 ms worst frame,
  0% slow frames. Resting scene reported 411 calls and approximately 125k
  triangles.
- **L3 High:** PASS — 57.8 FPS average, 17.6 ms P95, 84.4 ms worst frame,
  2.5% slow frames. Resting scene reported 312 calls and approximately 263k
  triangles.
- The isolated L3 worst-frame spike is retained as a residual-risk datapoint;
  aggregate and P95 evidence do not justify reducing the approved visual
  quality. Recheck on representative iOS and Android hardware before copying
  the template broadly.
- Screenshot evidence is stored at
  `outputs/island5-3d-gauntlet/actual-3d-pilot/m16-performance-certification/island5-m16-level3-high-profiler-pass.png`.

## M17 — production live-shell and Capacitor bridge

### Mission and gate

Promote the approved Island 5 renderer from an opt-in developer preview into
the normal Island 5 game route without creating a second gameplay authority.
Then copy the verified production bundle into the existing native shell.

### Implementation evidence — 2026-08-09

- Normal Island 5 gameplay now defaults to the lazy-loaded actual-3D scene;
  the internal visual-preview query remains explicit and the developer menu
  retains a reversible 2D fallback.
- The canonical `BoardStage` remains mounted underneath as state authority and
  fallback. The 3D layer reads the canonical token index and hop sequence, and
  now also receives each landmark's individual canonical build level.
- Tapping a 3D landmark delegates to the existing `handleStopOpenRequest`
  dispatcher (`event` maps to canonical `mystery`). The Three.js component
  still contains no gameplay persistence or action service.
- WebGL initialization failure disables only the 3D visual layer and reveals
  the mounted 2D board rather than trapping the player on an error canvas.
- The normal demo-backed live shell was opened without `island3dPreview=1`,
  jumped through the canonical dev control from Island 001 to Island 005, and
  exposed `Interactive 3D Island 5` while preserving the real HUD, 36 tiles,
  landmark controls and footer.
- Fifteen of fifteen focused Island 5 actual-3D tests pass. The production Vite
  bundle succeeds and emits `Island5ThreePilot` as a separate lazy chunk
  (approximately 669 KB raw / 176 KB gzip).
- `cap sync ios` succeeded: the verified `dist` bundle was copied to
  `ios/App/App/public`, native configuration regenerated and all six installed
  Capacitor plugins synchronized through Swift Package Manager.
- A code-signing-disabled Debug build for the iOS Simulator resolved the
  official Capacitor 8.4.1 Swift package, compiled all native plugins and the
  app target, validated `App.app`, and ended with `BUILD SUCCEEDED`.
- Live-shell screenshot evidence is stored at
  `outputs/island5-3d-gauntlet/actual-3d-pilot/m17-production-capacitor/island5-normal-live-shell.png`.

### Residual gates

- This worktree is on
  `codex/preserve-local-wip-before-island1-merge-20260730`, not `main`; merging
  or deploying remains an explicit approval boundary.
- The repository currently has an iOS Capacitor platform only. Android is not
  initialized in this checkout, so no Android native sync was possible.
- Repository-wide TypeScript compilation remains blocked by pre-existing
  generated Supabase/type errors outside this slice. Focused tests and the
  production Vite transform pass; those unrelated errors must be cleared
  before claiming a fully green release gate.

## M18 — clean-main integration branch

### Mission and gate

Extract only the approved Island 5 actual-3D vertical slice from the large
mixed worktree, reconcile it with the current `main` architecture, and prove
that it can be reviewed and merged without carrying unrelated work.

### Integration boundary — 2026-08-09

- Integration branch: `codex/island5-3d-main-integration-20260809`, created
  directly from `main` at `8e1de94f`.
- The branch contains the Island 5 renderer/model/contract, optimized 53 KB
  WebP sky, live-shell bridge, canonical Build modal preview, internal camera
  workbench, device-profiler build mode, focused tests and this Gauntlet.
- The live-shell bridge is visual-only: canonical gameplay state remains owned
  by `BoardStage` and the existing action services. The Three.js layer receives
  token motion, per-landmark build levels and landmark callbacks as read-only
  presentation inputs.
- The developer menu includes the requested three-digit 001–120 island jump,
  routed through the existing canonical island-travel action rather than a UI
  state shortcut.
- Merge into `main` remains blocked while the existing `main` worktree contains
  user-owned uncommitted native/package and technology-asset changes. Do not
  clean, stash or overwrite those changes as part of this Gauntlet.

### M18 verification evidence

- Full TypeScript project build: PASS.
- Production Vite build: PASS; Island 5 remains a separate lazy chunk at
  approximately 669 KB raw / 176 KB gzip.
- Internal island-profiler build: PASS.
- Focused Island 5 contract: 15/15 PASS.
- Full Island Run corpus: 1,684 PASS and 3 pre-existing `main` failures, all in
  unchanged Island 1 camera/manifest assertions. No Island 5 test fails.
- Architecture guard: PASS with zero violations and the three existing
  allowlisted warnings.
- Camera-template, island-art asset and render-wiring validators: PASS.
- Clean-workbench browser smoke: one actual WebGL canvas, 60 FPS observed,
  7/7 geometry gates visible, zero browser errors.
- Capacitor iOS sync: PASS. The Island 5 chunk SHA-256 is identical in `dist`
  and `ios/App/App/public`.
- Xcode iOS Simulator Debug build with code signing disabled: `BUILD SUCCEEDED`.

## M19 — physical iPhone build and launch gate

### Mission and gate

Prove that the clean-main Island 5 integration branch can be rebuilt, signed,
installed and launched through the Capacitor iOS shell on Eivind's paired
phone. Keep physical-device performance certification separate from desktop
and Simulator evidence.

### Build and signing evidence — 2026-08-09

- Device discovery: paired and available `Eivind sin iPhone`, iPhone 16 Pro
  (`iPhone17,1`), with Xcode destination `00008140-001414591062201C`.
- The production web bundle was rebuilt and synchronized into Capacitor. The
  generated `dist/index.html` and `ios/App/App/public/index.html` share SHA-256
  `ebf2b23e07260a33f824e50a0318d1bf34afe7b21bebe1c2192b95e386922f7e`.
- An explicit generic iPhoneOS Debug build completed successfully from commit
  `260dbe19` using Capacitor 8.4.1 and the installed native plugins.
- The output `App.app` contains an embedded provisioning profile, passes strict
  `codesign` verification and resolves to bundle identifier
  `com.lifegoalapp.habitgame`.

### Installation and launch evidence

- CoreDevice installed the signed app successfully and reported bundle ID
  `com.lifegoalapp.habitgame` at its native application-container URL.
- The first launch correctly required Eivind to trust the local development
  profile. After trust was granted, `devicectl` launched the application
  successfully through SpringBoard.
- A post-launch physical-device process check found the arm64 executable
  running from the installed `App.app` container. M19 is complete for native
  build, signing, installation and launch.
- Visual gameplay acceptance and a 30-second High-quality performance trace
  remain user-observed device gates; successful launch alone does not certify
  Island 5 composition or sustained phone performance.

## M20 — live-shell phone quality override

### Mission and gate

Let development-device testing force Auto, Low, Medium or High quality inside
the real Island Run shell. Keep production users on automatic adaptation and
keep the override outside canonical gameplay state.

### Implementation and device evidence — 2026-08-09

- The Island Run developer menu now exposes a persistent `3D quality` selector
  on Island 5. Its first-use development default is High so physical-device
  smoothness can be judged against the full approved composition.
- The live shell passes the selection to the embedded renderer only while dev
  mode is enabled. Non-dev sessions still resolve `auto` from device signals.
- The override is local presentation state only. It does not mutate, mirror or
  persist any canonical Island Run gameplay field.
- TypeScript, production Vite build, Capacitor iOS sync and the architecture
  guard pass. All 15 focused Island 5 3D tests pass; the complete Island suite
  remains at 1,684 pass / 3 unchanged Island 1 failures.
- The refreshed signed build installed successfully on `Eivind sin iPhone`.
  CoreDevice's automatic post-install launch tunnel timed out, so opening the
  already-installed app manually remains the final interaction for this build.
- Eivind then confirmed that forced High runs smoothly in the iPhone Capacitor
  app. The browser/PWA preview was somewhat less fluid; native iOS remains the
  primary pilot gate while browser-tier tuning stays visible as follow-up work.

## M21 — eroded shoreline and living surf

### Mission and gate

Replace the visibly simple cylindrical water edge with a readable stylized
coast: irregular terrain silhouettes, layered reef-limestone strata, darker
waterline undercuts, translucent shallows, persistent foam and waves that
travel into the coast. Preserve the already-smooth High-quality iPhone result.

### Non-negotiables

- Board, tile, landmark, bridge, hit-target, camera and gameplay authority do
  not move. All additions remain presentation-only under the existing living
  ambience and terrain layers.
- The coastline must read as the same ceremonial Crown of Tides island—not a
  wild volcanic biome. Use pale reef limestone, mauve undercuts, aqua shallows
  and restrained pearl foam.
- Coastal rocks and breaker crests are batched/instanced. Do not add physics,
  one React object per wave, per-frame React state, video water or a gameplay
  collision system.
- Reduced motion keeps a composed static coast and disables traveling breakers.

### Quality and performance budgets

- **Low:** 24-segment coastal strata, one breaker layer per coast, existing 20 Hz ocean
  cadence, simplified eroded terrain segments.
- **Medium:** 56-segment coastal strata, two breaker layers per coast, existing 30 Hz
  cadence and fuller shallow-water shelves.
- **High:** 96-segment coastal strata, three breaker layers per coast, existing 45 Hz
  cadence and the complete layered cliff silhouette.
- The pass may add at most four material-batched coastal draw-call families.
  High must retain the current 50 FPS / 29 ms P95 certification target.

### Acceptance evidence and stopping rules

- High overview and at least one low shoreline camera frame show a materially
  irregular coast, readable rock strata, water-depth transition and moving
  breakers without obscuring tiles, bridges or landmarks.
- Low and Medium preserve the same shoreline composition with reduced density;
  reduced-motion remains stable.
- Focused Island 5 contracts lock quality budgets, batching, eroded geometry,
  moving coastal breakers and absence of gameplay writes. TypeScript,
  production build, architecture guard and native sync must pass.
- If High becomes visibly jittery on the iPhone, reduce rock density or breaker
  cadence before reducing the approved building/garden quality.

### Implementation evidence — 2026-08-09

- Every terrain plate now uses deterministic multi-frequency erosion rather
  than a perfect cylinder. One instanced coastal family adds two solid rock
  terraces on Low and three on Medium/High, with overlapping depth so close
  landmark cameras cannot expose empty seams.
- One batched shallow-water family, one persistent pearl-foam family and one
  dynamically instanced breaker family cover the main coast and all four
  satellite coasts. High animates three breaker fronts per coast, Medium two
  and Low one inside the existing reduced-motion-gated ambience loop.
- High, Medium and Low were visually inspected at a 390 x 844 phone viewport.
  High overview and Concord Arena close-up evidence is stored under
  `outputs/island5-3d-gauntlet/actual-3d-pilot/m21-eroded-shoreline/`.
- TypeScript and the production Vite build pass. The finished lazy Island 5
  chunk is 672.10 kB raw / 176.74 kB gzip. Architecture guard, camera-template
  validator and island-visual-production validator all pass.
- All 15 Island 5 contracts pass inside the full suite. The complete Island Run
  corpus remains at 1,684 pass / 3 unchanged Island 1 failures; no Island 5
  contract fails.
- The previously certified iPhone High build was smooth before this coastal
  slice. The refreshed M21 bundle then synchronized into Capacitor, built and
  signed successfully, installed on Eivind's paired iPhone and launched through
  CoreDevice. User-observed sustained surf smoothness remains the final M21
  certification gate.

## M22 — weighted token movement and responsive tiles

### Mission and observed failure

Give the actual-3D token a polished board-game travel rhythm: anticipation,
readable tile-by-tile hops, restrained response from every landed tile, and a
stronger two-stage landing on special tiles. Remove the visible regression
where the canonical final token index appears before presentation receives the
hop sequence, causing the 3D piece to teleport forward and then jump backward.

### Authority and non-negotiables

- `islandRunRollAction` remains the only movement authority. The renderer
  consumes its canonical hop sequence and final tile; it never derives or
  writes a gameplay position.
- The existing live-shell `isRolling` presentation guard prevents early
  canonical destination updates from snapping the 3D piece while dice or hop
  choreography owns the visible token.
- Tile response changes only the existing Three mesh transform and returns it
  exactly to its authored position and scale. Tile indices, anchors, hit
  targets, rewards and topology never move.
- Currency tiles use the normal landing. Chest, microgame, encounter, card,
  landmark-door, traffic-light, build-discount and free-ticket tiles receive a
  bounded extra final hop. Hazards use the same timing with a distinct forceful
  response.
- Reduced motion skips anticipation, secondary bounce, tile compression and
  token settle, then snaps directly to the canonical destination.

### Acceptance evidence and stopping rules

- A live roll never renders the token at the final tile before the first hop.
- Every traversed tile may depress/rebound briefly; the final tile response is
  stronger without shifting neighboring tiles or the board route.
- Special final tiles land once, rebound vertically in place, then land with a
  stronger compression inside the existing final-hop duration. This may not
  delay canonical reward or modal timing.
- Pure tests lock landing classification and exact transform recovery. Source
  guards lock the early-destination protection and canonical tile-map input.
- TypeScript, focused Island 5 contracts, full Island Run suite, architecture
  guard, production build and physical iPhone install must pass before M22 is
  accepted.

### Implementation evidence — 2026-08-09

- The actual-3D live shell now receives canonical `isRolling` state and refuses
  to apply an early final-index snap while dice presentation is active and the
  hop sequence has not arrived. A real browser roll held the token at its
  starting tile, then travelled forward once; the former forward-teleport and
  backward restart did not recur.
- Each visited tile now performs a short presentation-only compression and
  rebound. The final tile receives a stronger response, while the token adds a
  bounded squash-and-settle pose. Every transform returns exactly to its
  authored position and scale.
- Canonical tile metadata selects the finish: currency uses the standard
  landing, hazards receive a forceful response, and all other special tile
  families add a second vertical hop in place. The extra beat fits inside the
  existing final-hop duration, so reward and modal timing are unchanged.
- Reduced-motion mode bypasses secondary motion and snaps to the canonical
  destination. No gameplay store, roll action, reward service, board topology
  or hit target was changed.
- TypeScript, production Vite build, template-kit validation, visual-production
  validation and the Island Run architecture guard pass with zero new
  violations. The full corpus is 1,685 pass / 3 unchanged Island 1 failures;
  the new M22 contract passes.
- The production bundle was synchronized to Capacitor, signed successfully and
  installed on Eivind's paired iPhone. Automatic launch was deferred only
  because the physical phone was locked; the installed build is ready to open.
