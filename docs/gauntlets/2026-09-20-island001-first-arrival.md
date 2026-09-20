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
