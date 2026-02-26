# Dark Theme Analysis – Pass 9 (Settings folders)

## Scope reviewed
- `src/styles/settings-folders.css` surfaces for settings folder buttons/popup and workspace snapshot blocks.

## Confirmed dark-theme issues found
1. **Settings folder cards/popup used light fallbacks**
   - Defaults leaned on white/light cards via `--card-background` and `--background` fallbacks.
2. **Workspace snapshot stats/hints stayed bright in dark mode**
   - Snapshot stat and hint blocks kept light panel assumptions.
3. **Icon and text hierarchy needed explicit dark tuning**
   - Icon tile backgrounds and secondary text colors weren’t dark-safe by default.

## Fixes applied in this pass
- Added `dark-glass` overrides for settings folder button/popup/snapshot surfaces and borders.
- Added dark-safe text hierarchy for titles vs secondary metadata/hints.
- Added dark-safe hover state treatment and close-button color updates.

## Next analysis targets
1. Remaining `src/styles/*` files with light fallback defaults (player-avatar and residual gamification modules).
2. Optional cleanup: consolidate repeated dark-surface recipes in shared tokens/utilities.
