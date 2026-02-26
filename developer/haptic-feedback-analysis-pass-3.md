# Habit Feedback Analysis – Pass 3 (Haptic moderation)

## Scope reviewed
- `src/utils/completionHaptics.ts`
- `src/utils/habitFeedback.ts`
- completion call-sites in Actions, Journal, and BreathingSpace.

## Problem observed
- Feedback had become too chatty: many routine completions triggered medium/strong haptics.
- The experience risked "haptic fatigue" where signal quality drops as repeated vibrations feel noisy.

## Changes made
- Added channel-aware cooldown gating in `completionHaptics` so repeated events in a short window are suppressed.
- Softened default vibration patterns to short, lower-intensity taps.
- Habits:
  - quick-win now visual-only,
  - streak-build gets a light pulse,
  - milestone keeps the stronger pulse,
  - habit channel uses a stricter cooldown.
- Actions:
  - standard completion now visual-only,
  - only clear-all bonus actions trigger haptics.
- Journal:
  - reflective saves now visual-only,
  - gratitude saves trigger moderated haptics.
- Breathing/Meditation:
  - short breathing completions now visual-only,
  - only long guided sessions trigger moderated haptics.

## Guiding rule
Use haptics for meaningful events (milestones, bonus outcomes, deeper sessions), while keeping routine wins mostly visual.
