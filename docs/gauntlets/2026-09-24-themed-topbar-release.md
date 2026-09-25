# Themed top bar and accumulated release

User authorized implementation and pushing accumulated work to live main.

## Top bar
- 64px minimum height, up from approximately 48px; keeps safe-area inset.
- Controller's resolved theme drives the top bar, including dev override changes.
- Circular portrait uses the existing player-menu rank's bronze/command styling.
  App passes its canonical rank result; no alternate rank derivation or grants.
- Wallet contrast follows theme; reward bar and menus clear the taller header.

## Release boundaries
Includes implemented controller themes/personality/pill, shop preview, camera and
tile-trail work, travelling egg batch/cards, primary Habit/Wisdom progress bars,
default caretaker removal and top bar. Paid checkout, masked Island008 handover,
all-input-surface progress coverage and new dice completion prizes are unfinished.
Do not describe those unfinished features as shipped.

## Evidence
- Main fetched: ea8c7ec08ab85e935c9f90987ac2714a19b9d332, matching branch base.
- Earlier service run: 2303 passed, zero failed (before latest topbar additions).
- Theme policy and activity progress focused checks pass; architecture guard zero
  violations with three existing allowlisted warnings. git diff --check clean.
- Release TypeScript /tmp/controller-release-tsc.log, session78784 and production
  build /tmp/controller-release-build.log, session44653 are still running.
- Browser inspection repeatedly times out; visual release gate remains open.
  Preserve rollback commit ea8c7ec0 and do not claim deployment until confirmed.
