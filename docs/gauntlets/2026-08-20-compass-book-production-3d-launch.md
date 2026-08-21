# Compass Book production 3D launch gauntlet

**Date:** 2026-08-20  
**Status:** Implementation and device-proof tooling complete in branch; launch remains gated on recorded physical-device and live-environment proof
**Branch:** `codex/compass-book-launch-3d-20260820`  
**Clean worktree:** `worktrees/compass-book-launch-3d-20260820`

## Mission and measurable outcome

Ship the existing Compass Book as a launch-ready HabitGame surface without replacing its content, persistence, or accessibility model. The launched book must have a production Three.js physical-book layer connected to the real Reading/chapter/navigation state, retain an equivalent DOM reading experience, and fall back safely when WebGL or motion is unavailable.

Launch closure means all of the following have evidence:

1. The Reading, six canonical chapters, 120 activities, Quest Ledger, goal/habit bridges, Wisdom proposal loop, local/cloud persistence, and demo isolation still pass their focused tests.
2. The production application—not only a developer lab—renders the living 3D book and follows real cover, page, and chapter state.
3. The 3D chapter tabs can navigate the real book while equivalent DOM controls remain keyboard and screen-reader accessible.
4. The modal is rendered at the viewport root, centered in the visible viewport, locks background scroll, restores focus, supports Escape, reduced motion, and WebGL fallback.
5. Phone and desktop evidence records visual quality, direct navigation, failure fallback, and frame/call/triangle budgets.
6. Feature availability describes the experience that is actually shipped; no “coming soon” contract remains around a live entry point.

## Product authority and source order

1. The user's explicit launch decision in this task: production 3D is mandatory.
2. The current six-chapter product and code on `origin/main`.
3. `docs/gauntlets/2026-08-11-compass-book-3d-reference-pack.md` for the approved hybrid living-book contract and visual target.
4. `docs/gauntlets/2026-08-11-habit-wisdom-compass-loop.md` for the proposal-only Wisdom loop.
5. Canonical Island Run contracts when reading Island position or sharing application infrastructure.
6. Historical/unmerged investigations only as design evidence, never as current product authority.

## Non-negotiable launch rules

- React/DOM owns book content, form controls, focus, scroll, persistence, and screen-reader meaning. Three.js owns the physical book, spatial transitions, lighting, relief, and pointer targets.
- There is one canonical Compass Book state. The 3D layer receives presentation state and emits navigation intent; it does not persist answers or mirror gameplay state.
- The book reads Island position only. No Island Run gameplay write path may be added.
- AI may propose drafts; it may not silently persist player meaning.
- No invented chapter copy, progress metrics, or signal mappings from prototypes enter production.
- Direct Reading/chapter navigation remains available. Production behavior cannot require a decorative animation to finish.
- Canvas is decorative to assistive technology. Every 3D action has an equivalent accessible DOM control.
- Reduced motion shortens or removes physical transitions. WebGL failure displays the complete flat book, not an error screen.
- Production code must not depend on the developer lab, capture automation, automatic downloads, or localStorage evidence controls.
- No schema migration is required for 3D presentation. Legacy Personality/Shield data is preserved until a separately reviewed mapping or archival decision exists.

## Unmerged branch and worktree audit

| Source | Useful evidence | Decision |
| --- | --- | --- |
| Root stale worktree | Portal-to-`document.body`, scroll lock, initial close focus, focus restoration | Manually port onto current main; never copy the stale component wholesale |
| `codex/3d-egg-hatch-pilot` (`e606` worktree) | More detailed cover binding/rivets; before/after capture harness; phone layout tuning | Extract geometry and QA ideas only; capture controls remain dev-only |
| `codex/island1-3d-world-pack-20260810` worktree | Chapter-tab DOM treatment and three existing phone screenshots of the Habit/Wisdom loop | Preserve evidence where relevant; tab treatment is superseded by direct 3D interaction |
| `codex/journey-disc-arena` worktree | Raycastable fore-edge hit meshes, chapter selection APIs, page-state transitions, first two relief prototypes, capture naming | Rebuild against real page IDs and real content; reject hardcoded copy/metrics and automatic downloads |
| `origin/codex/investigate-compass-book-curriculum-architecture` (`ec934c1d`) | Curriculum validation matrix and data-authority rationale | Historical evidence; recommendations are mostly fulfilled, not a code merge |
| `origin/claude/compass-chapters` (`70c5de27`) | Original intent for legacy Personality and Shield material | Historical retention map only; obsolete 11-chapter structure must not replace the canonical six chapters |
| Other Compass-path commits | Final files are identical or patch-equivalent to `origin/main` | No action |

## Execution slices and gates

### Slice A — release shell closure

- Portal the modal to `document.body`.
- Lock and restore background scroll, focus the close control, and restore prior focus on exit.
- Add regression checks for portal/focus/scroll-lock behavior.
- Reconcile feature availability with the real entry point.

**Gate:** focused Compass tests and TypeScript build pass; modal guardrail has automated evidence.

### Slice B — production 3D foundation

- Move reusable physical-book construction out of the developer-only boundary.
- Add a production shell that is lazy, failure-contained, and DOM-first.
- Connect cover state, current page, turn direction/duration, quality tier, and reduced motion to the real `CompassBookScreen`.
- Keep the lab as a consumer of the reusable model where practical.

**Gate:** real Compass state drives the production canvas; forced WebGL failure and JS-disabled-canvas assumptions leave the DOM book usable.

### Slice C — direct spatial navigation and identity

- Add raycastable Reading/chapter tab hit areas mapped to canonical page IDs.
- Add binding/rivet detail and approved chapter relief progressively, without text textures.
- Provide visible spatial response for hover/focus-equivalent selection while preserving DOM tabs.

**Gate:** all canonical destinations are reachable directly in both layers; no prototype data enters production.

### Slice D — verification and launch evidence

- Run focused Compass tests, architecture guards, typecheck/build, and modal checks.
- Capture desktop and 390×844 phone states: closed/open, Reading, representative chapter, direct tab navigation, reduced motion, low quality, and forced fallback.
- Record renderer statistics and physical-device status explicitly.
- Update this gauntlet and the 3D reference pack with final evidence and remaining deployment-only checks.

**Gate:** no unresolved P0/P1 launch defect; any unavailable physical-device or live-environment proof is labeled, never inferred.

## Budgets

- Cover open: 650–900 ms at full motion.
- Page turn: 420–620 ms at full motion; direct destination remains immediate for state and accessibility.
- Selection illumination/response: under 300 ms.
- High tier: target at least 50 FPS on a supported physical iPhone.
- Low tier: target at least 55 FPS on a supported physical iPhone.
- Low tier must materially reduce draw calls/triangles/effects and remain visually identifiable.
- No new network request is required to open the procedural base book.

Browser measurements are evidence, not a substitute for the physical-device gates.

## Rollback and stop conditions

- The runtime rollback is the complete DOM book: an internal error boundary or unavailable WebGL disables the canvas while retaining navigation and persistence.
- 3D presentation state is ephemeral, so rollback does not migrate or discard user data.
- Stop implementation if a change requires duplicating Compass persistence, writing Island Run gameplay state, inventing content, silently mapping legacy Personality/Shield records, or weakening the accessible DOM path.
- Stop release and report if the focused data tests regress, the canvas can block input, the fallback is incomplete, or a physical-device claim cannot be evidenced.

## Authority boundary

Authorized now: local code, tests, documentation, evidence capture, and reversible build configuration in this branch. Not yet authorized: merging to `main`, deployment, App Store/Play Store submission, production database changes, deletion/mapping of legacy player data, or writes to live user accounts.

## Handoff record

Final handoff must name the branch and worktree, summarize files changed, list exact verification commands and results, link visual evidence, state device/live-environment unknowns, and provide the safe merge/deploy sequence for separate authorization.

## 2026-08-20 implementation record

Completed in this branch:

- The modal now portals to `document.body`, locks both body and document scrolling through the shared stacked lock, focuses its close control, and restores prior focus.
- Feature availability now matches the real public experience (`live` / `open`).
- The reusable procedural model moved out of the developer-only folder. Production lettering defaults off so runtime words and values remain DOM-owned.
- The production shell is lazy-loaded and failure-contained. It follows the real cover, active page, turn direction/duration, reduced-motion preference, and quality tier.
- The phone launch moment renders the physical closed book above the DOM cover, then hands off to the complete readable DOM. Wide portrait/tablet renders an open physical left page beside the DOM right page.
- Canonical page intent is attached to raycast targets. A visible 3D Chapter II tab navigated the real production screen to `inner_compass`; the DOM tab rail remains the accessible equivalent.
- Low quality removes the duplicate spatial rail and materially reduces renderer work.
- A development-only `compass3d=fallback` switch exercised the same state used by WebGL initialization/context failure; the Reading and focus remained complete.

Automated evidence:

- Focused Compass Book suite: pass.
- TypeScript project build: pass.
- Island Run architecture guard: pass, 0 violations (3 pre-existing allowlisted warnings).
- Vite production build: pass.
- `scripts/check-compass-book-launch-contract.mjs`: pass.
- Strict img2threejs spec validation: pass, with action-profile warnings retained in the spec.

Visual evidence is under `docs/gauntlets/evidence/compass-book-production-3d-2026-08-20/`:

- `01-phone-closed-3d.png` — real procedural launch cover at 390×844 CSS pixels.
- `02-phone-reading-dom.png` — readable phone state after the 3D opening.
- `03-wide-reading-3d-spread.png` — physical left page + DOM right page.
- `04-phone-webgl-fallback.png` — forced WebGL fallback with complete Reading.
- `05-wide-3d-tab-to-chapter-ii.png` — raycast navigation proof.
- `06-closed-reference-comparison.png` — approved reference vs production cover.
- `07-structural-front.jpg`, `08-structural-left.jpg`, and `09-structural-right.jpg` — current-pass multi-angle proof.
- `10-structural-comparison.png` and `structural-review.md` — structural/form review and explicit mask limitation.
- `11-material-refined-front.jpg` — bounded indigo/gilt correction after the material diagnostic failed.
- `browser-metrics.json` — High 60 FPS / 677 calls / 182,080 rendered triangles; Low 60 FPS / 279 calls / 25,332 rendered triangles. These are browser readings only.

Honest remaining launch gates:

- High ≥50 FPS and Low ≥55 FPS still require a supported physical iPhone run; browser readings cannot close that gate.
- The img2threejs Chapter IV pipeline is complete through blockout, structural, form, material, surface, lighting, interaction, and optimization. Its accepted visual evidence and scores are recorded in the inner-quality Gauntlet; the earlier material-only diagnostic is superseded by those later gated passes.
- Supabase migrations/RLS, signed-in cloud persistence, native AI, and the deployed Player Menu entry require live-environment verification. No production account or deployment was changed in this task.
- Merge, deployment, and store submission remain outside the authority granted to this branch.
- Legacy Personality/Shield records remain preserved. The obsolete 11-chapter plan is only a retention map; no silent migration was introduced.

## 2026-08-21 supported-iPhone proof tooling

The remaining performance gate is now executable rather than a prose-only handoff:

- `?profile=1&compass3dQuality=high|low` mounts a dev-only 30-second panel around the real production Compass screen and shell.
- The run is cancelled whenever Safari/WebView leaves the foreground.
- Reports use the stable `compass-book-3d-device-v1` schema and include average FPS, p95/worst frame time, slow-frame share, viewport, renderer resolution, GPU string when available, active page, and maximum calls/triangles.
- `npm run build:compass-profiler` and `npm run cap:sync:ios:compass-profiler` provide an explicit internal Capacitor proof build; the production service worker is disabled in that build.
- High and Low are forced only in development or the flagged internal profiler build. The player-facing Compass Book never mounts the profiler.
- The complete physical-device procedure and restoration step are in `docs/gauntlets/COMPASS_BOOK_SUPPORTED_IPHONE_PROFILING.md`.

Automated browser smoke evidence verified that the panel mounts at 390×844, reads the forced High tier and real Chapter IV renderer workload, completes a 30-second trace, and correctly returns `FAIL` for a below-target automation-held desktop run. This proves the gate logic, not physical-iPhone performance. The launch gate stays open until the required phone reports are recorded.
