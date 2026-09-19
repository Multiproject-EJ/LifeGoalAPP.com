# Crystal Miners — Merge Miners event adaptation

Date: 2026-09-19. Authority: Eivind's request to build the linked Merge Miners game as a functional HabitGame event minigame. Reversible implementation is authorized; production deployment and database rollout require separate approval.

## Outcome and reference

Create an original HabitGame presentation of the observed Merge Miners loop: buy tools, combine equal tiers, position the tool deck, drop tools into layered blocks, recover treasure, and improve the next dig. Reference: https://youtube.com/playables/UgkxagGtOacDB1SvVDTH2J5vhkFjASrAJtBw . Original code and vector artwork; no copied game assets.

Sources of truth: AGENTS.md; gameplay architecture and canonical gameplay contracts; live origin/main at da642f12; Arena catalog, canonical event tickets and state store. Main checkout contains unrelated WIP; use branch codex/merge-miners-event-20260919 in this isolated worktree.

## Scope and assumptions

- Arena exhibition available alongside the active event; existing event rotation remains authoritative.
- One active-event ticket per dig, permanent tool deck, ore, gifts, mining depth and personal league across islands and event rotations, free arranging/merging and ore purchases within the minigame. Ore is internal material, never an island coin wallet.
- Deterministic bounded physics, breakable layered terrain, treasure, tool tiers, upgrade loop, touch drag and tap/keyboard controls, sound/haptics, reduced-motion support.
- Canonical action service owns all mutations, ticket spend and once-only reward settlement. UI subscribes to the store and animates simulation evidence only.
- Closing or refreshing cannot refund a spent ticket or duplicate a reward. Old events cannot spend or reward the new event.
- Include a standalone local review entry using a disposable preview identity and the same canonical action service; never seed the user's real account.
- No payments, ads, copied branding, island progression shortcuts, or unrelated rewrites.

## Milestones and evidence

1. Pure engine: merge/buy/move validation, deterministic falling-tool simulation, layered block damage, treasure and increasing difficulty. Tests prove invalid actions are inert and all simulations terminate.
2. Canonical integration: locked atomic ticket+dig+reward action, persisted progress, sanitization, conflict merge, Arena catalog/launcher, schema migration. Tests cover concurrent actions, duplicate revisions, reload, no tickets, expiry, and reward idempotency.
3. Playable UI: original mine scene, readable tool deck, progression feedback, instructions, results, mobile fit and accessible controls. Browser playthrough and desktop/mobile visual inspection.
4. Verification: relevant gameplay suite, architecture guards, TypeScript/build; record pre-existing failures separately. Keep user-facing review instructions and evidence.

## Rollback, budgets, stopping

Lazy-load game code; no new runtime dependencies. Bound simulations to 2,400 fixed steps, 25 tools and 140 blocks; cap visual effects. Respect viewport modal portal and scroll locking. Rollback via reverting this feature's commits; additive database column may remain unused. Never reset other user state. Stop only for a concrete blocker or a deployment decision after the local implementation is reviewable. No delegation requested.

## Handoff

Read this contract and the feature files before continuing. Do not infer deployed state from code. Append verification and delivery details below.

## User clarification — permanent investment

The newest complete career checkpoint follows the player regardless of event or island. Event keys retain spend evidence; they do not reset the workshop. Event-specific tickets and reward-bar resets remain canonical. No building side mission: HabitGame owns building in the main loop. Gifts, TNT, varied hardness, suspenseful falling tools, every-fifth-cavern guardian and lifetime personal leagues are in scope.

## Verification and handoff — 2026-09-19

- 24 focused mining + Arena preference checks passed, including canonical island travel, event rotation, reload, ticket/reward atomicity, duplicate revisions, boss collision and generous reward-course coverage.
- Production Vite build passed (1,469 modules); existing bundle-size warnings remain. Final game/preview bundles also compile after collection-effect changes.
- Architecture guard passed with zero violations and three existing allowlisted warnings. Diff whitespace check passed.
- Browser evidence: gift opening, merging, purchasing, a normal dig (23/28 m, three gifts, Silver promotion), saved workshop after reload, guardian dig (28/28 m, one treasure, four gifts), reward dig (one ticket, ore and event-bar credit), and phone-width rendering/gift opening.
- Later browser control stalled. Eivind demonstrated the reference reward round, but no frames were received. Do not claim that round was observed. Eivind authorized proceeding without it and will show it another time.
- Reward cavern is provisionally placed after each guardian; no building side mission. Current league is a lifetime personal ladder, not multiplayer.
- Release is not done: migration unapplied, no live deployment, existing production eligibility gates unchanged. See outputs/CRYSTAL-MINERS-REVIEW.md in the task directory for player journey and comparison audit.
- Final feature/transitive TypeScript check: zero diagnostics across 369 source/declaration files. Full repository recheck stopped after >27 minutes; not claimed as passed.

## Gauntlet iteration 2 — explicit user authorization

Mission: play once, critique, fix bottom treasure visibility and add a top event reward/progress track with future rewards for level completion. Preserve permanent equipment, original loop, canonical tickets/rewards and no building side mission. Local changes only; no deployment.

Observed baseline play: merged two tier-1 tools and completed a drop in phone preview. Result: 28/28 m, 49 blocks, 1 treasure, 2 gifts, 289 ore, +4 event-bar progress. Problems: bottom chests are offscreen in preparation; no course inspection; depth implies completion despite only 1/3 chests; personal league offers no concrete next level prize; phone scroll offset clips heading on launch.

Slices: (1) visible treasure destination + shaft overview + honest completion feedback; (2) event-scoped cleared-level track, visible upcoming wallet/mining prizes, idempotent claims through canonical action service; (3) browser re-play, reward claim/reload and focused type/gameplay/architecture checks. Existing career carries across rotations while the event prize track resets. Do not reset user preview progress. No additional migration required for additive fields inside the existing JSON save column.


## Iteration 2 steering — forty-cavern progression

User explicitly requested 40 increasingly demanding levels, reward freefalls at 10/20/30/40, and milestones: level 1 = 25 dice, 10 = 200 dice, 15 = mystery gift, 20 = 20 drop tickets, 30 = 500 dice, 35 = lots of money, 40 = 1,500 dice. This supersedes the provisional five-level reward cadence and event-reset prize track above. The journey and once-only claim ledger now persist with permanent equipment. Active-event tickets and event bar remain event-scoped. Money means HabitGame's actual Essence wallet; select 5,000 Essence. Mystery gift deterministically reveals one real wallet prize, atomically granted with its claim. No level 41 or repeat farming of the final reward. Preserve version-1 workshop investments with validated proportional-damage terrain migration to version 2. Verify every milestone, final cap, save migration and tool-vs-difficulty curve.


Latest steering: five finish-line chests, each with a distinct ore/gift prize. Normal levels need one reached chest; x8/x9 hard approaches need two. Every tenth level has a full-width guardian above its generous reward fall, reconciling the boss cadence with the requested reward levels. Continue all falling tools before settling so additional paths pay extra treasure. Save format 3 migrates both earlier prototype layouts. Selecting a mergeable tier highlights only matching, non-max-tier tools, with reduced-motion support.


Latest steering: reference tools normally remain in their selected lanes; random lateral ricochets are incorrect. Save format 4 introduces separated lane shelves and freefall stretches, fixed-lane impacts, rare violet arrow deflectors with explicit adjacent-lane motion, and collection/impact feedback. Existing saves migrate while retaining workshop and damage where materials match. Add full-frame lane invariants and redirected finish-line payout tests. The reference tab was accessible on a level-99 completion screen but did not advance on Continue; no newly observed reference drop is claimed.


Latest steering: add a drag-to-trash workshop target, plus select-and-tap equivalent. Canonical revision-checked removal gives no ore refund and protects the last item. Wrapped gifts open before discarding. Verify duplicate removal, persistence and zero ticket/currency effects.


Latest steering: integrate scarcity, upgrades and the existing Stripe paths. Keep one-ticket pricing transparent and independent of player balances; never secretly alter physics to exhaust paid/earned tickets. Reuse mined ore for five permanent forge ranks (+2 impacts each; costs 90/180/360/720/1440 ore, unlocks at caverns 1/5/10/20/30). Read-only readiness guidance spots underprepared lanes and boss approaches. At <=3 tickets show island earning and existing gated ticket/dice shop routes. No new automatic ticket regeneration, payment execution or fake checkout. Combined dice+ticket SKU is absent; requested user quantities/price asynchronously while finishing existing routes.


Latest steering: longer opening and finish-line freefalls. Move the first shelf to y=116 and treasure to y=1056 in a 1120-unit shaft, leaving about 186 units clear above the finish. Collision and rendering use one shared block-position function. Destination chests glow within the final 220 units, then open and display their actual ore/tool-gift prize. Re-run trajectory, reachability and balance checks after the geometry change.


Latest steering: weighted random gift reveals centered on the current buying tier; normal odds 70% base, 23% +1–2, 3% lower down to 1, 3.5% +3–4, 0.5% +5–10. Super boxes occur for ~5% of recovered gifts, with 10/40/35/15% odds for base/+1–2/+3–4/+5–10. Extend tool ceiling to 20 so rare finds can exceed the old ten-tier ceiling. Box rarity settles with the dig; actual tool tier rolls once in the revision-locked open action and persists. Add odds-boundary/distribution and reload-no-reroll tests. These are virtual tool rewards, not purchased loot boxes.


Latest steering: camera tracks one live tool until it finishes, then smoothly returns to the next surviving tool, including upward motion after a first tool reaches the chest. Precompute presentation camera positions from deterministic frames and test survivor switching, upward travel and bounds.


Latest steering: play through all forty levels and make progression continuous. Automatically bank eligible milestone rewards in the dig's atomic commit and persist their reveal labels on the receipt. Result primary action is Continue (next-level drop) or Try again (same terrain); optional workshop adjustment remains available. No extra collection stop. Full canonical playthrough should use actual open/merge/buy/forge/dig actions and refill only through modeled island earning, documenting that no Stripe charge was executed. User wants later pressure points; fixed x8/x9 approaches and transparent ticket limits supply these without requiring payment or changing outcomes based on balances.


User correction (authoritative): every result must return to the item grid. Continue and Try again only dismiss results and reset focus/scroll to preparation; neither spends a ticket or starts a drop. A separate explicit Drop remains required after arranging/upgrading. Milestone rewards stay automatic, so no collection detour. This supersedes the immediate-next-drop interpretation above.


Latest steering: taller animated guardians with four escalating identities: Moss Guardian, Iron Warden, Ember Colossus, Prism Tyrant. Add idle breathing/arm movement, glowing core, hit recoil and low-health rage, with reduced-motion support. Leave rows 9–13 open below the boss for the taller silhouette, shift first post-boss gift row to 14, and migrate terrain to save format 6. Guardian HP rises from 343 at level 10 to 29,384 at level 40 under the visible level curve.


Gauntlet balance finding: unrestricted exponential upper-tier power plus the newly generous gift odds made both canonical campaigns clear 40/40 on the first attempt. Preserve gift odds and tool tiers, but use 25% power growth per tier above tier 7 (integer damage), retaining the early doubling curve. Retested canonical policies (up to two or eight buys per dig) finish in 42 and 41 drops, with retries on 38–39. Mystery ticket rewards can legitimately remove later ticket pressure; do not manufacture a mandatory purchase. Add a Guardian inspection view to make the tall four-stage artwork readable before dropping.


User camera correction: follow the furthest-down active tool on every frame, including overtakes. Do not remain attached to the previous tool while it is slower. Keep the leader within the lower safe area even while easing, then return upward to the next survivor after it finishes. Add a regression with alternating leaders and fast descents. This supersedes the sticky-focus camera rule.


## Current verification — 19 September

47 focused mining/Arena checks passed, including both full canonical forty-level campaigns and the corrected overtaking-camera regression. Feature TypeScript: 370 source/declaration files, zero diagnostics. Architecture guard: zero violations, three existing allowlisted warnings. Browser checks: level-10 guardian cleared with five chests, 697 ore, 11 gifts, 1,690 points and automatic 25/200-dice banking; Continue returned to cavern 11 preparation with unchanged 19 tickets/one dig. Underpowered level-40 attempt preserved guardian damage and Try again returned to preparation without spending. Final guardian visual inspected at phone width; browser computed styles confirmed running breathing, arm and core animations. Matching glow and actual drag-to-trash verified with unchanged ore/tickets. Full campaigns were automated canonical-action playthroughs, not forty manually watched rounds. Final camera continuous visual capture remains limited by automation latency; per-frame regression proves leadership and framing. Additional engine seeds completed in 41–42 drops with four modeled island earning returns. No live migration, deployment or Stripe charge. Combo pack pending product quantities/price.

Final checks completed: Vite production build passed with 1,470 modules and existing chunk/import warnings; corrected-camera TypeScript check passed. Final review, balance evidence and full patch are in the task outputs directory.


## Authorized production release — latest user instruction

User explicitly requests reward-bar modal grid inclusion and its own icon, integrated test play, professional failure reporting, event-loop optimization data, and push to live. This supersedes earlier no-deploy limits for this feature. Reuse existing consent-aware, capped telemetry and admin RLS; do not introduce a new vendor. Add session/attempt/preparation/reward/resource-funnel events, sanitized error fingerprints and a recoverable render boundary, plus an admin per-cavern balance view. Keep legacy game gates intact while permitting Crystal Miners to use the real active event channel. Apply only this feature's additive save migration (nullable for older snapshot clients), verify it, commit the isolated feature, push the reviewed release to main, and verify GitHub Pages and the live asset. No paid purchase, user-data reset or unrelated deployment changes.

## Release verification and ticket-model steering

Reward-bar modal browser check: Crystal Miners appears once at rank 7; its dedicated SVG loads; clicking opens the canonical workshop with the active event and permanent progression. The zero-ticket screen offers island earning/supplies. Automated checks reached 52 passing before ticket-model changes. Production additive save migration applied and verified: JSONB empty-object default, nullable old-client compatibility, existing RLS enabled. Frontend release remains pending successful build and push.

User requests per-game normal-loop earnings and Stripe pack quantities, with more attempts for Crystal Miners. Existing event wallets are shared and server packs fixed at ten. Presented the wallet tradeoff asynchronously, then stated the shared-budget assumption: one shared earned/purchased ticket funds three mining drops; consume saved funded drops first; exact milestone drop rewards stay game-specific. No new paid SKU, price, or globally disabled checkout gate is enabled. Other games preserve their current quantities. The user can steer this assumption before release.
