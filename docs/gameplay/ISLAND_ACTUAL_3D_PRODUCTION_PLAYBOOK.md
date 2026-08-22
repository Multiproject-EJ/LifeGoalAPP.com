# Island Run — Actual 3D Island Production Playbook

Status: **Active reusable workflow**

Scope: authored interactive 3D worlds for Islands 001–120 and later volumes

Project authority: HabitGame repository contracts and runtime code

## Purpose

This is the single start-here file for a new Island Run 3D world. It makes the
production process resumable across chats and agents. EJ-Jarvis should point to
this file; it should not duplicate the implementation details.

## Read order

Before changing Island Run code, read these files completely:

1. repository `AGENTS.md`
2. `docs/gameplay/ISLAND_RUN_ARCHITECTURE_CONTRACT.md`
3. `docs/gameplay/CANONICAL_GAMEPLAY_CONTRACT.md`
4. `docs/gameplay/ISLAND_RUN_GUARDRAILS_AND_CONFLICT_MATRIX_2026-04-24.md`
5. `docs/gameplay/ISLAND_VISUAL_PRODUCTION_CONTRACT.md`
6. `docs/gameplay/ISLAND_CAMERA_LOCKED_KIT.md`
7. this playbook
8. `docs/gauntlets/2026-08-16-island-content-pack-reuse-and-volume-strategy.md`
9. the target island's dated file under `docs/gauntlets/`
10. the complete `img2threejs` skill when a reference is being reconstructed

Useful implementation precedents:

- `src/features/gamification/level-worlds/dev/Island5ThreePilot.tsx` — shared
  renderer, real 36-tile board, camera, pawn, caretaker, quality selection and
  profiler. This is infrastructure, not a visual template to recolour.
- `src/features/gamification/level-worlds/dev/Island7UnderwaterThreeWorld.ts` —
  the clearest current example of an isolated world factory, ambience runtime,
  L1–L3 landmarks, runtime metadata and mobile optimization.
- `src/features/gamification/level-worlds/services/islandRun3DWorldRouting.ts` —
  the only mapping from gameplay island identity to authored visual world.
- `.img2threejs/island-007/` — example of persistent reference analysis,
  detail inventory, sculpt spec, state and review evidence.

## Immutable gameplay and composition contract

- The live topology is `spark36_ring`: 36 real wedge-shaped tiles.
- Tile geometry, token movement, rewards, stops and gameplay writes remain
  canonical shared systems. A world factory is presentation-only.
- Tiles must retain solid readable top faces, tapered inner edges, clean joints
  and no overlap/z-fighting.
- Every ordinary island has five footprint-stable landmark families:
  Hatchery, Habit, Mystery, Wisdom and central Boss.
- Every landmark has authored L1, L2 and L3 growth. L1 is crafted and readable,
  L2 operational, and L3 restored/premium. Levels grow the same building rather
  than swapping identities.
- Only every fifth island is a creature Arena island. Ordinary islands receive
  an impressive central Boss landmark, not an arena.
- The first phone view shows the whole route and all five landmarks between the
  real top HUD and controller. Landmark focus views may then move closer.
- Scenery, plants and props never occupy the protected route corridor or hide
  collectible/tile objects.
- Reduced motion freezes decorative animation without breaking composition.

## What may be reused—and what must be new

Reuse:

- shared renderer, camera presets and smooth camera language;
- canonical route/tile transforms, movement and landing impacts;
- build-mode camera and L1–L3 state integration;
- caretaker system, with island-specific clothing/material modules;
- quality-tier, batching, culling, disposal and profiler infrastructure;
- runtime metadata conventions (part IDs, focus sockets, colliders and
  non-breakable presentation groups).

Author for each new **base world family**:

- terrain/root silhouette and horizon;
- palette, materials, architectural language and tile material palette;
- all five landmark silhouettes and L1–L3 construction stories;
- vegetation/fauna and ambience choreography;
- island-specific caretaker outfit treatment;
- background vehicle/creature only when it belongs to the biome.

Never create a new island by merely copying Island 005 geometry and changing
colors. Copy infrastructure and interfaces; author a new world factory.

An explicitly planned `variant-overlay` may reuse a base world family. Reuse
must be dependency-based rather than copied, and its phone comparison must
demonstrate at least two changed sensory systems plus one changed experiential
system. Reuse structure; create a different visit.

## Required source pack

Create before broad 3D implementation:

1. one immutable `NNN-source.<ext>` image admitted through the Source Fidelity
   Workloop, plus one selected repository copy in
   `docs/visual-references/island-NNN-<slug>/`;
2. a dated Gauntlet/brief in `docs/gauntlets/`;
3. a 3×3 detail inventory of the selected image;
4. five named landmark crops or focus references when the overview cannot
   resolve construction detail;
5. optional side/back references only for forms whose hidden construction is
   consequential;
6. an explicit reference-limit statement for unseen sides.

Do not require ten arbitrary images. Start with one coherent master overview;
add only the focus/turnaround evidence needed to remove actual ambiguity.

The source image is a recurring visual target, not a one-time prompt. Read
[`2026-08-21-island-source-fidelity-workloop.md`](../gauntlets/2026-08-21-island-source-fidelity-workloop.md)
before intake. Preserve its SHA-256, keep runtime island numbering separate
from text embedded in the concept, and never overwrite a source or accepted
`done-vNNN` proof.

## Production loop

### 0. Safe repository start

- Inspect branch, worktrees and dirty files.
- Preserve unrelated user work.
- Work on a dedicated `codex/island-NNN-<slug>` branch/worktree based on the
  latest integrated Island Run source.
- Confirm whether prior island work is committed/merged before depending on it.

### 1. Reference admission

- Dry-run then apply `scripts/island_source_workloop.py intake` so an exact
  dropped `NNN.<ext>` becomes immutable `NNN-source.<ext>`.
- Resolve collisions and ambiguous names instead of guessing their island.
- Save the chosen repository copy under `docs/visual-references/`.
- Record its role as inspiration/goal, never runtime board art.
- Lock island role (ordinary or every-fifth arena), identity, palette,
  landmark names, ambience, avoid list and phone composition.
- Classify delivery as `new-base`, `variant-overlay` or `hero-exception`; name
  base/shared dependencies and set the expected deployed-byte tier.
- Reject reference tile counts and approximate geometry; the real 36-tile ring
  remains authoritative.
- Write the reference-lock sheet: landmark identities/placement, depth stack,
  palette/materials, critical features, approved board adaptations, forbidden
  drift and hidden-side limitations.

### 2. img2threejs intake

- Initialize `.img2threejs/island-NNN/state.json` with the selected reference.
- Run the mandatory `forge/next.py` state gate at every start/resume.
- Create image analysis, pre-spec assessment, 3×3 detail inventory and sculpt
  spec before landmark code.
- Quality contract must name macro silhouette, meso architecture, materials,
  animation, runtime hierarchy and mobile budget.

### 3. Representative blockout

- Add the world route and a dedicated `IslandNNN<Theme>ThreeWorld.ts` factory.
- Build terrain/root, route context and five large distinct landmark masses.
- Capture map-stripped overview plus left/right orbit.
- Stop if the complete route does not fit, landmarks repeat silhouettes, or
  any plot/plant enters the route corridor.

### 4. One-landmark-at-a-time sculpting

- Work Hatchery → Habit → Mystery → Wisdom → Boss unless the central silhouette
  is the highest-risk unknown.
- For each landmark: compare goal/current, fix macro form, then structure,
  entrances, material hierarchy and finally micro-detail.
- Author L1 first as a finished small structure, then additive L2 and L3.
- Approve one landmark before spreading the same mistake to four more.

### 5. World materials and living ambience

- Establish large phone-readable color masses and warm/cool hierarchy.
- Add biome-specific terrain integration at landmark bases without covering
  tiles.
- Add layered motion at foreground/midground/background depth.
- Motion uses elapsed time, not frame-dependent accumulation.
- Use instancing/merged static geometry for repeated vegetation and fauna;
  retain only a few independently animated hero elements.

### 6. Integration

- Route the runtime island to its unique world source.
- Preserve canonical clicks, Build mode, token movement, rewards and camera.
- Reuse the shared caretaker LOD; apply the island outfit/material module.
- Add/update structural and routing tests. No component-level gameplay writes.

### 7. Signature missions and moving infrastructure

When an island contains a buildable railway, bridge, lift, excavation or other
moving system, define its complete player loop before adding final scenery:

- mission briefing and unlock condition;
- route-relative pickup positions and authored pickup quantities;
- canonical inventory, spend action and monotonic completion state;
- one deterministic visible construction result per spend;
- presentation-only cinematic, focus camera, reduced-motion path and replayable
  developer preview;
- completion beat and safe compatibility for saves created before the mission.

Commit gameplay through the canonical action service before starting the
cinematic. The cinematic may read the committed before/after state, but must not
own or duplicate inventory, reward or completion authority. It must also be
interrupt-safe: closing a modal, changing focus or using reduced motion cannot
lose or repeat the gameplay result.

Audit two clearances separately and early:

- the protected 36-tile board corridor against every landscape/landmark object;
- the complete swept envelope of each moving vehicle—including carriages—against
  every L3 landmark mesh, instance, tunnel, switch and camera focus volume.

Run the vehicle-clearance audit again whenever a landmark grows, a track moves
or a review camera changes. A decorative doorway or facade painted over a track
is not a tunnel; show a physically open throughpass with enough width, height
and turning clearance on both elevations. Keep shared transport construction
language consistent without making the five landmarks repeat silhouettes.

Environmental anchors that establish direction—especially a sun, moon or
distant landmark—must live in world space. Verify them from overview, left,
right and rear orbits so they do not follow the camera. Review background depth,
360 construction and moving-system clearance at blockout, before micro-detail.

### 8. Gauntlet evidence loop

After each meaningful pass capture:

- 390×844-ish phone overview;
- left and right orbit (rear when hidden form matters);
- five landmark focus views;
- L1, L2 and L3 overview;
- map-stripped geometry proof;
- timed ambience proof (for example t0/t6 or a short clip);
- goal/current comparison.

At blockout, terrain/background, landmark, materials/life, integration and
final review, also return to the original `NNN-source` image. Record the five
Source Fidelity scores (`composition`, `landmarkIdentity`,
`paletteMaterials`, `terrainBackground`, `phoneReadability`), critical
mismatches and one decision (`pass`, `revise`, `user-accepted-drift`) with the
workloop helper. The latest generated target never replaces this source check.

Critique the largest observed mismatch first. Change one bounded problem group,
recapture and log the delta. Do not claim 10/10 from code inspection or a
single flattering camera.

For animated construction, also preserve a deterministic query/toggle that can
replay each segment and capture before, ignition, impact and completed frames.
The safest review camera usually uses a bounded exterior arc that keeps the work
face visible; a literal full spin is wrong when the terrain itself occludes the
action.

### 9. Mobile optimization and release

- Quality tiers must change real cost, not only labels.
- Profile the representative High scene on the physical target phone.
- Start with the current Island 007 High reference ceiling: approximately 175
  maximum draw calls, 180k maximum triangles, 50 FPS average, p95 ≤29 ms and
  slow frames ≤15%. A new brief may set a stricter budget; raising it requires
  an explicit documented decision.
- Verify Auto quality and forced High. Prefer runtime downgrade over jank.
- Run TypeScript, production build, Island Run tests, architecture guard,
  geometry/routing contracts and `git diff --check`.
- Report island-specific deployed bytes, dependency bytes, duplicate-asset
  findings and any approved pack-budget waiver.
- Install the normal Capacitor app after any dedicated profiling build. A
  profiling/demo build must never be left on Eivind's phone as the handoff.
- PWA/main publishing or merging still requires explicit authority.

## Completion definition

An island is complete only when:

- it has a unique authored 3D world and stable routing identity;
- all five L1–L3 landmarks are coherent and readable at phone scale;
- the real board, token, rewards, clicks, Build flow and caretaker still work;
- any signature mission has canonical, save-compatible progression and its
  moving geometry passes swept-envelope clearance from all relevant views;
- ambience is alive but quality-scalable and reduced-motion safe;
- overview/orbits/focus/level/motion evidence matches current code;
- physical-device and static budgets pass, or any review/waiver is explicit;
- its pack/reuse classification, dependencies and expected/actual deployed
  bytes are recorded without avoidable duplicated binaries;
- the normal app—not a lab—is installed for user testing;
- its Gauntlet records delivered work, known gaps and the next optional pass.
- its original source hash is intact and the final source/current review has
  overall fidelity ≥0.80, every dimension ≥0.75 and no critical mismatch, or
  Eivind explicitly recorded a `user-accepted-drift` exception;
- its accepted overview exists as immutable `NNN-done-vNNN.<ext>` evidence and
  `_workflow/NNN/status.json` records the version.

## New-chat starter

Use this prompt, replacing `NNN` and the slug:

> Continue HabitGame Island NNN in a dedicated worktree. First read AGENTS.md,
> the four Island Run contracts, ISLAND_ACTUAL_3D_PRODUCTION_PLAYBOOK.md and the
> Island NNN Gauntlet completely. Inspect git/worktree state and preserve all
> existing work. Run the img2threejs state gate, then continue from its exact
> next step. Keep the real 36-tile board and gameplay authority unchanged. Use
> the selected goal image in docs/visual-references as the visual target. Work
> one landmark at a time. Return to the immutable NNN-source image at every
> major pass, record the five source-fidelity scores and block unresolved
> identity drift. Capture phone/360 evidence, enforce High mobile
> budgets, define signature-mission gameplay before its final infrastructure,
> audit moving-vehicle swept clearance separately from board clearance, and
> never leave a profiler build installed in place of HabitGame.
