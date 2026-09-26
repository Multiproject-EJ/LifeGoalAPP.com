# World portal entry gate — approved continuation

Scope: activate the approved game-first presentation policy for new and existing
ordinary players, using canonical portal ownership and verified developer access.
Paid Early Access is not provisioned. No server permissions, purchases, AI consent,
data deletion, push or deployment changes.

Implementation:
1. Owner-tagged startup hydration/admin checks. Never inherit a prior account's
   bypass; do not mount a fresh playable save when remote loading fails without
   usable local progress. Offer retry and essential controls.
2. Guard both App layouts above their workspace/overlay rendering. Today, habits,
   goals, launcher callbacks and deep-link navigation cannot bypass the guard.
3. Reuse account settings/profile editor and support, with game-only recovery
   (reload, not save reset). Hide Exit before ownership; retain the council until
   the player explicitly leaves, then open Today.
4. Keep full-app startup for verified developers/earned portal owners. Preserve
   public trust pages and the separate Peace Between surface.
5. Verify async owner changes, startup failures, gate policy, handover, navigation
   containment, essential controls, actual React boundary and responsive layout;
then typecheck and existing gameplay regressions.

Parallel safety: work only on the isolated ranks/portal branch, re-fetch main
before integration, stop on dirty main or incompatible changes. No edits to the
shared checkout or paused Cosmic Outpost. Local fast-forward only after checks.
Rollback the entry boundary independently; never remove earned portal receipts.

Testing method: reuse the focused esbuild/Chrome fixtures proven in the previous
slice. Actual hooks, shell and canonical handover run with controlled remote/admin
responses. AST checks verify placement/wiring of the real App guard above both
layouts. These are not authenticated full-App E2E; that remains a release check.

Implementation checkpoint: entry/owner guards, recoverable shell and canonical
receipt policy are implemented. Guest claim and initial hydration are serialized;
StrictMode and late prior-owner responses are exercised using the real App effect.
Native egg notifications remain mounted after safe startup. Focused checks and
TypeScript pass; evidence and the known baseline landing-copy test failure are in
`docs/investigations/world-portal-entry-20260927/README.md`.
