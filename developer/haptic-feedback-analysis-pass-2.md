# Habit Feedback Analysis – Pass 2 (Cross-tab haptics)

## Scope reviewed
- `ActionsTab` completion feedback wiring.
- `Journal` entry save feedback wiring.
- `BreathingSpace` session-complete feedback wiring.
- Shared `index.css` feedback animation/effect classes.

## Confirmed feedback gaps found
1. Typed haptic+visual feedback only existed in Habits.
2. Actions, Journal, and Meditation/Breathing completions still used generic visual feedback only.
3. Journal had completion state (`justSavedEntryId`) but no list-item class application.

## Fixes applied in this pass
- Added shared completion haptics utility (`src/utils/completionHaptics.ts`) with light/medium/strong profiles.
- Added typed action completion effects:
  - standard completion profile,
  - bonus completion profile when clear-all bonus applies.
- Added typed journal completion effects:
  - reflective entry profile,
  - gratitude entry profile with stronger haptic/visual treatment.
- Added breathing/meditation typed completion effects:
  - reset profile for standard completions,
  - deep profile for long guided completions.
- Added and applied profile-specific CSS classes for Action, Journal, and Breathing feedback surfaces.
- Extended reduced-motion handling to disable animation for action/journal/breathing completion classes.

## Next steps
1. Add user-facing haptic settings (off / subtle / expressive).
2. Consider coupling subtle sound cues with current haptic profiles for multimodal reinforcement.
