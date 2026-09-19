# Gradual Island Run feature introductions

Status: implementation authorized; cohort-aware gating, approved Vault
prerequisite and canonical ceremony preparation implemented locally.
New-campaign enrolment, full ceremony/egg flow and release remain incomplete.

## Implementation checkpoint

The user explicitly requested "proceed, fix, implement and merge to live".
This authorizes the completed, validated release; it does not waive acceptance
gates or include unrelated unfinished changes in this dirty worktree.

Implemented `islandRunFeatureAccess.ts` as a read-only cohort-aware selector.
Connected traffic eligibility to the tile map, canonical roll transaction,
direct traffic actions, modal and hop animation; connected puzzle eligibility
to HUD, reward previews, actual claims/chains and traffic-box reward generation.
The Island Run Daily Momentum launcher now uses the actual Vault entitlement.
The same wheel is also exposed by non-Island habit surfaces; those unrelated
entry points and their earned balances are not changed by this slice.

Validation: `node scripts/check-island-feature-introductions.mjs` passed 181
behavioral cases, including new/legacy saves, actual early-island traffic rolls,
reward replacement, preview/grant parity, saved inventory retention, canonical
Re-Docking completion, retired causeway actions and concurrent ceremony actions.
Architecture guard passed with zero violations and three existing allowlisted
warnings; `git diff --check` passed. Full `tsc -b --pretty false` completed
successfully during this continuation. The subsequent compact-phone, pacing
and tile-map identity edits passed the focused runtime tests/browser checks;
rerun the complete typecheck/build on the final release tree after integration.
Five disposable offline mobile-browser cases passed in
`island-002-opening-games/progression-ui-v001/report.json`: new001/002 hide the
puzzle button, new003/004 show it, and legacy002 retains it. New002/004 mission
labels are checked. Screenshot review then rejected the six-row ceremony phone
overflow even though those functional checks passed. The corrected three-row
phone passed a separate browser/layout check and visual inspection in
`island-002-opening-games/progression-ui-v002`. Keep v001 as rejected layout
evidence; v002 supersedes its ceremony screenshot. These routes do not provide
the Daily Momentum callback, so they are not browser evidence for wheel launch.
No physical-device or deployment pass is claimed.

Not yet wired: new-cohort enrolment, reward-channel/event reveal, inaugural
launcher, replacement early Hatchery objectives, first-egg service guards,
custom biome traffic-light geometry and introduction
tutorial. The selector's egg/event flags are preparatory, not enforcement.
No current live or unmarked new record is silently enrolled.

### Approved Vault prerequisite — implemented

New campaign moves Re-Docking to Island004, while the Vault still requires
Broken Causeway (the old Island004 mission). Keeping both island-specific
missions active by accident is not a migration. The user's latest "proceed"
approved the recommended resolution: retain earned legacy Vault access, and
make completed Re-Docking on new Island004 grant new-campaign Vault access.

The canonical selector now requires twenty completed Re-Docking rolls and a
valid completion timestamp on an Island004 cycle key. Legacy Broken Causeway
completion remains valid. New-cohort Island004 no longer creates causeway
pickups, presents its descriptor or accepts its spend action. This also fixes
an actual overwrite risk: both missions previously wrote the same `cycle:4`
slot. Real roll tests verify the twentieth roll persists Re-Docking, unlocks
Vault/wheel and emits its completion edge once. Old Island002 progress cannot
grant the new entitlement. Mission phones use the new identities without moving
earned save keys. Full 3D content routing and unlock-reveal sequencing are still
separate integration work, not claimed by these tests.

### Ceremony preparation — canonical foundation, not yet playable UI

`prepareIslandRunOpeningGames` is mutex-protected and reads actual funded
construction from the canonical store. Its preparation, welcome and beacon
steps are idempotent; no separate wallet, event or egg is created. Accepted
Island002 rolls now advance the team-arrival counter in the same transaction.
Rejected rolls do not count. Regular events still require the inaugural game.

Preparation requires the welcome/Hatchery venue and Event Arena at least L1,
not all five L3 buildings. Important pacing correction: construction is
landmark-first, so all five L1 buildings would still mean step13/15. The two
essential venues can be ready at step7/15 (`[3,3,1,0,0]`). The twelve-roll arrival
counter is visible separately; welcoming teams requires its explicit action.
The inaugural pure settlement accepts a completed round (win or loss), not
cancellation, and rejects wrong game/attempt IDs and duplicates. The actual
game-launch/settlement action wiring, starter tickets and reveal animation have
not been connected; this service foundation must not be described as a
finished playable ceremony.

The mission phone now shows one current ceremony step plus the two existing
landmark rows, preserving its authored three-row layout. During team arrival,
the first row displays the roll counter; reaching twelve still requires the
welcome action. Unchanged generated tile maps retain their object identity
across mission-ledger updates, avoiding an unnecessary whole-scene rebuild on
every new ceremony roll.

### Next integration gate

Keep enrolment disabled until the playable ceremony reveal/game/settlement,
reward-channel and event-service guards, early Hatchery replacement objectives,
egg grant guards, full content routing and onboarding are integrated. Exercise
mixed/stale cohort hydration as well as normal new-save replay; a label change
or selector test is not a data-migration acceptance test. The themed 3D signal
and whole-island performance gates remain independently required. Nothing in
this continuation clears the unfinished palace/coast/ship release scope.

The working branch is `codex/island-004-v2-20260914`; this progression checkpoint
is kept separate from unfinished palace artwork. Last fetched main was
`dc54bb95`; refresh it again before merging. GitHub Pages deploys on pushes to main.
No merge, push, deployment, remote save mutation or production cohort activation
has been performed. Preserve unrelated palace work and all rejected evidence.

## Authority and outcome

User accepted a gradual introduction sequence, then explicitly requested Island
003 introduce the traffic light and puzzle system, no corresponding icons,
modals or 3D traffic lights on earlier islands, architecture/ecology-appropriate
3D lights on eligible islands, and the spinning-wheel icon only after Vault
Island access. This extends the opening-games proposal, not its rollout status.

For new journeys:

| Milestone | Introduction |
| --- | --- |
| 001 | Board movement, resources and construction; no reward-bar/event launcher, puzzle launcher, traffic-light experience or wheel launcher |
| 002 | Festival preparation and opening ceremony; introduce the existing reward bar, event launcher and a guided inaugural game |
| 003 | Introduce the traffic light, first puzzle pieces and puzzle/album experience as one linked tutorial |
| 004 | First egg and incubation introduction |
| Vault access granted | Introduce the wheel and its launcher after the Vault explanation, not before |

The new palace-island-as-002 mapping follows the previous approved proposal.
The original source002/source004 identities and earned data are not renumbered
by this presentation policy. Existing journeys retain previously earned access,
balances, creatures, puzzle progress, tickets and Vault ownership.

## Verified current code, not future design

- `islandRunContractV2RewardBar.ts`: FIRST_PUZZLE_COLLECTION_ISLAND is currently 2.
- `islandRunVaultCollection.ts`: legacy Vault collection unlock still accepts
  completed `broken-causeway`; explicit opening-games journeys additionally
  accept completed Re-Docking on004. Merely reaching004 is never sufficient.
- `islandRunSignatureMissions.ts`: the legacy table retains Broken Causeway on4;
  cohort-aware descriptor, pickup and spend paths exclude it for new004.
- `islandDiplomaticPresentation.ts`: reward channel currently becomes visible
  during the Island001 opening flow, earlier than this new ceremony direction.
- Egg objectives participate in stop progression and island departure checks.
  Removing early eggs must replace those early objectives, not strand the player.

## Scope and non-negotiables

1. One canonical access policy drives HUD visibility, service eligibility,
   automatic triggers, modals, 2D board presentation and 3D scene props.
2. Before the traffic/puzzle introduction, no puzzle icon, traffic-light modal,
   traffic-light hints/badges or 3D traffic light on Islands001/002. No early
   puzzle fragment payouts or invisible usable traffic-light charges for new
   journeys. Use a tested basic-reward fallback where necessary; do not silently
   discard earned legacy progress.
3. Interpret “puzzle” here as the traffic-light-linked puzzle/album system.
   Do not globally disable unrelated puzzle-shaped arena minigames.
4. Eligible islands need a physical readable 3D traffic-light prop, styled to
   the island architecture, materials and local plant/animal motifs. Preserve
   recognizable red/amber/green signals and non-colour-only state cues. Presence
   follows an explicit island capability map; do not assume every later island
   must contain the feature. No canonical board topology change.
5. Wheel access follows the persisted Vault entitlement. Hide its HUD launcher
   and prevent alternative early entry routes. Preserve earned spin balances.
   Do not conflate this wheel with unrelated wheel-themed event games.
6. Reveal tutorials once, resumably and idempotently. Reduced-motion and skip
   controls must not skip the unlock or award it twice.
7. All gameplay writes use canonical action services/store ownership. No new
   component runtime-state mirrors or direct persistence writes. All modals use
   viewport-anchored portals and background scroll locking.
8. The live global event clock and existing reward system remain singletons.

## Milestone slices and acceptance

### A — Resolve access and migration policy

Inventory all traffic/puzzle/wheel entry and reward paths. Define new-journey vs
legacy behavior and Vault prerequisite under the island swap. Test 001/002/003/
004, prior unlocks, repeat visits, offline hydration and conflicting saves.
Document any unresolved choice before broad wiring.

### B — Canonical gating and HUD

Wire service guards and presentation to the same policy. Prove early icons and
modals absent, early rewards valid, no completion softlocks, no duplicate unlock
awards, and existing-account progress unchanged. Exercise actual browser flows,
not only source-string assertions. Update canonical contracts with rollout scope.

### C — Island003 representative 3D signal

Inspect actual island003 references/architecture and production instructions.
Use 3D Asset Gauntlet for a meaningful custom asset: approved decomposition,
bounded construction, actual multi-view runtime evidence and independent review.
Before expanding variants, verify physical prop, actual gameplay state, picking,
charge/reward presentation and phone readability agree. Frozen palace assets and
the approved board/outer landmarks are not redesigned by this request.

### D — Remaining eligible islands and onboarding

Use a declared capability/style map to scale the approved signal system. Capture
absence on001/002 and correct presence/state on003 and each eligible variant.
Introduce Vault then wheel sequentially, avoiding simultaneous tutorial overlays.
Measure mobile scene budgets and verify accessible/reduced-motion presentation.

## Authority, rollback and stops

Local implementation and a validated merge/deployment are now authorized by the
latest user request. Remote save mutation, paid assets and unrelated external
services remain outside scope. Preserve unrelated dirty work.
Keep the new-journey policy behind an explicit persisted cohort until every gate
passes; rollback presentation/wiring without deleting earned data or tombstones.

Stop for newly discovered conflicting mission placement, an unidentified wheel entrypoint,
an early-island completion dependency without a valid replacement, visual family
budget exhaustion, or unmet performance acceptance. Do not hide these with UI-only
checks, raised budgets, auto-completed objectives or fabricated screenshots.

## Handoff

Read AGENTS.md and its required architecture/gameplay/visual contracts before code.
This document records direction and the bounded implementation checkpoint above. Palace planting evidence and
its unfinished validation bookkeeping remain in
`docs/gauntlets/island-002-opening-games/festival-finish-plan-v001/ASSEMBLY-STATUS.md`.
Do not mistake this new onboarding scope for completed palace/coast/ship work.
