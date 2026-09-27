# Island 040 council handover

This is a bounded gameplay slice following the temporary 040 setting, not a
production 3D council animation or the full app-entry gate.

## Behavior

- Open the board menu on canonical Island 040 or later and choose **Caretaker
  council · portal ready**. Later-cycle players can recover the handover without
  replaying forty islands. Owned portals expose replay on any island.
- The meeting uses existing caretaker portraits, a small procedural portal
  illustration and holographic-link story copy. The complete 120-caretaker cast
  is represented narratively, not individually rendered in the 3D world.
- Hearing/closing the meeting grants nothing. Explicit acceptance uses the
  per-owner canonical action mutex and existing signature-progress JSON.
- A once-only timestamp survives reload, ordinary conflict merge and cycle
  transitions. Replays do not pay rewards or increment gameplay versions.
- No XP, wallet, landmark, stop, travel, AI consent, habit, goal or paid
  entitlement is mutated.
- A successful message confirms read-back from local storage, not cloud backup.
  Account sync uses the existing queue. Storage-full errors can be retried,
  including after closing/reopening the dialog.

## Verification

- `node scripts/check-world-portal.mjs`: 8 suites covering 120 island boundaries,
  later cycles, malformed data, global-key validation, bounded serialization,
  duplicate/concurrent acceptance, unchanged gameplay, reload/replay, full-record
  conflict merge, account isolation and storage failure/retry.
- `node scripts/check-world-portal-browser.mjs`: actual React dialog/control
  and canonical local action, StrictMode, synthetic accounts. Four viewports:
  390×844, 360×640, 1280×900 and 430×932 with reduced motion. Portrait loads,
  viewport portal, scroll lock/release, keyboard wrapping/restoration, explicit
  handover, reload/cycle replay, exit callback, pre-040 rejection, storage failure
  plus reopen/retry, and owner switching passed. See browser-check.json/screenshots.
- Existing 299 Arena integration cases and Journey progression tests (1,800
  transitions plus 21 completion/travel/claim cases) passed.
- Architecture guard: zero violations, three existing allowlisted warnings.
- Full application TypeScript check passed on the final source tree. Existing
  rank, expansion and access-policy regression suites also passed.

Browser fixture results do **not** claim authenticated full-board E2E, remote
account-save verification, cross-tab synchronization, physical-phone performance
or final artwork approval. This receipt is client-side game progress, not server
authorization for paid APIs. Older clients that discard unknown signature keys,
manual save replacement/reset, clearing unsynced browser storage and backend
retention remain rollout considerations. The broad entry gate must not ship
until owner-tagged verified developer access, hydration, essential controls and
all-path navigation tests are ready.

## Parallel-work safety

All changes were made on the isolated ranks/portal branch. The shared dirty
checkout and separate paused Cosmic Outpost worktree were not edited. No App,
live database, account permissions, purchase product or deployment changes.
Main must be freshly fetched and the clean main worktree checked before a local
fast-forward. No push is authorized by this slice.

Integration preflight: origin/main remains `9f3c45ac`; the dedicated main
checkout is clean at `0cd2977b`, an ancestor of this branch. No incoming upstream
files overlap or require conflict resolution. The pending fast-forward includes
the previously checked temporary 040 setting (`01893a5d`) plus this handover.

Rollback the council UI/action independently, retaining the receipt
sanitizer/merge support to avoid stripping progress already earned.
