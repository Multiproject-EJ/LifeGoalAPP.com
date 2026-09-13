# Island completion and departure repair

## Execution contract

User-authorized scope: slow the mandate roll-up enough to see signing; verify Island 001; repair landmark accounting and automatically begin the island-complete/travel presentation for every genuinely completed island.

Sources: AGENTS.md, canonical gameplay/architecture contracts, mission tracker, stop/build action services, Assembly mission, board departure orchestration. Current request supersedes the old manual-only clear-presentation rule, not genuine objective/egg requirements.

Non-negotiables: canonical store reads and action writes; no fabricated objective credit from construction; no extra rewards; preserve guest save gates, Island 003 demo gate, rare-island Treasure Path, Island 020 extraction, cycle wrap and wallets. Automatically open the existing completion/departure sequence after other modal/cinematic work settles; retain the explicit Travel/Keep playing choice inside that sequence.

Milestones: (1) inspect/reproduce counters and gate divergence; (2) unify current-island completion derivation and truthful construction counters, including the Island 001 Assembly/mandate; (3) wire automatic presentation and recovery CTA; (4) focused regressions across 120 islands, incomplete/legacy state, duplicate triggers and travel reset; (5) browser-check scroll pacing and available local gameplay QA.

Authority: local changes and test fixtures only; no production save writes, migration, merge, deployment, purchases or account changes. Preserve unrelated worktree edits.

Rollback: revert only this task's specific hunks if a gate fails. Do not reset the dirty worktree. Stop for an external permission/product decision or unrecoverable test-environment blocker; report evidence and remaining coverage honestly.

## Initial findings

- Signature missions label a counter "Build Landmarks" but count `fullyRestored` (objective + egg resolution + construction), so finished buildings can appear unregistered.
- Ordinary final build updates canonical L3/buildComplete correctly, but does not open completion presentation. The automatic effect is restricted to Island 001.
- The departure helper ignores unfinished objectives while the full-clear helper requires them; the advisor, board and mission percentages therefore disagree.

## Verification

- `scripts/check-island-completion.mjs`: 263 passed, 0 failed. Includes construction counters for all 120 islands, canonical completion exceptions, legacy completed-stop credit, final build registration, automatic presentation eligibility, Keep playing/preview/busy suppression, Island 001 charge→build→sign→travel actions, wallet preservation, duplicate departure rejection and 120→1 cycle reset. These use isolated in-memory/local test storage, not a live account.
- Project TypeScript check (`tsc --noEmit`) passed; service test TypeScript check passed.
- Production Vite build passed (1m 56s), with the existing large-chunk advisory.
- Architecture guards: zero violations, three existing allowlisted warnings. No new UI gameplay mirrors/writes.
- Assembly/signature/world regression runner: 63 passed, 0 failed after updating the source guard to expect the new all-island completion effect (326 passing checks total across the two runners).
- Browser signing screenshot captured ink with parchment still fully open, then sealed result. Signing now runs 1.65s; roll begins after 1s and lasts 2.2s; success view waits 3.5s. A complete arbitrary signature remains unrendered.
- Isolated actual mission-phone component: L3 buildings show Done with activity/egg requirements incomplete; ready fixture shows Island 100% / Ready to travel. Checklist is readable at desktop and phone-sized viewport override; override restored. QA entry `island-completion-review.html` reads/writes no account data.

## Delivery and limits

Completion logic, advisor and departure guard share `islandRunCompletion.ts`. The mission phone separates its optional mission progress from overall island completion and exposes the complete requirement checklist. Island 001's mission phone can reopen the signing mini-mission after closing/reloading it. The board automatically opens the clear/claim/departure sequence only after active work yields attention; manual Travel and Keep playing remain inside it.

No production account, backend migration, merge, deployment or physical-device run was performed. Browser verification is the shared UI in an isolated fixture plus the marina review; the full live-account board journey is not claimed as browser-tested. Canonical action integration is covered by the regression suite.
