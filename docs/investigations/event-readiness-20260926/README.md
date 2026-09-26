# Event-minigame readiness and introduction audit

Date: 2026-09-26. Scope: current main integrated at 52f1610f, local model/action tests, actual mobile puzzle briefings and HUD/controller renders. This is **not** a full playtest or a production-readiness certification.

## Recommendation: commit the introduction contract before expanding the catalogue

1. **Island001:** no event launcher, reward bar or evaluator, for ordinary and developer players alike. Preserve saved tickets, careers and prior play history when returning here.
2. **Island002:** introduce **Signal Path** through the existing opening-games ceremony/free guided round. It is already the authored inaugural game. The catalogue should contain that game alone at this point. No evaluator: one game is not a comparison.
3. **Next candidate: Crystal Miners**, introduced through a short caretaker beat and a first guided drop. Island003's mining theme is a reasonable proposal, not an implemented/approved assignment.
4. **Journey Disc Arena:** preserve its existing Island006 chapter-opening integration as the next candidate introduction. Do not infer play credit from reaching the island.
5. **Skybound Academy:** introduce later with a launch/landing lesson, after validating touch-flight controls and reset/recovery. No island number invented in production.
6. Add other games individually after content, settlement and mobile QA gates. A calendar event rotating must not unlock an unseen game.

Recommendations 3–5 are proposals, not shipped gates. The existing opening cohort remains explicit and is not silently enabled for every legacy save.

## Cut / hold / retain recommendations

| Game | Recommendation | Evidence and missing gate |
|---|---|---|
| Signal Path | First introductory game | Existing Island002 ceremony identity; guided opening-mode briefing rendered at 390px; 12 variants come from three base routes, so adequate for introduction is not proof of endless-event depth. Full guided completion/reload test remains. |
| Crystal Miners | Strong follow-up candidate | Persistent 40-cavern career and canonical action path; 82 model/progression tests pass, including simulated campaigns. Needs a genuine introduced-on-island receipt and full touch/resume QA. |
| Journey Disc Arena | Retain as a later candidate | Existing chapter-opening integration from Island006, permanent armory/event reward separation; 33 model/action/progression tests pass. Need mobile control/performance sign-off and introduction evidence. |
| Skybound Academy | Retain, later introduction | Twenty-lesson/five-aircraft career; 11 model tests pass. Played-once must mean one settled flight, **not** finishing the entire certificate. Touch flight and terminal/reload cases remain. |
| Twin Sigils | **Demo-only recommendation** | Six variants are mirror/invert transforms of one base 6×6 puzzle. A clean briefing does not solve shallow repeat content. Need independent puzzle bank, uniqueness/difficulty validation and teaching feedback. |
| Concord Categories | **Demo/side-challenge recommendation** | Six authored category sets; inspected mobile briefing and passing shared puzzle tests. Too little variety for a headline recurring event. Needs editorial ambiguity review and larger pool. |
| Lexicon Relay | **Demo/side-challenge recommendation** | Six fixed multiple-choice ladders; inspected mobile briefing and passing shared puzzle tests. Expand content and demonstrate replay value before normal-player recurring exposure. |
| Island Workshop | Hold release judgment; curate against Matrix | 26 model tests pass. Both Workshop and Matrix use placement/route-planning; avoid presenting two near-adjacent introductions without a clear difference. No full visual/play review this pass. |
| Momentum Matrix | Hold release judgment; compare with Workshop | 8 model/action tests pass. No automatic demotion based only on similar mechanics; needs comparative mobile playtest. |
| Space Excavator | Candidate, not certified | 14 selected depth/clue/object/reward-UX tests pass; per-dig settlement exists. Needs real touch-game and save/recovery review. |
| Companion Feast | Candidate, not certified | 29 model/progression tests pass. Need long-session overflow, exit/reopen and one-settled-run tracking verification. |
| Fortune Engine | Candidate, not certified | 32 model/progression/action tests pass. Need timing legibility, daily launch/exit/resume QA; don't count merely opening as playing. |

Boss Rhythm, Shooter Blitz and Vision Quest are stop-specific manifests, not entries in the current 12-game event/exhibition catalogue; do not accidentally relabel or gate required stop content with the event policy.

These judgments recommend public/demo disposition; **per-game demo flags and the new catalogue rollout are not wired yet**. Passing model tests is not a reason to mark every game ready.

## Current implementation gaps

- Board event grid takes every rotation template and every exhibition. It lacks per-game introduction/readiness filtering. Its caption hardcodes five rotating events, which would become incorrect after filtering.
- Arena pair selection has a broad exhibition fallback when fewer than two games are eligible. This must not survive in an introduction-gated catalogue.
- Recent-game history is a bounded presentation preference recorded at **launch**. It is not proof that a game was played.
- Existing result contract conflates abandon/loss via `completed`. Some long-career games only report completion on a much later milestone. Evaluation needs canonical settled-round/flight/dig evidence independent of winning or whole-campaign completion.
- Developer event controls currently support overrides/reordering, not a per-game release/demo permission model. A local dev switch alone is not verified developer identity.
- Island001's ordinary-event policy still returned true for legacy saves even though its launcher was hidden. This slice fixes that direct-launch-policy gap and invalid-location handling, with regression tests.

## Evaluator: target not located, do not alter the launcher blindly

Current main and inspected relevant branches/worktrees contain:

- `IslandRunArenaChoice`: a two-game **launch** chooser, not a preference vote;
- `IslandRunArenaPreferencesModal`: catalogue/order/pace/pause controls, not a pairwise evaluator;
- Skybound's evaluator: an aircraft test tool, not a two-game vote.

No post-game “which game was better?” modal was identified. Eivind was asked for a screenshot or open path. Do not relabel the launch chooser “Pick the best”: first-time players must be able to launch a game before having played it.

Proposed evaluation gate: two distinct game IDs AND each introduced at/before the current island with its saved introduction receipt AND each has at least one genuine settled play for this owner AND each passes release/demo access. Returning to Island001 fails regardless of history. A developer-only demo switch must not fabricate introduction or played evidence. Revalidate when opening, on account/island changes and when submitting. Store no vote if eligibility changes.

Visual direction: one title (“Which would you play again?”), two equal halves, large game identities/art, central separator, entire half as choice, Skip. No catalogue/settings/rank controls in this modal. Use a viewport portal, scroll lock, focus management and reduced-motion presentation.

## Safe merge and HUD evidence

- Previous verified progression slice committed as `d237d9e0`.
- Latest remote main at fetch: `1efd6ecd` (Claude's build-mode work). Merged without conflicts as `52f1610f`, then local main fast-forwarded to that tested commit. No push or deployment; shared dirty checkout untouched.
- Top bar housing: 76px → 64.59375px in browser measurements at 360/390/1280 viewports; width unchanged, menu hit height remains 44px.
- Entry glint settles to low-opacity ambient sparkle; upper Shop/Build controller faces receive bounded 12fps decorative sparkle using the existing cap surface. No gameplay writes or geometry changes; reduced motion freezes the effect.
- HUD screenshot fixtures use actual SVG/controller components, not the authenticated full app. See before/after PNGs and `hud-measurements.json`. Puzzle screenshots show briefings, not completed game sessions.
- Run `node scripts/audit-event-games.mjs`, `node scripts/check-event-hud-browser.mjs`, rank/progression tests and architecture guard. Browser script needs Playwright (available via PLAYWRIGHT_MODULE here) and installed Chrome.

## Next decisions

Confirm the actual evaluator surface and agree the initial introduction sequence before broad catalogue/persistence changes. Keep Island40 portal work and expanded rank rollout in their existing contract; neither is declared complete by this UI/audit slice.
