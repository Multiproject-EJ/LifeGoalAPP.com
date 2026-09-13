# Island 001 — Assembly marina and diplomatic arrivals

Date: 2026-09-13
Status: active vertical slice
Authority: Eivind approved the revised 95% spacecraft / 5% yacht marina concept and requested implementation.

## Mission

After Island 001's General Assembly reaches 100%, present one continuous civic payoff:

1. commission a large waterside entry hall;
2. construct a long, wide floating marina from every side of the island;
3. receive more than 200 mixed visiting craft, overwhelmingly spacecraft;
4. move arriving people from nearby berths through the entry hall and into the Assembly;
5. focus the camera on crisp nearby people while later distant arrivals continue as deliberately soft, low-cost silhouettes.

The player can replay the presentation from a development review button. Before, completed, and timed-sequence evidence must use actual rendered geometry.

## Sources of truth

- Repository `AGENTS.md` and the four Island Run gameplay/visual contracts.
- `docs/gameplay/ISLAND_ACTUAL_3D_PRODUCTION_PLAYBOOK.md`.
- `docs/gauntlets/2026-09-09-island-001-assembly-upgrade.md` for the existing 3 + 5 + 2 Assembly mission.
- `docs/visual-references/island-001-reimagined-20260910/` for approved Island 001 V2 identity.
- `docs/visual-references/island-001-marina-20260913/001-marina-source.png` for the user-approved marina/fleet goal.
- `.img2threejs/island-001-marina/state.json` for resumable visual-production gates.

## Non-negotiables

- Preserve the canonical 36-tile board, token, landmark footprints, Assembly charge state, rewards, save compatibility, and Island 001 V2 landmarks.
- The marina is presentation-only. React and Three.js may read the committed completion state but never write gameplay progress.
- Fleet mix is approximately 95% spacecraft and 5% ocean yachts/boats.
- High quality exposes at least 50 deterministic spacecraft design families and over 200 berth/arrival slots; diversity must come from silhouette and structure, not recolour alone.
- Foreground craft and people are crisp; mid-distance assets are simplified; far arrivals use soft impostors/haze rather than detailed geometry.
- Reduced motion resolves the identical finished marina, populated Assembly, and entry hall immediately without camera travel, construction movement, flashing, or particle motion.
- The ordinary board camera remains readable. The full distant fleet is a cinematic/review view; it must not force the normal board view permanently outward.

## Scope and assumptions

### Included now

- Procedural floating promenade, two-sided dock fingers, fences, junction plazas, and broad entry hall.
- Deterministic 50-family spacecraft catalogue rendered through shared instanced component batches.
- Quality-tiered near/mid/far fleet and crowd representation.
- Staged marina construction, ship arrival, pedestrian movement, Assembly occupancy, and camera choreography.
- Replay button and before/after states in the existing Island 001 review surface.
- Structural/runtime tests, TypeScript/build checks, architecture guard, and rendered desktop/phone evidence where local tooling permits.

### Deferred until this slice is visually accepted

- Unique interiors for individual visiting ships.
- Player interaction with every berth or delegate.
- Authored dialogue for visitors.
- Physical-device performance acceptance and production merge/publishing.

### Explicitly excluded

- New currencies, rewards, progress fields, Supabase writes, store mirrors, or changes to island-clear rules.
- Two hundred hero-detail models.
- Screen-space full-scene blur that harms board/HUD readability.

## Sequence contract

- Existing final excavation and Assembly construction remain first.
- Entry hall commissioning begins with the final Assembly construction tail.
- Marina grows radially from all sides in a fast, staggered outward wave.
- Near ships arrive first; middle ships follow; far arrivals continue during the people-focused camera beat.
- Pedestrians begin once nearby berths are safe, converge on the entry hall, and fill Assembly seating progressively.
- Finished state settles into low-cost ambient motion.

Recommended first timing: 8 seconds existing Assembly build, followed by a 26-second marina/arrival presentation. Timing is presentation-only and may be tuned from rendered review.

## Performance budgets

- Preserve the Island 001 High scene ceiling of roughly 175 draw calls and 180k triangles.
- Marina target: no more than 30 additional visible draw calls on High; repeated decks, rails, docks, people, and ship components use instancing.
- High: 216 perceived craft, 50 deterministic families, up to 96 moving pedestrians and 120 Assembly occupants.
- Medium: at least 144 perceived craft with fewer detailed near craft and occupants.
- Low: at least 72 perceived craft, dominated by mid/far impostors, with the same composition and completion state.
- Far fleet must not allocate separate materials or geometries per ship.

## Milestones and acceptance evidence

1. **Reference and contract** — durable source/prompt/hash, image analysis, img2threejs state, quality contract.
2. **Infrastructure blockout** — entry hall, all-sided marina, >200 berth metadata, clear island/route separation; before/after overview plus left/right/rear.
3. **Fleet LOD** — 95/5 mix, 50-family catalogue proof, near/mid/far cost tiers, no clone rows.
4. **Arrival life** — moving pedestrians, progressive Assembly population, far soft arrivals, reduced-motion final state.
5. **Cinematic and replay** — deterministic Play Marina Arrival button, camera moves wide → entry hall → people/Assembly, interrupt-safe replay.
6. **Integration** — focused tests, Island Run suite, architecture guard, TypeScript/build, draw-call/triangle capture, phone evidence.

## Rollback, recovery, and stop conditions

- Keep work on `codex/island-001-assembly-upgrade-20260909`; do not edit the dirty preservation root.
- New systems remain isolated behind Island 001 Assembly completion and are removable without touching canonical gameplay state.
- Stop scaling detail if the route becomes obscured, the ordinary board camera is no longer playable, High exceeds the agreed ceiling, Low loses the intended composition, or replay can duplicate/lose gameplay state.
- No merge, publication, deployment, purchase, or device-install change is authorised by this contract.

## Handoff

Resume from `.img2threejs/island-001-marina/state.json`, then this file. Inspect the latest actual-render evidence before editing. Fix the largest visible mismatch first and record whether the next action is `continue`, `refine-spec`, `refine-code`, `request-input`, or `stop`.
