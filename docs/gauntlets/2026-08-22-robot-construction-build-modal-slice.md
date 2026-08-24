# Robot construction theatre — live Build modal slice

## Mission

Prove the three-helper construction theatre inside HabitGame's existing Build modal flow. The Heavy Worker, Project Manager and Mini Artist must work simultaneously around the currently focused real landmark, disappear behind construction cloud cover, and reappear at deterministic work sockets with role-specific tools and poses.

## Authoritative inputs

- `docs/gameplay/ISLAND_RUN_ARCHITECTURE_CONTRACT.md`
- `docs/gameplay/CANONICAL_GAMEPLAY_CONTRACT.md`
- `docs/gameplay/ISLAND_RUN_GUARDRAILS_AND_CONFLICT_MATRIX_2026-04-24.md`
- `docs/gameplay/ISLAND_VISUAL_PRODUCTION_CONTRACT.md`
- `docs/design/robot-family/ROBOT_BUILD_MOVEMENT_CONTRACT.md`
- Existing `BuildModalV2` view model and read-only `islandRunConstructionPresentation` adapter

## Non-negotiable boundaries

- The existing island Three.js renderer owns the construction presentation; do not mount a second canvas in the modal.
- The real targeted landmark is the spatial and visual building. The theatre's lab-only building envelope stays hidden.
- React UI remains presentational. No gameplay writes, local gameplay mirrors, purchase logic, stop progression, or hit-target changes are added.
- Modal close control and build dock remain unobscured and interactive.
- Reduced-motion presentation uses stable keyed poses with no orbit, rapid stroke, spin, or relocation loop.
- Construction crew, tools, materials and cloud systems are non-interactive scene decoration.

## Reversible vertical slice

1. Derive a read-only construction presentation from the existing Build modal state.
2. Pass it to the already-mounted island scene.
3. Anchor one low-detail robot family and one low-detail construction theatre to the target landmark's world-space bounds.
4. Use deterministic cloud-covered relocation cycles around adaptive building work sockets.
5. Validate contracts, focused type/build checks, modal behavior, and multi-angle visual coherence before treating the slice as launch-ready.

## Evidence and budgets

- One WebGL renderer while the modal is open.
- Stable target landmark mapping, including `mystery` to the authored `event` landmark.
- Construction scene appears only while the Build modal/review is active.
- Capture at least front, side, rear and high/underside-revealing views where the live route permits them.
- Record rendered draw calls and triangles with the crew active; mobile acceptance remains subject to the existing island geometry budget.

## Rollback

Remove the `constructionPresentation` prop from the island scene and the construction anchor created in `Island5ThreePilot`. No gameplay or persistence migration is required.

## Stop condition

This slice proves in-game fit and choreography. It does not declare the v17 robot sculpt 10/10 or authorize a production merge. A visual/performance failure remains a launch blocker, not something cloud cover may conceal.
