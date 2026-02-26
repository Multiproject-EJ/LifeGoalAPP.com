# Dark Theme Analysis – Pass 2 (Next PWA Area)

## Scope reviewed
- Journal Detail and Journal Editor flows (including fullscreen mode).
- Problem Mode and Deep Mode sub-sections under Journal editor/detail.

## Confirmed dark-theme issues found
1. **Problem mode used undefined semantic variables with light fallbacks**
   - `--color-bg-subtle`, `--color-border`, and `--color-bg-main` fallbacks can resolve to near-white surfaces in dark contexts.
2. **Journal detail action buttons were visually too light/neutral in dark mode**
   - They relied on transparent styling and light-theme border assumptions.
3. **Editor auxiliary chips/buttons had light-tuned backgrounds**
   - Tags/cancel/prompt/deep-focus actions needed explicit dark-surface treatment.

## Fixes applied in this pass
- Added dark-glass overrides for Journal detail action buttons.
- Added dark-glass overrides for Journal editor panel/fullscreen header layers.
- Hardened Problem Mode/Detail section containers and textarea states with tokenized dark surfaces and borders.
- Tuned notice/timer-related readability colors in dark mode.

## Next analysis targets
1. Habits tab: card stacks, helper chips, and modal sub-panels.
2. Account/settings tab: nested buttons/inputs that still use white background defaults.
