# Island 001 first arrival — review contract

User-authorized local implementation and animation preview, 2026-09-20.

Outcome: the first post-reset/new-player game moment starts with the existing Expedition Ship in fast-space mode, dramatic descent to ocean beside Island 001, physical unfolding, then player and three robots fly onto the actual board. Player lands on the canonical starting tile; robots roam.

Scope: one reversible presentation sequence, real existing models, onboarding ordering, review/replay page. No ship redesign, rewards, movement rules, island geometry changes or deployment. Current origin/main 1426f994 is the baseline; existing ship worktree model snapshot is recorded separately.

Milestones: (1) deterministic choreography in the real renderer, (2) first-session eligibility and completion through canonical action, (3) desktop/mobile rendered evidence and playable local review.

Acceptance: visibly distinct fast travel/descent/ocean contact/expansion/crew flight/board handoff; actual player endpoint; three roaming robot roles; reload/return/reset eligibility checks; TypeScript and architecture guards; browser review with no new runtime errors. Reduced-motion and skip must reach the same final composition.

Authority: user requested implementation and local playback; animation approval is pending. No publish, merge, or release. Existing authored assets and mechanics remain authoritative. All changes isolated on codex/island001-first-arrival-20260920. Rollback is removal/revert of this branch. Stop for user's visual approval after concrete playback.

## Delivered review candidate

- 29-second choreography in the existing island renderer, using the authored controller ship snapshot and existing robot/player models. Landscape recording lasts 32 seconds including renderer startup.
- Travel -> descending bank -> ocean ripples -> full Haven expansion -> staggered player/three-robot arcs -> canonical START handoff and separate roaming paths. Camera adapts to portrait width.
- Fresh-state eligibility waits for hydration and uses the canonical story-prologue completion action. Reset factory restores eligibility. Blocks rolls and welcome/audio entry until complete; Skip and reduced motion settle at the same endpoint. Skip has a context-failure fallback.
- No gameplay rewards or token state writes occur in the cinematic. Post-handoff rendering stops assigning player positions.
- Dedicated local review at `/first-arrival-review.html` with replay and individual shot inspection. Vite recording config writes only the named local preview artifact.

## Verification

Full TypeScript and production Vite build passed. Architecture guard passed (three pre-existing allowlisted warnings). Focused tests pass: fresh/return/reset eligibility, ordered beats, existing current ship contracts, real-scene START endpoint, skip/reduced-motion endpoint, gameplay position ownership after handoff and disposal.

Wider suite: 2184 passed, three failed before importing the matching newer ship tests. The old ship assertion expected exposed physical armor leaves; its newer authored contract correctly expects those leaves buried under the closed controller shell, and passes. Two existing baseline source-string assertions remain unrelated: Island 015 expects the old scene build dependency text, and Island Tech Collection expects the retired Concord departure expression. HEAD source was checked directly to establish both predate this work. Neither gameplay rule was changed to satisfy stale assertions.

Browser evidence: actual portrait and landscape renders inspected at travel, expansion, disembarkation, and final board. Real canvas recording saved to task outputs as `habitgame-first-arrival.mp4`. User visual approval remains pending; no merge or deployment.

## Revision and release authority — latest user request

The first visual candidate was rejected. User now explicitly authorizes improved cinematic camera cuts, functional-only tile props, visible traffic light, Concord collection on Island005, main/PWA deployment, and rebuilding/installing the local iPhone development app. This supersedes the earlier preview-only stop. Acceptance: actual rendered close/wide shots; no decorative reward props; real money symbols and collectible state; nine collectable Concord positions on005 with legacy progress/reward preservation; first-session construction without a fragment dependency; build/service/architecture checks; exact live deployment and phone install evidence. Preserve current main and all unrelated original-worktree changes. No App Store release or remote account reset.

Latest steering: pause after unfolding and camera entry into the ship; fade in the canonical three-prize welcome claim using IslandMoneyNote (the actual game banknote); one DOM representation per prize to prevent doubled rank/award art; green PLAY resumes player/three-robot launch; short START close-up then camera handoff. Existing canonical idempotent welcome grant owns balances. No extra reward grant, no cohort enrollment. Publish remains explicitly authorized.

## Final revision verification

- Revised close/wide camera cuts, cabin checkpoint, canonical welcome reward, green PLAY, crew launch and short START close-up are integrated. One rank image, one dice prize and the actual game banknote render in the welcome modal. Phone-sized browser inspection verified the pause and PLAY continuation without runtime errors.
- Tile props now represent rewards/collectibles; persistent traffic light remains visible even under the player. Concord sprites and recovery placements are on Island005; earned Island001/005 slots and reward lines are unioned to avoid lost progress or duplicate payouts.
- User's missing iOS Build controls reproduced using the real BuildModalV2, real CSS, and the full-screen game entry wrapper. Body portal z-index2100 was behind game entry z-index9999. Raised Build to10060, above game/mobile-exit layers, and added a completed-island return action. Phone-sized hit testing and actual clicks verified hold input, close, complete-state return and viewport bounds. This is browser reproduction, not a claim of physical-device screen inspection.
- Final TypeScript and Vite production build pass. Island Run service suite:2259 passed,0 failed. Actual scene/arrival/functional-prop checks pass. Architecture guard:0 violations,3 existing allowlisted warnings. Native compile and release/install evidence follow below.

Signed iOS Debug build succeeded after the modal fix; Capacitor assets copied from the final passing web build. Latest origin/main rechecked at3b2a13b3 before publishing.

## Beginner-island follow-up

User correction: Island001 is intentionally quieter for every save. Hide and disable the reward-bar channel (including accumulation/claims), hide the daily-wheel and event-launcher icons, and remove the traffic-light tile/presentation/charging there. Preserve existing saved progress and all later-island rules. Required landmark activities retain their existing progression paths.

Blue board caretaker introduction moves to Island008: no actor, shadow, idle/walk update, encounter LOD, tap target or caretaker landing interception on001–007. Camera-preset visibility restoration uses the same policy.

Build fireworks now play only for Level3, with normal crew and construction presentation retained at Levels1–2. Browser inspection of actual BuildModalV2 confirmed fireworks counts0/0/1 for Levels1/2/3 and crew present in all three.

Regression fixtures for generic reward/event behavior now use Island002 where the reward channel remains available; Island001 tests explicitly retain money tile payouts while freezing reward progress, across both new and legacy save policies.
