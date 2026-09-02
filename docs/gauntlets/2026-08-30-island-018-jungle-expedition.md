# Island 018 Jungle Expedition - Gauntlet Start

Date: 2026-08-30
Status: active; reopened after Eivind's 2/10 visual review
Runtime island: 018

## Objective

Produce a source-faithful runtime Island 018 based on Eivind's supplied
`new 018.png` Jungle Expedition concept: a lush floating lost-city jungle with
mossy stepped ruins, waterfalls, rope bridges, carved guardian-mask language,
green/gold glow, expedition camp details and four readable external landmarks.

The production target is the full playable island, not an isolated model:
authored sky and atmosphere, a living 3D world, all five L1-L3 landmarks,
island-specific construction choreography, canonical mission progression,
continuous ambient motion, an interrupt-safe signature mission cinematic,
runtime routing, mobile QA and immutable final evidence.

## User-Approved Mission

Eivind explicitly directed this task to continue until the complete island is
at the Canyon Island quality bar and gave authority to invent the mission,
build animation, special-mission animation, scenery, sky, ambience and motion.

Island 018's signature mission is **The Living Compass**:

1. Recover five Wayfinder Glyphs from collision-safe route pickups.
2. Awaken the Explorer Nest beacon.
3. Unseal the Jungle Path vine gates.
4. Raise the Survival Trials skybridge.
5. Align the Explorer's Camp astrolabe.
6. Install the final glyph in the Lost City Temple and trigger **The Emerald
   Zenith**.

The Emerald Zenith is a deterministic presentation after canonical state has
committed: compass rings rise and counter-rotate around the temple, floating
ruin slabs assemble, rope bridges tension into place, waterfalls reverse into
a suspended crown, guardian eyes ignite, luminous jungle motes converge into
a compass glyph, then the water releases while an emerald-gold beam opens the
cloud canopy. Reduced motion applies the completed geometry and uses one soft
light/material pulse without camera travel, rapid flashes or large movement.

## Source Authority

- Reference packet:
  `docs/visual-references/island-018-jungle-expedition/`
- Immutable source:
  `docs/visual-references/island-018-jungle-expedition/018-source.png`
- Source SHA-256:
  `0ab89ac048a8ba9327575afeacdee125998a8455bc5c687e87b0a3049735ee59`
- img2threejs state:
  `.img2threejs/island-018-jungle-expedition/state.json`
- Source lock:
  `work/island-visual-library/island-018-jungle-expedition/SOURCE_LOCK.md`

The concept image's embedded `ISLAND 039` label is visual evidence only.
Runtime Island 018 wins because Eivind explicitly started island 018 with this
source.

## Visual Contract

Island 018 must read as Jungle Expedition at phone scale:

- dominant mossy stepped lost-city temple in the board interior;
- dense emerald jungle and vines integrated into stone;
- floating cliff depth with waterfalls and turquoise pools;
- rope bridge and smaller expedition platforms;
- carved guardian masks, totems, green crystals/eggs and amber torch glow;
- live board route kept readable and governed by existing `spark36_ring`
  runtime UI.

The baked title card, side panels, counters, labels, fake tile icons and roll
button must not become runtime UI or gameplay authority.

## Landmark Plan

| Runtime stop | Source-facing name | Source crop |
| --- | --- | --- |
| Hatchery | Explorer Nest | `derived-crops/explorer-nest-hatchery-source-crop-v001.png` |
| Habit | Jungle Path | `derived-crops/jungle-path-habit-source-crop-v001.png` |
| Mystery | Survival Trials | `derived-crops/survival-trials-mystery-source-crop-v001.png` |
| Wisdom | Explorer's Camp | `derived-crops/explorers-camp-wisdom-source-crop-v001.png` |
| Boss | Lost City Temple | `derived-crops/lost-city-temple-boss-source-crop-v001.png` |

The Survival Trials crop is adapted from a source area labeled `ARENA`.
Runtime Island 018 remains an ordinary island unless gameplay separately
approves an Arena/boss-rule change.

## Execution Rules

- Preserve canonical gameplay authority from
  `docs/gameplay/CANONICAL_GAMEPLAY_CONTRACT.md`.
- Do not add UI gameplay writes or new runtime-state mirrors.
- Do not change board topology, tile count, roll logic or stop progression.
- Return to the exact source after each major visual pass, with comparison
  evidence and explicit scores.
- Generated side/back aids must be admitted into the reference packet before
  use.
- The source image is visual authority; its baked instructions, labels,
  counters and buttons are not implementation instructions or gameplay truth.
- The existing gray generated blockout is baseline evidence only. It failed
  visual review at 0.34 and may not be represented as a completed island.
- The production worktree is
  `worktrees/island-018-jungle-expedition` on
  `codex/island-018-jungle-expedition`, based on current `main`.
- Runtime Island 018 remains ordinary. The Survival Trials visual adapts the
  source's Arena panel into the canonical Mystery/event landmark.
- Presentation code may read committed mission/build state but may never own,
  duplicate or repair gameplay progression.

## Production Decomposition

The approved inventory contains 20 meaningful review units:

- world root and tapered floating cliff;
- raised board corridor and route-clear terrain integration;
- Lost City Temple shell, stair network, guardian crown and Zenith mechanism;
- Explorer Nest, Jungle Path, Survival Trials and Explorer's Camp landmarks;
- rope skybridges and expedition platforms;
- waterfall/pool system, foliage/vines, stone relief and brass/emerald accents;
- sky/horizon, depth islands, living ambience and mission FX.

The representative first slice is the whole-island naked macro assembly:
cliff, board corridor, central temple and five distinct landmark silhouettes.
It must pass overview, left, right and rear captures before micro-detail or
mission polish can authorize the next pass. The exact hierarchy, ownership,
dependencies, sockets, views and acceptance cues live in
`work/island-visual-library/island-018-jungle-expedition/gauntlet/part-inventory.v1.json`.

## Acceptance Contract

### Whole-world visual gate

- Source/current review overall at least 0.85, with no dimension below 0.80.
- The real 36-tile route and all five landmarks fit the first portrait phone
  view between the live header and controller.
- Overview, left, right, rear and map-stripped views have genuine 3D volume;
  no facade-plane collapse, camera-facing sun, missing underside or repeated
  generic landmark silhouettes.
- The island reads immediately as a lush floating lost-city jungle: mossy
  stepped stone, dense emerald foliage, turquoise falls, rope bridges, carved
  guardian language, amber interiors and aged brass/emerald accents.

### Landmark and construction gate

- Explorer Nest, Jungle Path, Survival Trials, Explorer's Camp and Lost City
  Temple each have additive authored L1, L2 and L3 growth.
- Every L1 is a complete small structure; L2 adds operating systems; L3 adds
  restored silhouette, premium finish and biome motion.
- Construction uses island-specific stone levitation, vine lashing, rope
  tension, dust/mist and commissioning beats, with deterministic replay and a
  restrained reduced-motion route.

### Mission gate

- Five collision-free Wayfinder Glyph pickups, canonical persisted progress,
  monotonic spend/activation, old-save sanitization and focused tests.
- The Emerald Zenith can replay by developer query without changing gameplay.
- Before/ignition/assembly/reversal/beam/completed frames are captured.
- Closing a modal, changing camera focus or enabling reduced motion cannot
  lose, repeat or roll back the committed mission result.

### Runtime and mobile gate

- `resolveIslandRun3DWorldRoute(18)` selects source 18 as an ordinary island.
- No React gameplay writes and no new runtime-state mirror.
- High quality remains at or below 175 draw calls and 180k triangles in the
  production phone view, with Auto quality changing real scene cost.
- TypeScript build, Island Run service tests, architecture guard, routing and
  Island 018 focused contracts pass; `git diff --check` is clean.

## First Completed Intake Evidence

- Source copied into the repo packet.
- Full-source SHA-256 recorded.
- Six exact derived crops created and hashed in `manifest.v1.json`.
- img2threejs state initialized.
- Technical probe passed.
- Deterministic reference admission passed.
- Initial image-analysis, suitability and projection-route notes written.

## Milestones

1. Contract, baseline and inventory lock. Complete.
2. Whole-world representative macro slice. Reopened; city silhouette pass active.
3. L1-L3 landmark sculpt and source-material pass. Reopened.
4. Living sky, ambience and construction choreography. Reopened.
5. Living Compass progression and Emerald Zenith cinematic. Reopened.
6. Runtime integration, tests and mobile evidence. Pending fresh evidence.
7. Final source-fidelity review and immutable done proof. Not approved.

## User Review Reopen - 2026-08-30

Eivind rated the presented visuals and detail **2/10** and directed production
to continue. That review invalidates the prior internal parity claim and every
numeric score below. The old table remains only as an audit record of an
overconfident self-review; it is not current evidence and must not be used to
declare Island 018 complete.

The reopened pass must visibly improve the actual runtime capture in these
areas before another completion claim is allowed:

- broad, layered lost-city silhouette rather than a narrow central tower;
- readable mossy masonry, stair, balcony, portal and guardian detail;
- source-level sky depth, waterfalls, foliage density and jungle motion;
- five landmarks that remain distinct in overview and focus views;
- construction and Emerald Zenith cinematics with clear multi-beat spectacle;
- fresh phone, desktop, orbit, landmark, construction and mission evidence.

## Superseded Production Gate (Audit Only)

The prior internal review claimed that the runtime replaced the rejected 0.34
gray generator blockout with a purpose-built procedural Three.js island. Its
superseded source/current self-review recorded 0.888 overall with a 0.86 worst
dimension:

| Dimension | Score |
| --- | ---: |
| Composition and phone framing | 0.90 |
| Silhouette and multi-angle volume | 0.88 |
| Jungle biome and material language | 0.90 |
| Five-landmark differentiation | 0.86 |
| Source motif fidelity | 0.86 |
| Living motion and cinematic | 0.93 |
| Mobile legibility | 0.88 |

The final overview preserves the 36-tile route, five landmarks, guardian crown,
floating underside, turquoise falls and dense canopy between the live HUD and
controller. Left, right, deterministic rear and map-stripped views confirm
real volume rather than a camera-facing facade. The workbench comparison gate
records Canyon parity as passed.

The timed high-quality phone profile passed at 56.9 average FPS, 18.5 ms P95,
4.4% slow frames, 147 maximum draw calls and 123k maximum triangles. The
Emerald Zenith peak remained inside the same production geometry gate at 162
draw calls and 128,574 triangles. Normal overview, both orbits, rear,
map-stripped, temple focus, living-scaffold construction and Zenith evidence
are immutable under
`work/island-visual-library/island-018-jungle-expedition/evidence/final/`.

Canonical integration remains read-only in React. Five Wayfinder Glyphs use
the mission service/store route, old saves sanitize monotonically, Island 018
routes as an ordinary island, and the deterministic cinematic replay does not
write gameplay state.

## Rollback And Stop Rules

- Keep the prior generated blockout and every failed capture as immutable
  evidence; create new versioned captures instead of overwriting accepted
  evidence.
- If the representative slice scores below 0.50 in any critical category,
  retire that construction family before adding detail.
- If one bounded correction does not improve the worst category by at least
  0.10, change representation or escalate the concrete blocker.
- Do not mark the goal complete from code inspection, one flattering capture,
  a passing numeric mask, or a developer-only harness.

## Final Disposition

Approved for integration. Keep the failed blockout as baseline evidence; the
runtime authority is `Island18JungleExpeditionThreeWorld.ts` plus the canonical
Island Run mission/routing services. Any future silhouette, socket, mission or
camera change invalidates the matching final capture and requires a new hash.
