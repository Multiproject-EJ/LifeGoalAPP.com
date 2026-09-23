# Island 017: Status And Remaining Work

Latest user decision: no assets requiring credit or attribution. The BodyParts3D
donor is rejected, not awaiting approval. It must not be adapted or shipped.
Original assets or verified no-attribution-required assets are the permitted
routes. This supersedes earlier pending-licence statements in the intake history.
The user decision is also recorded in the worktree AGENTS.md.

As of September 23, 2026. The user explicitly requested publishing the current
Island 017 as-is ("push to live now"). A scoped release is being integrated on
current main. This supersedes the earlier requirement to withhold deployment
until final-art acceptance; it does not constitute final-art acceptance.
Runtime island 016 remains reserved for the fisherman island. No overall
completion percentage or final-art score is justified by the available evidence.

## Player Experience Implemented

- Titan's Rest identity, a 3D island scene, five landmark families, skull,
  soulfire, bridge and waterfall parts exist in the working branch.
- Titan's Spine uses eight finite soul-bolt pickups and eight restoration
  stages through canonical action services, with saved cycle/island progress.
- New sections rise into place; existing restored sections remain still.
  Completion has a bounded finale, visual-only replay and reduced-motion handling.
- Full landmark restoration awards 100 dice through the canonical action path.
  UI has a reward display, dice rain, fireworks and a wide completion banner.
- Three construction robot roles have celebration movement and changing faces.
- Terrain obscuring the authored island was removed; texture coordinates were
  retained in batching; pit openings and rear bridge visibility were repaired.

These are implementation claims, not final appearance approval.

## Evidence And Limits

### Release Integration Checks

The release integrated on main `6a07260f` passed TypeScript (`tsc -b`), the
production Vite build, and the full Island Run suite: **2,285 passed, zero failed**.
Architecture guard: zero violations, three existing allowlisted warnings.
Audio asset validation passed. Vite retains its large-chunk warning.

Hold and fast-build paths award the 100-dice final-restoration bonus once in
addition to existing per-level dice. Concurrency, repeat clicks and new-cycle
tests pass. Island 017 completion requires all eight spine stages in the current
cycle; phone presentation and departure gates agree.

The merged mobile browser preview rendered without JavaScript errors. Completion
capture confirms the full-width banner below the header, +100 dice display,
scroll lock, three robots and effects ending transparently. This is emulated
browser evidence, not physical-device or final-art approval. Original-worktree
captures are in `work/island-visual-library/island-017-titans-rest/evidence/release-20260923/`.
The high-quality loaded scene still measured roughly 1,145 calls / 417k triangles;
the procedural-only budget test is not proof of loaded-scene mobile performance.

The table below preserves earlier evidence and remaining acceptance limits.

| Area | Evidence | Still open |
| --- | --- | --- |
| Island routing and scene contracts | Fresh focused browser run: 7 passed, zero failed | Does not exercise the complete player journey |
| Full service regression | September 13 run: 1,899 passed, zero failed | Historical, not rerun September 23 |
| Architecture guard | Fresh September 23 run: zero violations, three allowlisted legacy warnings | Existing warnings are not resolved by this art work |
| Mission renderer | Saved phone/desktop stage, replay and reduced-motion captures | Full app-shell and physical-device acceptance |
| Completion reward | Canonical 100-dice constant, award path and regression assertion present | Fresh end-to-end completion/reload/replay verification |
| Completion presentation | Banner, effects and robot choreography code present | Layout, clipping, timing and happy-face quality in actual app |
| Build-modal background icons | Background HUD suppression rules present | Specifically verify circular vault icons are absent in all build states |
| Bridge replacement | Multiple saved local prototypes and independent reviews | No replacement has passed visual review or entered production |
| Overall island artwork | Assets and prior screenshots exist | No final whole-island or 360-degree acceptance |

## Prioritized Finish Order

1. **Central vertebra:** current user-approved custom vertex/topology prototype,
   isolated from ribs. Require convincing anatomy, silhouette and multi-view form.
2. **Paired ribs and bridge assembly:** only after central anatomy passes; prove
   attachment, span, rock contact, repeated rhythm and all eight restoration states.
3. **Titan skull and other skull structures:** front, side, rear, top and underside
   checks; strengthen anatomy and material definition without facade-only fixes.
4. **Landmarks:** Bone Hollow, Strength Altar, Coliseum Pit and Oracle's Cranium;
   inspect each at phone scale and all construction levels/transitions.
5. **Scenery:** cliffs, ruins, pit depth, waterfalls, bone debris and lighting;
   check physical grounding and separation without obscuring the playable route.
6. **Mission and completion polish:** stage camera, pickup readability, repair
   payoff, finale/replay, +100 dice, robot cheering and reduced motion.
7. **Release proof:** full app-shell journey, responsive layout, performance,
   physical phone, regression suite, clean scoped diff and asset delivery checks.
8. **Merge and live verification:** authorized now for the current work-in-progress.
   Verify release tests, deployment revision and public assets. Keep the remaining
   visual and physical-device acceptance work explicitly open.

## Current Anatomy Route

The separate-socket local unit was retired for open root gaps. The continuous
unit removed those gaps but was retired after its one correction because
identity improvement was insufficient. Neither was promoted. The user has now
explicitly approved a custom vertex-by-vertex central vertebra, with no ribs
until that unit is accepted. Meshy is not a dependency.

Current prototype directory:
`work/island-visual-library/island-017-titans-rest/parts/vertebra-authored-v001/`.
The first custom-topology blockout is built: 480 triangles, 9,964-byte GLB,
one connected closed mesh with a canal, and 14 nonblank/unclipped runtime views.
Independent visual review retired this family: forbidden architectural bracket
read, worst silhouette .40 and identity .30. No correction is eligible. Parent
inspection agrees. Technical efficiency improved, but appearance did not meet
the required anatomy. No ribs were attached and no production asset replaced.
Evidence: the part's `qc-review.v1.json`. The next anatomy route is a decision
checkpoint, not an automatic further variant. Other island release gates remain
open; the project has not advanced to visual completion.

## Anatomical Donor Intake Follow-Up

The previously approved external-base investigation found an accessible
BodyParts3D/DBCLS lumbar vertebra without Meshy or account access. Original STL,
attribution, licence and hashes are preserved in `external-base-v002/` under
the Island 017 work folder. Thirteen neutral runtime views passed capture checks.
Independent review finds it suitable for one proposed bounded adaptation, not
approved final art. The user subsequently rejected the CC BY-SA 2.1 Japan asset
and all attribution-required creative assets. No production asset was replaced;
the requested finished-island
screenshot cannot honestly be supplied yet.

## Source Pointers

- Mission evidence: `work/island-visual-library/island-017-titans-rest/evidence/spine-restoration-v001/review.md`
- Continuous-family final review: `work/island-visual-library/island-017-titans-rest/parts/spine-unit-continuous-v001/review-v002.md`
- Gameplay reward: `src/features/gamification/level-worlds/services/islandRunStateActions.ts`
- Completion presentation: `src/features/gamification/level-worlds/components/BuildModalV2.tsx`
- Robot animation: `src/features/gamification/level-worlds/dev/RobotConstructionTheatre.ts`
- Release decisions: `docs/gauntlets/2026-09-09-island-017-release-path.md`

Original work and unshipped experiments remain on
`codex/island-017-titans-rest-20260829` in the Island 017 worktree. The runtime
release is integrated separately on `codex/island017-live-20260923` from main
`6a07260f`. Rejected experimental models, anatomical donor and local evidence
are excluded from the release. Preserve them as history, not production assets.
