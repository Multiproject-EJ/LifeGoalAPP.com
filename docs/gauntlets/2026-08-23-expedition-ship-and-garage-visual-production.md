# Expedition Ship and presentation garage visual-production Gauntlet

Status: **active, user-directed**
Date: 2026-08-23
Starting main revision: `257292b0` (`Add immersive Score garage entrance`)

## Mission and observable outcome

Raise the existing Expedition Ship from Eivind's current assessment of roughly
3/10 toward a convincing 10/10 hero vehicle, while building a simple dramatic
garage that becomes its permanent showcase, upgrade surface and summon portal.

Completion means the same canonical controller-derived ship:

- holds up from exterior front, side, rear, roof and underside views;
- contains believable, traversable inhabited spaces from true human-eye POVs;
- transforms through attached, mechanically readable parts without replacing
  meshes or shrinking occupied rooms;
- appears in the Score garage and Island Run travel/arrival without duplication;
- supports performant quality tiers and coherent visual customisation.

## Start here

1. `docs/design/expedition-ship/references/README.md` — canonical goal-image
   folder and authority index.
2. `docs/design/expedition-ship/README.md` — approved product direction and
   current implementation gate.
3. `docs/design/expedition-ship/EXPEDITION_SHIP_MODE_ARCHITECTURE_V1.md` — mode,
   engineering and inhabited-volume contract.
4. `.img2threejs/expedition-ship/state.json` — resumable reconstruction state;
   treat its stopped correction ceiling and open gates honestly.
5. `src/features/gamification/level-worlds/dev/ExpeditionShipThreeModel.ts` —
   canonical procedural ship implementation.
6. `src/features/gamification/level-worlds/components/ExpeditionShipGarageShowcase.tsx`
   and `ExpeditionShipGarageEntrance.tsx` — current garage presentation surfaces.

Before editing, fetch and inspect `origin/main`, relevant branches, worktrees,
stashes and recent ship commits. Do not assume the current checkout contains all
agent work.

## Non-negotiables

- Fast-space mode must preserve the exact smooth controller planform used in
  the game. Generated ship silhouettes cannot outrank the literal game asset.
- One persistent ship scene graph is reused in the garage, travel and island
  scenes. The garage must not contain a separately maintained copy.
- The Great Tree, root-water garden and inhabited pressure volume never shrink,
  teleport, swap or fold through another occupied volume.
- The three primary drives remain one centre propulsion unit and one in each
  controller grip; the grip assemblies also own walking, hover and jump motion.
- Haven uses open-feeling wraparound pressure glass. Walker remains sealed with
  transparent glass. Fast-space and Hyperseed cover it with attached armor.
- Steering houses and administration suites remain sealed inside opposite
  outer shoulder masses, not in the Zen garden.
- True interior cameras must stand inside real walkable volumes. Exterior
  cutaways are not accepted as interior POV evidence.
- The dedicated garage stays visually simple: architecture, rolling door,
  service platform, restrained equipment and dramatic lighting. Performance
  budget belongs primarily to the ship.
- No visual model or presentation component may read or mutate Island Run
  gameplay state directly.

## Scope and milestone slices

### Slice 0 — durable visual route

- Canonicalise the goal-image folder and authority index.
- Store the accepted garage concept sheets in that folder.
- Add this resumable contract and an EJ-Jarvis pointer.

Evidence: another fresh task can locate the references, active contract,
current code and reconstruction state without relying on chat history.

### Slice 1 — exterior volume and controller likeness

- Fix the thin side profile, rear pressure hull, roof unity and continuous
  underside keel.
- Reconcile Haven, Walker and fast-space silhouettes against their exact
  authority images.
- Establish honest front, ±30°, 90° side, rear, roof and underside comparisons.

Gate: the model reads as one volumetric controller-derived ship from every
required view; no front-only improvement passes.

### Slice 2 — traversable inhabited core

- Build true floor depth, ceiling clearance, aft circulation and stairs/lifts.
- Preserve the ordered fabrication, creature, Zen garden, residential and
  shoulder command/administration zones.
- Make the Great Tree larger and lush while preserving circulation, its wrapped
  stair, crown terrace, pavilion and near-180-degree observatory view.

Gate: human-eye cameras can stand under the tree, on both balconies, in the
steering house, administration suite, creature habitat and fabrication deck
without intersecting facade geometry.

### Slice 3 — truthful transformation choreography

- Prove attached rolling, telescoping, folding and shielding mechanisms with
  persistent pivots and clearance envelopes.
- Keep occupied spaces fixed while terraces, glass rails, legs, drives, armor,
  towers and service structures transform around them.
- Add restrained staging: warning light pulses, panel sequencing and mode-aware
  camera movement, with reduced-motion alternatives.

Gate: a slow scrubbed transition explains where every visible macro part goes.

### Slice 4 — dedicated garage environment

- Rebuild the Score entrance and fullscreen space around goal images 16 and 17:
  dark graphite shell, segmented overhead door, low service platform, recessed
  maintenance ring, compact service arms and dramatic amber/cool lighting.
- Return to Score with the door still open and the ship visible inside.
- Keep Auto, Smooth and Ultra quality selection persistent.

Gate: desktop and iPhone-sized views remain legible and smooth; the garage never
competes with the ship for geometry or draw-call budget.

### Slice 5 — customisation and luxury progression

The garage will eventually expose these player-facing systems. Exact names and
economy values remain deferred until the representative visual slice succeeds.

- **Hull finishes:** yacht-like curated palettes, restrained metallic/ceramic
  finishes, accent seams and optional engine-light colours.
- **Interior themes:** coordinated material, lighting, textile and furniture
  families without changing required room clearances.
- **Great Tree variants:** compatible trunk character, bark tone and leaf
  families; tree choice never removes stairs, crown terrace or circulation.
- **Luxury packages:** a progression from functional/basic through premium to
  exceptional super-luxury, expressed across furnishing density, observatory
  lounges, balconies, bar/tea service, lighting and finish quality.
- **Mobility upgrades:** boosters, drive presentation, shield choreography and
  transformation polish, separated from gameplay-balance decisions.

Gate: one hull finish, one interior theme, one tree variant and one luxury tier
can be changed independently without cloning the ship model or breaking mobile
budgets.

### Slice 6 — controller-to-ship summon illusion

- When the ship is called into an island, synchronise the on-screen controller
  representation disappearing with the canonical 3D ship materialising,
  unfolding or entering the world.
- Reverse the sequence when appropriate so the player perceives one transforming
  object rather than two unrelated assets.
- Keep presentation events outside canonical gameplay writes.

Gate: capture one continuous garage-to-island or summon sequence in which no
duplicate controller/ship is visible at the handoff.

## Evidence and budgets

Every material checkpoint records:

- goal image and exact feature under review;
- same-checkpoint exterior contact sheet;
- at least one true interior POV when interior geometry changes;
- transformation start, middle and end when pivots change;
- TypeScript/build and focused ship-contract results;
- Smooth/Ultra mesh, triangle and material counts;
- desktop and iPhone-sized screenshots for garage changes;
- one candid visual score, largest mismatch and next action.

Do not claim completion from code, a single front render or an attractive
cutaway. The previous bounded correction state stopped with Tier-1 likeness and
strict part-coverage gates still open; a new cycle must reopen them explicitly.

## Authority and safety boundary

Work may change project-local ship references, design docs, reconstruction
state, procedural ship/lab code, the dedicated garage environment and focused
tests. Do not merge, deploy, publish, delete prior evidence, rewrite gameplay
state ownership or set economy prices without Eivind's explicit authority.

## Rollback and recovery

- Begin each implementation slice from a verified latest-main worktree on a
  normal `codex/` branch.
- Preserve accepted screenshots and state before large geometry changes.
- Commit one bounded system at a time; do not mix unrelated dirty work.
- If a change improves one hero view while breaking another required view,
  revise or roll back the slice rather than polishing around it.

## Best next action

Start Slice 1. Compare the current ship against the literal controller asset and
the calibrated Haven/speed authority, then correct the side/rear/roof macro
volume before adding more interior decoration or customisation content.

## Fresh-task starter

> Continue the HabitGame Expedition Ship and garage Gauntlet. Read
> `docs/gauntlets/2026-08-23-expedition-ship-and-garage-visual-production.md`,
> `docs/design/expedition-ship/references/README.md`, the linked ship contracts,
> and `.img2threejs/expedition-ship/state.json`. Verify latest `origin/main` and
> relevant ship branches/worktrees before editing. Start with the contract's
> best next action, use the exact goal-image authority for the feature, and show
> fixed multi-angle evidence rather than judging from one front view.
