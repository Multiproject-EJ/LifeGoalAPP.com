# Island 020 Lava Labyrinth — complete production Gauntlet

Date: 2026-08-30

Status: production-complete hybrid; user-directed lava-volume v3 approved after a hard-budget correction

Owner: Eivind

## Mission and observable outcome

Ship a unique, source-faithful, interactive 3D Arena world for runtime Island 020. On a portrait phone the first view must immediately read as a black-stone Lava Labyrinth: the full canonical route circles a tall Crucible Citadel, four distinct L1–L3 landmarks occupy stable terraces, lava and forge systems feel alive without obscuring gameplay, construction robots visibly build additive geometry, and the signature mission culminates in a large unobstructed Arena-awakening payoff.

## Sources of truth

1. Eivind's exact `New 020.png`, preserved as `docs/visual-references/island-020-lava-labyrinth/020-source.png`, SHA-256 `ed22a7b4b8f1d1a1ab729c982c95898380fd7a2aa3852dfb7cd72d78854f87b8`.
2. Canonical gameplay, architecture, camera, visual-production, source-fidelity, and content-pack contracts.
3. This Gauntlet, the approved part inventory, img2threejs state/spec, implementation, and captured evidence.

The source controls visible composition, material language, silhouette, terrain, atmosphere, and landmark character. Runtime Island 020 controls numbering. Canonical systems control the 36 tiles, UI, Arena cadence, progression, currencies, rewards, and writes.

## Product identity and planned retheme

Approval of this admission package will authorize replacing Island 020's placeholder catalogue identity `Golden Sands` / `Golden Winds Cup` with:

- Island: **Lava Labyrinth**
- Arena event: **Blaze Trials Cup**
- Theme: pressure, steadiness, and choosing a deliberate path under heat
- Central Arena guardian: **The Pyre Sentinel**, a secondary-inferred obsidian forge creature designed only after approval

This is an Arena island because runtime 020 is every fifth island. The source's Arena language therefore aligns with the canonical cadence even though its baked island number does not.

## Signature mission — Forge the Four Firebridges

The Crucible Citadel's four radial bridges have collapsed into molten channels. Eight route-relative **Ember Cores** appear at collision-free mission pickup positions. The player spends two cores at a time through one canonical mutex-protected action to temper the next bridge.

Each of four monotonic stages produces one deterministic world change:

1. chains tighten and the north basalt span rises through the lava;
2. the east span locks while molten seams cool from yellow to orange to black;
3. the south span assembles with forge-hammer impacts and vent pulses;
4. the west span completes, all four Crucible Gates ignite in sequence, the tower crown opens, and the Blaze Trials Arena awakens.

The mission is a parallel signature restoration and presentation loop; it does not bypass canonical stop access, tickets, boss resolution, building completion, or island-clear rules. The committed gameplay state always precedes presentation. Closing a modal, changing focus, reloading, or using reduced motion cannot lose or repeat a spend. Reduced motion snaps each bridge to its committed stage with one restrained glow and no flashing particles.

## Build and ambience animation contract

- Every landmark L1 is a finished small basalt/iron structure; L2 adds an operational core; L3 adds a crown, active vents, and restrained premium light without footprint drift.
- Resting construction mode: robots remain outside the landmark shell, with slow tool checks, rare greeting turns, and quiet forge breathing.
- Working mode: bounded relocation to authored stations, hammer/tong contact, small sparks, dust, material carries, and façade scaffolding owned by the landmark level factory.
- Commissioning: additive parts overshoot and settle, one warm flash, a small ember burst, then stable geometry. The funded structure, hit targets, board, token, and camera never scale or move.
- Ambient elapsed-time systems: lava flow, ember drift, heat shimmer, forge bellows, chains, distant smoke, rare falling sparks, and sparse forge inhabitants. Reduced motion freezes or simplifies all decoration while preserving world state and readability.

## Non-negotiables and forbidden shortcuts

- No gameplay writes in React UI; all mission mutations use canonical action services and action mutexes.
- No fake route, HUD, text, counters, or tile symbols from the source.
- No reused Island 005/007 geometry with a lava recolour. This is a new-base world.
- No disconnected floating masonry, paper-thin rear elevations, camera-following volcanoes, or emissive wash that erases black-stone form.
- No micro-detail, particles, creature polish, or animation polish before the owning naked macro form passes every required view at 0.85.
- No generated study may override a visible source contour.
- No OneDrive rewrite, merge, publish, deploy, paid service, or production-phone install without separate authority.

## Milestones and acceptance evidence

1. **Admission:** immutable source, provenance, blank baseline, 32-part inventory, hierarchy, sockets, ambiguities, mission, and first slice presented for approval.
2. **Reference/spec:** img2threejs suitability, 3×3 detail inventory, material evidence, strict sculpt spec, exact landmark crops, and approved secondary-inferred sheets only where hidden design matters.
3. **Representative slice:** central Crucible Citadel/Arena family in a minimal clay island shell; source-angle, left, right, rear, top-clearance, semantic/clay, and phone captures; worst view at least 0.85.
4. **World and landmarks:** complete shell/horizon plus Hatchery → Habit → Mystery → Wisdom; each family passes macro before surface and coherent L1–L3 growth.
5. **Mission and animation:** four committed Firebridge stages, anticipation curve, replayable cinematic, build robots, commissioning, ambience, reduced motion, and separate board/swept-envelope clearances.
6. **Integration:** unique world route, Lava Labyrinth catalogue and Blaze Trials presentation, canonical action/state integration, mission/build/routing tests, and no architecture-guard regression.
7. **Final:** source/current phone comparison, overview/orbits/focus/levels/motion evidence, TypeScript/build/Island Run tests, performance budgets, part coverage, and final quality review.

## Budgets

- Delivery: new-base Standard island, target 2–5 MiB island delta; explicit review above 8 MiB.
- High scene ceiling: approximately 175 draw calls, 180k triangles, 50 FPS average, p95 at most 29 ms, slow frames at most 15%.
- Visual: naked macro and critical required views at least 0.85; final source fidelity overall at least 0.80, every dimension at least 0.75, zero critical mismatches.
- Correction economics: one blockout plus at most one bounded correction per construction family; retire/escalate according to the 3D Asset Gauntlet.

## Rollback and recovery

All work lives on `codex/island-020-lava-labyrinth` in the dedicated worktree. Accepted goals, captures, reviews, and decisions are immutable/versioned. Gameplay and presentation commits remain separable. A failed family is retired or replaced without changing frozen siblings or canonical state. The dirty shared checkout is not modified.

## Admission decision

Approved by Eivind on 2026-08-30:

1. the 32-part hierarchy and boundaries in `part-inventory.v1.json`;
2. the runtime retheme from Golden Sands/Golden Winds to Lava Labyrinth/Blaze Trials;
3. **Forge the Four Firebridges** as the signature mission;
4. the central Crucible Citadel/Arena family (`p07`–`p10`) as the representative first slice.

Production proceeds without routine re-confirmation. A new decision is requested only for conflicting exact views, a hidden design that materially changes silhouette/animation, a frozen-part change, or a materially different external/paid/neural/manual-DCC route.

## Final production and Quality-Lord record

The implementation is functionally complete on the dedicated branch: Lava Labyrinth and Blaze Trials routing are integrated, Forge the Four Firebridges uses canonical action/state services, eight Ember Cores fund four monotonic two-core stages, bridge replay is cumulative, reduced-motion poses settle synchronously, all 32 runtime parts are named, and the dedicated ceremony portrait contains no copied source UI. The complete Island Run service suite passes 1,916/1,916; both TypeScript projects and `git diff --check` pass. Runtime evidence reports 164 authored estimated calls, 197 logical instances, and zero unnamed meshes.

The independent final v021 visual review scores identity 0.70, structure/assembly 0.77, materials/lighting 0.58, phone readability 0.73, cross-view coherence 0.84, and runtime/mission integrity 0.95. The approved strict 0.85 likeness gate therefore does not pass. The current procedural-radial family used its single bounded correction and is retired under the Gauntlet economics; it must not be described as 100% source-faithful.

That decision was resolved by Eivind's 2026-08-30 reply, “alright, keep going,” after the recommended option was stated explicitly. Family 2 is therefore approved as the second and final visual family: a source-led layered 2.5D / Three.js hybrid. A UI-free environment plate carries the source's dense black-stone labyrinth, Crucible Citadel, continuous cliff strata, lava falls, and volcanic horizon; the canonical 36 tiles, token, hit targets, Forge the Four Firebridges machinery/effects, camera transitions, and state remain live Three.js/runtime systems. The rejected procedural family and its v021 evidence remain immutable.

Family 2 is not permitted to become a flat screenshot replacement. Its acceptance evidence must show the authored environment plate subordinate to the real route and interaction layer, live mission state changing above it, foreground and midground geometry supplying parallax/occlusion, and a stable bounded camera envelope. The first naked macro capture plus at most one bounded correction governs this final family.

## Family 2 final acceptance

After its one bounded correction, Family 2 passed the independent Quality-Lord gate. Scores: source identity 0.91, composition 0.89, materials/atmosphere 0.92, phone readability 0.87, live tile/mission separation 0.92, hybrid depth 0.88, animation/mission integrity 0.95, runtime budget 0.90, and fixed-final-angle stability 0.98. The reviewer verified that Overview is the only enabled presentation; rotation, zoom, landmark focus, tour, POV authoring, and non-overview programmatic camera paths are locked. No regression was observed in the source-led representation.

Final verification is 1,917/1,917 Island Run service tests passing, both application and test TypeScript projects passing, and `git diff --check` clean. Observed stage-four runtime evidence was approximately 55 FPS, 167 draw calls, and 45,000 visible triangles. Island 020 is therefore production-complete in its dedicated worktree and branch. Merge, deployment, publication, and device installation remain outside this production record.

## Bounded lava and heat-lighting quality loop

Eivind reopened the accepted hybrid on 2026-08-30 with one explicit visual objective: make the lava read as proper flow and make the world visibly illuminated by its heat. The accepted source-led composition, strict final camera, live route, token, rewards, hit targets, mission state, landmark hierarchy, and representation family remain frozen.

The baseline proves the gap: the plate contains strong molten colour, but its lava pixels are static and the existing runtime point lights cannot illuminate a background texture. The only authorized correction therefore adds one elapsed-time GPU layer over the approved plate, masks flow and highlight energy to molten pixels, derives restrained orange-red heat bounce into adjacent basalt, and slowly modulates the existing forge/underglow lights so live route and mission geometry share the same thermal light. Reduced motion freezes the field at a deterministic pose. The budget is one draw call, two triangles, zero new texture bytes, at least 50 FPS average, and at most 175 draw calls.

Acceptance requires t0/t6 phone evidence with directional travel, adjacent basalt heat response, preserved black-stone and route readability, reduced-motion proof, tests/typechecks, and one independent Quality-Lord action. This pass receives one implementation correction only; a repeated dominant defect stops the loop rather than accumulating polish around it.

## Lava and heat-lighting final acceptance

The bounded pass is complete and accepted. One shared-texture shader quad now moves cliff lava with gravity and carries upper labyrinth channels centre-outward; a neighbouring-molten-pixel halo illuminates adjacent basalt without a full-frame orange wash. Existing forge and under-island lights breathe with slow thermal variation, and reduced motion freezes both the lava field and shimmer at a deterministic pose. The approved final camera, source-led plate, 36-tile route, gameplay mission, token, rewards, hit targets, and landmark hierarchy did not change.

Deterministic t0, t6, and reduced-motion captures are stored under `.img2threejs/island-020-lava-labyrinth-hybrid-v2/review/`. The overlay costs one draw call, two triangles, and zero new texture bytes; the live low-tier scene measured 163 calls and 31k visible triangles, below the 175-call ceiling. Verification finished at 1,918/1,918 Island Run tests, a clean camera-kit validator, zero architecture violations, and clean diff whitespace.

The independent Quality Lord scores source identity 0.92, lava flow readability/direction 0.88, heat illumination/local bounce 0.90, route/black-stone readability 0.91, reduced-motion safety 0.99, and performance 0.96. The one permitted implementation correction is accepted with `ACTION: PASS / APPROVE`; Island 020 remains production-complete.

## User-directed lava-volume integration v3

Eivind reviewed the accepted v2 and said it was “much better, but still not there yet” with an explicit instruction to continue. This authorizes one new bounded pass, not a silent rewrite of the accepted family. The v2 evidence remains immutable.

The largest observed mismatch was integration: the plate moved, but molten material still read too much like an animated background and the live route layer remained too neutrally lit above it. V3 first tested cliff-only Three.js volume plus a batched thermal route rim. The visual direction passed, but the independent gate stopped that experiment at a projected 177 high-tier calls against the hard 175-call ceiling, and its regular tubes retained a slight cylindrical risk.

The bounded correction retired both extra renderables. Surface and cliff lava remain registered to the approved plate, where periodic advection, multi-scale ribbons, hot cores, cooling edges, and local heat halos create directional flow and perceptual depth. Thermal contact now uses the existing tile materials, adding no route-rim draw call. This is an evidence-led correction, not an overclaim of true camera-parallax volume.

Frozen systems remain the strict camera, source-led composition, 36 canonical tile transforms, gameplay and mission authority, token, rewards, hit targets, landmark hierarchy, and black-stone silhouette. Final v3 adds zero draw calls, zero triangles, and zero texture bytes above accepted v2. Deterministic t0/t6 evidence shows mean absolute phone-scene RGB change `[4.542, 3.803, 3.94]`; reduced motion returns every decorative thermal system to a frozen authored pose.

## Lava-volume v3 final acceptance

The corrected pass is accepted. Live High evidence is 173 calls and 45k visible triangles; Low is 163 calls and 31k, both within the 175-call ceiling. Runtime diagnostics identify centre-outward and gravity-down flow with multi-scale hot-core depth, plus local plate bounce, existing forge lights, and existing-tile emissive response. The 32-part hierarchy remains intact. The strict final camera makes multi-angle capture inapplicable because orbiting would break the approved plate registration.

The independent Quality Lord scores flow direction/readability 0.90, multi-scale hot-core depth 0.88, heat illumination/local bounce 0.91, no-orange-wash control 0.95, route/black-stone readability 0.92, pipe/spoke-artifact avoidance 0.99, reduced-motion safety 0.99, and mobile performance 0.98. The largest remaining mismatch is that lava depth is perceptual plate-space depth rather than true camera-parallax volume; under the frozen source-led hybrid representation this is non-blocking. Island 020 remains production-complete.

## Approved Iron Skiff escape mission v4

Eivind explicitly reopened the mission on 2026-08-30 and approved replacing **Forge the Four Firebridges** with **Escape the Lava Labyrinth**. The player now forges a compact riveted Iron Skiff at the summit, opens the molten sluice, steers through three readable Level-3 labyrinth junctions, descends the front lavafall, and is caught by the Expedition Ship's magnetic extraction cradle.

The ordinary board controller temporarily becomes left/right steering paddles plus a hold-forward throttle joystick only while the skiff run is active. This control state is presentation-only. The canonical staged action commits before the run, legacy Firebridge progress migrates monotonically, and closing or reducing motion cannot lose or repeat the gameplay result. The run is forgiving and guaranteed to extract: steering changes the visible route and response, but it does not create a death loop after committed progress.

The Level-3 visual target is an impressive functional labyrinth rather than a decorative wall ring: three connected concentric families, elevated brass-capped junction towers, readable sluice gates, launch rails, portcullis silhouettes, and one clear summit-to-cliff molten escape stream. The Iron Skiff must read as a blackened foundry escape pod with ceramic shielding, ember-glass visor, cooling veins, steering fins, and magnetic collar—not a wooden canoe.

This pass must retire/reuse the existing Firebridge mission budget and remain at or below 175 high-tier draw calls. The canonical route, token, tile rewards, five stops, build funding, source-led fixed camera, and gameplay state ownership remain frozen. Acceptance requires save-migration tests, controller lifecycle tests, L3 labyrinth structural evidence, skiff/extraction runtime evidence, reduced-motion proof, performance diagnostics, and an independent Quality-Lord action.

## Iron Skiff escape v4 final acceptance

The bounded mission pass is accepted. Island 020 now collects eight Heatshield Plates and forges four cumulative Iron Skiff systems. The Level-3 build adds a summit launch davit, three readable brass-capped gatehouse junctions, a guided molten channel over the front lavafall, and an enlarged Expedition Ship with magnetic cradle and tether. The completed skiff is a compact black-iron/ceramic foundry craft rather than a wooden boat.

During the run, the footer becomes hold-left and hold-right steering paddles plus a hold-forward throttle joystick, with A/D/W, arrow and space-key equivalents. Steering creates damped lateral response at the junctions; throttle increases speed; gentle auto-forward guarantees extraction. A one-shot completion consumer commits the extraction through the canonical action service, restores the ordinary controller, and opens the extraction payoff. Reduced motion resolves directly to the extracted pose.

The final live medium scene measures 172 calls and 42k visible triangles at the 351×773 workbench renderer, within the 175-call ceiling. The bounded correction consolidated the completed skiff to one black-iron static batch plus one separate furnace glow, improving the preceding 180-call build without weakening its silhouette. The Quality-Lord scorecard is 0.90 globally, with source identity/composition 0.92, Level-3 labyrinth readability 0.89, skiff/extraction silhouette 0.88, lava/heat integration 0.91, mobile readability 0.87, gameplay/controller integrity 0.98, and performance 0.98. `ACTION: CONTINUE / ACCEPT PASS`.

The approved fixed-camera hybrid means the dense rear environment plate cannot be honestly orbit-scored; its remaining plate-space depth is explicitly retained as the largest approximation. Live mission geometry is non-planar, named, part-covered and contract-tested. Legacy `forge-four-firebridges` saves migrate monotonically to `escape-lava-labyrinth`; no gameplay write was added to React.

## Main-promotion mission gate — 2026-09-05

The production sequence now treats the Level-3 labyrinth and the Iron Skiff escape as two explicit canonical milestones. The long mission is locked and its eight Heatshield Plates are hidden and uncollectible until all five ordinary objectives, all five Level-3 builds, and the Hatchery egg are resolved. That solved-labyrinth edge persists `startedAtMs`, opens the emergency extraction briefing, and reveals the plate route. Four two-plate forge actions assemble the skiff; forging alone does not complete the island. Only the one-shot Expedition Ship extraction persists `finaleCompletedAtMs`, unlocks the island-clear celebration, and permits travel.

The launch and extraction actions are idempotent, reload-safe, and conflict-merge monotonically. React and Three.js remain presentation/controller layers and do not write gameplay state directly. Final promotion verification passed 1,921/1,921 Island Run tests, application and test TypeScript checks, the production Vite build, whitespace validation, and the Island Run architecture guard with zero violations (three pre-existing allowlisted warnings).
