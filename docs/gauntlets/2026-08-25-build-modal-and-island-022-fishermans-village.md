# Build modal pacing and Island 022 Fisherman's Village

Date: 2026-08-25  
Status: active bounded implementation; Slice 01 route-safe foundation built, visual gate stopped below threshold 2026-08-25  
Owner: Eivind  
Branch: `codex/build-modal-fisherman-022-20260825`

## Mission and observable outcome

Deliver two coordinated HabitGame slices:

1. Make the live PWA Build modal feel deliberate and joyful. The camera follows
   the active landmark, canonical Money spends are paced so the construction
   robots can visibly work, a completed level owns the screen long enough to
   jump/shine/settle, and no new paid build control becomes usable until the
   preceding level celebration and landmark camera handoff finish.
2. Reserve the first genuinely empty source slot, Island 022, for a cozy
   fisherman's village built around a central pond and prepare its immutable
   reference/decomposition package up to the mandatory 3D production approval
   gate.

Success is visible on a portrait phone, not inferred from source code.

## Sources of truth

- repository `AGENTS.md` and the four Island Run contracts;
- `docs/gameplay/ISLAND_ACTUAL_3D_PRODUCTION_PLAYBOOK.md`;
- `docs/gauntlets/2026-08-21-island-source-fidelity-workloop.md`;
- `docs/design/robot-family/ROBOT_BUILD_MOVEMENT_CONTRACT.md`;
- EJ-Jarvis HabitGame route and current-state snapshot read on 2026-08-25;
- the OneDrive `011-120 islands HERE` inbox and numbered workflow ledgers;
- the generated candidate and its SHA-256 recorded in the Island 022 reference
  pack.

## Confirmed repository/source state

- `origin/main` already contains the flexible Build modal and robot construction
  system.
- The user's main checkout is materially dirty and is not edited by this work.
- Island 011 is active in a separate worktree.
- Immutable sources exist for 012–021 and 023 onward; `022` has no source,
  workflow ledger, prior implementation branch, world factory or authored
  project mapping. A second bounded audit after Eivind's clarification checked
  both source and 3D/runtime ownership across relevant branches/worktrees; it
  remains the first genuinely empty slot.

## Non-negotiables

- Canonical state/actions continue to own every Money spend and build level.
- UI code does not add gameplay persistence or a parallel build-progress state.
- The live island keeps one WebGL renderer; the modal does not mount a second
  landmark canvas.
- A cumulative part choice may request several canonical spend steps, but those
  steps are serialized and visually paced rather than committed as one instant
  jump.
- The next landmark cannot accept payment before its camera handoff finishes.
- Build Rush is neither granted nor advertised when all 15 levels are complete.
- Reduced motion preserves clear final poses and state timing without rapid
  jumps, sparkle motion, or robot oscillation.
- A future numbered island is available only when both its source/workflow slot
  and its 3D/runtime implementation slot are empty. If either side exists,
  continue forward and adjust the new island to the first genuinely empty slot;
  never overwrite an existing island.
- The exact approved v004 pixels and decomposition are the production authority.
  Later versions are additive evidence and never overwrite v004.

## Slice A — Build modal pacing and completion

### Implementation defaults

- one canonical spend beat approximately every 1.15–1.25 seconds;
- level celebration minimum dwell: 3.2 seconds;
- automatic release: 4.6 seconds;
- landmark-to-landmark camera handoff lock: about 1.1 seconds;
- the actual landmark gets a proud rise, landing and damped jiggle during the
  reveal; CSS sparkles/shine reinforce the same beat;
- the final completed state keeps the Boss/L3 shot, dims the surrounding island,
  shows the generated `COMPLETED!` crest, and leaves the three robots in a
  front-facing celebration lineup with changing expressions and snappy jumps.

### Acceptance evidence

- focused service/source-contract tests cover paced spends, timing, camera
  release/handoff lock, completed Build Rush suppression and completion UI;
- Island 002 construction reaches multiple working phases instead of jumping
  straight to reveal;
- actual phone or equivalent 390×844 capture shows camera movement from one
  landmark to the next, moving robots, level jump/shine/settle, disabled build
  controls during the handoff, and the final celebration;
- typecheck/build, architecture guards and `git diff --check` pass.

## Slice B — Island 022 reference and 3D admission

### Locked creative direction

- premium stylized 3D miniature fishing village in a bright ocean;
- deep freshwater pond in the middle, with fishermen on small platforms around
  the pond and additional fishing activity on the outer shore;
- the live 36 board tiles form one geometrically perfect, uninterrupted circle
  around the pond; no oval, spiral, continuous path or second route is allowed;
- the large Guild Hall/Fish Market occupies the upper-right outer plot rather
  than sitting directly above the pond at the top centre;
- a compact working fish-market loading/offloading dock occupies the upper-left
  ocean shore behind the lighthouse lantern, with low market props and moored
  boats but no sixth landmark mass;
- small boats, docks, nets, crab pots, fish-smoking huts, cozy taverns and warm
  timber-and-stone homes;
- quiet circular board corridor around the pond and five footprint-separated
  landmark plots;
- a subtly darker central depth foreshadows the later water-dragon event, but no
  creature or disaster appears in the peaceful source image.

### Mission spine (design contract; first cinematic pass implemented 2026-08-26)

- catch target: **100 kg / 220.5 lb**;
- at **98 kg / 216.1 lb**, the pond swirls and drops rapidly;
- fishermen panic with authored, readable evacuation routes: most take boats,
  some jump into the ocean, and a small number make the irrational leap into the
  draining center;
- the camera commits to the pond, the ground shakes, and a very long eel/worm
  form erupts, gains limbs and wings, resolves into a flying water dragon,
  circles in a wide reveal, then dives into the ocean;
- follow-up mission: stabilize/fill the deep base with concrete while preserving
  small underwater fish-pass holes through the cylinder wall for a later-island
  payoff.

Implementation evidence: a deterministic 21-second presentation controller now
plays every beat above on the complete L3 island, including the corrected
off-island ocean dive. The live development lab is
`island-022-water-dragon-mission-lab.html`; temporal proof frames live under
`.img2threejs/island-022-fishermans-village/representation-routes/water-dragon-mission-v1/renders/mission-pass-v1/`.
Production routing remains unchanged until the broader island and phone-PWA
performance gates pass.

The 2026-08-26 bounded v2 correction replaces the visible bead-chain body with
one continuously deformed tapered skin, adds a pale belly, stronger head/jaw,
four webbed limbs, dorsal and tail fins, broader aqua wings, an actual
off-island dive and an island-return shot for the repair mission. The replay lab
now supports deterministic frozen time anchors, Low/Medium/High selection,
reduced motion and live FPS/render/draw-call/triangle diagnostics. A complete
Medium replay reached every phase without a frame error and held 49–50 FPS in
desktop Safari, but full-island views still reached 349–733 draw calls and have
not passed on a physical phone. The side-by-side creature review is `0.74 / 0.85`:
body continuity and mission choreography improved, while the flat procedural
wing panels, simplified head/crown and light surface detail remain below the
approved four-view identity. This spline family is therefore retired after its
bounded correction; Island 022 remains development-only and unrouted. Immutable
v2 proof and the honest review live under `renders/mission-pass-v2/` and
`review/mission-pass-v2.json`.

Eivind then explicitly approved a genuinely different eruption family: the
drained pond aperture, not the prior creature, owns the scale. The 3.34-radius
water opening and 3.42-radius stone bowl set a 3.0-unit leading torso radius
(about 90% aperture fill by diameter). The camera must peer into the empty shaft
before the creature starts below the water plane, blasts past the rim with a
water/spray shockwave, and forces a visible camera recoil. The earlier stopped
family and all of its evidence remain immutable; the new route is
`water-dragon-colossus-v2` and remains development-only.

The first colossus pass implements that contract. A dark pond-width shaft is
visible before the reveal; the leading body grows from radius `0.34` to `3.0`
against the `3.34` pond radius; its root starts `6.4` units below the water
plane and rises `17.8` units in `0.72` seconds; a shock ring, 24 instanced spray
columns and mist burst accompany the breach. The camera now peers into the
empty shaft, lets the body pass close enough to fill the frame, recoils to the
head and widens far enough to show a 28-unit dragon dwarfing the village. An
uninterrupted Safari replay reached the repair mission at 22.8 seconds at 50
FPS with no visible frame error. The dedicated scale/reveal review scores
`0.91 / 0.90`, while the inherited head (`0.62`) and flat wings (`0.66`) remain
honestly below the broader creature gate. Evidence is preserved under
`water-dragon-colossus-v2/renders/mission-pass-v1/`; the island is still
development-only and unrouted.

This cinematic must eventually use canonical mission state, an interrupt-safe
presentation layer, reduced-motion alternatives, and crowd/boat escape routes
that do not cross the live 36-tile corridor.

### 3D approval checkpoint

Before geometry, present:

- candidate hash and full source pixels;
- blank/current baseline;
- 10–50-part hierarchy with dependencies, sockets, motion ownership, visible
  versus inferred regions and representative first slice;
- unresolved hidden-side choices and the recommended production order.

Explicit Eivind approval is required before source promotion, isolated studies,
geometry generation, or implementation workers.

Approval recorded: **2026-08-25**. Eivind approved corrected candidate v004,
including the upper-right Guild Hall and upper-left fish-market loading dock,
then instructed production to continue under the two-sided no-overwrite slot
rule. Approved source SHA-256:
`a631297b2d2c11fcb3939de8ccc5bcdd69c52ab3bd12d40597859fbb6019ae65`.

### Current Slice 01 result

- The exact approved pixels are promoted as immutable `022-source.png` with a
  matching source-ready workflow ledger.
- The development-only Three.js blockout owns the central pond, perfect live
  board corridor, five separate L1–L3 landmark families, upper-right Guild
  Hall, upper-left fish-market offload dock, shore docks, fishing boats, pond
  platforms, terrain/cliff massing and calm water motion.
- Structural tests and the Island Run TypeScript contract pass for the new
  geometry. Island 022 deliberately has no production routing entry.
- Desktop Safari recovered a real WebGL path and produced fixed-view,
  map-stripped and left/right orbit evidence at 60 FPS. Three bounded review
  loops grew the blockout from a sparse macro layout into a route-safe fishing
  outpost with two cottage/wharf bands, fishers, skiffs, lanterns, cargo and
  working docks.
- Deterministic geometry evidence passes (`0.8789` silhouette IoU, no orbit
  collapse), but the strict source-likeness review stops at `0.54 / 0.70`.
  Island 022 therefore remains development-only and has no production route.
  A later authored-detail pass must add layered rock terraces, interlocking
  boardwalks, richer bespoke architecture and warm occupied materials before
  activation.
- Eivind then authorized one continuation. A genuinely different, batched
  authored-cluster family added gabled harbor homes, stepped stone circulation,
  a larger fish-market hall/apron/crane, warmer route materials and tighter
  portrait framing. The final Safari view holds 60 FPS at 278 calls and about
  30k triangles, with `0.9082` coarse silhouette IoU and non-degenerate orbits.
- The final source-likeness score improves to `0.60 / 0.70`, but still misses
  both the visual gate and the `0.75` post-correction family-retention floor.
  Two construction families and four formal reviews are now exhausted. Island
  022 remains development-only with no production routing; another attempt
  requires Eivind to approve a materially different representation route.
- Eivind then said “proceed”, explicitly satisfying that authority request. A
  separate Blender-authored modular-diorama route was created without changing
  the stopped procedural ledger, v004, existing evidence or production routing.
  Its first blockout established a true elongated mesh shell, circular pond,
  five modular landmarks, market/lighthouse, shipyard, net house, docks and
  boats. One bounded correction removed two accidental substitute-tile terrace
  rings, added twelve pond fishermen/rafts/rods, corrected the source-side
  Guild Hall/lighthouse composition and strengthened warm material separation.
- The corrected DCC diagnostic reaches only `0.51`: better at the island's
  fishing-life identity, but worse than the retained `0.60` authored-cluster
  family and far below the `0.70` visual, `0.80` source-fidelity and `0.85`
  Gauntlet-view floors. The exported GLB is 4,534,424 bytes with 477 primitives
  and 541 nodes, already beyond the representative 175-draw-call High ceiling
  before the live board, UI and construction crew. It was therefore stopped
  before browser/runtime integration. Island 022 remains development-only and
  unrouted; the exact v004 SHA-256 remains unchanged.
- Eivind then approved a narrower artist-grade Guild Hall branch. It imported
  the retained 20-primitive GLB strictly as an immutable blockout and replaced
  the roof identity with a curved mansard, geometry-backed shingle courses,
  complete wing roofs, a pointed carved entry, arched windows, balcony,
  chimney/crown details and a lived-in terrace. The bounded correction removed
  legacy glow collisions and added a coherent rear service elevation. This is
  the strongest isolated Guild Hall result so far at `0.72`, with measurable
  `+0.12` or better gains in roof, entry, terrace and rear systems. It still
  misses every `0.85` source-critical gate, the least-flattering rear view is
  `0.68`, and the 3,097,872-byte GLB exceeds its 2.5 MiB branch budget despite
  passing at 25 primitives. The branch therefore stopped before Three.js/PWA
  integration; Island 022 remains development-only and unrouted.
- Eivind then approved a materially different neural-material experiment. No
  callable image-to-mesh service was installed, so a source-guided 2x2 atlas
  was generated for slate, carved oak, coastal stone and smoked plaster and
  applied as albedo only over the immutable artist-grade GLB. The direct
  before/after render is richer and raises material/surface quality from `0.72`
  to `0.77`, while keeping the same 25 primitives, hierarchy and runtime
  metadata. The inherited UV layout, however, maps several samples at an
  oversized inconsistent scale; global likeness reaches only `0.73`, the rear
  remains `0.68`, and no source-critical feature reaches `0.85`. Embedded
  texture payload also grows the GLB to 5,624,968 bytes against the 2.5 MiB
  branch budget. Because frozen geometry keeps the absolute feature gate
  unreachable by a material-only correction, this route is stopped with no
  Three.js/PWA integration. Island 022 remains development-only and unrouted.
- Eivind then said “continue”, explicitly authorizing a fresh geometry-sculpt
  route after the global family ceiling. The Guild Hall was rebuilt from an
  empty Blender scene rather than importing the prior GLB: 199 editable mesh
  objects were batched into 36 semantic GLB meshes/primitives, with a continuous
  concave mansard, swept side roofs, narrow vertical shell, layered arched
  entry, irregular coastal apron and an authored rear service bay. The single
  bounded correction fixed reversed front-gable roof rotations and extended
  both rake lengths from 3.55 to 4.55 units, raising the roof transition from
  `0.72` to `0.82` without a critical regression. The 1,715,140-byte GLB passes
  both the 90-primitive and 2.5 MiB technical budgets, but global likeness is
  only `0.76 / 0.80`; the rear and worst source-critical feature remain `0.69`
  against the `0.85` Gauntlet floor. The route is therefore stopped and
  preserved as evidence with no Three.js/PWA integration or production routing.
- Eivind then approved the explicitly proposed hand-authored hero-mesh and UV/
  material route. A new empty-scene Blender branch authored the Guild Hall from
  fourteen direct architectural profile/loft systems rather than importing a
  prior GLB. Its naked blockout established a narrow occupied shell, deep nested
  entrance, custom four-sided mansard, interlocked wing roofs, side gables,
  complete rear service gable and an irregular apron. The one bounded roof
  correction strengthened the mansard control rings, added correctly sided
  slate planes to every gable, and added roof ridges/finials; the roof system
  rises from `0.74` to `0.85` (`+0.11`) with no critical regression. The final
  naked macro score is `0.84`, however, with left/right orbits at `0.83/0.84`
  and the rear at `0.81`, all below the required all-view `0.85` floor. The
  958,884-byte, 35-primitive GLB passes its technical budgets, but the dedicated
  UV/PBR stage remains deliberately locked. No browser/PWA integration or
  production routing was attempted, and all previous routes remain unchanged.
- Eivind then explicitly redirected the work away from Blender and asked for
  the normal runtime Three.js methodology. A separate code-only Guild Hall
  route built fourteen marked architectural systems with no GLB: a four-sided
  mansard, swept wing roofs, layered pointed entry, occupied amber apertures,
  slate relief, fishing-life terrace props and a rear loading elevation. The
  final bounded correction moved the dominant dormer onto the visible mansard,
  restored a smaller front-gable window, added seven staggered front/rear slate
  rows and deepened the rear with a dormer, deck, steps, framed door and
  lanterns. The targeted slate/window/material score rose from `0.68` to `0.78`
  (`+0.10`), while the overall comparison reached `0.80 / 0.85`. Runtime proof
  remains technically healthy at 12,626 triangles, 14 marked parts, zero
  invalid vertices, `0.8912` coarse silhouette IoU and non-degenerate
  left/right/rear views. Shorter angular eaves, procedural slate cadence and
  reduced facade density still fail the source-critical visual gate, so the
  local route stops at correction `3/3`. It remains development-only and
  unrouted; the protected Island 022 stopped-state hash and every prior evidence
  version remain unchanged.
- Eivind then asked whether the fishing mission and sea-dragon animation were
  working and instructed the island work to continue. A runtime audit confirms
  that they are not implemented: the peaceful island currently exposes the pond
  vortex, crowd, boat and repair sockets, but its animation callback only runs
  ambient pond/boat motion. A separate development-only
  `water-dragon-mission-v1` admission packet now records the canonical
  `100 kg / 220.5 lb` target, `98 kg / 216.1 lb` disaster trigger, twelve ordered
  mission phases and a 21-part state/effects/creature/camera/repair hierarchy. A
  new four-view dragon sheet is preserved as `secondary-inferred` evidence with
  SHA-256 `051c1577841f4479f3fceaf1d4a53d3a68dd6c68ca5434eb717228e1fc86c642`.
  Because the peaceful source contains no dragon, geometry and animation remain
  locked until Eivind explicitly approves or revises that visible creature
  identity. The existing island, evidence versions and production routing are
  unchanged.
- Eivind subsequently approved the aperture-calibrated colossus and directed a
  full-body sky launch, natural turn, longer flight, contracted-wing head-first
  dive, large splash and slower accelerating well drain. The development-only
  mission now holds the dragon vertically folded until all 24 units of body
  clear the island: the launch root reaches `y=33.4` and the tail remains at
  `y=9.4` before unfurl begins. The 23.5-second sequence adds eased body waves,
  banking, a visible route turn, a committed dive and complete post-impact
  disappearance. The previous flat-lid drain was traced to the protected
  terrace cap; a stencil-clipped cinematic portal now reveals alternating shaft
  courses and descending teal water without altering the island or board
  geometry. Five immutable Safari frames preserve the mid-drain, full launch,
  flight, dive and splash. The dedicated Vite build and diff check pass, and the
  protected Island 022 state hash remains unchanged. The task-specific motion
  pass is successful, but the general reference diagnostic remains blocked by
  an isolated four-view sheet versus in-world-frame silhouette mismatch, and
  physical phone performance is still unverified; production routing remains
  unchanged.
- Eivind then approved a complete development mission slice around the refined
  dragon. The deterministic progression collects a fishing rod on board tile 2,
  casts toward individually glowing fish tiles, and uses repeated pull inputs
  for catches of different sizes. Four catches total `46 kg`; the next scripted
  ten-pull monster catch weighs `32 kg`, bringing the meter to exactly `78 kg /
  172.0 lb` and locking all fishing input during the dragon event. The dragon's
  third visual contract retains full wing bones and membranes while wrapping
  them around the diving body, adds layered anatomical detail, moves the final
  splash onto the waterfront, recoils the presentation-only island, sends waves
  over the village, destroys one temporary net-house presentation and sweeps one
  fisher into the central shaft. Five rebuild inputs restore the temporary
  building before fishing resumes toward `100 kg / 220.5 lb`; an ancient chest
  previews `+100 dice` without touching the canonical wallet, and a rare `40 kg`
  fish remains a later tuning candidate. This lab does not change board tiles,
  landmark levels, production routing, purchases, persistence or economy state.
- The live Safari review explicitly checks the user's parallax concern at
  `7.45s`, `7.9s` and `9.9s`: the leading torso remains at the exact pond center,
  the near rim occludes it, and the body rises vertically through the well
  before the route introduces any horizontal offset. A first dive review then
  rejected the still-wide downward fan. The bounded correction preserves the
  full shoulder length while contracting only the wing-digit span to `32%`, so
  the darker membranes layer visibly against the torso rather than disappearing.
  The shoreline and post-impact views confirm the front-edge contact, complete
  dragon disappearance, five wash rings, temporary net-house collapse, debris,
  island recoil and the swept-fisher beat. This is a successful development
  slice, not production admission: final hero-creature detail, an apples-to-
  apples isolated reference diagnostic and physical iPhone PWA profiling remain
  open gates.

## Deferred story threads preserved from this request

- A flying activity begins earlier as a sport and establishes the player as a
  gold-medal pilot.
- Roughly 35 islands later, a barren red-black rocky weapon-facility island
  threatens the original islands with a giant missile. The mission sends the
  player-controlled drone into the unmanned facility's center with the briefing:
  “According to my intel, you're already a gold-medal pilot. Good luck—much
  depends on you.”
- An earlier suspicious allied island claims that a satellite-protected,
  missile-shaped installation stores disaster grain. Its guarded residents show
  performative respect; optional clues include a concealed missile drawing.

These threads are narrative backlog only in this slice. They do not consume an
island number or introduce mission code until their placement and safety tone
receive a separate contract.

## Rollback and recovery

- Modal changes are isolated to presentation timing, the read-only construction
  adapter, Three.js presentation code, CSS, tests and one versioned crest asset.
  Reverting this branch restores the previous behavior without a data migration.
- Island 022 files remain versioned. The approved v004 pixels and source-ready
  OneDrive ledger are immutable; later iterations create new evidence instead
  of replacing either accepted artifact.
- Preserve all generated evidence and rejected candidates; never overwrite an
  accepted source or done proof.

## Stop conditions

- stop if canonical spend serialization or saved build levels regress;
- stop if a camera handoff can be cancelled by a new paid input;
- stop if the final celebration needs a second renderer or gameplay mirror;
- stop if the immutable promoted source differs from approved v004 or another
  implementation claims runtime Island 022 before routing lands;
- request a decision if the candidate source, landmark decomposition, hidden
  dragon anatomy, or later narrative placement is not accepted.
