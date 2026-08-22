# Island 013 — Cactus Canyon production Gauntlet

Date: 2026-08-21
Status: active
Role: ordinary island; not an every-fifth Arena
Delivery: `new-base`, Standard island, target deployed delta 2–5 MiB

## Mission

Build a source-faithful, interactive actual-3D Cactus Canyon for runtime Island
013. The first phone read must preserve the supplied concept's red-rock plateau
and extend it, by direct user correction, onto a tall broad canyon column whose
width remains close to the summit mesa rather than a floating underside. It retains the concentric railway,
moving steam locomotive, central frontier civic
tower, four distinct satellite sites, tall canyon buttes, cacti and warm sunset
depth while retaining the canonical 36-tile board and live gameplay UI.

The immutable source is
`docs/visual-references/island-013-cactus-canyon/013-source.png`, SHA-256
`211c555791218557426263c0ac20ce2141ac1e5d85aca863626e21ce885753a1`.
Its baked `ISLAND 021` label is a known mockup discrepancy; the filename and
runtime mapping designate Island 013.

Eivind approved
`work/island-visual-library/island-013-cactus-canyon/renders/013-imagegen-pillar-goal-v2.png`
(SHA-256 `4712a092ae3a2b4edf3fe54d647010a3b3ce7befdd3275354be1ac4704299e62`)
as the production goal for the tall-pillar, 360-degree canyon network and
rock-cut spiral railway direction. This generated target does not replace the
immutable source: the source remains authoritative for frontier identity,
landmark hierarchy, palette, material richness, vegetation and sunset depth.
Eivind subsequently confirmed that the goal image's greater column height is
also preferred; the runtime pillar, canyon network, spiral railway and
full-column camera must preserve that more monumental vertical proportion.

## Sources of truth

1. `AGENTS.md` and the canonical Island Run gameplay/visual contracts.
2. `docs/gameplay/ISLAND_ACTUAL_3D_PRODUCTION_PLAYBOOK.md`.
3. `docs/gauntlets/2026-08-21-island-source-fidelity-workloop.md`.
4. `work/island-visual-library/island-013-cactus-canyon/SOURCE_LOCK.md`.
5. `.img2threejs/island-013-cactus-canyon/state.json` and its evidence.
6. The authored world factory and current browser/device evidence.

## Non-negotiables

- Keep the real `spark36_ring`, 36 live wedge tiles and canonical gameplay.
- Preserve the source's macro composition and five landmark identities; Island
  012's accepted drift is not precedent.
- No baked source HUD, labels, fake route, approximate tile count or token.
- Keep the double railway as scenery outside/along the board context without
  replacing or obscuring the playable route.
- Island 013 is ordinary: adapt the source's Showdown Field into the canonical
  Mystery landmark rather than adding Arena gameplay.
- All four satellite landmarks and the central boss remain readable together
  at 390×844; each satellite has coherent additive L1–L3 growth.
- Quality scaling and reduced motion must affect ambience without changing hit
  targets or gameplay geometry.
- One source image does not reveal the rear/underside. Hidden construction is a
  controlled approximation using the visible frontier language.
- Real 3D quality is reviewed in the canonical, left, right and rear views. No
  landmark or vehicle may rely on a detailed hero façade and empty back side.
- The locomotive travels clockwise through an actual open tangent-aligned rock
  tunnel. Decorative tunnel-mouth geometry over a solid box is forbidden.
- Cactus Canyon route-tile materials retain a stable depth bias so orbit and
  impact motion cannot expose z-fighting against the mesa cap.
- Island 013 owns one canonical signature mission: landing on survey tile 19
  earns one wheel spin, and each spin excavates 1–4 of sixteen durable
  rock-cut railway-gallery sections from the summit downward.
- The mission railway is a shelf/cave/shaft cut into the mountain, not an
  exterior roller-coaster structure. It uses the same twin steel rails and
  timber sleepers as the summit railway, joins that railway at a real summit
  junction, and terminates at a canyon-floor public-transport stop.
- Once complete, the train runs a 90-second public timetable: three summit
  circuits, summit dwell, descent, canyon-floor dwell, ascent and arrival dwell.

## Locked landmark translation

| Canonical family | Cactus Canyon landmark | Source identity |
| --- | --- | --- |
| Hatchery | Rail Nest Waterworks | timber water tower, egg/nest rail depot and pipework |
| Habit | Windmill Ranch Yard | tall multi-blade windmill, ranch house and fenced work yard |
| Mystery | Showdown Signal Yard | low circular challenge/corral language, signal tower and rail switch |
| Wisdom | Prospector Sheriff Archive | frontier sheriff office, map room, claim markers and blue-lit records safe |
| Boss | Cactus Crown Union Station | central stepped civic station/church tower, bell, flag and illuminated windows |

The steam locomotive is a moving ambience system circling the mesa. It is not
a sixth clickable landmark.

## Milestone slices and evidence

### Slice A — reference lock and resumable intake

- repository source copy and matching hash;
- dated Gauntlet, SOURCE_LOCK, BRIEF and ASSET_TRACKER;
- image analysis, suitability, admission, 3×3 inventory, pre-spec assessment,
  sculpt spec and active img2threejs state;
- explicit embedded-label discrepancy and hidden-side limits.

### Slice B — representative blockout

- dedicated Island 013 world factory and routing scaffold;
- pillar-supported mesa/cliff silhouette, double railway, five unmistakable landmark
  masses, tall buttes, cacti and sunset depth;
- map-stripped 390×844 overview plus left/right orbit;
- source/current comparison and `blockout` fidelity checkpoint.

Block if the central tower is generic or visibly thin at L3, the railway is
absent, the mesa lacks its tall mountain-pillar support, or the four satellites repeat one
silhouette.

### Slice C — terrain, railway and background depth

- layered canyon foreground/midground/far-background buttes and haze;
- strata, fractured cliff edge, sand/stone variation and route-clear cactus;
- clockwise locomotive with wheels/rods/steam, elapsed-time motion and a
  physically open tunnel clearance;
- terrain/background source checkpoint.

### Slice D — landmark production

Build and review one family at a time: Boss → Hatchery → Habit → Mystery →
Wisdom. For each, prove L1, L2 and L3 preserve footprint, entrance and identity.
Capture focus, source/current and front/left/right/rear evidence before
continuing. The least flattering elevation is the first review target.

### Slice E — materials and living ambience

- warm orange sandstone with strata/cavity variation;
- weathered timber, dark iron, copper/brass accents, glass windows and rail
  steel with separate PBR response;
- cactus variation, tumbleweed/dust, smoke/steam, windmill motion, flags and
  distant heat haze;
- reduced-motion and Low/Medium/High evidence.

### Slice E2 — Canyon Spiral signature mission

- canonical cycle-scoped mission ledger and mutex-protected wheel action;
- one route-bound survey marker on tile 19, with landing auto-open through the
  canonical roll result;
- sixteen progressive gallery sections revealed top-down in the live Three.js
  world, including flat cut-stone shelf, cave shadow, twin rails, sleepers,
  tunnel mouths, summit junction and canyon-floor stop;
- dedicated full-column camera and top-level portal mission tray with scroll
  lock;
- public timetable proof at summit dwell, descent, canyon-floor dwell and
  ascent phases;
- saved evidence: `renders/013-pass24-excavated-shaft-front.png` plus matching
  left, right and rear views with the train frozen in its descent phase.

### Slice E3 — 360-degree canyon network

- one deep monumental ravine running almost the full height of the supporting
  mountain, with irregular sunlit lips and stepped interior rock shelves;
- eight smaller ravines distributed around the complete circumference, so no
  rear or side elevation returns to a featureless cylindrical wall;
- railway trestle supports wherever the completed public-transport shelf
  crosses the monumental cut;
- stable `canyon-system` runtime manifest identity and structural regression
  coverage for the monumental and eight minor scars;
- saved front/left/right/rear proof in
  `renders/013-pass25-canyon-network-*.png`, with mobile-frame crops beside
  each full evidence capture.

### Slice F — integration and release proof

- runtime route maps Island 013 to world source 13;
- canonical clicks, token travel, Build flow, rewards and caretaker remain
  unchanged;
- structural/routing tests, TypeScript, production build, architecture guard,
  Island Run suite and `git diff --check` pass;
- physical PWA and Capacitor evidence only after visual gates pass;
- final source fidelity overall ≥0.80, every dimension ≥0.75 and no critical
  mismatch; then create immutable `013-done-v001` evidence.

## Performance budget

- High: approximately ≤175 draw calls and ≤180k triangles.
- Target ≥50 FPS average, p95 ≤29 ms and slow frames ≤15% on the representative
  physical phone.
- Repeated rails, sleepers, cacti, fence posts and distant rocks use instancing
  or merged static geometry. Only a few hero elements animate independently.

## Authority and exclusions

Authorized: reversible repository implementation, local browser testing,
versioned evidence and the source inbox checkpoint ledger.

Not authorized: gameplay-rule changes, publishing/deployment, App Store
submission, paid assets/services, deleting source studies, or merging without
separate approval.

## Rollback and stop conditions

- Keep each milestone independently committable on
  `codex/island-013-cactus-canyon`.
- Source hash drift, state hard-stop, unresolved source numbering, fake board
  geometry, critical source mismatch, route obstruction or mobile budget
  failure blocks the next slice.
- Revert the bounded failing slice rather than weakening source or gameplay
  contracts.

## Handoff

### 2026-08-22 checkpoint — taller pillar and structural railway

- User approved the more monumental column height. The pillar, 360-degree
  canyon system, excavation shelf and train path now share a 1.30 vertical
  scale, while the summit junction remains connected at the top.
- The custom canyon camera was tightened after the height increase so the
  complete pillar remains visible without shrinking the summit. Four-view
  evidence is saved as `renders/013-pass39-taller-column-*-crop.png`.
- The approved generated target/current comparison is saved as
  `renders/013-pass39-approved-goal-comparison.png`.
- Blockout advanced at its pass-specific 0.58 gate with a 0.62 review score,
  passing the four blockout feature targets and deterministic multi-angle
  volume check. This is structural-stage readiness, not production approval;
  final target fidelity remains 0.80.
- Structural pass has begun with gallery retaining piers, cap stones, masonry
  portal voussoirs and rock-cut wing walls. Initial evidence is saved as
  `renders/013-pass40-structural-rail-engineering-upper.png`.
- Structural passes 41–44 deepen that work: all sixteen excavation segments
  now carry paired ceiling/back-wall rock shells and wider ledges, eight major
  tunnel transitions carry masonry portals, and denser instanced cliff blocks
  wrap the pillar without adding a draw call per rock.
- The smooth cylinder core was replaced by one continuous irregular procedural
  cliff shell with vertical fracture rows and restrained shelf pulses. Latest
  front/left/right/rear evidence is saved as
  `renders/013-pass44-union-station-volume-*.png`.
- Cactus Crown Union Station now has a broader hall and tower, deeper paired
  wings, side passenger platforms and a projecting rear service annex with
  its own roof, window, service door, sign, lantern, braces and crates.
- Structural passes 45–49 replace the former rigid train prop with four
  independently sampled vehicles: engine, tender and two passenger coaches.
  Every vehicle now receives its own position and tangent/grade orientation
  from the summit circle or spiral centreline, while bogie rotation derives
  from travelled rail distance.
- The summit/spiral join now has real paired switch blades, a steel frog,
  switch stand and lever, plus a natural sandstone clearance portal and short
  descending deck. The timetable still performs three summit circuits, then
  approaches the points, dwells, descends, dwells below and returns.
- Timed transition evidence is saved as
  `renders/013-pass48-turnout-transition.png` and
  `renders/013-pass49-turnout-ascent.png`; descent and wider summit context are
  saved as `renders/013-pass47-articulated-descent-rear.png` and
  `renders/013-pass46-consist-orbit-right.png`.
- Passes 50–51 reopen the portal sightline by replacing the single oversized
  hood with a raised crown and two separate rock shoulders. The summit throat
  now includes switch tie plates, a connecting rod, keystones, an inner iron
  rim, paired lanterns and a ramp drain grate; the four upper gallery segments
  now include instanced ballast, drainage and signal conduit geometry.
- Same-time descent and ascent evidence is saved as
  `renders/013-pass50-turnout-engineering-transition-verified.png` and
  `renders/013-pass51-turnout-ascent-engineering-verified.png`.
- Passes 52–53 strengthen the lower and rear railway as a rock-cut public
  transport shelf. The existing floor/fascia geometry now widens and deepens
  progressively below the summit, alternate lower sectors receive instanced
  ballast/parapet masonry and iron drains, and three lit maintenance refuges
  are recessed into the cliff. Corrected tunnel-mouth tangents keep portals
  perpendicular to the rails instead of reading as freestanding scenery.
- Rear and left structural evidence is saved as
  `renders/013-pass53-rear-gallery-portal-correction-verified.png` and
  `renders/013-pass53-lower-gallery-left-verified.png`.
- Passes 54–61 address the least flattering front/right geology. The formal
  structural review recorded `refine-code` at 0.55 because the old cliff units
  were 0.95 radial by 1.8 tangential and collapsed into hanging sheets. The
  replacement uses deeper, narrower, two-step-bevelled stacked blocks, a
  restrained rounded sunlit family, denser 360-degree rows, irregular core-row
  twist and coherent vertical column tracks. Rock ribs, shoulders and columns
  now move outside an elevation-matched rail corridor so added geology cannot
  swallow the public-transport shelf.
- Current front/left/right/rear proof is saved as
  `renders/013-pass61-segmented-cliff-columns-*-verified.png`; the deterministic
  multi-angle volume diagnostic remains clean.
- Honest remaining structural gaps: the column stacks are still more regular
  and lower-detail than the approved goal, sandstone lacks its final layered
  erosion/material pass, and rear/side landmark timber construction remains
  too simple for production quality.
- TypeScript, strict sculpt-spec validation, 1,826 Island Run tests,
  architecture guards (0 violations, 3 allowlisted warnings) and
  `git diff --check` pass after this slice.

### 2026-08-22 checkpoint — structural closure and form refinement

- Passes 62–64 close the over-wide diagonal gallery void with a four-part
  instanced rock shell per bay: crown, recessed back wall, under-shelf support
  and staggered flanking buttress. Shorter scattered cliff shoulders and a
  denser irregular block skin preserve the train envelope while making the
  route read as excavated geology. Verified front/left/right/rear evidence is
  saved as `renders/013-pass64-natural-bench-geology-*-verified.png`.
- The structural review advanced legitimately at 0.69 against its staged 0.68
  threshold. Tier-1 silhouette and multi-angle volume diagnostics pass; this
  remains stage readiness rather than final fidelity.
- Passes 65–67 replace the repeated floating-chimney background with tiered
  mesa bases, crowns, attached spires and overlapping continental shelves.
  Each formation is positioned on the overview camera's descending horizon
  plane, so the inland canyon rim rises behind the summit without becoming a
  ceiling or floating in the sky.
- Union Station, the waterworks and the ranch now carry visible construction
  around all four elevations. Station corner posts, front/rear gable rafters,
  rear service construction and a broader bell-tower mass survive the side and
  manual rear cameras. The water tower and windmill use four-legged,
  cross-braced trestles rather than facade-only props.
- The source/current form review correctly recorded `refine-code` at 0.73
  against the 0.74 form threshold, keeping the pass open instead of masking the
  remaining landmark-volume gap. Its evidence is
  `renders/013-pass67-source-form-comparison.png`.
- The source-locked ImageGen form target is preserved as
  `renders/013-imagegen-form-goal-v1.png`; it keeps the approved tall pillar and
  public railway while showing the intended richer frontier hierarchy.
- Pass 68 addresses the recorded mismatch with a projecting Union Station
  entry pavilion, four roof dormers, auxiliary waterworks pump shed and ranch
  stable. Latest front/left/right/manual-rear evidence is saved as
  `renders/013-pass68-form-refinement-*-verified.png`.
- The second form review advanced at 0.76 against the 0.74 gate, with every
  staged feature threshold met. The local pipeline now starts `material-pass`;
  this is not permission to skip surface, lighting or final production gates.
- The canonical 36-tile route, train centreline, mission progression and
  gameplay authority remain unchanged. The Island Run suite remains clean at
  1,826 tests after the Pass 68 form additions.

### 2026-08-22 checkpoint — material pass, first bounded look-dev group

- Pass 69 replaced the old 96–128 px shared grayscale noise with independent
  procedural albedo, roughness and relief channels. Hero sandstone and timber
  use 1024 px maps; sand, roofing, metal and cactus use quieter 512 px maps.
  Albedo stays sRGB while data channels stay linear, and all important maps
  are separate objects rather than aliases.
- The first material render was deliberately rejected because high-contrast
  sandstone strata repeated across the local UV island of every small cliff
  block. Passes 70–73 move that frequency into gentler roughness/relief,
  preserve quiet phone-scale albedo, and use bounded instanced colour variation
  for broader warm/cavity separation. The visible striping is gone.
- Timber, worn trim, dark roof, blackened iron, rail steel, brass, amber glass
  and navy locomotive paint now have distinct response. Summit and spiral rails
  read dark against the sandstone; the rock-cut gallery floor no longer reads
  as a pale exterior roller-coaster deck.
- Union Station, its wings and service annex, the waterworks, ranch, signal
  house and sheriff office now receive batched four-sided siding courses.
  Windows use separate timber frames and amber glazing on every elevation.
  Irregular instanced flagstones enrich the summit town floor inside the
  protected route corridor.
- Latest four-view evidence is
  `renders/013-pass73-material-{front,left,right,rear}-verified.png`. The
  summit train material proof at public-service time 12 is
  `renders/013-pass74-material-train-verified.png`. Before/current and
  source/current sheets are
  `renders/013-pass68-to-pass73-material-comparison.png` and
  `renders/013-pass73-source-material-comparison.png`.
- Deterministic multi-angle volume remains clean. The Tier-1 material colour
  diagnostic is still failed at max delta-E 41.44 because its documented
  coarse implementation compares the whole orange scene against every local
  component recipe; returned component IDs are null, so the legitimate green
  cactus recipe is treated as a global mismatch. Do not erase the cactus
  palette or weaken the spec to satisfy this false-positive. The pipeline
  remains honestly parked at `tier1-diagnostics` until the evidence route is
  corrected or a valid component-crop diagnostic is supplied.
- TypeScript, strict sculpt-spec validation, all 1,826 Island Run tests,
  architecture guards (0 violations, 3 allowlisted warnings) and
  `git diff --check` pass after this slice. Regression coverage now locks the
  independent PBR channels, 1024 px hero maps, route-clear flagstones and
  four-sided siding detail.

### 2026-08-22 checkpoint — source-crop look-dev and visible civic tower

- Material evidence now uses five verified local crops from the immutable
  source rather than the whole board image: sandstone butte, timber facade,
  timber roof, locomotive and cactus. Crops and derived albedo/roughness/
  height/normal/AO evidence are stored under
  `.img2threejs/island-013-cactus-canyon/material-evidence/`.
- The sandstone, timber, roof and locomotive extractions each reported 0.829
  confidence against the 0.70 extraction threshold, with the required warning
  that single-image PBR is inferred and background separation is weak. The
  cactus crop also reported 0.829 mechanically, but visual inspection showed
  orange ground contamination, so its extracted palette was rejected.
- `analyze_texture.py` classified every strongly warm stylized crop as
  `candy-coat`. That physical-material conclusion was rejected rather than
  turning rock and timber metallic. Only crop-supported palette ranges,
  independent roughness variation, relief strength and cavity/edge structure
  informed the runtime refinement.
- Pass 75 rebases sandstone, shadow rock, sand, timber, worn trim, roofing,
  amber windows and blue-black locomotive paint toward the verified source
  stops. It also replaces identical bilateral cylinder cacti with varied
  one/two-arm plants, rounded crowns, elbows and arm caps, plus route-clear
  instanced dry grass distributed around all azimuths.
- Pass 76 fixes a genuine 360-degree Union Station defect: the enlarged tower
  shell had swallowed its inherited window, siding, band and clock offsets.
  Those systems now sit outside the 1.42 x 1.42 tower volume. Front/rear clock
  rims and hands and four lit cupola elevations make the civic landmark read
  from every orbit without changing its approved massing.
- Settled four-view evidence is
  `renders/013-pass76-civic-{front,left,right,rear}-verified.png`. The
  before/current and source/current sheets are
  `renders/013-pass73-to-pass76-material-civic-comparison.png` and
  `renders/013-pass76-source-civic-comparison.png`.
- The new multi-angle diagnostic remains clean: left 1.0027, right 1.0001 and
  rear 1.0122 relative silhouette-area ratios, with no degenerate view. The
  current Tier-1 run again fails only the coarse null-component colour check
  (max delta-E 42.96); silhouette IoU is 0.9311, aspect and scale deltas are
  zero, and symmetry error is 0.0113. The pipeline therefore remains honestly
  parked at `tier1-diagnostics`; no AI review or `continue` decision was
  recorded past the failed deterministic gate.
- TypeScript, strict sculpt-spec validation, all 1,826 Island Run tests,
  architecture guards (0 violations, 3 allowlisted warnings) and
  `git diff --check` pass. Regression coverage now locks rounded cactus
  systems, route-clear dry grass, exposed front/rear clock assemblies and the
  four-sided cupola.

### 2026-08-22 checkpoint — working waterworks and windmill ranch

- Passes 77–81 turn the two weakest satellite silhouettes into working civic
  landmarks without changing their approved positions, the route, summit,
  pillar, railway, camera overview or background scenery.
- The Rail Nest Waterworks tank now has explicit vertical timber staves, three
  iron bands, a full-circumference service deck and guard rails, overflow feed
  and downpipe, front/rear depot doors and a pump-house pressure gauge. The
  four-legged cross-braced trestle and ladder remain readable from the alternate
  outer elevation.
- The Windmill Ranch now has broad alternating timber sail panels, an engineered
  outer wheel rim, named hub, service platform, four rail posts and a vertical
  pump linkage. The stable receives four-sided windows and siding; the yard adds
  a water trough and small working props rather than relying on the windmill
  silhouette alone.
- The first ranch review exposed an edge-on camera defect: the broad sails read
  as a thin horizontal row. The Cactus Canyon Habit camera was therefore aligned
  to the wind-wheel normal, and a deterministic `island13LandmarkView=rear`
  inspection toggle now exposes the opposite ranch elevation and an unobstructed
  alternate waterworks elevation.
- Before/current evidence is preserved as
  `renders/013-pass77-waterworks-before-verified.png`,
  `renders/013-pass77-ranch-before-verified.png`,
  `renders/013-pass77-waterworks-after-verified.png`, and
  `renders/013-pass80-ranch-front-verified.png`. The neglected-side proofs are
  `renders/013-pass80-ranch-rear-verified.png` and
  `renders/013-pass81-waterworks-alternate-elevation-verified.png`. The final
  whole-island regression frame is
  `renders/013-pass82-waterworks-ranch-whole-island-verified.png`.
- Visual review records this as an improvement, not a final-fidelity claim. The
  front and alternate views prove readable 3D volume and working parts, while
  close-up material response and smaller ranch-yard dressing remain candidates
  for later look-dev. Tier-1 is still parked at the known coarse null-component
  colour diagnostic; no `continue` decision is recorded past that failed gate.
- TypeScript, all 1,826 Island Run tests and `git diff --check` pass after this
  slice. Regression coverage locks water-tank construction, mechanical details,
  ranch sails, pump linkage, stable rear detail and the functional trough.

### 2026-08-22 checkpoint — Showdown Signal Yard and Sheriff Archive

- Passes 83–89 refine the remaining two thin satellite landmarks without
  moving their plots or changing the route, railway, mission, pillar, station,
  waterworks, ranch or background scenery.
- The Showdown Signal Yard now contains a raised timber challenge deck, two
  full corral rails with twelve structural posts, a brass showdown compass,
  twin approach rails and sleepers, a real diverging switch, hand lever, mast
  ladder, semaphore, restored signal gantry and three working signal lamps.
  The switch house gains explicit front/rear doors and four-sided construction.
- The Prospector Sheriff Archive now has a projecting front entrance, awning
  and steps, attached four-sided map room, four-sided lookout lantern, front
  blue records safe with wheel and bolts, rear records hatch, rear map chest
  and roll, front/rear badges and four claim markers around the complete plot.
- The initial Signal Yard focus was rejected because its dark gantry collapsed
  into the mountain tunnel behind it. The default Event camera now uses the
  clear tangent elevation where the corral, compass, switch and signal tower
  remain simultaneously visible. `island13LandmarkView=side|rear` preserves
  additional deterministic landmark inspections, and
  `island13WorldView=rear` supplies a stable whole-island rear proof.
- Before/current focus evidence is
  `renders/013-pass83-signal-yard-before-verified.png`,
  `renders/013-pass87-signal-yard-side-verified.png`,
  `renders/013-pass83-sheriff-before-verified.png` and
  `renders/013-pass86-sheriff-primary-verified.png`. Neglected-side proof is
  `renders/013-pass87-sheriff-side-verified.png`.
- The settled whole-island 360 set is
  `renders/013-pass89-landmarks-{front,left,right,rear}-verified.png`. All four
  views preserve the approved tall column, complete railway and background;
  the least flattering side/rear views no longer reveal blank Sheriff or
  Signal Yard elevations.
- Visual review records `refine-code`, not pass completion: landmark identity
  and 360 construction improved materially, but close-range surface response
  and the scene-wide source-material gate remain open. The pipeline stays at
  the known failed coarse null-component Tier-1 colour diagnostic; no AI
  `continue` decision is recorded past that hard gate.
- TypeScript, strict sculpt validation, all 1,826 Island Run tests,
  architecture guards (0 violations, 3 allowlisted warnings) and
  `git diff --check` pass. Regression coverage locks the new functional yard,
  map-room, safe, records and neglected-side systems.

### 2026-08-22 checkpoint — rail clearance, dynamite mission and canyon world

- Passes 90–94 audited the locomotive and independently articulated carriages
  against every level-3 landmark, not only against the protected board route.
  Rail Nest Waterworks, Windmill Ranch, Showdown Signal Yard and Prospector
  Sheriff Archive now provide real throughpasses or setbacks instead of placing
  facades and props inside the train's swept envelope. The geometry contract
  reports zero landmark/train clearance violations. Before/current evidence is
  `renders/013-pass89-landmarks-front-verified.png`,
  `renders/013-pass94-landmark-rail-clearance-front-verified.png` and
  `renders/013-pass89-to-pass94-landmark-rail-clearance-comparison.png`.
- The former chance wheel has been replaced by the authored **Carve the Canyon
  Spiral** mission. Its briefing unlocks eight route-relative dynamite caches:
  six single sticks and two triple bundles. Landings collect dynamite through
  the canonical roll action; the mutex-protected mission action spends exactly
  one charge to reveal exactly one of sixteen descending rail-gallery sections.
  Version-1 wheel saves migrate monotonically into the new version-2 dynamite
  state, and saves that had already seen the briefing repair the unlock safely.
- Route tiles now carry readable 2D dynamite markers and real 3D red charge
  bundles. Before the briefing the caches remain hidden. The mission overlay is
  presentation-only and closes after a successful canonical commit so the user
  sees the planted charge, burning fuse, bounded exterior camera arc, shake,
  flash, dust, individually animated rock debris and delayed track reveal.
  Deterministic QA controls `island13BlastPreview=1` and
  `island13BlastSegment=N` replay any section without altering gameplay. The
  nine-frame proof is `renders/013-pass106-blast-frame-01.png` through
  `renders/013-pass106-blast-frame-09.png`.
- Passes 95–107 deepen the canyon-world read without deleting approved scenery:
  broad low mesa families now surround all azimuths, subtle heat veils rise at
  several depths and four western wayfinding assemblies dress the summit. The
  late-day sun is a real world-space anchor with its key light aligned to the
  same azimuth; it stays fixed while the camera orbits instead of spinning with
  the viewer. The settled overview is
  `renders/013-pass107-soft-launch-final-overview-viewport.png`; left/right
  world proofs are `renders/013-pass105-canyon-world-left-viewport.png` and
  `renders/013-pass105-canyon-world-right-viewport.png`. The bounded before/
  current sheet is `renders/013-pass94-to-pass107-canyon-world-comparison.png`.
- TypeScript, the production Vite build, all 1,827 Island Run tests,
  architecture guards (0 violations, 3 allowlisted warnings) and
  `git diff --check` pass after the mission and scenery slice. Tests lock
  canonical pickup/spend/migration semantics, 3D cache construction, blast
  timing and debris, moving-train clearance, world-locked sun, heat atmosphere,
  360 mesas and western signage. The build retains pre-existing dynamic/static
  import and large-chunk warnings, but completes successfully.
- This is accepted as the Island 013 soft-launch checkpoint, not a formal
  img2threejs completion. The deterministic Tier-1 run remains honestly parked
  at the known coarse null-component colour mismatch even though structural and
  multi-angle diagnostics pass. Desktop High evidence held 60 FPS but reported
  roughly 1,375 draw calls; physical-device High/Auto profiling and draw-call
  reduction remain release work rather than being hidden by this acceptance.
- Reusable lesson: define a moving-infrastructure mission before final sculpting,
  keep gameplay authority separate from its cinematic, audit the full vehicle
  swept envelope independently from board clearance, and verify directional
  environmental anchors in world space across 360 views. These requirements are
  now recorded in `ISLAND_ACTUAL_3D_PRODUCTION_PLAYBOOK.md` for the next island.

### 2026-08-22 checkpoint — western station frontage and solid pillar correction

- The Union Station's lower front row now reads as an authored western street:
  both wings have stepped timber false fronts, cornices, independent painted
  signboards and distinct crossed-rail/horseshoe artwork. The central entrance
  has a recessed portal and paired timber saloon leaves built on separate,
  slightly open hinge groups rather than a flat door decal.
- A blue-and-brass railway flag now sits asymmetrically on the tower roof,
  breaking the former church-like centred silhouette and staying clear of the
  canonical phone notch. Its subdivided cloth mesh remains fixed at the pole
  edge while two bounded waves produce a subtle changing canyon-wind ripple.
- Visual review exposed a more fundamental pillar defect: the procedural core's
  triangle winding faced inward and the cylinder ends were uncapped. The core
  now faces outward and is closed at both ends, so the mountain reads as one
  solid sandstone mass. Canyon scars use recessed rock colours rather than void
  black; only the completed blasted spiral shelf retains a hollow channel read.
- Saved evidence includes the close frontage in
  `renders/013-pass111-western-station-flag-viewport.png`, the settled overview
  in `renders/013-pass114-western-flag-wave-b-overview.png`, and the 360 checks
  `renders/013-pass115-western-solid-360-right.png` and
  `renders/013-pass116-western-solid-360-left.png`.
- All 1,827 Island Run tests, architecture guards (0 violations, 3 allowlisted
  warnings) and `git diff --check` pass. Regression checks now lock the hinged
  doors, western storefront identities, railway flag hierarchy and closed
  continuous pillar core. This remains a bounded `refine-code` correction; the
  formal img2threejs state stays parked at its previously recorded Tier-1 colour
  diagnostic rather than claiming an unsupported pipeline completion.

Resume from `.img2threejs/island-013-cactus-canyon/state.json`, run
`forge/next.py --state ...`, inspect the latest source/current evidence and fix
the largest recorded mismatch only. Never reconstruct progress from chat.
