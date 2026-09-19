# Gradual Island Run feature introductions

Status: implementation authorized; cohort-aware gating, approved Vault
prerequisite and playable ceremony UI implemented locally.
The early free welcome activity is implemented locally. New-campaign enrolment,
full egg flow, ordinary-event release gates and release
remain incomplete. This is not the finished 3D opening show.

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

Previous foundation checkpoint validation: `node scripts/check-island-feature-introductions.mjs` passed 181
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

At the initial foundation checkpoint, not yet wired: new-cohort enrolment, replacement early Hatchery objectives,
first-egg service guards, custom biome traffic-light geometry and its
introduction tutorial. The egg selector was then preparatory, not enforcement.
The later checkpoints below supersede that early welcome/placement status.
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

### Ceremony preparation and inaugural game — playable local checkpoint

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
cancellation, and rejects wrong game/attempt IDs and duplicates.

The portal-based ceremony dialog now connects these actions to the mission
phone. Lighting the beacon closes the dialog and reveals the existing reward
bar with its reveal animation plus a free first-game launcher. The phone remains
accessible while that bar is hidden. The ceremony owns focus, locks background
scrolling and stops auto-roll. Signal Path uses a fixed guided route, free entry
and a sixty-second participation window; no minimum score is required.

Canonical begin/settle actions persist one attempt, resume after reload, reject
late/repeated callbacks, allow cancellation without rewards, and atomically
grant three tickets once to the existing active-event ledger. They ignore any
reward amount supplied by the game. No separate event or wallet is created.
The game registry must be populated before opening the launcher; the first
browser pass caught and fixed that missing integration step.

Reward progress and claims now require beacon eligibility. The canonical tile
bridge retains cohort/island context, and the state action rejects stale UI
reward writes while still allowing the shared timed-event clock to initialise
or rotate. Saved collection balances are not deleted. Generic event ticket
spending is gated until inaugural completion. Dedicated per-game launch/spend
actions still need their own audit before enrolment: the generic spender is
not the sole entry point. Existing ordinary-event production/admin gates stay
intact. The inaugural launcher bypasses that presentation gate only for the
free ceremony round, using the canonical active event.

The beacon action also initialises the shared clock when none exists, so its
launcher does not depend on an earlier UI lifecycle or reward tile. This edge
case is covered by a canonical action regression.

Current focused regression run: 367 passed, zero failed, including the existing
tile-reward and state-action suites. The architecture guard reports zero
violations and three existing allowlisted warnings. Offline browser evidence
`ceremony-ui-v003` passes actual preparation, reveal, cancellation, same-attempt
reload/resume, guided game completion, exactly-once tickets and reload safety.
`progression-ui-v003` passes all five new/legacy HUD/mission cases. Screenshot
review found and fixed a low-contrast ceremony heading. `ceremony-ui-v004`
expired normally during automated play under concurrent validation load; the
test incorrectly assumed every run must solve all twenty-five cells. The
runner now accepts the intended timed-participation result as well as a solved
route. Final `ceremony-ui-v006` passed the whole flow with zero browser errors;
its preparation, beacon/launcher, guided game and completion screenshots were
visually reviewed (the narrow launcher uses a readable `FREE` caption).
Keep rejected evidence. No physical-device or production acceptance is claimed.

The ceremony checkpoint's full-project `tsc -b --pretty false` (session 65915)
completed successfully; the next continuation retrieved exit code zero. The
earlier nullable test descriptors had been corrected. This result does not
replace validation of subsequent edits or the final release build.

The mission phone now shows one current ceremony step plus the two existing
landmark rows, preserving its authored three-row layout. During team arrival,
the first row displays the roll counter; reaching twelve still requires the
welcome action. Unchanged generated tile maps retain their object identity
across mission-ledger updates, avoiding an unnecessary whole-scene rebuild on
every new ceremony roll.

### Next integration gate

Keep enrolment disabled until dedicated event-service guards and production
event availability, early Hatchery replacement objectives,
egg grant guards, full content routing and onboarding are integrated. Exercise
mixed/stale cohort hydration as well as normal new-save replay; a label change
or selector test is not a data-migration acceptance test. The themed 3D signal
and whole-island performance gates remain independently required. Nothing in
this continuation clears the unfinished palace/coast/ship release scope.
Also gate island completion/departure on its new special mission: the old
Hatchery/stop resolver must not allow a fresh player to leave Island002 without
the ceremony or block travel on eggs that are intentionally unavailable.

The working branch is `codex/island-004-v2-20260914`; this progression checkpoint
is kept separate from unfinished palace artwork. Last fetched main was
`dc54bb95`; refresh it again before merging. GitHub Pages deploys on pushes to main.
No merge, push, deployment, remote save mutation or production cohort activation
has been performed. Preserve unrelated palace work and all rejected evidence.

### Early-island safeguards — next continuation

`canPlaceIslandRunEggs` now guards the single and batch canonical Hatchery
actions for the explicit new cohort. Islands001–003 cannot place an egg or
receive objective credit through that callback. Island004 accepts a first
placement; cross-island arguments, malformed batch keys and attempts to replace
an already-owned slot are rejected without writing. Early UI-only ready-egg
fallbacks cannot invent a reward. Existing canonical eggs remain collectable or
sellable exactly once, and legacy placement behavior is unchanged. The board
does not animate, schedule a hatch notification or mark a stop complete after
a rejected placement.

The shared completion selector now adds the new002 ceremony/first-game
requirement and the new004 current-cycle twenty-roll Re-Docking requirement.
Ordinary construction/activities/eggs alone cannot bypass those missions.
New-cohort travel also checks completion when the caller omits the legacy
optional visit key. Existing unmarked travel behavior is preserved. These
exceptions are recorded in the canonical gameplay contract.

Focused tests now pass 381 cases, including existing completion coverage across
all120 islands and actual accepted/rejected new002/new004 travel actions. The
architecture guard passes with zero new violations (three legacy warnings).
Fresh full-project typecheck is running in tool session 44751, with output at
`/tmp/early-island-progression-types.log`; retrieve its result before claiming
typecheck acceptance. The first mobile regression attempt
`early-progression-ui-v001` timed out before the canvas loaded with no reported
app error; it is failed evidence, not a pass. With a startup-only allowance of
180s (ordinary interaction timeout remains60s), `early-progression-ui-v002`
passed with zero browser errors. Its three-row mission phone screenshot was
visually inspected and remains within the mobile viewport. This is HUD/mission
regression evidence, not a new full ceremony or device-performance acceptance.

Previously pending product choice sent via the user-input tool: use the first landmark on
Islands001–003 as a free welcome/arrival check-in, then introduce its Hatchery
egg activity on004? This is a real explicit activity, not fabricated objective
credit from building alone. No replacement activity or removal of the old egg
departure dependency has been implemented without that choice. Therefore the
new cohort must remain disabled. The subsequent "continue" approved the free
welcome check-in. The implementation checkpoint below supersedes this pending
choice and the earlier statement that no replacement exists.

### Approved welcome activity — current continuation

New001–003 now use an explicit free Welcome Venue check-in at internal stop0.
Its dedicated mutex-protected canonical action validates the exact island/cycle
visit, persists objective/ledger completion once and invokes the existing stop
resolver. It grants no wallet payout, egg, building progress or next-stop ticket.
Repeated/concurrent taps are inert, as are stale-visit and legacy/004 calls.
Travel resets the next activity normally. Enrollment is still disabled.

The canonical departure checklist omits the egg requirement only for these
early new-cohort islands. All real activities, construction and special missions
remain required. Island004 and legacy saves still require their eggs. The mission
phone counts the welcome activity without waiting for an unavailable egg.
The portal-based, scroll-locked welcome dialog reads the canonical store, shows
persisted completion after reopening/reload and keeps a separate entry for
previously earned eggs. Orbit labels/icons, advisor text, Hatchery door copy and
Egg Mania eligibility reflect the early activity. Egg-specific landmark whispers
are suppressed on this early welcome surface. No artwork is changed by this slice.

Final focused run passed403 cases, including the existing advisor suite and a
no-egg mission-phone assertion; architecture guard passed with zero new
violations and three existing allowlisted warnings. The final service log is
`/tmp/welcome-checkin-verified-tests.log`. `welcome-ui-v001` failed before the
board loaded, with an empty-body screenshot and no uncaught app error.
`welcome-ui-v002` reached the 3D board, but the runner incorrectly looked for
its hidden 2D orbit button. Neither is accepted mobile evidence. The corrected
runner taps the rear-left venue observed in the v002 screenshot for new002.
`welcome-ui-v003` passed its actual 3D tap, viewport portal/scroll-lock, check-in,
unchanged wallets/eggs/tickets and reload assertions. Its welcome and completed
screenshots were visually inspected and are readable and centered. The overall
run then failed when a queued legacy narrative intercepted the separate mission
phone click. Do not call the overall v003 report green. The welcome-only runner
now leaves that separate mission test to its normal mode; v004 is running in
session71273 with log `/tmp/welcome-ui-v004.log`. Retrieve its report before
claiming a clean run. No mobile001/003 or fresh first-session acceptance is claimed.
The observed old Luma Isle story after new002 check-in is explicit evidence that
full narrative/content routing still needs integration before enrollment.
Full-project `tsc -b --pretty false` is running in session25687 with output at
`/tmp/welcome-checkin-types.log`; no successful exit has been retrieved. The
older session44751 was unavailable on resume, and its empty log alone cannot
establish a successful exit. Do not claim either as a fresh typecheck pass.
Full first-session tutorial wording/replay, all egg inventory grant paths,
dedicated event-service guards, cohort hydration/enrollment, full content/3D
routing and the existing art/performance release gates remain open. This is a
local progression checkpoint, not a production deployment or completed island.

Egg-source audit: Welcome Pack starter cards and the first-session Creature Pack
grant creatures directly, not eggs; the welcome resource bundle grants dice,
essence and event tickets. Do not conflate those with egg placement or silently
remove earned cards. Additional egg inventory grant paths exist in Combined
Journey rewards, Treasure Path/Lucky Roll banking, Creature Arena victory and
admin/dev grants. Their safe deferred/replacement behavior and matching UI need
an integration pass before claiming that all early egg sources are gated.

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
