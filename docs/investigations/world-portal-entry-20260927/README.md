# Game-first entry gate — verification

The approved gate now applies to new and existing ordinary players. A saved
Island 040 handover or verified active developer/admin role opens the full app.
Paid Early Access is intentionally not provisioned. Existing habits/goals remain
intact. Recovery reloads the game; it does not delete or reset saves.

## Evidence

- `check-world-portal-entry-browser.mjs`: actual entry hooks, shell and canonical
  handover with controlled remote/admin responses. Covers owner switches, stale
  responses, metadata spoofing, durable receipt readback, explicit council exit,
  reload, offline/local and unavailable remote saves, retry, developer revocation,
  guest-transfer barriers, bounded startup, essential controls and sign-out.
  Phone, short-phone and desktop screenshots plus `browser-check.json` are here.
- `check-world-portal-entry-wiring.mjs`: real App AST verifies a single boundary
  before mobile and desktop layouts, owner-keyed shell, account-only exception,
  guarded exit to Today, discarded queued protected launches and portaled overlays.
- `check-portal-guest-transfer-browser.mjs`: executes the actual App claim effect
  under StrictMode, including serialized cross-account transfer, stale responses,
  failure, retry and safe existing-save conflict. Does not change claim semantics.
- Portal and guest-claim suites: 9 + 6 passing. Arena: 299 assertions. Journey:
  1,800 transitions and 21 completion/travel/claim assertions. Rank: 22 suites and
  36 expansion/policy/badge checks. Architecture: no violations (3 existing warnings).
- Full TypeScript check and whitespace/diff check passed before upstream integration.

Known baseline failure: `check-guest-free-play-entry.mjs` passes 10/11. Its
“Guest can enter Island Run before choosing names” assertion requires the literal
copy `Choose my captain`, absent from the untouched landing component at committed
baseline 432a7960. The empty-name play action exists. This slice does not edit that
landing component or silently relax its test.

## Limits and release checks

Fixtures use synthetic owners and controlled services; no real account, billing,
notification or remote database mutations. Board/account contents are fixture
slots in the shell browser check, not full authenticated App E2E. Authenticated
mobile/desktop and physical-device release smoke testing remains necessary.

This is a gameplay presentation policy, not new server authorization. Existing
save synchronization remains unchanged. A receipt must survive local readback;
unavailable local persistence cannot grant ordinary-player access. Essential
account/privacy/support/accessibility and non-destructive recovery stay available.
Developer verification failures fail closed and are retryable. Guest transfer
must settle safely before mounting a playable board.

## Parallel integration

Owned work is isolated on `codex/ranks-and-island40-portal-20260926`. Upstream
Claude changes through a8d685ea modify Island Complete presentation in the board
and renderer. Merge them on the isolated branch, validate the combined tree,
then fast-forward a clean dedicated local main. No shared dirty checkout, paused
Cosmic Outpost work, push, deployment or live migrations are part of this slice.
