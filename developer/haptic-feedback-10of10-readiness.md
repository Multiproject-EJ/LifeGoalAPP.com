# Haptic Feedback – 10/10 Readiness Plan

## What is complete now
- Shared, centralized haptic engine with:
  - per-channel cooldowns,
  - reduced-motion guard,
  - global rolling budget,
  - persisted user mode (`off` / `subtle` / `balanced`).
- Coverage across core flows (habits/actions/journal/breathing/timer/nav) and gamification loops.
- In-app haptic mode controls and active-state visibility in Account settings.
- Added “Test vibration” button in Account settings for quick user/device validation.

## Remaining items to reach 10/10
1. **Real-device QA calibration (highest priority)**
   - Verify feel on iOS Safari + Android Chrome.
   - Tune per-event intensity and cooldown values where needed.
2. **Automated logic tests for completionHaptics**
   - Add unit tests covering:
     - mode behavior (`off`, `subtle`, `balanced`),
     - per-channel cooldown blocking,
     - global budget blocking,
     - reduced-motion suppression.
3. **Optional product polish**
   - Add short helper text near Test vibration clarifying that system settings (silent mode / OS haptics off) can suppress output.

## Suggested acceptance criteria for “done”
- At least 2-device QA sign-off (one iOS + one Android) with no “too noisy” reports.
- Unit tests in place for haptic gating logic with stable pass results.
- Product owner confirms haptic feel quality in top user journeys.
