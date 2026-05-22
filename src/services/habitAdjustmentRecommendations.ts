import type {
  HabitDesignRecommendation,
  HabitDesignSignalAnalysis,
  HabitDesignSignalInput,
} from './habitDesignSignals';

export interface HabitAdjustmentRecommendationResult {
  recommendation: HabitDesignRecommendation;
  reason: string;
  promptPayload: string[];
  alternatives?: {
    suggestedHabitId: string;
    title: string;
    supportiveCopy: string;
  }[];
}

export function getHabitAdjustmentRecommendation(
  analysis: HabitDesignSignalAnalysis,
  input: HabitDesignSignalInput,
): HabitAdjustmentRecommendationResult {
  if (analysis.state === 'stale') {
    return withPrompts('restart_gently', 'No recent activity suggests a gentle restart.', [
      'This habit has gone quiet lately.',
      'Want to restart with an easy first step?',
    ]);
  }

  if (analysis.environmentRiskScore >= 0.34) {
    return withPrompts('add_environment_cue', 'Environment friction appears to be blocking consistency.', [
      'This habit may need a better cue.',
      'Want to add a visible trigger in your environment?',
    ]);
  }

  if (analysis.state === 'too_hard') {
    return withPrompts('shrink_to_tiny', 'High risk and misses indicate the task is likely too hard right now.', [
      'This quest may be too difficult.',
      'Want a smaller version?',
    ]);
  }

  if (analysis.state === 'fragile') {
    if ((input.timingAdherenceRate ?? 1) < 0.55) {
      return withPrompts('simplify_timing', 'Timing adherence is low, so reducing schedule complexity may help.', [
        'Your timing seems hard to sustain.',
        'Want to simplify when this habit happens?',
      ]);
    }
    return withPrompts('link_to_goal', 'Momentum is fragile; reconnecting to purpose can improve consistency.', [
      'This habit may feel disconnected from your goal.',
      'Want to link it to a specific outcome?',
    ]);
  }

  if (analysis.state === 'too_easy') {
    return withPrompts('upgrade_to_stretch', 'Consistency is strong and stable, so a stretch upgrade is reasonable.', [
      "You've been consistent. Ready to level up?",
      'Try a stretch version if this feels easy.',
    ]);
  }

  if (analysis.state === 'healthy' && analysis.stabilityScore >= 0.72) {
    return withPrompts('celebrate_consistency', 'Steady consistency suggests reinforcing the current plan.', [
      'Great consistency lately.',
      'Keep the momentum going.',
    ]);
  }

  return withPrompts('no_change', 'Current signals indicate the habit is in a healthy range.', ['This habit looks balanced right now.']);
}

function withPrompts(
  recommendation: HabitDesignRecommendation,
  reason: string,
  promptPayload: string[],
): HabitAdjustmentRecommendationResult {
  return { recommendation, reason, promptPayload };
}
