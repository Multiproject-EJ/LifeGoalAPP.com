# Daily Spin Wheel Economy QA Checklist (Mobile-first)

This checklist implements Step 9 (QA + Telemetry) from the master plan. Focus on mobile-first validation before scaling to tablet/desktop.

## Status
- **Overall:** In Progress
- **Last updated:** 2025-02-15

## Mobile-first QA Checklist

### Daily Spin → Score Tab
- [ ] Spin reward applies without blocking the mobile UI.
- [ ] Score tab balances update immediately after the spin (XP, Points, Zen Tokens).
- [ ] Offline fallback still awards rewards and updates the Score tab.

### Vision Board Claim Animation
- [ ] Claim animation renders smoothly (target 60fps) on mobile.
- [ ] Animation path targets the Game tab icon consistently.
- [ ] Animation triggers only on successful reward claim.

### Shop + Zen Garden Currency Rules
- [ ] Shop purchases accept **Points** only.
- [ ] Zen Garden purchases accept **Zen Tokens** only.
- [ ] Balance updates are visible immediately after purchase.

### Telemetry Validation
- [ ] Earn events log with `economy_earn` for XP/Points/Zen Tokens.
- [ ] Spend events log with `economy_spend` for Points/Zen Tokens.
- [ ] Event metadata includes currency, amount, balance, and source.

### Regression Checks (Mobile-first)
- [ ] Score tab remains readable at 320px width.
- [ ] Spin wheel layout does not overflow on small screens.
- [ ] Shop grid remains usable with thumb reach (no hidden CTAs).

## Evidence Log
Add notes here as QA completes.

- **Code review (telemetry wiring):** economy earn/spend events emit `currency`, `amount`, `balance`, and `sourceType`/`sourceId` metadata from daily spin + shop/zen garden flows. (`src/services/dailySpin.ts`, `src/services/powerUps.ts`, `src/services/zenGarden.ts`, `src/services/trophies.ts`)
- **Code review (telemetry schema):** `economy_earn` + `economy_spend` are first-class event types in telemetry service. (`src/services/telemetry.ts`)
- _QA validation pending for mobile UI behavior and event ingestion._
