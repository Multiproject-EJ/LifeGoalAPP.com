# Skybound Expedition — Flight Prototype Gauntlet

Status: **Production event integration active**, direction approved by Eivind on 2026-08-25 and integration authorized on 2026-08-26.

## Mission

Build the smallest genuinely playable version of an original HabitGame flight
event inspired by the pull, release, fly, earn, upgrade loop observed in Epic
Plane Evolution. This pass exists to answer one question before production
integration: is launching and guiding the craft fun enough to keep developing?

## Observable outcome

At 390×844, a first-time player can pull the craft back, see power and angle,
release into flight, steer the nose with one finger, spend a bounded boost, land
or reach the course goal, earn salvage, buy an upgrade, and feel the next throw
improve. Three environments make the same mechanic progressively less forgiving.

## Prototype loop

1. Pull down and back from the launcher to set power and angle.
2. Release to launch.
3. Drag vertically to lift or dive; hold boost while fuel remains.
4. Bank salvage from distance, altitude, landing quality, and course completion.
5. Upgrade one of three readable systems:
   - Launch Rig: stronger initial throw.
   - Airframe: more lift and control with less drag.
   - Pulse Drive: stronger boost and more fuel.
6. Reach the gate to unlock the next environment.

## Level plan

- Meadow Run teaches the gesture with forgiving gravity, low wind, and a short
  finish distance.
- Canyon Lift increases distance, drag, terrain height, and gust strength.
- Storm Passage combines the longest goal with stronger deterministic gusts and
  reduced natural lift.

## Non-negotiables

- Original name, art direction, layouts, values, code, and level design. No
  copied assets or source code from the reference.
- Pure deterministic flight math. No `Math.random()` and no frame-rate-dependent
  progression; simulation steps clamp large `dtMs` values.
- Phone-first controls with mouse and keyboard fallbacks.
- Reduced-motion mode removes camera shake and decorative motion without
  changing gameplay outcomes.
- This first pass is development-only at `/dev/skybound-expedition` and stores
  progression only in component memory.
- It does not spend canonical tickets, grant canonical rewards, register as the
  active event, or write to the Island Run store.

## Acceptance evidence

- Unit tests prove deterministic launch/flight, bounded time steps, upgrade
  effects, and increasing level targets.
- Typecheck and production build pass.
- Browser playtest covers pull/release, analog flight steering, boost depletion,
  result settlement, upgrade purchase, relaunch, and level advancement.
- Exact 390×844 capture shows the complete game surface and controls without
  horizontal overflow.

## Budgets

- One 2D canvas renderer and one animation loop.
- Logical canvas remains fixed and CSS-responsive; DPR is capped at 2.
- No remote assets, new dependencies, backend schema, or production event state.
- Physics stays in one pure service so tuning does not require UI rewrites.

## Rollback and next gate

The slice is isolated to the Skybound game folder, its pure flight service and
tests, one development route, and this contract. Remove those additions to roll
back. After Eivind plays the prototype, the next gate is a feel review: tune the
throw curve, steering, camera, landing, upgrade cadence, and level goals before
any ticket or reward integration.

## 2026-08-25 prototype evidence

- Browser playtest completed the full loop: 244m recovery, Launch Rig and
  Airframe purchases, upgraded relaunch, boost-assisted 321m Sky Gate finish,
  Canyon unlock, and Canyon environment load.
- Phone-width browser QA found no horizontal overflow and no console warnings or
  errors from the game.
- Production Vite build passed with only the repository's existing chunk-size
  and mixed-import warnings.
- Island Run architecture guard passed with 0 violations and 3 existing
  allowlisted warnings.
- Full Island Run service suite passed: 1840 tests, 0 failures.
- Repository-wide TypeScript check reaches only the existing Supabase generated
  type incompatibilities; it reports no Skybound files.

## Visual north star and second playable slice

The next pass is governed by two original goal frames under
`docs/visual-references/skybound-expedition/`:

- `skybound-flight-goal-v1.png` sets the target for speed, depth, wind rings,
  salvage trails, readable hazards, the Sky Gate, and sparse flight controls.
- `skybound-hangar-goal-v1.png` sets the target for visible physical evolution
  of the Launch Rig, Airframe, and Pulse Drive on the same craft.

This slice includes deterministic salvage crystals, wind rings, rock hazards,
collision outcomes, richer settlement, stronger live plane evolution, and a
compact flight/result HUD. It explicitly excludes a separate hangar route,
3D conversion, runtime use of the concept images, canonical event tickets, and
canonical reward writes.

Acceptance evidence adds collision/scoring tests and one phone playthrough that
collects salvage, clears a ring, encounters or visibly avoids a hazard, upgrades
the craft, and reaches or retries the Sky Gate without console errors.

## 2026-08-25 second-slice evidence

- Both goal frames were generated, reviewed, and stored as design-only visual
  references; no generated pixels are used by the runtime.
- A phone-width browser playthrough recovered at 315m with 6 salvage, 2 wind
  rings, 1 hazard hit, and a best streak of 10, settling 395 prototype salvage.
- Launch Rig, Airframe, and Pulse Drive were each upgraded to Level 1 and their
  physical modules changed on the same craft before the next launch.
- The flight HUD, settlement breakdown, course-object resolution, and upgrade
  loop produced no browser console warnings or errors.
- Production Vite build passed with only the repository's existing chunk-size
  and mixed-import warnings.
- Island Run architecture guard passed with 0 violations and 3 existing
  allowlisted warnings.
- Full Island Run service suite passed: 1844 tests, 0 failures.
- `git diff --check` passed.

## Approved Pilot Academy direction

Eivind approved replacing the generic course ladder with **Skybound Pilot
Academy**. The event teaches flight through five aircraft ranks while retaining
the original pull, release, fly, earn, and upgrade foundation:

1. Cadet — toy glider and slingshot launch.
2. Trainee — single-prop academy trainer.
3. Aviator — jet trainer.
4. Elite — storm interceptor.
5. Ace — original non-weaponized fighter-shaped jet with gold trim.

Each rank is planned as three exercises plus one mini exam. The current bounded
slice implements the complete Cadet chapter, shows the five-rank destination,
and ends with a Prop Trainer promotion reveal. Later ranks remain visibly locked
and are not simulated yet.

### Cadet slice

- Launch Drill teaches pull strength and flight energy.
- Precision Gates teaches ring-centre lines.
- Weather Control introduces gusts and the Stabilizer.
- Cadet Exam combines distance, rings, and hazard control.
- Two of three standards pass a lesson; all three earn an Ace result.
- Exactly one prototype event ticket is spent when a valid launch is released.
  Aiming, upgrades, navigation, and an invalid short pull never spend a ticket.
- Every completed attempt banks prototype salvage even when the lesson is not
  passed. Repeated failure must not erase progress.
- The three global upgrade tracks carry forward: Launch System, Airframe
  Control, and Power Unit.
- Boost trades fuel for speed. Stabilizer trades forward speed for precision,
  vertical damping, and wind resistance; rings replenish some stability.

### Authority boundary

This remains development-only at `/dev/skybound-expedition`. The ticket wallet,
lesson progress, salvage, academy XP, promotion, medal, and certificate are
in-memory prototype state. This slice must not create another active event,
write `minigameTicketsByEvent`, claim canonical rewards, or persist gameplay
from React. Production integration requires a later canonical action-service
slice after the Cadet experience is accepted.

### Cadet acceptance evidence

- Pure tests cover ticket spend timing, lesson sequencing, two-of-three passes,
  Ace results, exam promotion, and deterministic Stabilizer physics.
- A phone-width playthrough launches with one ticket, uses Boost and Stabilizer,
  passes exercises, completes or retries the exam, and sees the Prop Trainer
  promotion without horizontal overflow or console errors.
- Production build and Island Run architecture guard remain green.

## 3D flight pivot — 2026-08-25

The side-on canvas prototype is superseded. The active Cadet slice now uses a real Three.js chase camera and moves the aircraft forward through a persistent world-space course.

- Flight axes: forward distance, lateral steering, altitude, pitch, and bank.
- World depth: rolling ground blocks, side islands, clouds, runway, Academy slingshot, spatial rings, salvage, hazard spires, and a finish gate.
- Collision response: hazards remove integrity, shove and bank the aircraft, reduce speed, and detach a deterministic named part.
- Destruction response: the third damaging impact or a hard ground crash detaches the remaining flight surfaces; each fragment falls, spins, bounces, and stays under the single presentation runtime.
- Aircraft contract: the Cadet toy glider exposes named pivots, low-cost collider metadata, a boost socket, and stable destruction groups through `root.userData.sculptRuntime`.
- Controls: drag in two dimensions to steer/climb/dive; Boost trades fuel for thrust; Stabilizer trades speed and reserve for damping and wind resistance.
- Progression shell: five visible aircraft ranks, four sequential Cadet drills including the mini exam, two-of-three pass, three-of-three Ace, one ticket charged on valid release, salvage upgrades, and a Trainee promotion reveal.

Current limitation: only the Cadet toy glider and Cadet syllabus are playable. The other four aircraft are progression targets, not implemented models. Canonical event tickets and rewards remain deliberately disconnected until the event slice is approved.

### 3D verification evidence

- Targeted TypeScript compilation passed for the 3D stage, aircraft factory, minigame, flight service, and Academy service.
- Production Vite build passed.
- Island Run service suite passed: 1,850 tests, 0 failures.
- Strict ObjectSculptSpec validation passed.
- Runtime part coverage passed: 15 specified visible components, 0 errors, 0 warnings (plus the expected transform-only root note).
- Local review route: `http://127.0.0.1:5176/dev/skybound-expedition`.

## Production integration slice — 2026-08-26

This section supersedes the earlier prototype-only authority boundaries. The
development route remains available for isolated flight-feel work, while the
same game now also launches as `skybound_expedition`, the fifth canonical timed
event. All five aircraft ranks and all 20 exercises/checkrides are playable.

## Flight-feel correction gate — 2026-08-27

Player review scored the first integrated 3D feel below the acceptance bar in
three related areas. This correction pass is not accepted until all three are
observable in the same phone-width playthrough:

- Holding the launch gesture physically pulls the aircraft backward and down,
  stretches two live launcher bands, brightens a tension field, flexes the
  wings/control surfaces, and adds a restrained full-power tremble. Release
  must snap that stored pose into forward flight.
- Ground classification has a real launch grace period. A brief early runway or
  terrain brush produces a recoverable skim; only a slow controlled touchdown,
  a genuinely hard impact, total integrity loss, or the real exam gate ends the
  sortie. Every terminal state records its reason.
- Runtime aircraft presentation uses mesh geometry, not a chase-view raster.
  All five aircraft inherit named aileron, elevator, rudder, wing-flex, damage,
  and effect pivots. Energetic level flight settles into smooth surfaces;
  low-energy, extreme-attitude, or damaged flight produces deterministic
  flutter and shudder. The prop trainer also drives a real propeller pivot.

The existing concept PNG remains a design reference only. The compatibility
renderer may draw a procedural vector silhouette when WebGL is unavailable,
but it may not load or draw the aircraft artwork.

### Canonical player loop

1. Earn a ticket from the shared Island Run event economy.
2. Open Skybound Academy without spending anything.
3. Select an unlocked lesson and make a valid launch, spending exactly one
   ticket from the active event runtime id.
4. Fly the authored 3D course, collide, recover or crash, and settle once.
5. Bank scored salvage, improve Launch System / Flight Controls / Boost Drive,
   and retry or advance.
6. Pass three drills and a checkride in each rank to evolve from Toy Glider to
   Goldwing Fighter. The first checkride pass awards its declared shared-ticket
   refill; the final checkride awards Gold Wings and the certificate.

### Authority and persistence

- React owns presentation only. Launch, settlement, shared-ticket mutation,
  reward-bar credit, and upgrade spend route through
  `islandRunSkyboundAcademyActions.ts`.
- Academy state is keyed by the active event runtime id under
  `skyboundAcademyProgressByEvent` in `IslandRunGameStateRecord` and persists to
  `island_run_runtime_state.skybound_academy_progress_by_event`.
- A bounded settled-attempt ledger makes flight settlement idempotent across
  duplicate callbacks and hydration/conflict merges.
- Valid launch costs one shared event ticket. Opening, aiming, an invalid short
  pull, changing lessons, and upgrading cost no ticket.
- A normal pass contributes four points to the one canonical event reward bar;
  an Ace contributes eight. Failed flights still bank their scored salvage but
  do not advance the reward bar.
- The optional purchase route reuses the generic ten-ticket Checkout Session
  SKU with `skybound_expedition` metadata; it adds no separate Stripe product or
  payment authority in this slice.

### Production acceptance gates

- Rotation templates, event engine, modal grid, banner, Arena catalog, debug
  override, launcher descriptor, and ticket routing all recognize Skybound.
- Service tests prove exact ticket spend, ticketless no-op, event-wallet
  isolation, Ace reward credit, duplicate settlement protection, first-exam
  refill, rank promotion, and persistent upgrade spend.
- Full Island Run service suite, architecture guard, production build, database
  migration validation, and phone-width browser playtest must pass before the
  integration checkpoint is handed off.
- No Supabase migration, Edge Function, Stripe price, or production deployment
  is applied by this local integration slice.

### Rollback

Remove the fifth rotation template and Skybound route, delete the event action
service and event-scoped state field, and reverse the additive JSONB migration.
The isolated `/dev/skybound-expedition` prototype remains usable because its
local save path is intentionally separate from canonical event mode.

### 2026-08-26 integration evidence

- Full Island Run service suite passed: 1,873 tests, 0 failures.
- New coverage includes shared-ticket wallet isolation, ticketless no-op,
  simultaneous-launch serialization, Ace reward-bar credit, idempotent flight
  settlement, exam ticket refill, rank promotion, upgrade persistence, and
  generic Checkout SKU routing.
- Island Run architecture guard passed with 0 violations and the same 3
  allowlisted legacy warnings.
- Production Vite build passed with the repository's existing chunk-size and
  mixed-import warnings only.
- `git diff --check` passed.
- The additive migration was generated with Supabase CLI 2.116.0. Local
  execution remains pending because no Supabase Postgres stack is running on
  port 54322; no remote database or Edge Function change was applied.
- The local play server returns HTTP 200 at
  `http://127.0.0.1:5199/dev/skybound-expedition`. Final human phone playfeel
  review of this integration checkpoint remains the next visual gate.

## Flight-feel Gauntlet loop 2 — 2026-08-27

Eivind rated the current playable experience **2/10** after the first launch,
aircraft-motion, and ground-contact correction. The progression architecture is
not the active risk in this loop: the ticket wallet, five ranks, twenty lessons,
upgrade economy, reward-bar settlement, models, and level themes already exist.
The failed gate is the connection between the player's hand and the aircraft.

### Baseline critique

| Gate | Baseline | Observed failure |
| --- | ---: | --- |
| Launch anticipation | 4/10 | The mesh and bands react, but a quick launch can skip the readable charge beat. |
| Aircraft readability | 3/10 | The procedural aircraft is real geometry, but the chase framing leaves it too small to read under pressure. |
| Flight control | 2/10 | Pointer input is absolute to the canvas, so control depends on where the gesture begins. |
| World speed/depth | 4/10 | Perspective props exist, but camera FOV and air-rush feedback do not scale clearly with energy. |
| Collision/recovery | 3/10 | Physics can recover, but the HUD does not tell the pilot whether the craft is skimming, stalling, or damaged. |
| Progression feedback | 5/10 | The five-rank shell and rewards are visible, but this cannot compensate for weak flying. |

### Bounded correction slice

1. Replace absolute pointer steering with a relative, dead-zoned virtual flight
   stick whose anchor, displacement, and command are visible while held.
2. Classify every live frame as smooth flow, climb, dive, ground effect, stall,
   or airframe strain and show speed, altitude, and accumulated smooth-flight
   time without obscuring the course.
3. Make smooth flight a deterministic scored behavior; make low-energy stall
   readable and recoverable rather than an invisible early ending.
4. Drive chase distance, FOV, bank roll, and air-rush streaks from actual speed,
   boost, and attitude in both WebGL and compatibility renderers.
5. Add a bounded impact vignette and recovery instruction when a hazard hit is
   registered; preserve the existing deterministic destruction and terminal
   reasons.
6. Give the one-tap full-power fallback a visible charge sequence before it
   releases so it demonstrates the same anticipation as a manual pull.

### Acceptance evidence

- Pure tests prove virtual-stick dead zone/direction, deterministic flight-mode
  classification, smooth-flight accumulation, scoring value, and recoverable
  stall/skim behavior.
- At 390×844, the stick follows the held pointer, climb/dive/bank commands read
  correctly, and the plane can recover after a low-energy or terrain warning.
- A browser replay shows visible speed-dependent framing, a legible aircraft,
  live condition telemetry, and no abrupt result while the aircraft remains in
  valid flight.
- Targeted tests, the full Island Run service suite, architecture guard,
  production build, `git diff --check`, and browser console remain clean.

### Rollback and stop rule

This slice may add presentation state and pure transient flight metrics; it may
not create another persistence owner or bypass the canonical event actions.
Rollback is limited to the flight-feel helper, transient fields, stage feedback,
and CSS. Stop and revise the interaction model if the 390×844 replay still
requires screen-position steering or if telemetry hides the approaching course.

### Loop 2 evidence and decision

- Relative input now anchors where the pointer goes down, applies an 8% dead
  zone, limits displacement to an 82px-equivalent radius, and renders the live
  stick position. A first-flight coach explains climb, dive, and bank.
- Live telemetry classifies smooth flow, climb, dive, terrain lift, stall, and
  airframe strain. It exposes airspeed, altitude, energy, and accumulated flow
  time. Smooth flight adds at most 120 salvage to settlement.
- Low-energy nose-high flight now produces a deterministic recoverable stall.
  The first two severe terrain contacts become visible recovery skims; a third
  severe impact may still destroy the craft. Hazard impacts retain integrity
  loss, named-part detachment, camera shake, and terminal integrity failure.
- The one-tap launch now shows four charge poses over 390ms before release.
  WebGL chase framing moves 1.8 world units closer for Cadet, scales the model
  from 0.9 to 1.02, widens FOV from 62 toward 76 with speed/boost, rolls with
  bank, and drives thirty camera-space air-rush streaks. The software fallback
  received equivalent energy-based FOV, streak, and aircraft-scale tuning.
- Browser evidence is stored at
  `.img2threejs/skybound-cadet/renders/2026-08-27-launch-charge-v2.png` and
  `.img2threejs/skybound-cadet/renders/2026-08-27-flight-feel-v2.png`.
- The phone-width replay had no horizontal overflow and no browser warnings or
  errors. The same unassisted full-power launch that previously hard-crashed at
  304/360m recovered from terrain contact and reached 360/360m.
- Full Island Run service suite passed: 1,880 tests, 0 failures. Production Vite
  build passed with the existing chunk/import warnings. Architecture guard
  passed with 0 violations and the same 3 allowlisted warnings. Full TypeScript
  still stops only on the repository's pre-existing Supabase generated-type
  incompatibilities and reports no Skybound error. `git diff --check` passed.

### Honest re-score

| Gate | Before | After loop 2 | Decision |
| --- | ---: | ---: | --- |
| Launch anticipation | 4/10 | 7/10 | Pass for this slice |
| Aircraft readability | 3/10 | 5/10 | Improved, still below final bar |
| Flight control | 2/10 | 6/10 | Pass for relative-control slice |
| World speed/depth | 4/10 | 6/10 | Improved, needs real-device WebGL review |
| Collision/recovery | 3/10 | 7/10 | Pass for abrupt-ending correction |
| Progression feedback | 5/10 | 5/10 | Intentionally unchanged this loop |

**Gauntlet decision: revise, not complete.** The interaction slice passed, but
the in-app test browser used the procedural software 3D fallback and therefore
cannot prove final WebGL aircraft shading, moving-part readability, or orbit
volume. The next highest-value loop is a real-device/WebGL aircraft-and-world
fidelity pass, followed by authored level-specific course moments rather than
additional shell UI.

## World-identity Gauntlet loop 3 — 2026-08-27

The next bounded slice addresses the largest remaining visual/gameplay gap:
the five ranks currently share one floating-island language with palette
changes. A player should recognize the current Academy range in the first
second of flight without reading the HUD.

### Execution contract

- **Meadow Campus:** green training islands, Academy pylons, striped practice
  balloons, and moving wind turbines establish a friendly first-flight school.
- **Coastal Airfield:** a blue ocean/cloud deck, lighthouse beacons, sea stacks,
  and a large coastal arch create lower, broader horizon scale.
- **Sunset Canyon:** red mesas, rock arches, and translucent thermal columns
  make altitude exchange and close passes visually legible.
- **Thunder Range:** dense thunderheads, rain, lightning beacons, and dark range
  spires create a hazardous storm corridor without hiding course objects.
- **Goldwing Stratosphere:** a dark upper sky, stars, aurora ribbons, and orbital
  navigation markers create a visibly final, high-altitude exam world.
- Passing close to a hazard without colliding awards one deterministic
  **near-miss** and streak point. It scores once per hazard and remains transient
  flight state; it does not create a currency or persistence owner.
- Both WebGL and the compatibility renderer must express the same world identity
  and near-miss feedback. Runtime art remains procedural and deterministic, with
  no remote assets or new dependency.

### Acceptance evidence

- Pure tests prove a near-miss scores once, a collision does not also count as a
  near-miss, and the bonus raises settlement without bypassing canonical actions.
- Each of the five world presentations has a deterministic identity contract and
  at least three named visual anchors.
- Phone-width replay shows the Meadow identity, readable fly-by scale, and live
  near-miss feedback without horizontal overflow or browser console errors.
- Full Island Run service suite, architecture guard, production build, and
  `git diff --check` remain green.

### Authority, rollback, and stop rule

This slice may add presentation configuration, procedural world geometry,
transient near-miss fields, score value, and HUD feedback. It may not change
ticket ownership, reward-bar authority, lesson unlocks, upgrade persistence, or
database shape. Rollback is limited to those presentation and transient-flight
changes. Revise again if two unlocked levels still read as the same place when
their HUD is hidden, or if landmarks obscure the authored rings and hazards.

### Loop 3 evidence and decision

- One shared deterministic presentation map now gives all five ranges a unique
  signature and four authored anchors: Meadow turbines/balloons/towers, Coast
  lighthouse/sea stacks/arch, Canyon mesas/thermals/rock arch, Storm
  thunderheads/beacons/spires, and Stratosphere stars/aurora/orbital markers.
- WebGL geometry includes moving rotors, lighthouse beams, rising thermals,
  intermittent lightning, aurora motion, orbital markers, aircraft navigation
  lights, and speed/bank-driven wingtip vapour. The compatibility renderer
  expresses the same landmark families plus storm rain and procedural 3D
  aircraft trails; neither renderer loads a runtime concept image.
- A hazard proximity band now awards one near-miss per crossed hazard, extends
  the streak, and adds 25 bounded salvage points. Direct collision takes
  precedence and cannot also award the near-miss. The field remains transient
  sortie state and is settled through the existing canonical action.
- The phone replay reached 360/360m, naturally earned one near-miss with zero
  impacts, displayed the result breakdown, had no horizontal document overflow,
  and produced no browser warnings or errors. Evidence is stored at
  `.img2threejs/skybound-cadet/renders/2026-08-27-world-identity-v3.png` and
  `.img2threejs/skybound-cadet/renders/2026-08-27-near-miss-result-v3.png`.
- Full Island Run service suite passed: 1,882 tests, 0 failures. Architecture
  guard passed with 0 violations and the same 3 allowlisted warnings. Production
  Vite build passed with existing chunk/import warnings only. Repository-wide
  TypeScript still stops only on the known generated Supabase/Postgrest type
  incompatibilities and reports no Skybound error. `git diff --check` passed.
- The isolated-aircraft Tier-1 diagnostic correctly failed when given the full
  phone game frame (IoU 0.127, aspect delta 0.242, scale delta 0.276). That is an
  apples-to-oranges capture, so it is not recorded as model acceptance. A fixed
  isolated aircraft view plus meaningful WebGL orbit views remain mandatory.

| Loop 3 gate | Score | Decision |
| --- | ---: | --- |
| Meadow world identity | 7/10 | Pass for compatibility-renderer slice |
| Other four world contracts | 5/10 | Implemented, not yet live-play reviewed |
| Fly-by scale and atmosphere | 7/10 | Improved with landmarks, rain, stars, vapour |
| Near-miss risk/reward feedback | 7/10 | Pure tests and live replay passed |
| Aircraft readability | 6/10 | Improved lights/trails; still lacks WebGL orbit proof |
| Real-device/WebGL evidence | 3/10 | Still the blocking visual gate |

**Gauntlet decision: refine-code.** This is a substantive world/gameplay
improvement, not completion. The next loop should capture isolated multi-angle
WebGL aircraft evidence and then play one unlocked lesson in each promoted range
to tune landmark scale and occlusion from actual motion.

## Evolution-loop Gauntlet loop 4 — 2026-08-27

Eivind clarified that the current complete-aircraft steering course represented
the destination, not the opening loop. Each rank must begin with a barely
airworthy fuselage, pay distance earnings into visible physical construction,
and teach the player to find a sensitive speed/pitch/bank flow envelope before
the checkride.

### Vertical slice and authority

- All five promoted ranks now start at assembly stage 0 and share one canonical
  four-installation arc: first wing, second wing, tail/control pack, then the
  rank-specific propulsion/launch package.
- Lesson 1 remains the fuselage flight test. Lesson 2 requires the first wing,
  Lesson 3 requires both wings, and the checkride requires all four parts as
  well as the existing sequential lesson completion.
- Part purchase spends earned Academy salvage through
  `installSkyboundAircraftPart`; React owns no duplicate economy or progression
  state. Old saves infer completed assembly from already-completed lessons.
- Incomplete stages materially change deterministic flight: launch energy,
  lift, pitch/bank authority, stability, and boost availability scale with the
  installed parts. A one-wing aircraft has a persistent asymmetric bank and
  lateral bias.
- Both WebGL and compatibility renderers remove the uninstalled physical wing,
  tail, hook/drive, propeller, intake, coil, and trim nodes. The hangar strip
  names the next part, its cost and benefit, and rebuilds the same aircraft.

### Flow and economy contract

- Stable altitude clearance, near-level pitch, shallow bank, adequate assembly,
  and an aircraft-relative speed corridor charge a deterministic Flow meter.
  At 62% the craft enters Flow Lock, retains target energy, steadies its vertical
  velocity, brightens the HUD/airframe aura, and strengthens speed lines and
  wing vapour. Leaving the envelope drains the meter instead of ending the
  sortie abruptly.
- Flight speed is presented in km/h so the useful corridor reads near the
  intended 200 mark. Boost is unavailable until the propulsion package exists,
  making its timing part of the complete-aircraft skill.
- Settlement now exposes distance, flow, course, finish/landing/altitude bonus,
  and collision deduction components. Distance is the dependable base income;
  failed lessons still bank it. Displayed goal distance is capped at the course
  finish, and terrain skims count as bounded damaging impacts in standards.

### Evidence and decision

- Full Island Run service suite passed: 1,885 tests, 0 failures. New tests cover
  four-stage assembly pricing/persistence, canonical salvage deduction, lesson
  gates, incomplete-airframe physics, boost lockout, and Flow scoring.
- Production Vite build passed with existing chunk/import warnings only.
  Architecture guard passed with 0 violations and the same 3 allowlisted legacy
  warnings. Full TypeScript reports only the repository's pre-existing generated
  Supabase/PostgREST errors and no Skybound file.
- Phone-width compatibility-renderer replay started at Build 0/4, flew a 164m
  fuselage test, banked salvage, installed a visibly asymmetric first wing, then
  completed all four Cadet installations. A complete unassisted glider reached
  360/360m; the core crest objective correctly remained a player-skill gate.
  Browser console showed no warnings or errors.

**Gauntlet decision: pass the evolution-loop slice, continue fidelity.** The
missing-body-to-complete-plane economy and Flow contract now exist generically
for every rank. Remaining quality work is authored launch-facility animation per
rank, live WebGL multi-angle proof for all five completed/incomplete aircraft,
and human control tuning of the Flow corridor on a real device.

## Launch-facility and feedback Gauntlet loop 5 — 2026-08-28

The next fidelity gap was that every aircraft still appeared to leave from the
same generic sling deck and the important flight-state changes were mostly
numbers. This loop gives each school rank its own launch technology and makes
Flow, impact, and terminal outcomes readable without studying the telemetry.

### Facility and feedback contract

- One shared deterministic facility map now binds all five aircraft to distinct
  launch hardware: Cadet Sling Yard, Coastal Short Field, Vortex Boost Strip,
  Tempest Carrier Deck, and Goldwing Magnetic Vault. Deck size, energy, colour,
  instruction, and three identifying visual cues progress with rank.
- WebGL and compatibility renderers consume the same map. The WebGL path adds
  physical sling arms and bands, hangar/runway equipment, boost rails, carrier
  catapult coils, or magnetic arches; powered hardware reacts to launch charge.
- Entering Flow Lock now produces a dedicated gold stage treatment, a short
  callout, and reward audio. Impacts report remaining integrity, while terminal
  crashes identify terrain, hard-impact, or integrity failure instead of ending
  without explanation. WebGL impacts add bounded sparks and smoke.
- Terminal result cards now distinguish a completed course from a crash and
  retain the existing canonical settlement breakdown. Ticket, salvage, XP,
  progression, and reward-bar ownership are unchanged.

### Evidence and decision

- Full Island Run service suite passed: 1,886 tests, 0 failures. The added
  regression requires five unique facility identities and kinds, exactly three
  authored cues per facility, and increasingly capable deck lengths.
- Production Vite build passed with existing chunk/import warnings only.
  Architecture guard passed with 0 violations and the same 3 allowlisted legacy
  warnings.
- A browser-controlled Cadet replay spent exactly one ticket, responded to a
  deliberately excessive climb and subsequent dive, continued to the full
  360/360m exam gate, banked 416 salvage and 55 XP, and rendered the terminal
  breakdown. The browser console produced no warnings or errors. Evidence is
  saved at `/private/tmp/skybound-cadet-sling-yard-v5.png`,
  `/private/tmp/skybound-live-flight-v5.png`, and
  `/private/tmp/skybound-lesson-result-v5.png`.
- The Cadet Sling Yard was live-reviewed in motion. The four promoted facilities
  are implemented in both renderers and covered by pure contracts, but have not
  yet passed promoted-rank visual replay or real-device WebGL orbit review.

| Loop 5 gate | Score | Decision |
| --- | ---: | --- |
| Cadet launch anticipation | 7/10 | Facility reads clearly; charged-band motion still needs a slower manual pull replay |
| Full-course pacing and terminal result | 8/10 | Live 360m replay passed without abrupt termination |
| Flow/impact/crash explanation | 7/10 | Implemented; edge-state live capture remains incomplete |
| Five-rank launch evolution | 6/10 | Shared code and tests passed; four visual replays remain |
| WebGL aircraft and real-device proof | 3/10 | Still the blocking visual gate |

**Gauntlet decision: pass this facility slice, continue visual proof.** The game
now communicates an escalating pilot-school launch programme and a complete
sortie has a readable beginning, flight state, and result. The next loop must
expose a safe promoted-rank preview or fixture, replay all five facilities in
motion, and tune the manual pull/Flow corridor on an actual touch device before
raising the overall visual score beyond the current mid-build range.

## Ground-school progression Gauntlet loop 6 — 2026-08-28

Eivind corrected two foundational rules: the first rank should be a grounded
beginner lesson rather than a late-game floating-sky course, and touching the
ground must end every attempt. The previous recoverable-terrain-skim rule was
therefore invalid even when it made unassisted runs feel forgiving.

### Curriculum and terrain contract

- Cadet now owns Meadow Ground School for all four lessons, Trainee owns the
  Coastal Airfield, Aviator owns Canyon Lift, Elite owns Storm Passage, and Ace
  owns Goldwing Stratosphere. No early-rank exam jumps into the next rank's
  world.
- The five worlds expose monotonically increasing target altitude bands and
  finish-gate heights: 5–22m, 16–42m, 34–72m, 52–96m, and 78–132m. Launch
  energy and starting clearance progress with the same curriculum.
- Meadow course objects were rebuilt into a low 5–22m corridor. Its WebGL and
  compatibility scenes replace the cloud sea and floating start/finish islands
  with a continuous rolling practice field, boundary lines, distance markers,
  grounded Academy towers, low gates, and sparse overhead clouds.
- Ground contact resolves before goal completion. A slow, level, low-speed
  contact after real airborne time is a controlled landing; every other terrain
  contact immediately becomes a ground-impact crash, breaks the airframe, and
  ends the sortie. There is no launch grace or recoverable skim.
- Ground impact increments the displayed impact count, applies the canonical
  collision deduction, and fails First Hop's Perfect Safety standard. A small
  minimum salvage settlement remains so repeated failed throws can still fund
  the first physical wing.

### Evidence and decision

- Full Island Run service suite passed: 1,887 tests, 0 failures. Added coverage
  requires rank-to-world curriculum consistency, rising altitude bands and
  finish gates, a low Meadow object corridor, first-contact termination, and
  the controlled-touchdown versus crash distinction.
- Architecture guard passed with 0 violations and the same 3 allowlisted
  legacy warnings. Production Vite build passed with existing import/chunk-size
  warnings only.
- Fresh-port browser replay began from Build 0/4 on a visibly grounded field.
  An unassisted bare-fuselage launch spent one ticket, travelled 32m, contacted
  grass once, broke apart, and immediately opened the Ground Impact result.
  The corrected result showed one impact, a -20 deduction, failed Perfect
  Safety, and banked the bounded 45-salvage floor. Browser console had no
  warnings or errors.
- Evidence is saved at `/private/tmp/skybound-ground-school-v6.png` and
  `/private/tmp/skybound-ground-impact-v6.png`.

| Loop 6 gate | Score | Decision |
| --- | ---: | --- |
| Grounded beginner-world readability | 8/10 | Live field pass clearly reads as ground school |
| Ground-contact authority | 9/10 | First contact terminates before finish and scores correctly |
| Rank-by-rank curriculum | 8/10 | Pure progression contract passes for all 20 lessons |
| Beginner upgrade motivation | 7/10 | Failure banks bounded salvage toward the first wing |
| Promoted-rank visual proof | 3/10 | Four later worlds still need live curriculum replay |

**Gauntlet decision: pass Ground School, continue toward 10/10.** The opening
fantasy and failure rule now match the intended game. The next fidelity loop
should add a development-only rank/assembly preview, visually replay every
world, and tune each altitude band, ground approach, and aircraft control
response from real motion rather than static contracts alone.

## Academy evaluator and energy-model Gauntlet loop 7 — 2026-08-28

This loop made the complete five-rank curriculum directly testable and corrected
two misleading progression signals found during live replay: later aircraft
shared too much of the toy-glider wing silhouette, and the strongest Goldwing
could generate free energy until it exceeded 450 km/h without pilot input.

### Evaluator, aircraft, and world contract

- The development route now exposes a disposable Academy Evaluator for rank,
  lesson, aircraft build stage, and upgrade level. It creates an in-memory
  career with the exact prerequisites required for the requested stage, grants
  test-only tickets and salvage, updates the URL for reproducible scenarios,
  and never reads or writes the production Academy save.
- Each aircraft now owns a different physical wing planform: straight toy wing,
  trainer wing, swept jet wing, deep interceptor delta, and broad Goldwing
  delta. Propeller, intake, storm-coil, twin-fin, and gold-tip evolution remains
  part of the same real Three.js hierarchy.
- Meadow, Coast, and Canyon use continuous terrain under their launch course;
  the Storm carrier and Goldwing stratosphere remain deliberately suspended
  advanced worlds. Browser replay confirmed the grass sling yard, coastal short
  field, canyon boost strip, and high-altitude Goldwing course as distinct
  stages rather than one sky backdrop with colour swaps.
- Course objects are clamped into the curriculum's displayed altitude band and
  duplicate object identities are rejected. This keeps rings, salvage, and
  hazards physically reachable within what the instructor tells the player to
  practise.

### Flow and flight-energy correction

- Flow target speed now advances with the aircraft and installed upgrades:
  125 km/h for the base toy glider through 215 km/h for the base Goldwing, with
  the fully upgraded Goldwing capped at the intended 250 km/h target.
- Launch energy uses a bounded rank contribution instead of multiplying the
  entire launch impulse by late-rank speed tuning. Lift now acts perpendicular
  to the velocity vector, and overspeed drag removes excess energy, so stronger
  airframes improve control and retention without becoming perpetual engines.
- A live max-rank replay launched at 296 km/h and reached 317 km/h after four
  seconds without boost, compared with the previous 455+ km/h runaway. The HUD
  correctly coached level flight near 250 km/h; reaching and holding Flow still
  requires player pitch control.

### Evidence and decision

- Full Island Run service suite passed: 1,890 tests, 0 failures. New regressions
  cover evaluator isolation/prerequisites, five unique wing silhouettes, world
  terrain progression, unique in-band course objects, the Flow-speed ladder,
  and a bounded unassisted max-rank flight.
- Focused TypeScript compilation passed. Architecture guard passed with 0
  violations and the same 3 allowlisted legacy warnings. Production Vite build
  passed with existing mixed-import and chunk-size warnings only.
- Browser replay produced no console errors. Evidence is saved at
  `/private/tmp/skybound-coastal-airfield-v7.png`,
  `/private/tmp/skybound-canyon-runway-v7.png`, and
  `/private/tmp/skybound-goldwing-flow-v7.png`.

| Loop 7 gate | Score | Decision |
| --- | ---: | --- |
| Five-rank testability | 9/10 | Reproducible, non-persistent evaluator passed |
| Curriculum/world progression | 8/10 | First three grounded; two advanced suspended worlds |
| Aircraft evolution readability | 7/10 | Five structural wing families; fine-detail polish remains |
| Flow/energy integrity | 8/10 | Runaway removed and rank-relative targets verified |
| Final environment art | 6/10 | Strong identities, still visibly procedural and mid-polish |

**Gauntlet decision: pass the evaluator and energy slice, continue art/control
polish.** The event is no longer a single late-game steering course: it exposes
the intended fuselage-to-fighter school ladder and can be replayed at every
construction state. The next loop should improve terrain landmark composition,
tune touch steering into Flow on a real device, and add more aircraft motion
feedback at stall, trim, and sustained smooth flight.

## Flight director and world-depth Gauntlet loop 8 — 2026-08-28

This loop turned the energy model into a learnable flying exercise and removed
the last floating-platform presentation from the first three school worlds,
including the compatibility canvas used when WebGL is unavailable.

### Flight instruction and moving-airframe contract

- A deterministic flight director now compares current speed, pitch, bank,
  velocity angle, terrain clearance, and Flow charge with the aircraft's real
  rank-relative target. It gives one prioritized action: climb now, level wings,
  lower the nose, ease forward, climb then level, centre the marker, or hold the
  line after Flow locks.
- The chase HUD now has a bank-responsive artificial horizon, target brackets,
  a velocity marker, target speed, and signed speed delta. It waits until the
  opening drag tutorial has cleared, so the two instruction systems do not
  compete for the same centre-screen space.
- Completed aircraft retract real landing-gear struts after takeoff. Smooth
  Flow flight has a settled control-surface pose distinct from ordinary trim,
  while struggling flight retains visible wing and control-surface flutter.
- New pure-service coverage verifies director mode priority and alignment.
  Model coverage verifies that the trainer's Flow pose is distinct and that
  the gear nodes physically rotate into the airframe rather than merely hiding.

### Continuous travel worlds

- Meadow, Coast, and Canyon now anchor landmarks to their sampled ground
  height. Coast adds a reclaimed central field with two sand shoreline ribbons;
  Canyon adds a flyable floor with repeated side ridges and red-rock depth.
- The software renderer now follows the same continuous-terrain contract,
  palette, shoreline, ground-anchored landmarks, lane guides, and distance
  markers. Floating-island generation is disabled outright for those worlds.
- A clean-server browser replay confirmed that Coast and Canyon now retain a
  visible ground plane from the launch facility to the horizon. Storm and
  Stratosphere intentionally keep their suspended advanced-course fantasy.

### Evidence and decision

- Full Island Run service suite passed: 1,892 tests, 0 failures. Focused
  TypeScript compilation passed. Architecture guard passed with 0 violations
  and the same 3 allowlisted legacy warnings.
- Production Vite build passed with the repository's existing mixed-import and
  large-chunk warnings only. Skybound remains a separately emitted event chunk.
- Live browser replay launched the Aviator jet into Canyon. After the opening
  coach cleared, the director correctly changed to LOWER THE NOSE as the jet
  climbed above its target band and fell 63 km/h below its 196 km/h Flow target.
  The ground-impact end state was also replayed during the loop; contact ended
  the sortie and displayed the Ground Impact result instead of timing out.
- Browser console produced no warnings or errors. Evidence is saved at
  `/private/tmp/skybound-coast-grounded-v8.png`,
  `/private/tmp/skybound-canyon-grounded-v8.png`, and
  `/private/tmp/skybound-flight-director-v8.png`.

| Loop 8 gate | Score | Decision |
| --- | ---: | --- |
| Learnable Flow control | 8/10 | One prioritized cue plus spatial marker teaches the correction |
| Grounded world continuity | 8/10 | Coast and Canyon now travel over continuous authored terrain |
| Aircraft motion feedback | 8/10 | Gear, Flow trim, struggle, boost, and damage have distinct states |
| Compatibility/WebGL parity | 8/10 | Same curriculum and terrain identity survive without WebGL |
| Final environment art | 7/10 | Strong procedural composition; bespoke asset polish remains |

**Gauntlet decision: pass the flight-instruction and world-depth slice, continue
toward 10/10.** The core loop now teaches why a sortie succeeds or loses energy,
and the first three ranks visually progress through grounded school worlds. The
next fidelity loop should tune sustained touch control on a real phone, deepen
the obstacle/landing missions, and replace the broadest procedural landmarks
with bespoke production assets and sound.

## Distinct lesson objectives Gauntlet loop 9 — 2026-08-28

This loop preserved the five-rank, twenty-lesson Academy structure while making
named lessons demand their named skill. It also exposed those requirements live
instead of revealing them only after a sortie ended.

### Curriculum and evaluation contract

- The event contains exactly 20 lessons: five aircraft ranks with three drills
  and one exam each. The five worlds remain Meadow, Coast, Canyon, Storm, and
  Stratosphere; a world is a rank environment, while each lesson is a separate
  unlock, ticketed attempt, evaluation, and recorded completion.
- Lesson standards now support sustained Flow and controlled landing in
  addition to distance, rings, salvage, and impact limits. These remain pure
  Academy evaluation rules and add no React gameplay authority.
- Cadet Field Crosswind requires 3s Flow, Trainee Energy Turns requires 4s,
  Elite Crosswind requires 6s, and Ace Supersonic Gates requires 8s. Their
  starred core skill can no longer be passed through passive distance and
  safety alone.
- Trainee Landing Pattern now requires reaching the 520m landing zone and then
  making a controlled touchdown before the 580m final marker. Flying through
  the goal without landing fails the core skill. Gold Formation now requires
  collecting the twelve ceremonial crests rather than treating it as another
  ring lesson.

### Live mission checklist

- Every sortie now displays `LESSON n/20 · LIVE` with three updating standards.
  The required core skill has a gold star, completed standards turn green, and
  progress uses skill-specific units such as metres, Flow seconds, impacts, or
  `LAND SAFELY` / `TOUCHDOWN`.
- The checklist occupies the upper-right instrument area below salvage/ring/
  integrity pills. It stays separate from the centre flight director and the
  upper-left telemetry block, preserving the chase-camera play window.

### Evidence and decision

- Full Island Run service suite passed: 1,893 tests, 0 failures. New coverage
  proves that 3.9s fails the 4s Energy Turns core while 4.0s passes, and that a
  fly-through fails Landing Pattern while the same flight with controlled
  touchdown passes.
- Focused TypeScript compilation passed. Architecture guard passed with 0
  violations and the same 3 allowlisted legacy warnings. Production Vite build
  passed with existing mixed-import and large-chunk warnings only.
- Browser replay confirmed the current lesson briefing, instructor copy, live
  checklist, core-star hierarchy, and correct initial progress for Energy Turns
  and Landing Pattern. Browser console produced no warnings or errors.
- Evidence is saved at `/private/tmp/skybound-flow-mission-v9.png` and
  `/private/tmp/skybound-landing-mission-v9.png`.

| Loop 9 gate | Score | Decision |
| --- | ---: | --- |
| Twenty-lesson progression clarity | 9/10 | Exact lesson number and live requirements are always visible |
| Mechanical lesson differentiation | 8/10 | Flow, landing, rings, crests, distance, and safety now gate different drills |
| Landing-school integrity | 8/10 | Controlled touchdown is an actual pass requirement |
| HUD information hierarchy | 8/10 | Objectives remain readable without obscuring flight control |
| Mission variety depth | 7/10 | More authored formations, landing strips, and storm events remain |

**Gauntlet decision: pass lesson differentiation, continue toward 10/10.** The
Academy now has twenty real progression steps rather than five environments
with repeated scoring labels. The next loop should give the landing zone a
strong physical runway marker, author rank-specific course formations, and add
mission audio/impact/Flow sound feedback before final mobile handling polish.

## Physical landing mission Gauntlet loop 10 — 2026-08-28

This loop turned Trainee Landing Pattern from a result-screen requirement into
an authored course. The runway is now a destination in the world, the approach
teaches an actual energy transition, and an early safe landing can no longer
pass the lesson.

### Runway and approach contract

- Landing Pattern owns a dedicated 520–580m touchdown zone. The last 60m are
  cleared of ordinary salvage and hazards, so the player is never asked to
  dodge an object while flaring.
- Three centreline approach gates descend from 30m to 8m above local terrain.
  The final gate sits below the cruise corridor and trims the aircraft into the
  safe touchdown-speed envelope instead of applying the usual ring boost.
- The runway is segmented over the real Coast terrain with dark pavement,
  edge lights, threshold bars, centreline markings, and cyan approach lamps.
  The WebGL and compatibility renderers use the same physical zone and course
  profile.
- The final airborne exam gate is removed from Landing Pattern. The ground is
  the finish: reach the zone, touch down under 58 km/h with level wings, and do
  it before 580m.

### Handling and instruction corrections

- Live approach coaching appears from 170m out, counts down to the runway, and
  switches to `TOUCHDOWN ZONE` with an explicit 58 km/h speed cue.
- The one-tap instructor launch now uses a shallow 14-degree, 72%-thrust
  departure for this lesson. Manual launch aiming also exposes a lower
  10–32-degree range. Other lessons retain their existing launch calibration.
- A landing-profile dive gets additional elevator recovery authority when the
  pilot pulls up. This preserves the sensitive right/wrong steering model but
  removes the unrecoverable delay found during browser play-testing.
- Lesson evaluation requires both the 520m distance standard and a controlled
  touchdown. An early soft landing and a fly-through now both fail.

### Evidence and decision

- Full Island Run service suite passed: 1,895 tests, 0 failures. New coverage
  verifies an unobstructed runway, three descending centreline gates, flare-gate
  speed reduction, recoverable pull-up authority, and early/fly-through/valid
  landing evaluation cases.
- Architecture guard passed with 0 violations and the same 3 allowlisted legacy
  warnings. Production Vite build passed with the repository's existing
  mixed-import and large-chunk warnings only; Skybound remains separately
  emitted.
- Live browser play reached the authored approach at roughly 360m and exposed
  two real calibration faults before they were fixed: excessive Pattern launch
  energy and insufficient dive-recovery authority. The replay confirmed the
  aligned approach geometry, continuous airfield, moving 3D aircraft, impact
  breakup, and immediate ground-contact ending. Browser console produced no
  warnings or errors. Evidence is saved at
  `/private/tmp/skybound-landing-approach-v10.png`.

| Loop 10 gate | Score | Decision |
| --- | ---: | --- |
| Landing objective integrity | 9/10 | Zone plus touchdown are both mandatory |
| Physical approach readability | 8/10 | Runway, lights, gates, and speed cue form one path |
| Handling recoverability | 8/10 | Sensitive flight remains, but a committed recovery can work |
| Renderer parity | 9/10 | WebGL and compatibility modes share the authored landing contract |
| Final audiovisual polish | 7/10 | Bespoke aircraft audio and richer touchdown ceremony remain |

**Gauntlet decision: pass the physical landing mission, continue toward
10/10.** Landing Pattern is now a real lesson rather than ordinary free flight
with a landing label. The next loop should add rank-specific sound, touchdown
grade feedback, and authored formations for the advanced jet exams.

## Touchdown award and event-catalogue Gauntlet loop 11 — 2026-08-28

This loop closed two different presentation gaps: a safe return now reports
how well the pilot actually landed, and the shared reward modal now exposes the
complete mini-game catalogue instead of hiding valid exhibition games.

### Touchdown scoring and ceremony

- A controlled landing records its contact speed, sink rate, absolute pitch,
  and centreline offset before the settled aircraft is stopped. Those values
  are part of the deterministic flight result, not React-owned gameplay state.
- Safe landings receive one of three grades: A+ Golden Touchdown, A Precision
  Touchdown, or B Controlled Touchdown. Their 120/90/65-point landing bonuses
  reward a soft, level, centred flare without moving the existing safe-versus-
  crash boundary.
- The result card presents the four contact measurements, precision bonus,
  gold/silver/bronze treatment, wing badge, and a bounded confetti ceremony.
  Crash results retain their separate breakup and impact debrief.

### Shared icon and mini-game catalogue contract

- Skybound Academy now has a permanent original 512px pilot-school badge at
  `public/assets/event-games/skybound-academy/skybound-academy-icon-v1.png`.
  The catalogue is the single source for its icon and the existing Space
  Excavator artwork.
- The right-side event quick action, reward-bar banner, modal header, and
  four-column grid all constrain image dimensions, overflow, and object fit.
  Space Excavator can no longer expand to its natural bitmap size.
- The reward modal keeps five canonical timed-event tiles, of which only the
  one active timed event is directly playable. It now also links all six
  exhibitions: Journey Disc Arena, Momentum Matrix, Concord Categories,
  Lexicon Relay, Signal Path, and Twin Sigils. One twelfth slot remains visibly
  reserved for a future game.
- Journey Disc remains discoverable on ordinary islands and explains its
  chapter-island gate when selected. On eligible chapter islands it still
  replaces only the active timed-event surface and is not duplicated.
- Exhibition launches continue to borrow the active event ticket/reward
  channel. Browser verification launched Lexicon Relay from the grid and
  observed the canonical ticket balance change from 20 to 19.

### Evidence and decision

- Full Island Run service suite passed: 1,896 tests, 0 failures. New coverage
  proves contact telemetry capture, A+/A/B thresholds, score ordering, the
  unchanged safe-touchdown boundary, exhibition appending, and Journey Disc
  de-duplication.
- Focused Island Run TypeScript passed. Architecture guard passed with 0
  violations and the existing 3 allowlisted legacy warnings. Production Vite
  build passed with the repository's existing mixed-import and large-chunk
  warnings. The repository-wide `tsc -b` remains blocked by pre-existing
  Supabase/PostgREST generated-type incompatibilities outside this slice.
- Fresh-browser verification showed eleven populated tiles in the complete
  three-row grid. Space Excavator and Skybound both measured 27.2 × 27.2px in
  their 27.2px bounded containers; no icon overflow occurred. The board's 3D
  renderer fell back because this sandbox disables WebGL, while the event modal
  and linked exhibition remained functional.
- Live Skybound replay confirmed stable launch, control response, ground-impact
  breakup, abrupt-ground-contact termination, crash debrief, and no Skybound
  console warnings or errors. Deterministic service coverage provides the safe
  touchdown-grade gate; the next physical-device pass should capture all three
  award ceremonies with unthrottled touch input.

| Loop 11 gate | Score | Decision |
| --- | ---: | --- |
| Touchdown feedback | 9/10 | Contact quality is measurable, scored, and celebrated |
| Event discoverability | 9/10 | All shipped timed and exhibition games occupy one honest grid |
| Icon consistency | 9/10 | Skybound has bespoke art and bitmap sizing is bounded everywhere |
| Ticket/reward integrity | 10/10 | Exhibitions spend the existing active-event ticket channel |
| Final audiovisual polish | 7/10 | Rank-specific engine audio and physical-device ceremony capture remain |

**Gauntlet decision: pass touchdown feedback and shared catalogue integration,
continue toward 10/10.** The next loop should add rank-specific prop/jet sound,
advanced authored formations, and a phone-calibrated safe-landing replay for
gold, silver, and bronze ceremonies.

## Advanced formations and engine voice Gauntlet loop 12 — 2026-08-28

This loop replaced two remaining generic-feeling systems in the promoted
ranks. The named advanced lessons now own their own flyable routes, and the
five aircraft no longer share one silent flight identity.

### Authored advanced courses

- Elite Storm Corridor and Interceptor Checkride use an exact five-gate
  crosswind course. Four blocking storm spires force deliberate lane changes,
  while ten crests reward holding the safe line between gates.
- Ace Gold Formation uses exactly twelve sequential ceremonial crests, so its
  starred twelve-crest standard can be completed in one forward flight. The
  route sweeps across both wings of the taught lateral corridor and is divided
  into four readable gate phrases.
- Both profiles are deterministic flight-service inputs stored on the flight
  state. WebGL and compatibility renderers consume the same objects, use a
  visible route line, and distinguish storm-purple gates from Goldwing-gold
  gates. React selects a lesson profile but owns no collision, collection, or
  scoring authority.
- The live briefing now names `AUTHORED STORM CORRIDOR` or `GOLD WINGS
  FORMATION`, making the mechanical change explicit before launch.

### Rank-specific responsive engine sound

- A new bounded Web Audio controller gives Toy Glider airflow, Prop Trainer,
  Jet Trainer, Storm Interceptor, and Goldwing Fighter distinct frequency,
  harmonic, filter, and gain profiles.
- Speed and boost spool the voice upward; Flow settles flutter; stalls,
  ground-effect, and damaged flight introduce faster instability. The
  deterministic profile math is separately testable from browser playback.
- Production playback honours the canonical Island Run SFX preference. The
  development-only Academy Evaluator enables the voice for direct testing and
  primes its audio context from the launch gesture for iOS autoplay safety.
  The controller fades and closes on retry, lesson change, and unmount.

### Evidence and decision

- Full Island Run service suite passed: 1,898 tests, 0 failures. New coverage
  verifies exact formation counts, one-pass crest ordering, lateral course
  breadth, deterministic replay, five distinct rank voices, boost spool,
  struggle flutter, and Flow settling.
- Focused Island Run TypeScript passed. Architecture guard passed with 0
  violations and the existing 3 allowlisted legacy warnings. Production Vite
  build passed with the repository's existing mixed-import and large-chunk
  warnings only.
- Live evaluator replay confirmed both advanced briefings, objectives, aircraft
  identities, course colours, route geometry, moving weather, and stable
  compatibility rendering. The browser sandbox disables WebGL globally, so a
  physical iPhone remains the authoritative gate for WebGL and audible mix.
- Release reconnaissance found this branch 13 commits ahead of and 12 behind
  local `main` before this loop's checkpoint. Seven files changed on both sides
  and the dry merge contains two conflict blocks. The Capacitor project exists
  and Xcode 26.6 is installed, but `ios/App/App/public` is absent, confirming
  that the native wrapper has not received a current web bundle.
- The repository-wide `tsc -b` still fails on the same Supabase/PostgREST type
  incompatibilities in goals, actions, projects, routines, notifications,
  contracts, and Today services. Neither this branch nor the twelve local-main
  commits changed those source files, so this is a shared release gate rather
  than a Skybound regression.

| Loop 12 gate | Score | Decision |
| --- | ---: | --- |
| Advanced mission identity | 9/10 | Storm and Gold Formation now demand distinct authored lines |
| Five-aircraft sound identity | 8/10 | Responsive synthesis is wired and deterministic; phone mix remains |
| Renderer parity | 9/10 | Shared course service drives gold/purple routes in both renderers |
| Release readiness | 6/10 | Feature gates pass; main reconciliation and full-build repair remain |
| Physical-device confidence | 6/10 | iOS wrapper and real-device sound/WebGL/landing replay remain |

**Gauntlet decision: pass the authored-course and engine-identity slice,
continue into release hardening.** The next bounded work should repair the
repository-wide TypeScript release gate, reconcile the two dry-merge conflict
blocks with current `main`, then build and sync the Capacitor wrapper for a
real-device landing, sound, and WebGL pass. Deployment, merge, and native
publication remain explicit approval boundaries.

## Shared build-gate repair Gauntlet loop 13 — 2026-08-28

This loop removed the repository-wide compiler failure that blocked both the
PWA deployment workflow and the existing Capacitor iOS sync script. It did not
merge, deploy, copy the web bundle into iOS, or publish a native build.

### Schema and Supabase client alignment

- The checked-in database definition now reflects migrations 0178 and 0184:
  goals expose `goal_strategy_type`, while commitment contracts expose
  `tracking_mode` and `self_reported_outcome` across Row, Insert, and Update.
- Demo and offline goal construction now supplies the database-backed
  `standard` strategy default, keeping development state aligned with the
  non-null production column.
- Actions, projects, project tasks, and Today todos now send their generated
  table Update types to Supabase instead of unbounded
  `Record<string, unknown>` payloads. This preserves strict excess-property
  checks rather than bypassing the newer PostgREST client contract.
- Synthetic authentication, validation, and translated outage errors now use
  the current `PostgrestError` class, including its required `toJSON`
  behaviour, instead of incomplete object literals.

### Evidence and release boundary

- Full repository `tsc -b --pretty false` passed with zero errors. The same
  gate previously failed in goals, contracts, actions, projects, routines,
  notifications, and Today services.
- Production Vite build passed: 1,337 modules transformed and Skybound emitted
  as its own 102.00 kB minified chunk. Existing mixed-import and large-chunk
  warnings remain informational and unchanged in character.
- Full Island Run service suite passed: 1,898 tests, 0 failures. Architecture
  guard passed with 0 violations and the same 3 allowlisted legacy warnings.
  Today todos, demo/cloud routing, auth resilience, service resilience, and
  goal pillar suites also passed.
- The Playwright app-boot smoke check skipped because its configured Chromium
  binary is absent; it is recorded as not run rather than a pass. Loop 12's
  in-app-browser evaluator replay remains the current browser evidence.
- The dry merge still contains two conflict blocks, both in the runtime-state
  store: current `main` adds Vault Rush while this branch adds Skybound. The
  intended reconciliation is additive—retain both imports and both selected
  persistence fields—but merging remains an explicit approval boundary.
- Xcode 26.6 and the Capacitor project are present. `ios/App/App/public` is
  still absent, confirming no current web bundle has been copied into the
  native wrapper. The next native action is therefore a deliberate Capacitor
  sync followed by simulator/device QA, not an App Store publication.

| Loop 13 gate | Score | Decision |
| --- | ---: | --- |
| Repository compiler | 10/10 | Full TypeScript project graph is green |
| PWA production bundle | 9/10 | Bundle succeeds; existing size warnings remain |
| Regression confidence | 9/10 | 1,898 Island tests and affected service suites pass |
| Main reconciliation | 8/10 | Two additive conflict blocks are identified, not yet merged |
| Capacitor iOS readiness | 7/10 | Toolchain exists; sync and physical-device QA remain |

**Gauntlet decision: pass the shared build-gate repair, hold release actions
for approval.** The branch is ready for a deliberate reconciliation with
`main`. After that merge is verified, the safe sequence is PWA production
build, Capacitor iOS sync, simulator launch, physical-device audio/WebGL/touch
flight pass, and only then a separate deployment/publication decision.

## Main reconciliation and native sync Gauntlet loop 14 — 2026-08-28

This loop reconciled the Skybound branch with current remote `main`, rebuilt
the complete app, copied the verified production bundle into Capacitor, and
proved the native shell on an iPhone simulator. It did not push, deploy the
PWA, sign an archive, or publish an App Store build.

### Additive main reconciliation

- Remote `main` at `40b7f7aa` was merged into the feature branch in merge
  commit `2352d749`. The only conflicted file was the Island Run runtime-state
  store identified in loop 13.
- Both persistence systems were retained: Vault Rush claim state and Skybound
  Academy progress are imported, sanitized, merged, selected from Supabase,
  and written back independently. No conflict markers remain.
- Full repository TypeScript passed. The Island Run suite passed 1,950 tests
  with 0 failures, the architecture guard passed with 0 violations and the
  same 3 allowlisted legacy warnings, and the Vault lab/model contract checks
  passed.
- The post-merge production build passed with 1,379 transformed modules.
  Skybound remains a separate 101.99 kB minified chunk; the repository's
  existing mixed-import and large-chunk warnings remain informational.

### Capacitor and simulator evidence

- Capacitor copied the current `dist` into `ios/App/App/public`, regenerated
  native configuration, and resolved seven plugins: App, Browser, Dialog,
  Haptics, Local Notifications, Network, and Preferences.
- The production and native `index.html` files have the same SHA-256 digest:
  `f3240feeb81435593bc185fea8f15bec79ecac20d3de3f11d9605946d288727c`.
- Capacitor attempted to rewrite plugin paths through this machine's linked
  dependency store. Those paths were restored to the repository-portable
  `../../../node_modules/...` form before the final native gate.
- Xcode 26.6 built the checked-in portable configuration for a generic iOS
  Simulator target with code signing disabled. The final quiet repeat build
  exited 0.
- The resulting `HabitGame` app (`com.lifegoalapp.habitgame`) was installed and
  launched on an iPhone 17 Pro running iOS 26.5. A clean relaunch displayed
  the bundled HabitGame landing experience, proving that the Capacitor web
  assets load instead of a blank or missing-file shell.
- A physical iPhone remains the authoritative release gate for WebGL flight,
  slingshot touch handling, haptics, audio autoplay/mix, thermal behaviour,
  safe-area layout, signing, and distribution packaging.

| Loop 14 gate | Score | Decision |
| --- | ---: | --- |
| Main reconciliation | 10/10 | Current remote main merged with both event states preserved |
| Shared regression suite | 10/10 | TypeScript, 1,950 tests, architecture, and Vault gates pass |
| Capacitor bundle parity | 10/10 | Native shell contains the exact verified production index |
| iOS simulator startup | 9/10 | Native build installs and visibly launches on iPhone 17 Pro |
| Physical-device readiness | 7/10 | Real-device flight, sound, touch, signing, and archive remain |

**Gauntlet decision: pass reconciliation, production-bundle sync, native
compile, install, and simulator startup.** The next release slice is a
physical-device Skybound flight replay, followed by an explicit decision to
push/deploy and create a signed iOS archive.

## Event catalogue control Gauntlet loop 15 — 2026-08-30

This loop made the reward-bar modal a complete development catalogue without
changing canonical event progression. Ordinary development islands can select
one of the five rotating events directly from its tile and can pointer-drag all
eleven registered games into a persisted preference order. Chapter islands
that replace the ordinary event surface with Journey Disc keep selection and
sorting locked, preserving the authored island-specific event contract.

### Catalogue completeness and interaction

- The modal reports all eleven registered games: five rotating events and six
  exhibition games. Saved orders are normalized so stale or duplicate ids can
  never hide a newly registered game.
- Number badges make the preference order explicit from #1 at the top-left to
  #11 at the bottom-right, with a one-click reset to catalogue order.
- Selecting Skybound Academy updates the modal header, reward bar, quick-action
  icon, and active tile immediately while leaving the catalogue open.
- Sorting uses pointer events instead of native HTML drag data, making the same
  interaction work with mouse, touch, and the in-app-browser test harness.

### Evidence and release boundary

- Focused Island Run integration tests passed: 9 cases, 0 failures, including
  complete-catalogue normalization, drag ordering, ordinary-island restoration,
  and Journey Disc replacement rules.
- The Island Run architecture guard passed with 0 violations and the existing
  3 allowlisted legacy warnings.
- In-app-browser replay verified 11 visible tiles, switched the active event to
  Skybound Academy, dragged it from rank #5 to #1, and confirmed the reward bar
  changed with it. The finished modal remains open as the handoff preview.
- The production Vite build passed with 1,379 modules transformed; Skybound
  remains a separate 101.99 kB minified chunk. Existing mixed-import and
  large-chunk warnings remain informational.
- A concurrent full `tsc -b` gate was stopped after 28 minutes while still
  active and without emitting an error because the shared machine was heavily
  contended. Loop 14's full TypeScript pass remains the latest completed
  repository-wide type gate; the changed runtime was compiled by Vite and
  exercised in-browser in this loop.

| Loop 15 gate | Score | Decision |
| --- | ---: | --- |
| Catalogue completeness | 10/10 | All 11 registered games remain visible |
| Dev event selection | 10/10 | Rotating event and reward bar switch in place |
| Preference sorting | 10/10 | Pointer/touch drag persists #1–#11 order |
| Special-island safety | 10/10 | Authored replacement islands stay locked |
| Build confidence | 9/10 | Production build and focused gates pass; full type rerun was resource-bound |

**Gauntlet decision: pass the development catalogue control.** No production
rotation state, release deployment, native sync, or publication was changed by
this loop.

## Stunt-flight Gauntlet loop 16 — 2026-08-30

This loop added an aerobatics layer to the existing flight and settlement
model without creating another wallet, event clock, ticket rule, or reward
track. The manoeuvres are skill bonuses inside the ordinary sortie score; the
Academy lesson standards remain the authority for pass, Ace, and promotion.

### Stunt vocabulary and feedback

- Close hazard passes now announce and score a `NEAR MISS` once per obstacle.
- Holding 2.4–6.4m terrain clearance above 22m/s earns escalating `TERRAIN
  SKIM` milestones every 1.1 seconds; leaving the band resets the active skim.
- A hard left or right bank above 7m and 22m/s drives the actual aircraft model
  through a full roll. Each completed rotation earns `BARREL ROLL` score and a
  two-step streak increase; Stabilizer deliberately suppresses the command.
- A ground impact with meaningful active rotation can earn one bounded `CRASH
  FINALE`. It remains a crash: the aircraft is lost, the lesson cannot pass,
  and the launch ticket is not refunded.
- The live HUD shows total stunt score and animated manoeuvre callouts. The
  result card exposes a separate STUNTS line plus near-miss, roll, skim, impact,
  and best-streak counts; a qualifying rotating crash gets an explicit finale
  card instead of being mistaken for a successful landing.

### Evidence and boundary

- The full Island Run service graph passed 1,955 tests with 0 failures,
  including deterministic near-miss, terrain-skim, barrel-roll, Stabilizer,
  crash-finale, ground-impact, and settlement-breakdown coverage.
- The Island Run architecture guard passed with 0 violations and the same 3
  allowlisted legacy warnings.
- In-app replay confirmed an ordinary live near miss appears as explicit stunt
  score and the result dialog renders the separate STUNTS breakdown and seven
  flight counters. Threshold-sensitive roll and crash-finale behaviour was
  verified deterministically in the service suite.
- The canonical gameplay contract now states that stunts settle through the
  existing flight result and never change ticket or lesson authority.

| Loop 16 gate | Score | Decision |
| --- | ---: | --- |
| Stunt readability | 9/10 | Live callouts, total, and result breakdown are explicit |
| Flight skill | 9/10 | Risk bands, full rolls, and Stabilizer trade-off are deterministic |
| Crash integrity | 10/10 | Spectacle scores, but ground impact still loses the aircraft |
| Economy safety | 10/10 | Existing ticket, settlement, wallet, and reward-bar paths are unchanged |
| Regression confidence | 10/10 | 1,955 Island Run tests and architecture guards pass |

**Gauntlet decision: pass the stunt-flight slice.** It is ready for player feel
tuning; no push, production deployment, native sync, or publication was made.
