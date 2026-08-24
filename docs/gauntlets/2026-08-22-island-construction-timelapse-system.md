# Island Construction Time-lapse System — Gauntlet Contract

Status: active implementation contract
Approved by: Eivind's 2026-08-22 instruction to implement across the first ten 3D islands
Scope: presentation-only Island Run construction experience

## Mission and observable outcome

Building a landmark should read as a compressed, playful construction sequence rather than three hovering mascots around an already-complete model. In the live phone modal:

- the robots remain spatially stable while working;
- vibration is limited to an explicit impact/drill/saw/tool action;
- workers traverse distinct construction zones and occasionally perform a short personality fly-by, spin, and face-expression beat;
- the already-funded level remains physically present;
- only the additive geometry for the next level appears progressively;
- only landmark-authored façade scaffolding appears as a level grows; no site-wide rectangular scaffold cage is mounted by the modal;
- robots remain outside the landmark shell and outside one another's occupied volume;
- active/recent construction locks its camera, while quiet Build and 40-second-idle board states may use gentle POV variation;
- the same system works for world sources 1–10 and becomes the default rule for Islands 11–120.

## Sources of truth

- `AGENTS.md`
- `docs/gameplay/ISLAND_RUN_ARCHITECTURE_CONTRACT.md`
- `docs/gameplay/CANONICAL_GAMEPLAY_CONTRACT.md`
- `docs/gameplay/ISLAND_RUN_GUARDRAILS_AND_CONFLICT_MATRIX_2026-04-24.md`
- `docs/gameplay/ISLAND_VISUAL_PRODUCTION_CONTRACT.md`
- `docs/gameplay/ISLAND_ACTUAL_3D_PRODUCTION_PLAYBOOK.md`
- `work/island-visual-library/ISLAND_120_PRODUCTION_SYSTEM.md`
- current procedural robot and authored world factories in the dedicated robot-family worktree

## Non-negotiables and forbidden shortcuts

- Presentation code must not write gameplay state or infer build authority.
- The real 36-tile route, landmark hit targets, camera authority, and build costs remain unchanged.
- No frame-dependent transform accumulation; motion derives from elapsed time and damped authored targets.
- Reduced-motion mode removes relocation, spin, fly-by, vibration, and pulsing without breaking composition.
- Scaffolding is authored with the landmark level, concentrated on readable façades, and hidden/removed at the completed level.
- Never add a second site-wide scaffold envelope around the landmark in the live modal.
- Existing dirty and untracked robot-family work must be preserved.

## Milestones and acceptance evidence

### 1. Stable robot transform ownership

- The construction theatre explicitly owns member root transforms while active.
- A live trace shows no frame-to-frame reset from the showroom hover controller.
- Intentional vibration is isolated to named contact tools and their driven arm action.

### 2. Personality beat

- At most one robot leaves its work socket at a time.
- The selected robot performs a bounded fly-toward-camera/spin/expression beat and returns to the same construction route.
- The beat is rare, deterministic, phase-safe, and disabled by reduced motion.

### 2a. Physical occupancy

- Conservative role-sized presentation colliders keep every robot body outside the landmark shell.
- Pairwise separation prevents two robots from sharing the same work volume, including during relocation interpolation.
- Rooftop work remains possible through a height-aware shell profile; tools may reach inward to authored contacts, bodies may not.

### 3. Additive build reveal

- The current funded level remains opaque.
- Shared geometry between current and target levels is not double-rendered.
- New target-level parts reveal in a deterministic bottom-to-top sequence.

### 4. Landmark-authored scaffolding language

- World sources 1–10 retain their own façade scaffold language inside their landmark level factories.
- The live construction theatre does not wrap the site in a generic rectangular cage.
- Façade scaffold pieces appear only where the authored level transition needs them and are absent at the completed level.

### 4a. Camera calm

- A build hold, build burst, or seven-second recent-build cooldown locks the current construction shot.
- Once the modal is quiet, a small target-preserving orbit may vary the POV without changing landmarks.
- Outside the modal, ambient POV motion waits for 40 seconds of board inactivity and cancels on interaction.

### 5. Scale contract and release evidence

- The Island Visual Production Contract and 120-Island Production System document additive deltas, façade-scaffold rules, robot-motion ownership, occupancy, camera calm, and phone/reduced-motion QA.
- Production build, robot 3D contract, Island architecture guard, and `git diff --check` pass.
- A live phone modal screenshot and timed transform trace demonstrate the shipped behavior.

## Budgets and safety boundary

- Keep the construction crew within the existing low-quality live modal tier.
- Prefer merged or instanced façade-scaffold geometry and shared materials.
- Façade scaffolding must not materially raise the current construction scene beyond the existing mobile renderer envelope.
- No deployment, merge, external publishing, deletion, or gameplay mutation is authorized by this contract.

## Rollback and recovery

- Robot transform ownership, occupancy, personality choreography, level-delta reveal, and façade scaffolding remain separate reversible modules.
- If additive matching fails for a landmark family, fall back to current-level opaque plus target-level staged opacity for that family; do not hide the current building.
- If façade scaffolding exceeds mobile cost or obscures the building, reduce or hide those authored pieces rather than wrapping the site in a replacement cage.

## Stop conditions

Stop and request direction only if implementation requires gameplay-state changes, destructive asset replacement, deployment, or island-specific source evidence that cannot be inferred safely from the existing authored world.

## 2026-08-22 vertical-slice evidence — Island 001 Lantern Hatchery

The first landmark-specific implementation now covers all three Hatchery transitions:

| Transition | Retained funded meshes | Additive source meshes | Runtime reveal batches | Five-stage distribution |
| --- | ---: | ---: | ---: | --- |
| L0→L1 | 0 | 193 | 27 | 25 / 95 / 52 / 16 / 5 |
| L1→L2 | 113 | 108 | 24 | 17 / 9 / 56 / 17 / 9 |
| L2→L3 | 144 | 154 | 29 | 19 / 23 / 44 / 39 / 29 |

- Island 001 construction previews bypass finished-level material batching so
  the delta detector can compare semantic source meshes. The funded level is
  compacted again after comparison, while additive geometry is merged by
  stage and material for the live preview.
- Finished L1/L2 Hatcheries no longer contain scaffold geometry. Two compact
  entrance-façade scaffold towers, one side crane and one material cache are
  authored only into the active target preview; they hide in resting mode and
  at progress `1`.
- The five reveal stages are foundation/terrace, lower shell/entrance,
  sanctuary wings/egg cradles, lantern tower/dome, and crown/light finish.
- Live QA reported exact foundation contact (`verticalError: 0`) for every
  transition and zero pair/building occupancy violations in the sampled
  working and resting frames.
- Crew scale changed from `0.58` to `0.34`; the robots now read as miniature
  builders instead of peer-scale buildings.
- A simultaneous modal-focus and camera-lock mount now snaps the initial
  landmark shot once, preventing the lock from canceling the focus transition
  and leaving construction stranded in overview.
- L0→L1 target geometry fell from 193 reveal drawables to 27 stage/material
  batches. L1→L2 uses 24; L2→L3 uses 29.

Current honest review action: `refine-code`. The Hatchery transitions are
coherent from the sampled front, side, rear and opposite-side views and are
ready for continued polishing, but Island 001 is not complete until the Habit,
Mystery, Wisdom and Boss landmarks receive the same authored transition pass.

## 2026-08-22 second vertical slice — Island 001 Rhythm Tree Sanctuary

The Habit landmark now uses the same additive contract with a tree-specific
growth order and construction dressing:

| Transition | Retained funded meshes | Additive source meshes | Runtime reveal batches | Five-stage distribution |
| --- | ---: | ---: | ---: | --- |
| L0→L1 | 0 | 127 | 25 | 33 / 49 / 28 / 2 / 15 |
| L1→L2 | 74 | 77 | 17 | 20 / 6 / 22 / 4 / 25 |
| L2→L3 | 73 | 119 | 23 | 20 / 21 / 9 / 33 / 36 |

- The five phases are terrace/root bed, roots/heart/lower trunk, inhabited
  arcade/trunk sanctuary, branch lattice/upper crown, and canopy/crystal
  fruit/lantern light. Leaf materials are explicitly held for phase five so
  foliage cannot appear before its supporting branches.
- The old four-tower radial scaffold and generic crane were removed from the
  funded L1/L2 landmark. Active construction uses one narrow leaning rootwood
  ladder, one pruning platform, and a compact branch hoist with seed basket.
  This temporary dress hides in resting mode and never enters a finished level.
- A prior L3-only root scale made every funded mesh jump in size and caused a
  false `0` retained result. All tree levels now share one stable landmark-space
  scale; L2→L3 retains 73 funded meshes and reveals only the ancient-oak growth.
- Live working and resting QA at phone workbench scale reported exact grounding
  (`verticalError: 0`) and zero pair/building occupancy violations for all three
  transitions. Manual orbit checks covered front, side, opposite and rear
  silhouettes without detached roots, floating staging, or canopy collapse.
- The two landmark-specific contract tests pass through the targeted esbuild
  harness. Production Vite build, robot-family contract, architecture guard,
  and whitespace check pass. The full Island Run suite is still blocked before
  execution by the pre-existing `checkins.ts` PostgrestError shape and two
  `zenGarden.ts` `number`-to-`never` errors.

Current honest review action: `continue`. The Rhythm Tree construction slice is
coherent enough to move to the next Island 001 landmark; it is not a claim that
the whole island construction experience has reached 10/10.

## 2026-08-22 third vertical slice — Island 001 Echo Lens Observatory

The Mystery landmark now constructs as an optics installation rather than a
generic masonry site:

| Transition | Retained funded meshes | Additive source meshes | Runtime reveal batches | Five-stage distribution |
| --- | ---: | ---: | ---: | --- |
| L0→L1 | 0 | 61 | 17 | 25 / 22 / 1 / 6 / 7 |
| L1→L2 | 31 | 43 | 15 | 17 / 2 / 11 / 6 / 7 |
| L2→L3 | 45 | 72 | 17 | 23 / 9 / 17 / 9 / 14 |

- The phases are foundation/instrument bed, main drum/lower tower shells,
  domes/lens chamber, telescope axes/armillary/canopy frame, and celestial
  globe/lenses/stars/final light. Crystal, warm-glow, and celestial materials
  are held for the final phase so fragile optics cannot precede their mounts.
- The permanent scaffold attached to unfinished telescope towers and the old
  five-tower radial site scaffold were removed from funded L1/L2 models.
- Active construction uses one foreground lens-transfer rail with sleepers,
  carriage and uncalibrated optic, plus one compact two-post maintenance gantry
  serving the eastern telescope. The service deck, pulley and counterweight are
  temporary and hide completely while the modal rests.
- Live phone-workbench QA covered working, resting, left-orbit, opposite and
  rear views. All transitions reported `verticalError: 0`, zero pair/building
  occupancy violations, and no browser runtime errors.
- Hatchery, Rhythm Tree, and Echo Lens targeted construction tests pass. The
  production Vite build also passes; full-suite execution retains the known
  unrelated `checkins.ts` and `zenGarden.ts` TypeScript blockers.

Current honest review action: `continue`. Echo Lens reads coherently and its
temporary equipment is specific to optics work. Wisdom/Star Archive and the
Boss/Sun Court remain before Island 001 can receive a whole-island score.

## 2026-08-22 fourth vertical slice — Island 001 Sava's Star Archive

The Wisdom landmark now assembles as a functioning archive and celestial-study
worksite rather than retaining generic construction scaffolding after funding:

| Transition | Retained funded meshes | Additive source meshes | Runtime reveal batches | Five-stage distribution |
| --- | ---: | ---: | ---: | --- |
| L0→L1 | 0 | 115 | 20 | 30 / 23 / 22 / 12 / 28 |
| L1→L2 | 62 | 100 | 15 | 23 / 20 / 25 / 6 / 26 |
| L2→L3 | 118 | 85 | 18 | 24 / 8 / 15 / 12 / 26 |

- The phases are foundation/archive bed, reading hall/shelves/lower turrets,
  tower shells, great codex/domes/armillary instruments, and the final books,
  crystals, finial and illumination. The codex is explicitly assigned to the
  fourth phase so its L1→L2 expansion reads as scholarly installation rather
  than disappearing into the masonry reveal.
- The old permanent radial scaffold, generic crane and supply piles were
  removed from funded L1/L2 models. Active work uses a short pair of folio
  rails, a sleeper-supported page carriage with unbound sheets, and one narrow
  scribe gantry with service deck, pulley line and binding clamp.
- All manuscript-handling equipment is marked temporary. It appears only in
  working mode and hides completely while the build modal rests; completed
  landmark models contain none of it.
- Live phone-workbench QA covered every level transition, working and resting
  states, the authored left/right cameras and a manual full orbit through the
  rear and opposite-rear silhouettes. Every sample reported
  `verticalError: 0`, zero pair/building occupancy violations, and no browser
  runtime errors.
- Hatchery, Rhythm Tree, Echo Lens and Star Archive targeted construction tests
  pass. The final Island 001 landmark-specific slice is Aureon's Sun Court.

Current honest review action: `continue`. The Archive is coherent and its
construction language now belongs to books and instruments. Island 001 still
needs the Boss/Sun Court pass and whole-island build-modal QA before it can be
scored as a complete construction experience.

## 2026-08-22 fifth vertical slice — Island 001 Aureon's Sun Court

The central Boss landmark now commissions as an open ceremonial instrument and
council space, preserving its deliberately low silhouette:

| Transition | Retained funded meshes | Additive source meshes | Runtime reveal batches | Five-stage distribution |
| --- | ---: | ---: | ---: | --- |
| L0→L1 | 0 | 74 | 14 | 39 / 22 / 4 / 4 / 5 |
| L1→L2 | 45 | 73 | 13 | 16 / 14 / 25 / 9 / 9 |
| L2→L3 | 60 | 166 | 16 | 16 / 22 / 74 / 29 / 25 |

- The phases are foundation/compass court, sun-dial rays/socket/inlay,
  arcade/pylons/council furniture, ceremonial caps/frieze/gateways, and the
  sun core/crystals/crests/final light. Raised goldwork and all live light
  materials have explicit late-phase ownership.
- Active construction uses one short radial prism track with sleepers and a
  movable prism carriage, plus one low asymmetric collimator deck with halo,
  plumb line and weight. The rig leaves the circular court open and does not
  become a generic scaffold perimeter.
- The alignment equipment is working-only and absent from completed levels.
  Resting robots return to separated hover positions around the court while
  the funded geometry stays fully grounded.
- Live QA covered all transitions, resting mode, authored left/right cameras,
  and a manual full orbit around the restored L3 council table and gateways.
  Every transition reported `verticalError: 0` and zero pair/building
  occupancy violations. A clean reload added no browser runtime errors.
- All five Island 001 landmark-specific construction contract tests now pass.
  Production Vite build, robot-family contract, architecture guard and
  whitespace checks pass for the combined implementation.

Current honest review action: `continue`. The per-landmark construction system
is complete for Island 001. The remaining gate is a holistic pass in the real
build modal: pacing between clicks, inactive camera behavior, all three robots
sharing the site, and transition handoff across the five landmark families.

## 2026-08-22 holistic Island 001 release gate

The complete build-modal system now passes the cross-landmark gate rather than
only five isolated landmark reviews:

- The live crew honors the authored `0.34` scale exactly. The previous theatre
  clamp silently raised it to `0.40`, which was why the robots still felt too
  large beside the buildings.
- Robot roots no longer receive a shared high-frequency work pulse. Working
  vibration is restricted to the tip axis of contact-capable tools; resting
  workers retain only the slow authored hover.
- Collision resolution moves an overlapping worker tangentially around the
  landmark's legal shell. It no longer alternates between a Cartesian pair
  push and an inward-building correction during relocation.
- A deterministic matrix exercised all seven construction phases for five
  representative Island 001 envelopes over 12,600 frames. It reported zero
  robot/robot overlaps, zero landmark penetrations, and `0` settled root drift.
- Low LOD was reduced from 42,618 to 39,922 triangles without changing the
  133,422-triangle high model. The busiest construction theatre is 2,216
  visible triangles / 14 draw calls; the combined live-modal addition is
  42,138 / 72, within the 48,000 / 72 release ceiling.
- Build input and its recent-action tail use the shared seven-second camera
  lock constant. The open inactive modal then permits only a gentle orbit of
  the same landmark; main-board ambient POV changes remain delayed for forty
  seconds.
- The real phone-modal pass covered click-driven working, settled resting and
  camera ownership. The earlier per-landmark passes cover authored left/right,
  rear and opposite views for every transition; the final numeric pass closes
  the rare between-sample collision case found during longer running.

Release evidence: robot-family static contract passes; the focused Island 001
contract passes 41/41; the production Vite build passes; Island Run architecture
guards report zero violations and three existing allowlisted warnings; and
`git diff --check` passes. The broad Island test entrypoint remains blocked
before execution by unrelated existing generated-Supabase typing failures. The
current full TypeScript report includes PostgrestError `toJSON` mismatches and
`RejectExcessProperties`/`never` failures in goals, actions, contracts,
projects, todos, check-ins and Zen Garden services; none of those files are
part of this construction slice.

Current honest review action: `approve`. Island 001 is the completed reference
implementation for the remaining islands: authored additive stages, local
temporary staging, miniature non-colliding workers, input-owned camera timing,
and a repeatable runtime budget/occupancy gate.
