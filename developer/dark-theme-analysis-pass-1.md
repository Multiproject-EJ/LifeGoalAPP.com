# Dark Theme Analysis – Pass 1 (Actual Findings)

## Scope reviewed
- Journal Gratitude tab surfaces, cards, chips, inputs, and action buttons.
- Workspace/Goal/Auth menu controls from earlier pass were rechecked.

## Confirmed dark-theme issues found
1. **Journal gratitude inputs were still white in dark mode**
   - `journal-gratitude__item input/textarea` used `background: #fff`.
2. **Several gratitude subsection action controls stayed light**
   - `journal-gratitude-weekly__copy`, `journal-gratitude-weekly__coach`, and `journal-gratitude-lookback__open` used near-white backgrounds with dark text.
3. **Sub-panels/chips in gratitude weekly were bright by default**
   - `journal-gratitude-weekly__theme`, `journal-gratitude-weekly__readiness`, and `journal-gratitude-weekly__draft` had light surface defaults that could read as white cards.
4. **Warning/status readability in dark mode needed explicit dark tuning**
   - Warning badge states were light-theme tuned and not aligned with the dark palette.

## Fixes applied in this pass
- Added `[data-theme='dark-glass']` overrides for all the components above, switching to token-driven dark surfaces, dark-safe borders, and readable text hierarchy.
- Added placeholder/muted text dark overrides.
- Added warning state dark-tone treatment for gratitude coach/weekly warning chips.

## Next analysis targets (tab-by-tab)
1. Journal detail action chips/buttons (outside gratitude flow).
2. Habits sub-panels with glass cards that may still be too bright.
3. Account/settings nested controls with white button/input variants.
