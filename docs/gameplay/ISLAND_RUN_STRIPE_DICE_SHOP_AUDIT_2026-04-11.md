# Island Run Stripe Dice Shop Audit

Date: 2026-04-11

## Question audited

Can we find in code:
1) Stripe dice purchase product wiring,
2) access through Island Run shop,
3) automatic out-of-dice purchase popup trigger.

## Findings

### 1) Stripe dice checkout wiring exists ✅

- `createDicePackCheckoutSession()` is implemented and calls Supabase Edge Function `create-checkout-session-payment`.
- This indicates Stripe one-time checkout wiring is present at service layer.

### 2) Current UI entry for Stripe dice checkout is Account panel, not Island Run shop ⚠️

- The `Buy 500 Rolls` button is in `MyAccountPanel` and invokes `createDicePackCheckoutSession()`.
- I did not find this Stripe checkout action wired inside `IslandRunBoardPrototype` shop modal.

### 3) Island Run shop currently uses coin-based prototype bundles, not Stripe ⚠️

- Island Run shop opens via HUD `🛍️ Shop` button.
- Shop modal currently offers coin-priced bundle buttons (e.g., Dice Bundle costs coins and grants dice).
- No Stripe checkout call is present in the Island Run shop actions in this component.

### 4) Automatic out-of-dice Stripe popup trigger not found ❌

- In roll handling, when dice are insufficient in contract-v2 mode, code currently sets landing text (`Need 2 dice to roll`) and returns.
- In non-contract-v2, with no hearts + no dice, a booster button is shown for onboarding flow.
- I did not find logic that auto-opens a Stripe purchase modal/session when dice are depleted.

## Conclusion

- Stripe purchase plumbing exists, but currently surfaced via Account/Billing panel.
- Island Run shop is still local coin-bundle logic.
- Auto-trigger purchase popup on dice depletion is not implemented in Island Run flow today.

