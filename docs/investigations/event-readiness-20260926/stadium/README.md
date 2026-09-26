# Required stadium participation — 2026-09-26

User amendment: no stadium Later and no evaluator Skip. A built/enterable stadium requires a new settled round and any eligible unanswered comparison. The existing beginner exceptions remain; Island001 stays quiet.

## Implementation

- `arenaStadium.ts` owns pure visit/access/round/roll gates. `arenaStadiumActions.ts` owns mutex-protected receipts and atomic completion, including existing shard and L3 landmark-dice rewards. UI components do not write gameplay.
- Current-visit receipt in the existing `arena-journey-v1` JSON envelope: cycle/island/start key, timestamps and one current game's baseline. Historical play is not a new visit's participation. Miners uses the permanent career dig count (copying an old career into a new event on gift/workshop actions must not count); Disc uses event-scoped banked rounds including losses; Signal uses its funded terminal receipt. No requirement to finish a whole mining career or win.
- Stadium introduction and eligible post-round comparisons open automatically. A fresh catalogue with one game never asks a comparison. Already answered pairs are not repeated for each stadium. A player may still explicitly revisit a comparison in the catalogue.
- Closing a game, Escape, stale callbacks, generic stop-completion callbacks and postponement cannot grant stadium credit. Reload resumes a pending visit. Zero-ticket recovery explicitly returns to earning, leaving the activity incomplete; a waiting vote still blocks rolling. Existing completed landmarks are preserved.
- Required stadium play ignores optional catalogue pause flags so preferences cannot make the required activity empty. Ordinary catalogue preferences are unchanged. Developer previews remain excluded from participation/comparison.
- The stadium and game overlay use viewport portals; the evaluator sits above the real game-shell stacking context. Background scroll is locked, and the evaluator traps focus. Browser checks include a game-layer z-index9999 hit-test.

## Evidence

- `scripts/check-arena-journey.mjs`:299 tests, including10 new stadium scenarios and the existing210 action/roll tests. Five outdated test expectations were aligned with quiet-Island001 and mandatory-stadium rules; no runtime gates were relaxed. New assertions cover L3, legacy completion, no generic/postpone bypass, reload, resource recovery, historical/cancelled play, mining-career event rotation, terminal loss, unanswered pair, duplicate reward, stale visit and JSON merge.
- `scripts/check-arena-journey-browser.mjs`:actual controls, stadium component and canonical store with synthetic owner. Controlled Signal completion fixtures test cancel, remount, terminal loss, automatic comparison, required answer and ticket recovery. Equal halves, viewport, keyboard, scroll and z-order checked at360/390/1280px. Screenshots and `browser-check.json` are beside this file; prior before-images remain under `../journey/`.
- Event audit262 tests and journey progression1,800 transitions plus21 completion/travel/claim cases pass.
- Full-project TypeScript passes on the final integrated tree, including viewport portals, mining-career baseline and Claude's latest completion/reward changes. Rank/policy/badge checks also pass; those policy tests do not imply that the unfinished Island40 runtime or36-rank rollout is activated.

## Limits and release gate

No authenticated full-board playthrough, live database mutation or live cross-device test. Browser rounds are controlled terminal fixtures, not certification of every game. Supabase routing guidance kept persistence in the existing typed JSON save path; no schema, auth/RLS, new endpoint or dependency changes. Mixed old-client sanitizers remain a staging check before release. No push/deployment. Rank expansion activation and Island40 runtime work remain separate unfinished milestones.

## Recovery / handoff

Previous rollback checkpoint:b9997fc1. Revert this slice normally if needed; never reset shared worktrees. Preserve Claude's incoming main changes. Main may be fast-forwarded locally only from a clean checkout after integrated checks. The shared development checkout is intentionally untouched.

Implementation checkpoint:fb0e0ee5. Claude main advanced during verification to9f3c45ac (Island Complete title/reward presentation); merged without conflicts ataadb77b9. Both incoming Boss reward tests pass, and the299 Arena/action/roll tests,1,800 progression transitions,21 completion/travel/claim cases, browser fixtures and architecture guard were rerun on the integrated tree. Architecture guard retains3 explicitly allowlisted legacy warnings and adds none.
