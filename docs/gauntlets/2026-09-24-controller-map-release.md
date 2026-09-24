# Controller and island map release

User authorisation: publish the approved controller/map changes to live main and
update the iOS Capacitor dev app, after Island 017 finishes deploying.

Verified baseline: origin/main 37b89be969ba813abb1f339fa906d0508270b0f1,
freshly fetched after the user's release handoff. This release is isolated on
codex/controller-map-release-20260924. The old local workspace remains untouched.

## Scope and invariants

- Port the approved controller, Story entry and island map selectively.
- Preserve all current island renderers, Island 017 awakening, canonical actions,
  beginner gates, Lava Skiff and shooter adapters, and earned progress.
- Main already implements Island 005 Concord recovery (contract section 5G).
  Do not replace it with the old local branch's Island 001 logic.
- Public themes: day/dark only; experimental themes stay developer-only.
- No database changes, unrelated local work or blanket branch merge.

## Release gates

1. Main-based integration, targeted regression tests and architecture guard.
2. Full TypeScript and production build; current service suite.
3. Browser map open/search/close and controller interaction checks, including
   MAX lock, hold behaviour, special-mode preservation and mobile layout.
4. Refresh origin/main immediately before publishing. Reconcile if it advanced;
   never force-push. Confirm GitHub Pages success and actual live assets.
5. Build/sync the same release for Capacitor iOS; verify Xcode/device delivery
   separately. Bundling is not proof that the installed app was updated.

Rollback: revert only this release's commit(s) on latest main. Preserve all
intervening releases and local user changes. Stop before deployment on failing
tests, ambiguous migration or missing authorisation for external changes.

Status: preparation/integration, not published.

## Checkpoint

Island map ported into Board menu, with original map assets and scoped CSS.
Opening stops auto-roll; modal participates in blocking/attention gates and
renders through the viewport portal. Progress is derived read-only; map previews
cannot change canonical island position or reward state.

Architecture guard passes: 0 violations, 3 existing allowlisted warnings.
Diff whitespace check passes. Current verification logs:
- `/tmp/habitgame-main-map-typecheck.log`
- `/tmp/habitgame-main-map-tests.log`
- `/tmp/habitgame-main-map-build.log`

The first test invocation failed only because Node was absent from PATH; rerun
uses the installed runtime bin directory explicitly. Do not claim gates pass
until each process exits successfully and final log totals are checked.

Controller port is still pending. Important live-main integration differences:
Lava Skiff and shooter adapters must remain; pointer cancellation must use
`cancelAutoRollHold`, not `endAutoRollHold` (the latter may commit a short roll).
Main's Concord hub has a newer restoration grid/device, so port Story affordance
and channels without overwriting that hub or Island005 recovery services.

No commit, push, Pages deployment, Capacitor sync or installed-app update yet.

## Release candidate verification (supersedes checkpoint)

Controller port completed with explicit cancellation callback, creature reward
badge, original special-mode adapters, day/dark selection and dev-only extras.
Story uses reward-free `story_replay` of current island content; the retired
prologue and its onboarding side effects remain removed. Main's Island005
Concord collection and newer device hub are retained.

Final checks: 2302 service tests passed, zero failed; full `tsc -b` exited zero;
production Vite build passed; two controller animation/framing test files passed;
architecture guard zero violations, three pre-existing allowlisted warnings;
diff whitespace check passed. Signed final iOS Debug build succeeded after
syncing the corrected production bundle. Portable Swift package paths retained.

Browser evidence: new controller visibly rendered over actual main-based game.
Subsequent browser automation timed out across preview tabs; complete fresh
map/controller interaction QA is not claimed. Prior map QA remains documented
in the source workspace's 2026-09-07 orbit-map report. Phone interaction remains
a manual follow-up even if installation succeeds.

Deployment and installation results are tracked separately from build success.
