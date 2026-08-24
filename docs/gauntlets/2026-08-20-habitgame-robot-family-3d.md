---
id: habitgame-robot-family-3d
status: active
owner: Eivind
created: 2026-08-20
project: HabitGame / Creation Halls / Island Run presentation
branch: codex/robot-family-3d-20260820
---

# HabitGame robot family — procedural 3D execution contract

## Mission and user outcome

Turn the approved white-and-blue builder-robot concept into one reusable,
animation-ready procedural Three.js family with three unmistakable roles:

1. **Heavy Worker** — the large main doer for doors, lifting, carrying and
   heavy fabrication. It has the strongest chassis, large articulated hands,
   reinforced shoulder rings and two autonomous overhead tool arms.
2. **Project Manager / PA** — the central coordinator, diplomatic liaison and
   project manager. It preserves the existing round white-and-blue PA identity,
   wide circular blue eyes, small smile, transparent safety dome and side fins.
3. **Mini Job Robot / Artist** — the small maker, detail worker and artist. Its
   complete character is exactly half the PA's reference scale, with a larger
   face-to-body ratio, softer proportions, mint/cyan accents, small hands, an
   artist tray and a brush/stylus tool.

The family must feel manufactured by one culture while differing through
silhouette, proportions, expression grammar, tool loadout and working style—not
through colour swaps alone.

The same family also owns a reusable **construction theatre**: a live-board
presentation layer where the crew arrives around the currently focused
landmark, surveys it, moves tools and materials through an authored orbit
pattern, hides unfinished geometry behind dust/cloud cover, and clears the
atmosphere for the canonical completed-level review.

## Sources of truth

- User-supplied reference on 2026-08-20, SHA-256
  `eaed6909609cccea949331746652dcc2f49565a9a72a6b4856413e0072c1a78e`.
- User-confirmed Heavy Worker turnaround direction:
  `docs/design/robot-family/references/heavy-worker-turnaround-v1.png`.
- Original Orby references and generated reconstruction provenance:
  `docs/design/robot-family/references/README.md`.
- Construction choreography:
  `docs/design/robot-family/ROBOT_BUILD_MOVEMENT_CONTRACT.md`.
- Durable higher-resolution selected master:
  `docs/design/story-concepts/builder-robot-family-concept-2026-07-28.png`.
- Identity notes: `docs/design/story-concepts/README.md`.
- Story roles: `public/storyline/episode-001/manifest.json` and
  `public/storyline/creation-halls/manifest.json`.
- Island Run architecture and visual contracts listed in repository
  `AGENTS.md`.
- Resumable reconstruction state: `.img2threejs/robot-family/`.

## Reference limits and assumptions

- The selected master is one front three-quarter group composition. Rear
  shells, underside thruster construction, exact joint interiors and hidden
  add-on mount geometry are not visible.
- Hidden regions may be inferred only by continuing visible panel seams,
  bilateral chassis logic and the shared socket grammar. These regions remain
  lower-confidence until a turnaround is approved.
- The image supplies a coherent material and shape target, not manufacturing
  dimensions or exact mechanical engineering.
- "Two times smaller" is implemented as `0.50` uniform scale relative to the
  PA's authored reference height. The mini's head/face remains proportionally
  larger so the result reads cuter rather than merely shrunken.

## Non-negotiables

- Code-only procedural Three.js factory; no downloaded mesh pack and no
  pretending the raster reference is a 3D asset.
- One shared family factory, material library, face/emotion system, socket
  vocabulary and update loop.
- Three role silhouettes must remain readable in neutral clay materials.
- Every mesh and meaningful group is named. Major parts are clickable and
  explodable; surface relief travels with its parent.
- Named attachment sockets support autonomous arms, holders, lifters, clamps,
  projector, brush/stylus and future tools.
- All appendages attach through explicit pivots/sockets with visible overlap;
  no floating arms, fins, hands or tools.
- Presentation code may animate and raycast but must never write gameplay
  progress. Island Run state ownership remains unchanged.
- One WebGL renderer per scene, reduced-motion support and deterministic
  animation.
- The first implementation is dev-only. Live game placement is a later,
  separately approved integration slice.
- `BuildModalV2` stays a transparent UI/control overlay over the real board.
  It may not mount a second canvas or own landmark geometry. Construction FX
  must enter the existing Three.js scene through presentation-only inputs.
- Dust/cloud cover may hide assembly transitions, but the complete landmark,
  canonical route, close control and build dock must remain readable and
  reachable. FX never changes hit targets or gameplay state.

## Scope now

- Reference admission, image analysis, detail inventory, strict sculpt spec and
  persistent img2threejs state.
- Shared high/low procedural robot-family factory.
- Heavy Worker, PA/Manager and Mini Artist variants.
- Initial modular add-ons: autonomous articulated arm, universal holder,
  cargo-lifter/fork, holographic projector, brush/stylus and artist tray.
- Shared emotions: calm, happy, focused, concerned, delighted and blink.
- Shared presentation clips: idle-hover, listen, work, celebrate and
  reduced-motion still.
- Construction phases: arrive, survey, foundation, frame, assemble, finish and
  reveal, driven by transient presentation state rather than gameplay writes.
- Procedural tool kit: hammer, wrench, drill, welder, circular saw, paint
  sprayer, screwdriver, measuring laser, clamp and cable reel.
- Procedural material kit: beams, panels, timber, pipes, cable coils, bolt
  crates and generic island-material blocks.
- Construction FX: layered dust clouds, ground dust, sparks, tool trails,
  hovering material deliveries and a deterministic clear-air reveal.
- Dev-only lab with family/individual views, orbit, quality, motion, emotion,
  tool loadout, explode and part-inspection controls.
- Structural contract tests, typecheck/build and phone/multi-angle evidence.

## Explicitly deferred

- Canonical gameplay effects, rewards, inventory or robot ownership state.
- Bot Bay, Creation Hall economy, fabrication requests or individual robot
  identity cards.
- Final sound, voice, haptics and story-trigger integration.
- Full physical-device approval and production placement in Island Run.
- Broad production of every possible add-on; this slice proves the socket
  system with representative modules.

## Milestones and acceptance evidence

### R0 — Reference and contract lock

- Selected master, user role decisions and hidden-region limits recorded.
- img2threejs character state initializes and reports no hard stop.
- Strict quality contract names macro, meso and micro identity features.

### R1 — Shared family blockout

- All three robots render from the same factory and remain recognizable in
  clay mode.
- Mini reference height is `0.50 ± 0.01` of the PA.
- Heavy Worker reads broader and stronger than the PA without simply scaling
  the same shell.
- Front, ±35°, profile and rear captures show real volume rather than face
  cards or shallow extrusions.

### R2 — Role form and add-on system

- Heavy Worker: reinforced shoulders, large working hands and dual overhead
  autonomous arms.
- PA: helmet/dome, side fins, manager pointer and projector/holder sockets.
- Mini Artist: half-scale cute chassis, small working arms, artist tray and
  brush/stylus.
- At least seven stable socket IDs and six add-on module types are exposed in
  `root.userData.sculptRuntime`.
- Every attached module remains connected through orbit and animation poses.

### R3 — Materials and life

- White enamel/composite shell, black glass face, blue/mint emissive systems,
  brass/gold metal, dark joint metal and transparent dome remain distinct in
  neutral, grazing and reference-matched light.
- Face expressions and blinks are independently controllable from body motion.
- Reduced motion preserves readable expressions and tool poses without ambient
  bobbing.

### R4 — Runtime and evidence gate

- Dev route works at approximately 390×844 and desktop widths.
- Click/inspect and explode use the same semantic part definition.
- High family scene targets ≤90k visible triangles and ≤95 draw calls; Low
  targets ≤40k triangles and ≤60 draw calls. These are lab-family ceilings,
  not permission to spend the full budget in gameplay.
- Focused robot contract tests, TypeScript build, production Vite build,
  Island Run architecture guard and `git diff --check` pass.
- Evidence includes hero/reference view, ±35° orbit, profile, rear, phone family
  view, clay silhouette view and add-on/explode view.

### R5 — Construction theatre vertical slice

- Ten named procedural tools and at least six material carriers are independently
  addressable through a typed manifest.
- Robots move by role around one neutral landmark envelope: Heavy lifts and
  stabilises, Manager surveys/directs, Mini details/paints.
- The sequence is deterministic from phase, progress and elapsed time; opening
  the same build beat never produces random camera-blocking placement.
- Cloud/dust coverage rises during structural swaps, peaks around the target
  building rather than the UI, then clears for the existing 1–3 second level
  review. Reduced motion uses static cover and keyed poses with no fast orbit,
  sparks or rapid tool strokes.
- The reusable theatre adds no more than 18 draw calls and 8k visible triangles
  in phone mode, excluding the already-budgeted robot family. Dust, sparks,
  repeated materials and fasteners use instancing or points.
- A Build integration adapter is presentation-only: no new runtimeState mirror,
  no direct persistence, no new modal canvas, and no duplicate build-progress
  calculation.
- Evidence includes arrival, peak-occlusion, active-build and reveal views at
  desktop and 390×844-equivalent framing.

## Authority and safety boundary

This branch may add project-local code, tests, documentation, dev routes and
evidence. It may not merge, publish, deploy, install on a physical device,
delete user work or alter production gameplay without explicit approval.

## Rollback and recovery

- All work lives in `codex/robot-family-3d-20260820` and the dedicated
  `worktrees/robot-family-3d-20260820` worktree.
- The robot lab is development-only and can be removed without touching
  canonical gameplay.
- Keep the 2D concept and current PA story/dialogue as fallback presentation.
- Persist each reconstruction decision in `.img2threejs/robot-family/`, not
  only in chat or hand-edited TypeScript.

## Stop conditions

- Stop before live integration if the three silhouettes are not distinguishable
  in clay or the mini no longer reads at phone scale.
- Stop and request another view before claiming high-confidence rear/underside
  fidelity.
- Stop a pass on detached joints, failed multi-angle volume, inaccessible parts,
  exceeded correction-loop limits or mobile budget regression.
- Do not scale to more robot identities until the three-member vertical slice
  is visually approved.

## Handoff

### 2026-08-20 vertical-slice result

- The reusable construction theatre now implements all seven phases, ten
  tools, seven material families and five FX systems.
- Role choreography is independent: Heavy can lift/work, Manager can
  direct/inspect and Mini can work/paint in the same frame.
- The presentation adapter derives transient phase/cloud/reveal inputs from
  the canonical Build view model without exposing mutation callbacks.
- Peak phone assembly evidence measures `1,100` visible theatre triangles and
  `14` visible theatre draw calls. The low robot family remains `24,360`
  triangles / `60` calls before the theatre is added.
- Production Vite build and the focused robot/construction contract pass.
  Repository-wide TypeScript checking still reports pre-existing Supabase
  typing errors outside this slice; no reported error points to a robot or
  construction file.
- Combined runtime part coverage passes with 0 errors, 0 warnings and 0
  unnamed meshes. Multi-angle volume is non-degenerate.
- Blockout acceptance remains intentionally stopped after the third bounded
  correction loop. Tier 1 reports silhouette IoU `0.2326`, scale delta
  `0.0826`, and missing map-stripped evidence. AI review chose `refine-code`
  at `0.72`; see `.img2threejs/robot-family/pass-gate-failure.md`.

Do not wire the theatre into the production Island scene until the user
approves the vertical slice and a new manual refinement pass is opened.

Read this contract, repository `AGENTS.md`, the Island Run contracts and the
complete img2threejs skill. Then run:

`python3 /Users/ejmac/.codex/skills/img2threejs/forge/next.py --state .img2threejs/robot-family/state.json .img2threejs/robot-family/robot-family-sculpt-spec.json`

Continue only from the exact reported step and preserve all evidence.

### 2026-08-21 Heavy Worker v9 result

- v8 was not reopened after its 3/3 stop. A fresh v9 contract added four
  explicit systems: load forearms/hands, torso mass envelope, amber canopy
  optics and an object-centered lift interface.
- The lift system now exposes a thirteenth `heavy-worker:lift-load` socket and
  a lift-only proof yoke. Both palms visibly support the payload endpoints;
  its semantic review score is `0.84`.
- Main/lower shell depth was reduced and biased forward. The torso no longer
  reads as a small front assembly pasted onto a large rear orb; its semantic
  review score is `0.82`.
- Honest v9 global fidelity is `0.72`, not acceptance. The remaining dominant
  debts are pale amber optics (`0.68`), simplified shoulder/upper-arm density,
  hand detail/framing and sparse service-belt/panel detail.
- High remains `87,972` triangles / `95` calls and Phone remains `36,054` /
  `60`; both expose `13` sockets. The focused robot contract and production
  Vite build pass.
- Combined robot + construction-theatre coverage passes with `79 specified`,
  `83 built`, `0 errors`, `0 warnings`. Fresh opposite/rear views are
  non-degenerate.
- v9 is hard-stopped after blockout loop `3/3`. Do not extend it. Open v10 as
  a fresh contract if refinement continues, carrying the four debts above as
  bounded critical systems.

### 2026-08-21 Heavy Worker v10 blockout result

- v10 opened as a fresh bounded pass from the stopped v9 evidence. Its four
  critical systems are deep amber optics, rectangular shoulder/upper-arm
  mechanics, complete fixed-camera hand framing and construction service-belt
  density.
- The fixed camera moved to `[-0.25, 3.55, 9.60]` toward
  `[-0.25, 2.35, 0]`. Both full grippers, crown tools and hover core now stay
  inside the idle and lift evidence frame; this feature scores `0.90`.
- The canopy uses darker burnt-amber absorption (`0x542304`, transmission
  `0.18`, opacity `0.86`, attenuation distance `0.22`) while retaining visible
  transmitted depth and separate opaque gold ribs; this feature scores `0.82`.
- Shoulder cartridges now combine chamfered white carriers, beveled gunmetal
  inset faces, gold perimeter pieces, service lights and exposed upper rails.
  Opposite-view evidence proves real depth; this feature scores `0.85`.
- The front service belt now has a continuous gold rail, central inset module,
  left utility block and right three-canister bank. All detail remains merged
  into the existing composite draw call; this feature scores `0.84`.
- Honest global procedural likeness is `0.80`, not 10/10. Remaining debt is
  macro/meso: lower-hanging and more segmented forearms, denser fingers,
  smaller face-to-torso ratio and richer painted panel seams.
- High is `88,880` triangles / `95` calls and Phone is `36,726` / `60`, with
  `13` sockets. Combined coverage is `83 specified`, `87 built`, `0 errors`,
  `0 warnings`, `0 unnamed`.
- Strict spec validation, focused robot contract and production Vite build
  pass. Repository-wide TypeScript still reports the existing Supabase typing
  failures outside robot files; no new v10 file appears in that error list.
- The bounded v10 blockout review action is `continue`, and the sculpt pipeline
  has advanced to `structural-pass`. Continue from that exact state; do not
  discard the v10 evidence or reopen the stopped v9 pass.
