import { triggerCompletionHaptic } from './completionHaptics';

export type HabitFeedbackType = 'quick-win' | 'streak-build' | 'milestone';

export function getHabitFeedbackType(projectedStreak: number): HabitFeedbackType {
  if (projectedStreak >= 30 || projectedStreak % 7 === 0) {
    return 'milestone';
  }

  if (projectedStreak >= 3) {
    return 'streak-build';
  }

  return 'quick-win';
}

export function getHabitFeedbackClassName(type: HabitFeedbackType): string {
  return `habit-item--feedback-${type}`;
}

export function triggerHabitHapticFeedback(type: HabitFeedbackType): void {
  // Keep the baseline “done” interactions mostly visual.
  // Haptics are reserved for meaningful momentum signals.
  if (type === 'quick-win') {
    return;
  }

  triggerCompletionHaptic(type === 'milestone' ? 'strong' : 'light', {
    channel: 'habit',
    minIntervalMs: 1300,
  });
}
