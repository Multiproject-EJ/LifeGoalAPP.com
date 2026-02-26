# Habit Feedback Analysis – Pass 8 (Global haptic budget)

## Scope reviewed
- `src/utils/completionHaptics.ts`

## Problem observed
- Per-channel cooldowns prevent local spam, but high activity across multiple channels can still produce too many total haptic events over short periods.

## Fixes applied
- Added a global rolling-window haptic budget in `completionHaptics`:
  - 60-second window
  - max 6 haptic triggers across all channels
- Existing per-channel cooldown logic remains intact; the global budget is an extra safety net.

## Outcome
Haptics remain meaningful even during multi-feature bursts (e.g., rapid tasking + game rewards), reducing cross-channel vibration fatigue.
