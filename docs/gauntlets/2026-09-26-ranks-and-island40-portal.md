# Rank expansion + Island 40 portal — implementation goal

Date: 2026-09-26. Status: implementation in progress; local review only.

## Council handover slice — approved continuation 2026-09-26

- Implement a replayable caretaker council and one permanent portal receipt in
  the existing owner-scoped signature JSON, using the canonical action mutex.
- Island 040 arrival (or a later island/cycle) qualifies; player XP, query
  previews, developer flags and purchases do not manufacture story progress.
- No currency, stop completion, travel or AI-answer consent is granted.
- Verify duplicate/stale actions, serialization, conflict merge, reload, owner
  isolation and local-storage failure. Test the actual dialog at phone/desktop
  sizes, keyboard focus and reduced motion.
- App-wide game-first gating stays a separate slice: no partial exit-only lock.
  Preserve account/privacy/support/recovery and existing Today data meanwhile.
- Re-fetch main and inspect overlap before local integration. Preserve Claude's
  dirty checkouts and the separate Cosmic Outpost work. No push/live changes.
- Rollback UI/action integration independently; retain the receipt sanitizer so
  an already-earned portal is not erased by rollback.

Implemented council menu entry, responsive portaled meeting and once-only
acceptance. Eight portal suites, four browser viewports (including reduced
motion), storage recovery/owner switching, 299 Arena integration cases and the
Journey progression regression checks passed. Evidence and precise limitations:
`docs/investigations/world-portal-20260926/README.md`.
The short-phone screenshot was reviewed and tightened so both actions fit.
This does not activate the 36-rank model or app-wide access gate. Main refreshed
with no upstream changes. Final full-app TypeScript, rank/policy suites and
architecture guard passed. Dedicated main is clean and fast-forward eligible;
the local integration includes the prior 040 placeholder and this handover only.

## Island 040 placeholder slice — approved 2026-09-26

User approved proceeding after clarification that 001–020 have routed 3D worlds,
while 021 onward uses the legacy board. Scope here is one explicit temporary
3D setting for 040, not a final Cosmic Outpost replacement or mass placeholder
rollout. This is presentation-only neutral procedural massing, not a
reconstruction of the separate workstream's reference art.

- Reuse shared renderer, route, camera, canonical landmark anchors and input.
  Author a small original space deck and additive blockout landmarks; no new
  textures or third-party assets. Label it temporary in both UI and routing.
- Reserve a separate council/portal staging area without replacing 040's arena.
  Empty seats and an inactive frame are placeholders, not the actual all-caretaker
  meeting or an earned portal. No ownership, rewards or access mutations.
- Actual council handover, durable once-only ownership and all-path app gating
  remain the next gameplay slice. Geometry must never be the entitlement source.
- Preserve the separate paused Cosmic Outpost worktree and all 001–020 routes.
  No change to 021–039, 041+, demo travel cap (currently 003), player level or saves.
- Verify routing, L0–L3 continuity, phone/desktop/side/rear views, reduced motion,
  TypeScript and architecture guard. Physical phone/full authenticated journey
  and production art approval are not implied.
- Rollback: remove only the explicit 040 route to restore its legacy board.
  No save migration is needed.
- Earlier user approval permits safe local integration after checks; this slice
  stays on the task branch until review. No push, deployment or live changes.

## User mandate

Implement the approved 36-rank spaceship direction, with a full medal and purpose-designed compact pin for each. Check rank logic against player levels and the contribution of island progression. At Island 40, all caretakers gather and give the player a portal linking the game and real world. User said “maybe ... level 40”; do not confuse that with the explicitly requested Island 40 story beat.

The latest request authorizes implementation, superseding the earlier visual-only milestone. It does not authorize pushing, merging, publishing or deployment. The existing Codex goal is unfinished and usage-limited; create_goal rejected replacement. This file records the expanded objective without falsely marking the earlier goal complete.

## Repository handshake and coordination

- Repository: LifeGoalAPP.com, Multiproject-EJ.
- Isolated branch: `codex/ranks-and-island40-portal-20260926`.
- Worktree: `worktrees/ranks-and-island40-portal-20260926` under the shared repository.
- Base: fetched `origin/main` at `1cf96aec74cbb1bcbc59ef2b304c5a078a2fd82a`.
- Worktree clean after checkout completed. Shared dirty checkout and Claude's files remain untouched except a task-local handoff pointer.
- Re-fetch main and reconcile changed dependencies before future integration. No worker dispatch or messages to Claude have occurred.

## Sources of truth

Read AGENTS.md, Island Run architecture contract, canonical gameplay contract and guardrail/conflict matrix. Preserve service-owned state, mutex-protected actions, canonical completion/travel and grants. Use existing runtime narrative/services, not UI gameplay writes.

Approved visual contact sheet and first pair remain in the shared checkout's `docs/design/rank-previews/codex-review-20260926/`. Built-in image generation produced these original assets. No knot, rope, braid, tether or pretzel motifs in new assets. Preserve historical artwork rather than destructively replacing its files.

## Milestones / acceptance evidence

1. **Audit and foundation:** executable baseline showing island arrival/completion, level curves, existing rank anchors, reward-bar reset and cycle effects; implement/test 36-rank domain scaffolding and medal/pin plumbing without silently activating unreviewed progression rules.
2. **Progression consistency:** canonical durable island milestones rather than resettable reward bars; reconcile UI, leaderboard and rewards; preserve earned status and previous claims. Test first island, intermediate progress, reward claim, reload, wrap 120→1, deleted/archived real-life items and existing saves. Changes to grants or persistence require local tests and schema review; no remote database mutation.
3. **36-rank integration:** review exact XP thresholds and unresolved top-rank pacing; stable versioned rank identities and acknowledgement migration; semantic titles, accessible asset fallbacks, full medal/pin registry and approved images. No false availability claims for unfinished assets.
4. **Island 40 gathering:** append a caretaker-council story milestone without replacing championship/signature-mission work. Canonical once-only portal ownership; cancel/skip/replay/reload cannot duplicate grants. Existing later-island players need a catch-up ceremony; ordinary players remain gated until ownership as explicitly requested. Player level alone must not bypass the island event.
5. **Real-world bridge:** clarified as full-app access and a personalised Today/habits/goals transition. Introduce explicit permission to use selected in-game answers, editable suggestions and deletion/withdrawal controls; preserve existing user data while normal accounts are gated. External integrations are not implied by unlocking the app. Never require real-world tasks as mandatory island-stop completion without explicit design approval. Paid Early Access needs separate price/type/entitlement decisions before checkout provisioning.
6. **Review:** desktop/mobile and reduced-motion evidence, relevant regression suites, progression examples, durable handoff. User approves before any push/main/live action.

## Current scope decisions and unresolved questions

- Clarification accepted: the portal unlocks the existing full app and Today entry. Ordinary players stay game-first before it; verified developers and a future verified Early Access entitlement bypass. Eivind explicitly chose to gate existing regular players too, superseding any grandfather-access recommendation. Preserve their data; do not reset habits/goals/answers.
- “Recover game” means reload/resume safely, not delete progression. Account, privacy, support and accessibility controls remain reachable. Gate all navigation paths, not only the Exit button.
- Paid Early Access is access-only; it must not claim forty islands, rank XP, ceremonial ownership or external-service consent. Product price, purchase type, provisioning and refund/revocation behavior remain undecided. Do not create a live product or checkout.
- AI suggestions require a separate transparent, revocable use-of-answers choice; user review before creating habits/goals/actions. Do not send raw answers into analytics, silently infer sensitive traits, or automatically connect health/calendar/location services. Data/consent/deletion design and runtime tests remain to implement; no claim of completed privacy compliance.
- Direction accepted: 36 ranks, 12 families × 3 visual stages; no knots; two forms per rank.
- First pair accepted by user continuation (“yeah ... implement”). Preserve assets and prompts.
- Existing role anchors and age gates remain the baseline, not automatically good long-term pacing. Inserting sub-ranks must not silently triple grind.
- Scaffold will require explicit thresholds for Sky Marshal II/III, not invent new permanent endgame requirements.
- Use Island 40 narrative unlock independent of Journey level 40 or activity level 40. The destination is Today/full app. Current policy candidate offers the council once earned island progress reaches 40; exact presentation timing still needs real-world integration with that island's mission/ceremony flow.
- Main currently calls Island 40 Lotus Lagoon / Lotus Crown Cup. A separate unmerged worktree `codex/island-040-cosmic-outpost-20260906` contains the Cosmic Outpost packet and dirty progress. Neither is silently overwritten or merged here. Use island number as stable event identity; resolve presentation against that workstream before final story/art integration.

## Safety and rollback

No changes to main/live, remote DB, paid services, auth/permissions or external integrations. No broad staging, resets, stashes, branch switching or deletion. New code is local and reviewable. Keep uncertain balancing isolated from runtime activation. Stop only the blocked portion for consequential product choices; continue independent safe implementation. Goal remains incomplete until integrated behavior, all art, tests and review evidence are delivered.

## First implementation checkpoint

- Added immutable V2 rank candidate domain: 36 explicit versioned keys and ordinals, 12 preserved family anchors, XP-based subdivisions, age gates, unresolved final two thresholds. V2 shape intentionally cannot be passed as a V1 ordinal-based RankDefinition. Not activated in App.
- Added medal/pin support to the existing RankBadge component and registry. The accepted first pair is copied into versioned public assets in this worktree; original art is preserved. Compact <=48px automatically selects its pin. Other families still use existing assets until replaced; the full 72-asset set is not complete.
- Added game-first/full-app policy and Island 40 all-caretaker story brief, normal-player gating, trusted developer/paid bypass, essential-controls allowlist, cycle-preserved earned ownership and catch-up eligibility. Not wired to App or persistence; no actual purchase or AI processing exists in this slice.
- Added executable audit and boundary tests. Existing reward-bar level regression is reproduced at Island 38 (3850/level13 → 3750/level12); Island 40 itself is 3950/level13. The earlier spoken level12 estimate was corrected by execution.
- Runtime cycle omission and code/contract player-level/dice-regen drift are documented. Neither progression defects nor the broader economy are fixed by this foundation.
- Evidence: `docs/investigations/rank-portal-20260926/progression-audit.md` and `.json`. Run `node scripts/run-rank-tests.mjs --audit`. Additional browser/mobile/auth/deep-link tests remain before activation.

Next implementation slice: derive canonical durable Journey milestones (including cycle and actual island completion), reconcile prior earned status and claim authority, then wire portal ownership/entry guards through canonical services. Read current main again before touching App; no merge of unrelated Island040 work.

## Progression consistency checkpoint — implemented locally

The foundation baseline above is historical. The original `progression-audit.md/json` is preserved; `progression-consistency.md/json` contains current executable results.

- Canonical completion and cycle-aware milestones now feed App's rank header and GameBoardOverlay's Journey spine. Reward-bar fill no longer grants/retracts Journey XP. First island completion reaches 150 XP immediately; completed Island 120 and cycle 1 / Island 1 both hold 12,050 XP. No double credit on Travel.
- An owner-scoped numeric checkpoint retains the maximum of recorded local XP, same-owner profile XP and current milestones. Real-life async data is also owner-tagged and loaded at sign-in, not solely on opening progress. No answers, habit titles or goal text are copied into the checkpoint.
- Filtered profile and existing-league-row updates cannot lower a higher score through this new client path. A losing stale writer reads the existing checkpoint back into the local store. Missing/invisible rows and network errors are not falsely reported as successful writes. Persistence remains best-effort and occurs while progress is open.
- The dormant reward action uses the same canonical completion/cycle derivation but explicitly discards the display checkpoint and caller-supplied island progress. Do NOT turn on `combinedJourneyRewardsEnabled` or re-grant RPC access: migration `20260811211851_harden_confirmed_security_definer_rpcs.sql` intentionally quarantined this RPC until server eligibility checks exist.
- Existing activity XP / dice regeneration, currencies, rank family thresholds and portal runtime behavior are unchanged by this slice. The candidate 36-rank model is still not activated.

### Verification

- `node scripts/run-rank-tests.mjs --audit`: 22 legacy rank suites plus expansion/policy boundaries and actual RankBadge component rendering pass; regenerates the new consistency report without overwriting the baseline.
- `node scripts/run-journey-progression-tests.mjs`: existing derivation/adapter tests, 1,800 checkpoints across three cycles, owner isolation, reload/storage fallback, stale/concurrent filtered persistence, plus 21 canonical completion/travel/claim tests pass. All database/RPC interactions in tests are mocks.
- `node scripts/check-journey-checkpoint-browser.mjs`: actual React hook under StrictMode passes account switches, missing milestones, sign-out, reload, profile recovery and cross-tab updates in headless Chrome with synthetic accounts. This is a focused hook test, not authenticated full-app E2E. Here it ran with `JOURNEY_BROWSER_CHANNEL=chrome` and `PLAYWRIGHT_MODULE` pointing to the bundled Playwright installation; no browser installation was necessary.
- Full app `tsc --noEmit --pretty false` passed twice, including the added regression tests on the final repeat.
- Architecture guard: zero violations, three existing allowlisted warnings. `git diff --check` clean.
- Main rechecked at `2b2ad470`: five unrelated Island 5 / crew artwork files differ from this worktree base; no overlap with this slice. They were not merged.

### Limits / next work

The maximum-XP checkpoint is not an earned-event ledger: after deleting milestones, subsequent progress first catches up to the retained total. It cannot recover historical XP never saved. Browser storage clearing can lose un-synced checkpoints. Old deployed clients and other write paths are not constrained by this client-side conditional update; a separate reviewed server-side policy is needed for a global non-regression guarantee. The snapshot remains unsuitable as proof of reward eligibility.

Next: canonical once-only Island 40 portal ownership and caretaker handover, followed by all-path game-first entry gating with verified developer bypass. Essential account/privacy/support access and existing data preservation remain mandatory. Coordinate with Island040's parallel artwork/mission work before presentation integration. Paid entitlement provisioning and AI answer-consent flows remain separate unfinished work. Then finish rank identity migration, pacing and the remaining reviewed medal/pin pairs. Nothing may be pushed, merged or deployed without Eivind's approval.
