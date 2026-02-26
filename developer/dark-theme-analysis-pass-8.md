# Dark Theme Analysis – Pass 8 (Gamification)

## Scope reviewed
- Gamification UI cards/toasts and score-tab risk/reward surfaces.
- Reward category/redeem controls and reward history panels.

## Confirmed dark-theme issues found
1. **Reward/risk cards still relied on light panel defaults**
   - Several score-tab surfaces used near-white backgrounds and light-only contrast assumptions.
2. **Achievement toast variants could appear bright in dark contexts**
   - Variant backgrounds were designed for light mode and needed explicit dark token surfaces.
3. **Reward metadata text hierarchy needed dark-mode tuning**
   - Secondary text layers risked low contrast against darkened panels.

## Fixes applied in this pass
- Added dark-glass overrides for gamification toasts, reward cards, risk guardrails, and history panels.
- Added tokenized dark backgrounds/borders for category/redeem controls.
- Tuned primary/secondary text hierarchy and risk-card state backgrounds in dark mode.

## Next analysis targets
1. Final cross-file sweep of remaining unscoped light fallbacks in `src/styles/*`.
2. Optional consolidation pass to centralize repeated dark-glass recipes.
