# Dark Theme Analysis – Pass 11 (Gamification residuals)

## Scope reviewed
- Residual `contract-result-modal*` and `contract-history-card__reward-tier` selectors in `src/styles/gamification.css`.

## Confirmed dark-theme issues found
1. **Contract result options/chips still had light card defaults**
   - Option button/chip surfaces used light fallback cards and dark text assumptions.
2. **Bonus/stake blocks were light-themed gradients**
   - These sections could appear too bright against dark contexts.
3. **History reward-tier chip had bright glass background**
   - It still used a white-tinted background with dark text.

## Fixes applied in this pass
- Added dark-glass overrides for contract result option surfaces, chips, hover state, and support/cancel text hierarchy.
- Added dark-safe treatments for bonus/stake sections with readable success/warn text tints.
- Hardened reward-tier chip surface and border for dark contexts.

## Next analysis targets
1. Optional final consolidation/refactor of repeated dark recipes.
2. Final QA walkthrough in-app across all major tabs.
