# Event readiness, introduction gates, evaluator and HUD

## Mandate and authority

Eivind requests safe merging of the verified progression slice, continued Island40 work, an event-minigame readiness audit, explicit developer-only demo access for unfinished games, a progressively introduced catalogue, an evaluator comparing only two genuinely played games, and a 15% shorter top bar with controller-matching calm sparkle (also upper controller buttons).

Local commits and safe local merge are authorized. No push, deployment, production DB mutation or paid-service action. Preserve Claude's latest main changes and the shared dirty checkout. Implement in the existing isolated rank/portal worktree, checkpoint the previous work before the new slice. Main is checked out elsewhere; only fast-forward its clean checkout after integrated tests pass, never reset/stash someone else's work.

## Gates and interpretation

2026-09-26 continuation approval: Eivind accepted the recommendation. Implement Signal Path002, Crystal Miners003 and Disc Arena006 with explicit, free introduction acknowledgements (catch-up introductions may be read on later islands). Existing ceremony participation counts as Signal Path introduction/play. Do not fabricate play history for legacy players. Demo/held games stay in a separately labelled, verified-dev opt-in lab, never the introduced catalogue or evaluator. Preserve the global clock and wallets even when its rotating game is unavailable. Build a separate two-game evaluator rather than turning the first-play chooser into a vote. Persist bounded owner-scoped introductions, played-once receipts and comparisons in the existing typed signature-journey JSON envelope; no schema or live database changes.

- Island001 remains quiet for every player, including devs: no event catalogue or reward bar.
- Current island presentation limits the catalogue even after returning from a later island. Saved purchases, equipment, XP and played history are not deleted.
- Introduction, readiness, event availability and genuine played-once evidence are separate requirements. Developer demo access is opt-in, not a blanket introduction/play-history bypass.
- Recommend committing Signal Path as the first introduced game via the existing Island002 opening. Later introduction assignments need authored beats and readiness evidence, not an arbitrary dump of all games into Island003.
- A launch/cancel is not a completed play. A finished loss counts as played; preview/test fabrication does not.
- Evaluator must fail closed with fewer than two distinct introduced, played games. No fallback to unplayed games. Close on account/island eligibility changes; revalidate on submission.
- Evaluator presentation: two equal choices separated by a central divider, one clear question, no ranking-settings clutter; viewport portal, scroll lock, keyboard dismissal/focus behavior.
- Top bar: retain width and readable text/hit targets, target visual height 85% of measured baseline. Use opacity/transform-only decorative accents, a brief entry glint fading into subtle ambient sparkle; no interference with input and respect reduced motion.
- Upper-controller-button sparkle follows existing materials/effects; no controller geometry rebuild.

## Execution and evidence

1. Preserve/commit previous tested slice, fetch current main, check overlaps, integrate locally and rerun relevant checks before local-main fast-forward.
2. Inventory every actual event/exhibition entry. Audit implementations, canonical settlement, save/exit behavior and visual evidence; distinguish defects, demo candidates and unverified quality. Do not claim playtesting from static code inspection.
3. Implement a small shared access policy and launch/pair/catalogue guard; tests for Islands1/2/later/backtracking, zero/one eligible game, ordinary/dev opt-in, canceled/completed plays.
4. Locate the evaluator before replacing it. Current main has an Arena launch chooser and rank/settings catalogue, but no identified post-game comparison evaluator. Asked user for screenshot/open path; bounded independent work can continue.
5. Deliver before/after top-bar evidence at desktop/mobile and reduced-motion. Keep visual changes separate from economy changes.
6. Resume Island40 canonical ownership/gating after this requested slice. The expanded rank rollout, remaining art, paid Early Access and answer-consent work remain tracked separately.

## Stop / rollback

Conflicting edits, uncertain identity of the existing evaluator or unresolved introduction schedule block only those changes. Keep unsupported games hidden from proposed ordinary-player rollout rather than calling them production-ready. Preserve tested commits as rollback points; no destructive history operations.

## Verified checkpoint

- Preserved the prior progression/rank-policy slice in `d237d9e0`; integrated main through `1efd6ecd` in `52f1610f` and fast-forwarded the clean local main checkout. No push/deploy.
- HUD measured at 360/390/1280px: height 76 → 64.59375px, width unchanged, 44px menu targets retained. Actual controller renders successfully; reduced-motion check passes. Evidence is in `docs/investigations/event-readiness-20260926/`.
- Added a canonical Island001/invalid-location ordinary-event rejection and regression coverage. This is not the full per-game catalogue gate.
- Event audit: 262 model/action tests pass. Rank/progression checks and full TypeScript check pass. Mobile puzzle evidence covers briefings, not full gameplay certification.
- A second fetch found main advanced to `58542b21`, touching build-hold and Island5 pilot files, not this slice's edited files. Integrated without conflicts at `ffacf8b8`. Full app TypeScript, event/rank/progression suites, architecture guard and the changed Build contract test pass on the integrated tree; safe for clean local-main fast-forward. HUD/audit implementation is checkpointed in `f6a862ae`.
- Pending: identify the actual post-game evaluator; approve later introduction assignments; wire per-game demo opt-in, introduction receipts and settled-play evidence. The audit's proposed release statuses are recommendations, not runtime flags. Island40 runtime wiring and remaining rank artwork remain unfinished.
