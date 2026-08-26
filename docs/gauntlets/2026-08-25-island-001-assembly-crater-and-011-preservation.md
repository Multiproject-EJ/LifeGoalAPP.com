# Island 001 Assembly Crater and Island 011 Preservation

Date: 2026-08-25  
Status: active execution contract  
Owner direction: Eivind, 2026-08-25

## Mission

Preserve the current authored Island 001 First Light 3D world as runtime Island
011, then transform Island 001's centre into a signature mission. The player
lands on finite dynamite pickups on the canonical board and detonates twenty
charges. The blasts open the island's middle into a large circular civic
chamber with concentric seating and a central speaker podium.

## Sources of truth

- `AGENTS.md` and the canonical Island Run gameplay/visual contracts.
- `docs/gameplay/ISLAND_ACTUAL_3D_PRODUCTION_PLAYBOOK.md`.
- The current `Island1ThreeWorld.ts` world on `origin/main` at `e2a1f606`.
- Eivind's written direction in the 2026-08-25 task.

No `011-source` image or `_workflow/011/status.json` existed at intake. This
work therefore uses the current authored Island 001 runtime world as the exact
preservation source for 011. It does not invent a replacement concept image.

## Identity lock

### Island 011

- Preserve the current First Light terrain, atmosphere, four outer landmarks,
  and original central Sun Court.
- Route it as an explicit authored 3D world rather than the raster fallback.
- Reuse the First Light world as a declared dependency; do not copy deployed
  raster binaries.

### Island 001

- Keep the First Light terrain, atmosphere, route, and four outer landmarks.
- Remove the central boss-building silhouette from the 3D board.
- Replace that space with the Assembly Crater mission.
- The canonical Boss remains the fifth progression stop and remains reachable
  through canonical HUD/door flows; only its centre-world presentation changes.

## Mission contract

- Exactly twenty authored dynamite pickups exist on distinct route tiles.
- Each pickup can be collected once per island/cycle mission.
- Collection and detonation progress are persisted in
  `signatureMissionProgressByIsland` through canonical action services.
- One collected stick funds one deterministic crater sector.
- Detonation is committed before the fuse/camera/debris presentation.
- Closing the modal or using reduced motion cannot lose or duplicate progress.
- At twenty detonations the complete chamber is visible: the excavated bowl
  reaches the protected inner edge of the tile ring, concentric delegate seats
  surround a central podium, and no central boss building remains.

## Scope

Included now:

- Island 011 authored routing to the preserved First Light world.
- Save-compatible mission state, sanitization, merge logic, landing pickup,
  detonation action, board markers, mission UI, and focused tests.
- A procedural progressive Assembly Crater centre for Island 001.

Deferred:

- A new immutable concept image and Source Fidelity scorecard.
- Final character crowds, speeches, bespoke sound, narrative writing, and
  physical-device performance acceptance.
- Publishing, deployment, merge, or App Store submission.

## Reuse and delivery

Classification: `variant-overlay` for Island 011, depending on the First Light
base world. Island 001's Assembly Crater is a hero-entry experiential overlay.
The implementation should add procedural geometry and configuration rather
than duplicate First Light binaries.

## Acceptance evidence

1. Routing test resolves Island 011 to an authored First Light preservation
   source while Island 001 keeps its own runtime identity.
2. Mission tests prove twenty unique pickups, collect-once behavior, bounded
   progress, idempotent completion, sanitation, and monotonic merge behavior.
3. Roll-action tests prove landing commits a pickup through the canonical
   state record.
4. World contract tests prove the centre has twenty deterministic sectors,
   no boss-building mesh, seating and podium completion geometry, and a
   presentation-only update API.
5. Island Run TypeScript test compilation, service tests, architecture guard,
   and `git diff --check` pass. The app-wide build currently remains gated by
   Supabase type errors in untouched goals/project services.

## Rollback and stop conditions

- The work remains isolated on `codex/island-011-assembly-crater`.
- Never mutate the canonical board topology or add React-owned gameplay state.
- Stop if the crater overlaps the tile-ring inner radius, Island 011 no longer
  matches the preserved First Light world, or the mission creates a second
  gameplay writer.
- Do not mark visual production complete without phone/360 evidence and, once
  Eivind supplies or approves a visual master, the normal source-fidelity gate.

## Handoff

Resume from this file, inspect the branch diff, run the focused mission/routing
tests, then capture 390x844 overview plus left/right/rear evidence. The largest
visual risk is balancing a crater nearly as wide as the board's inner circle
without hiding tiles or making the podium unreadable at phone scale.

## 2026-08-25 continuation checkpoint

- Repaired the detonation presentation clock so the cinematic begins on the
  renderer's elapsed-time origin rather than comparing it with
  `performance.now()`.
- Added a quality-scaled impact flash, expanding shockwave and deterministic
  rubble beat for each committed sector.
- Reduced-motion presentation now applies the excavated sector immediately,
  queues no delayed blast, and skips the UI's 1.85-second cinematic wait.
- Structural tests cover the live blast frame, expiry and reduced-motion path.
- The dev-only camera kit now exposes Reset and Blast next controls, seeded by
  `assemblyCharges=0..20`, for deterministic before/impact/completed evidence
  without touching canonical gameplay state.
- A 390x844-class live workbench pass confirmed that the replay control advances
  from 0/20 to 1/20 and introduces no horizontal page overflow.
- Corrected the final runtime-identity leak: Island 001's centre camera now
  reads `Assembly Crater General Assembly`, while Island 011 retains
  `Aureon’s Sun Court` and exposes no Assembly Crater replay controls.
- The in-app browser still disables WebGL at the sandbox level, so geometry
  screenshots and physical-phone performance evidence remain an explicit gate.

## 2026-08-25 hardware-render checkpoint

- Hardware Safari exposed the original First Light terrain cap occluding the
  low chamber. Runtime Island 001 now replaces that cap with route-bearing
  annular terrain, a protected gold rim and an inward-facing 1.08-unit crater
  wall. Island 011 continues to use the untouched solid First Light terrain.
- Live evidence now covers intact earth at 0/20, an opened blast sector at
  1/20, the complete tiered chamber at 20/20, and the preserved Island 011 Sun
  Court. The finished chamber uses solid civic-blue floor treatment, four
  descending delegate terraces, eighty seats and a larger central lectern.
- The built-in 30-second medium-quality profile rendered at 564x1245 with
  58.3 average FPS, 21 ms P95, 0.7% slow frames and 159k maximum triangles.
  Timing passed; the overall result remains REVIEW because the inherited First
  Light world reached 622 draw calls against the current 175-call budget.
- Physical-phone acceptance is still deferred; this checkpoint proves the
  hardware browser path and phone-shaped render, not an iOS/Android device run.

## 2026-08-25 colossal-chamber correction

- Owner review rejected the first completed bowl as reading like only the first
  two of twenty explosions. The target is now explicitly a subterranean
  megastructure whose full footprint is larger than the surface island, while
  the route-safe opening still stops at the board's protected inner edge.
- The assembly now flares from a 2.72-unit surface opening into a 6.95-unit
  underground radius beneath the 6.25-unit island. Twenty individually revealed
  foundation wedges support seven concentric delegate terraces, 140 seats,
  twenty outer buttresses, radial aisles and an enlarged central lectern.
- The First Light lagoon and ocean no longer cap or slice through the buried
  chamber. The normal overview preserves the playable island; the Assembly
  focus preset switches to a presentation-only subterranean cutaway so the
  complete civic hall can be inspected without surface scenery obscuring it.
- Each canonical detonation now drives a 2.4-second impact presentation with a
  hot core, dual expanding shockwaves, dust columns, sparks, arcing stone debris
  and render-only camera shake. Fifth-charge milestones are stronger and the
  twentieth detonation is the largest. Reduced motion remains immediate and
  shake-free.
- The intact centre now has a green grass crust. A thin brown soil collar is
  exposed immediately below it, while the long crater wall is deeper grey
  stone, so the excavation reads as real layered ground rather than a flat
  brown surface.
- Fresh hardware-Safari evidence records the first explosion, restored surface
  overview and clean 20/20 subterranean cutaway under the `colossal` filenames
  in `docs/visual-references/island-001-assembly-crater/`.

## 2026-08-25 goal-image checkpoint

- Generated and project-locked `goal-finished-general-assembly-v1.png` from the
  live 20/20 surface overview and subterranean cutaway references.
- The goal image establishes the next visual bar: a readable three-quarter
  geological cutaway, green playable island above, and a warm ivory/navy/gold
  parliamentary megahall visibly larger than the entire surface footprint.
- The image is visual direction only. The canonical 36-tile topology, route
  clearance and fixed landmark anchors remain code-authoritative.
- Owner calibration superseded V1's excessive width. V2 keeps the same depth,
  seven tiers and civic identity while limiting the hall to roughly 10–12%
  beyond the island footprint. Runtime radius is calibrated to 6.95 units over
  the 6.25-unit surface crown.
- Owner review accepts V2's general concept only. Generated white fencing,
  altered island silhouette, cutaway rock shape and apparent landmark shifts
  are explicitly rejected as literal production instructions; canonical
  terrain, board and landmark anchors remain unchanged.
- The Assembly focus now uses a presentation-only rear-half geological context
  at the canonical 6.25-unit island radius: green crown, thin soil cut faces and
  deep dark stone. It retains only the far half of the real tile route for scale
  and adds no replacement fence, bridge, island outline or gameplay topology.
- Hardware Safari evidence is saved as
  `hardware-safari-island-001-canonical-cutaway-v2.jpeg`; the focused view held
  60 FPS in the captured frame with 55 draw calls and 20k triangles.
- Replaced the outer hall's ivory buttress treatment with deep structural stone,
  added one restrained gold capital per blast sector and changed the outer vault
  crown to gold. This keeps the civic rhythm while preventing the foreground
  structure from reading like the rejected white concept-art fence.

## 2026-08-25 whole-hole excavation correction

- Owner review accepted the automatic Assembly build and POV sequence but
  rejected the twenty pie-slice surface openings. The twenty charges must
  excavate one common crater volume, not behave like twenty trapdoors.
- The intact top is now twenty equal-area concentric grass rings. Each blast
  removes the next complete ring, expands the same circular opening and lowers
  the shared raw-stone floor. At 10/20 exactly half the final surface area has
  been excavated; at 20/20 the whole route-safe opening is clear.
- The raw excavation is one flared geological volume scaling from the protected
  2.72-unit surface throat toward the 6.95-unit underground footprint. Blast
  impacts use a golden-angle spread through the common crater rather than
  marching around sector boundaries.
- The twenty construction sectors remain valid only for the post-blast civic
  build choreography. Foundations, terraces, seats, aisles, buttresses and the
  podium remain hidden during excavation and rise automatically only after the
  twentieth explosion finishes.
- The canonical boss-stop civic seal remains in the object graph for routing
  but is visually hidden so no white disc or boss landmark floats inside the
  active hole.
- Corrected hardware-Safari evidence is saved as
  `full-sequence-whole-hole-10-of-20-final.png`. The shared Island Run suite
  passed 1,839/1,839, the architecture guard reported zero violations and the
  camera-kit geometry gate passed.

## 2026-08-25 progressive-depth excavation correction

- Owner review clarified that twenty charges must excavate the complete volume,
  not spend nineteen beats removing a grass lid and reserve depth for one final
  clearing blast. The surface opening now breaks through across the first six
  charges; all twenty charges continuously widen and lower the shared raw-stone
  excavation.
- The visible excavation state now interpolates during each 2.4-second blast.
  The active grass-cap band buckles and drops during the explosion, while the
  flared wall grows and the common floor descends in the same beat instead of
  jumping to its next state before the ignition flash.
- Charges four through twenty move progressively below the surface. From charge
  six onward, the main impact is joined by one staggered internal rock-breaking
  pulse; charge eleven adds a second and charge sixteen adds a third. These
  pulses contribute their own bounded camera-shake envelopes, while dust vents
  upward from the deep impact and rubble continues to burst from the wall.
- The twentieth blast remains a climax but no longer carries the old oversized
  final-only clearing boost. Intensity now grows gradually with excavation
  depth, with smaller milestone accents every fifth charge.
- The original First Light lagoon fish school was the spinning object visible
  inside the dry crater. Runtime Island 001 now hides only objects named
  `ISLAND_1_LAGOON_FISH_*`; the preserved Island 011 route retains its complete
  lagoon ambience.
- Runtime contract evidence verifies that blast one starts with intact grass,
  collapses the cap and lowers the floor during the animation, and that charge
  twelve detonates more than one unit below the surface with an active internal
  pulse and secondary shake. The complete Island Run suite remains 1,839/1,839,
  the architecture guard reports zero violations and the camera-kit gate passes.
- Safari rendered the corrected charge-eleven overview once with the fish gone
  and the shared crater already deep. Subsequent QA reloads exhausted Safari's
  local WebGL contexts, so no new screenshot is promoted from that unstable
  compositor session; automated Three.js runtime evidence remains authoritative
  for this checkpoint.

## 2026-08-25 mission, phone HUD and automatic-clear checkpoint

- Island 001 now has an authored Assembly mission statement in the shared
  Expedition Phone briefing: collect/detonate twenty charges and restore the
  four visible outer landmarks to Level 3. The previous Island 001 Concord copy
  no longer describes the board's primary mission.
- A circular Expedition Phone button sits in the lower-right thumb rail above
  the existing Compass button. It shows combined Island 001 completion and
  opens the viewport-level briefing with accessible progress bars for the
  Assembly excavation and the four outer L3 landmarks.
- The twentieth detonation is the Island 001 finale. Its canonical action
  atomically banks the standard finale reward and fulfils the hidden fifth-stop
  compatibility fields exactly once. It does not create or require a visible
  Boss landmark/build, and tapping an Island 001 Boss route affordance opens the
  Assembly mission instead.
- The Build modal treats Island 001's hidden compatibility slot as already
  funded for presentation, so only Hatchery, Habit, Mystery and Wisdom appear
  in the player-funded L1→L3 sequence.
- Mission completion first opens a dedicated General Assembly celebration. As
  soon as that celebration and any Build surface close, a completed mission plus
  all four outer L3 landmarks automatically opens the existing Island Complete
  screen; travel itself remains behind that screen's existing explicit CTA.
- The owner's phrase "Boss landmark is not counting on Island 011" was treated
  as Island 001 because it directly followed the Island 001 Assembly completion
  rule and the earlier instruction explicitly removed Island 001's centre Boss.
  Runtime Island 011 remains the preserved First Light world with its normal
  Boss/finale flow.
- Interactive QA confirmed that the lower-right Phone affordance opens the
  briefing and exposes `0/20` excavation plus `0/4` outer-landmark progress.
  The modal entrance no longer retains an identity transform after animation;
  this avoids a Safari/Chromium compositor path that could leave the dialog
  interactive but omit its panel from captured or mobile-GPU frames.
- Final visual evidence is stored as `mission-phone-hud.png` and
  `mission-phone-briefing-progress.png` in the Island 001 visual-reference
  folder.

## 2026-08-26 compact mission-phone correction

- Owner review rejected the dense two-device field briefing as too much player
  information and as reading like a separate 2D image instead of part of the
  live game. The runtime presentation is now one physical Expedition Phone over
  the still-visible 3D island.
- The phone contains only a compact military command plate, two short checklist
  rows (`Use Dynamite` and `Build Landmarks`) and one overall progress bar. The
  mission essay, protocols, council roster, caretaker quote and decorative
  second device were removed from the player-facing surface.
- The lower-right phone badge and the modal both derive progress from canonical
  Island Run state. This UI correction adds no gameplay write path or local
  gameplay mirror.
- Mobile visual QA at 390×844 confirmed the phone opens and closes cleanly,
  remains within the viewport and preserves the live Island 001 board as its
  background. No browser console errors were present.
- Runtime evidence is stored as `mission-phone-compact-runtime-v4.png` in the
  Island 001 visual-reference folder. The complete Island Run suite remains
  1,841/1,841 and the architecture guard reports zero violations.

## 2026-08-26 compact phone visual-polish pass

- The approved information density remains unchanged: one mission title, two
  short objectives and one overall progress bar. No briefing copy or secondary
  information panel was reintroduced.
- The runtime phone now uses a shield-and-chevron field insignia, dimensional
  gunmetal/brass header materials, recessed angular objective plates, distinct
  demolition and landmark pictograms, circular per-objective progress rings, a
  subtle tactical screen texture and a segmented mechanical progress rail.
- The polish remains code-native and presentation-only. Canonical mission and
  landmark values still supply every displayed progress state.
- Mobile QA at 390×844 confirmed viewport fit, close/reopen interaction and a
  clean browser console. Final evidence is stored as
  `mission-phone-compact-runtime-v5.png` in the Island 001 visual-reference
  folder.

## 2026-08-26 symmetrical metal-header correction

- Owner review asked for a more convincingly metallic and visibly symmetrical
  command header. The plate now mirrors its material bands around the exact
  centre axis, uses four matched corner fasteners, paired side armour, a
  balanced inset frame and equal-length brass rails around the centred crest.
- The title uses an embossed silver-metal treatment while retaining the exact
  compact mission copy and the previously approved objective layout.
- Live QA at 390×844 confirmed the revised plate remains centred inside the
  physical phone, opens and closes correctly and produces no console errors.
  Evidence is stored as `mission-phone-compact-runtime-v6.png`.
