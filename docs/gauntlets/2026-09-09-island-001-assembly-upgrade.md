# Island 001 — staged excavation and General Assembly upgrade

Date: 2026-09-09
Status: local implementation delivered; in-game visual and physical-device acceptance pending
Authority: Eivind requested the visual/progression upgrade and confirmed 3 + 5 + 2 charges.

## Outcome

Make Island 001's General Assembly read as a grand diplomatic chamber, with an exciting three-act excavation and fast robotic construction. Improve surrounding island/landmark presentation while preserving the playable route and First Light identity.

## Source and baseline

Read EJ-Jarvis's canonical charter, HabitGame routing and Gauntlet workflow. Implementation authority remains AGENTS.md, Island Run architecture/gameplay/visual contracts, the actual-3D playbook and the existing 2026-08-25 Assembly Crater contract. This brief supersedes that contract's twenty individual charges and simple concentric seat treatment only.

The task root is an older preservation branch with extensive unrelated work. New work is isolated under worktrees/island-001-assembly-upgrade-20260909, based on origin/main. Do not overwrite or migrate the root working tree.

## Accepted progression

- Ten charges total; collect 3, then 5, then 2.
- First detonation: sequential circular blasts break the surface and establish the shared crater.
- Second detonation: the largest excavation; remove most of the underground volume, raise a rolling earth plume, arc debris toward the sea and show water impacts.
- Third detonation: concentrated underground finishing blasts, then immediate fast robotic construction.
- One canonical batch commit before each presentation. UI, animation and camera never own inventory or completion.
- Preserve earned progress and completed saves from the old twenty-charge mission. Save compatibility, duplicate requests and merges require tests.

## Visual direction

Keep the previously calibrated 6.95-unit underground radius and the protected 2.72-unit surface opening. No enlargement of the canonical board or relocation of landmarks. Use warm stone, walnut/gold desk surfaces, blue delegate chairs, a presidential dais with speaker lectern and architectural backdrop, gallery tiers and integrated lighting. The rear geological context keeps the chamber visibly connected to the island. No new reference image is claimed approved.

Robots must visibly perform construction: move between work zones, carry/position pieces, weld at contact points and commission the final hall. Reveal foundations, terraces, desks, dais and lighting in a readable sequence. Instancing and bounded particle counts are preferred. Reduced motion resolves the identical completed geometry immediately without camera shake or flashing.

## Milestones and evidence

1. Canonical batch progression and save compatibility: boundary, inventory, duplicate-action, old-save and merge tests.
2. Three distinct excavation acts: replayable developer controls; before/impact/settled evidence for 3, 8 and 10; no premature hall.
3. Assembly redesign and robotic reveal: overview, left/right and dais focus; timed construction evidence; no intersection with protected route.
4. Island and outer landmark polish: retain identities, footprint and L1–L3 growth; verify phone readability.
5. Integration: focused tests, architecture guard, TypeScript/build, visual validators and phone-sized interactive QA. Physical-device performance is a separate evidence gate if no device is connected; do not claim it from desktop captures.

## Authority and recovery

Local reversible edits, local preview and tests are authorized. No publication, deployment, merge, external messages, purchases or unrelated changes. Keep changes in the isolated worktree and record actual evidence. Revert only this task's changes if a gate fails. Never restore whole dirty files in another checkout.

## Stop conditions

Stop broadening visual polish if gameplay ownership, save compatibility or route clearance fails. Report a concrete blocker rather than claiming completion from source inspection. Final acceptance requires rendered evidence; subjective 10/10 is not established by a passing test.

## Implementation checkpoint

- Isolated branch: `codex/island-001-assembly-upgrade-20260909`, baseline `c732f3f6` (fetched origin/main).
- Ten authored caches and canonical batch costs 3/5/2. Version 2 converts old detonation counts proportionally once, retains all legacy cache identities, and preserves completed timestamps. Merge and direct-resolution boundaries also normalize legacy records.
- Geometry retains twenty construction sections independently of the ten mission charges. Excavation targets are 24%, 92%, and 100%; each blast has a 5.2-second presentation and the final build lasts 8 seconds.
- Replaced sparse seating with 252 instanced chair/desk positions, including circulation gaps, desk consoles and nameplates; added presidential dais, interpreter galleries and four construction robots. Removed visible radial spokes.
- Added local forecourt lighting and cliff/shoreline details only to Island 001's wrapper. Island 011 remains on its preserved base factory.
- Focused Assembly/First Light tests: 11 passing. Architecture guard: zero violations. Island art assets and render wiring: pass. Broader TypeScript/service run and visual review pending at this checkpoint.
- Browser navigation and native Safari automation timed out during review. Blender initially crashed inside the sandbox; an authorized offline render is in progress. No browser/device visual acceptance is claimed.
- Procedural hero-entry overlay; no new runtime image/model binaries. New model and review sources are local and unmerged.

## Verification and visual review

- Full Island Run runner: **2,043 passed, 0 failed** (esbuild Node harness with static asset loaders). The normal TypeScript service compilation passed; its first execution found two old 20-charge expectations, now updated.
- Focused Assembly/First Light runner: **11 passed**, including the final renderer changes, live robot tool clock, crew removal, canonical batch costs, migration and completion idempotency.
- Architecture guard: **PASS, zero violations**; island art asset validation: **PASS, no warnings**; art render wiring: **PASS**; whitespace diff check: **PASS**.
- Offline render V1 exposed terrace/dais overlap. V2 exposed a RingGeometry/CylinderGeometry angular-axis mismatch. The current implementation corrects the rear seating gap, brings the dais forward and retains the protected route and existing hall radius.
- Static furnishing batches reduced the completed Assembly export from 83 to **38 visible mesh batches**. This is not a physical-phone frame-rate measurement.
- The final incremental TypeScript check passed. Production bundle validation passed, with existing static-asset and large-chunk warnings. Public asset copying is disabled only for the local bundle verification, so its output is not a deployable distribution.
- Browser navigation and native Safari automation were unavailable for this run. The local server/replay entry is available, but no real game-screen or phone animation acceptance is claimed.

Review evidence: `docs/visual-references/island-001-assembly-crater/upgrade-20260909/`. Continue with the actual phone sequence and compare its camera/readability with the offline model before any merge or publication.

- V3 offline geometry review verified that the seating terraces now support the visible chair rows and leave a clear presidential stage. This is a stronger diplomatic-chamber read; final material/lighting and phone composition remain subject to the in-game gate.
- Main-game camera handoff now uses overview for the surface and great-excavation batches, keeping the ocean visible; the finishing batch uses the underground inspection camera.
- Latest reviewed image: `hall-geometry-review-v3.png` (offline geometry proof).

## Four-landmark access integration

Eivind's follow-up authorizes integrating the four existing landmarks as lift entrances. Added an Island 001-only access module: each canonical satellite gets an outer-forecourt pavilion, brass guide rails, a cabin with staggered twelve-second travel and landing pauses, and a guarded arrival bridge to the upper gallery. Entrances remain within the existing landmark foundation footprint. The network commissions during the last part of the robotic build and disappears on excavation reset. It owns no gameplay state.

The first combined render (V4) revealed the foreground observatory obscuring the presidential dais. The inspection cutaway now removes the two near-side surface buildings with the terrain while retaining their lifts; the rear two buildings remain as context. All four original buildings remain in the ordinary surface view. V5 records this corrected inspection composition. No board coordinates, landmark identities or Island 011 factories changed.

Focused tests cover the four canonical locations, cabin bounds/travel, immediate parked presentation and reset visibility. Browser automation still times out opening the local preview; offline triangle renders are not browser/physical-device acceptance.

Access follow-up validation: 11 focused tests pass; architecture guard passes with zero violations and the existing three allowlisted warnings. Outer-row seating now leaves clearance at the gallery bridge angles derived from the canonical satellite positions. V5 predates that small seating-clearance refinement.

V5 inspected: the dais is readable again, the rear two original landmarks retain surface context, and foreground lift pavilions remain legible as connections. TypeScript service compilation and the focused browser-entry bundling both pass. Offline review remains a geometry/composition check; browser navigation timed out and physical-device acceptance is still pending.

## 2026-09-10 environment refinement

User authorized continued upgrades and asked what else deserves attention. Prioritized the conspicuously blank excavation faces and lift entry finish before broader landscaping. Added six instanced geological batches across the two inspection cut faces, with alternating slate/mineral strata and shallow relief. Added brass canopy trim, threshold guide lights and a civic roundel to all four lift pavilions. Protected radii, route, missions and landmark positions are unchanged. The geology is inspection context; it does not add surface route obstacles. Suggested next larger visual areas are waterfall/shoreline composition and selective landscaping around landmark approaches, subject to route-clearance review.

Focused runtime/mission regression: 11 tests pass. Whitespace check passes. TypeScript and V6 offline visual review recorded below on completion.

V6 visual gate rejected the regular block pattern as masonry-like. Reworked the six batches into eighteen continuous, uneven strata rather than 144 gridded rock pieces. V7 is the corrected review artifact; the two lift entrance details are retained. First TypeScript check passed, with a repeat after the strata correction.

V7 inspected: continuous mineral layers remove the masonry grid, preserve the dais sightline, and maintain the calibrated footprint. Final focused tests: 11 PASS. Final TypeScript service noEmit: PASS. Diff whitespace: PASS. Local implementation only; in-game and phone acceptance remain open.

## 2026-09-10 hero waterfall and shoreline

User authorized the proposed waterfall pass. Added `Island1AssemblyCoast.ts`, exclusively called by the Island 001 Assembly runtime. A broad spring-fed cliff waterfall is framed by eighteen instanced rock shoulders, with quality-scaled flowing highlights and plunge spray, plus four sea-impact rings. Seven visible mesh batches; low uses 10 flow streaks/6 spray particles, medium 18/12, high 26/18. The outer spring pool and curtain sit beyond the protected route; the curtain starts at z=6.3. The coast hides in underground inspection and skips its animation there. Existing reduced-motion gating freezes it in the initialized pose. Island 011 remains unchanged.

Also corrected pre-existing Assembly blast splash rings from generic sea height -0.64 to the canonical First Light sea level -2.65 (+0.025 surface offset). The large-blast debris arc now descends to that sea level. A regression assertion checks the actual splash instance matrix.

V8 offline surface review inspected: the broad waterfall reads between the foreground landmarks, with a continuous source-to-sea path. This review includes authored terrain, ocean and all four L3 landmarks; it excludes the live route, HUD and shared living ambience, and uses substitute terrain materials. It is not a full in-game composition/performance sign-off. Focused tests: 11 PASS, including coast visibility, flow movement, crown clearance and splash elevation. TypeScript result is recorded in the checks packet.
