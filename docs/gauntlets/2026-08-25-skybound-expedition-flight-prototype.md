# Skybound Expedition — Flight Prototype Gauntlet

Status: **Pilot Academy vertical slice active**, approved by Eivind on 2026-08-25.

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
