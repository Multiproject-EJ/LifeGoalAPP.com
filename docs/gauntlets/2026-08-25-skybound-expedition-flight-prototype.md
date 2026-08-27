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
