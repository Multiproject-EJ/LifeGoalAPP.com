# Approved catalogue and evaluator implementation

2026-09-26 continuation: Eivind approved the introduction recommendation. This supersedes the parent audit's “not wired yet” checkpoint for catalogue/demo/evaluation work only. Island40 and expanded rank art are still separate unfinished work.

## What is implemented

- Signal Path002 → Crystal Miners003 → Disc Arena006, each explicitly introduced by a free acknowledgement. Catch-up cards appear in order on later islands. Existing completed inaugural Signal Path participation is recognized; reaching an island alone is not proof of playing.
- Current-island catalogue filtering across grid, chooser, preferences and launch callbacks. Returning to001 hides everything without erasing earned state; returning to002 leaves Signal Path. No broad pair fallback.
- Three named demo candidates plus held/unreleased games live in a separate verified-admin + dev-mode lab with individual session-only opt-in flags. Normal players cannot see/launch these from the board. The lab does not fabricate introductions or played evidence.
- New, separate opt-in evaluator: equal halves, game illustration, central separator, one question, Skip. It is not the launch chooser. Open from **Arena games → Compare played games** after two games have been introduced and played. Votes are saved as bounded preferences evidence, not wallet/XP rewards and not automatic rank/session reordering.
- Canonical receipts: Signal Path entry atomically funds/resumes one attempt; closing does not count; terminal low-score/timed-out results count. Miners uses settled digs; Disc uses banked wins/losses. Opening/preparation is not played. No full-career certificate requirement.
- Fresh owner/island checks, viewport portal, scroll locking, focus trap/Escape and invalidation while open. Launch overlays close on owner/island change.
- Existing global event lifecycle, ticket buckets, careers, egg/stop progression remain distinct. Normal header says Arena games, not an unavailable rotating-game name.

## Evidence / limits

`node scripts/check-arena-journey.mjs`: 78 targeted journey, preference, opening-ceremony and signature-mission integration tests. New journey suite is also registered in the main Island Run runner.

`node scripts/check-arena-journey-browser.mjs`: actual controls/chooser and canonical store with a synthetic owner. Checks explicit introduction, one-card launch, no comparison after only one played game, equal halves at360/390/1280, viewport bounds, scroll lock, focus/Escape, vote persistence, travel invalidation and dev isolation. Browser uses installed Chrome and PLAYWRIGHT_MODULE in this workspace. Captures are fixtures, **not** full authenticated app playthroughs.

Existing262 event-model tests, Journey progression/1,800 transitions and architecture guard are regression checks, not certification that every minigame is release-quality. TypeScript is checked before local-main merge. No live database/remote policy/schema modification and no push/deploy.

The developer lab relies on the existing verified `isAdmin` prop, not editable user_metadata or a local switch alone. These are client product gates, not a new server anti-cheat boundary. Older deployed clients do not understand the new typed JSON entry; mixed-client preservation needs staging QA before release. Local fixture persistence/merge passes; live cross-device sync was not exercised.

Scope deliberately stops at the approved three introductions. Skybound and the remaining games need authored introductions and settlement adapters before entering the normal catalogue/evaluator. First-person mobile gameplay, full-board smoke testing and user visual acceptance remain release gates.

## Visual review

Initial desktop fixture exposed art overflowing its frame. Switched Miners to its existing icon asset, bounded illustration dimensions, and authored Signal Path's native SVG route. Re-ran the same browser checks at all three widths; final captures show no overlap. No third-party creative assets or image generation used.
