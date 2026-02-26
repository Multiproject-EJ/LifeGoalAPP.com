# Habit Feedback Analysis – Pass 9 (User-mode guardrail)

## Scope reviewed
- `src/utils/completionHaptics.ts`

## Problem observed
- Even with cooldowns and budgets, there was no user-level haptic mode kill-switch or intensity downshift path.

## Fixes applied
- Added persisted haptic mode support in shared haptics utility via localStorage key `lifegoal_haptics_mode_v1`.
- Supported modes:
  - `off`: suppress all haptics,
  - `subtle`: downshift requested haptics (strong→medium, medium/light→light),
  - `balanced`: current default behavior.
- Kept reduced-motion and cooldown/budget gating unchanged, layering mode checks before trigger execution.

## Outcome
Haptic behavior now supports user-level moderation without changing each feature call-site.
