export type HabitLifecycleState =
  | 'forming'
  | 'reinforcing'
  | 'at_risk'
  | 'paused'
  | 'aborted';

export type HabitLifecycleAction =
  | 'continue_reinforcement'
  | 'reshape_habit'
  | 'pause_and_reanalyze'
  | 'abort_and_replace'
  | 'restart_smaller';

export type HabitLifecycleInput = {
  daysSinceStart: number;
  adherence7: number;
  adherence30: number;
  missedDaysLast14: number;
  pauseRequested?: boolean;
  attemptCount?: number;
};

export type HabitLifecycleDecision = {
  state: HabitLifecycleState;
  action: HabitLifecycleAction;
  rationale: string;
};

function clampPercent(value: number): number {
  return Math.min(100, Math.max(0, value));
}

/**
 * Deterministic habit lifecycle evaluator.
 * Handles short/long sticking windows and explicit pause/abort pathways.
 */
export function evaluateHabitLifecycle(input: HabitLifecycleInput): HabitLifecycleDecision {
  const daysSinceStart = Math.max(0, Math.floor(input.daysSinceStart));
  const adherence7 = clampPercent(input.adherence7);
  const adherence30 = clampPercent(input.adherence30);
  const missedDaysLast14 = Math.max(0, Math.floor(input.missedDaysLast14));
  const attemptCount = Math.max(1, Math.floor(input.attemptCount ?? 1));

  if (input.pauseRequested) {
    return {
      state: 'paused',
      action: 'pause_and_reanalyze',
      rationale: 'Pause requested by user. Analyze blockers before resuming.',
    };
  }

  const earlyStage = daysSinceStart < 21;
  const isConsistent = adherence7 >= 80 && adherence30 >= 70 && missedDaysLast14 <= 2;
  const unstable = adherence7 < 45 || missedDaysLast14 >= 6;

  if (isConsistent) {
    return {
      state: earlyStage ? 'forming' : 'reinforcing',
      action: 'continue_reinforcement',
      rationale: earlyStage
        ? 'The habit is forming with strong early consistency.'
        : 'The habit is stable and should be reinforced for long-term retention.',
    };
  }

  if (unstable && attemptCount >= 3 && daysSinceStart >= 45) {
    return {
      state: 'aborted',
      action: 'abort_and_replace',
      rationale: 'Repeated low adherence suggests this habit design should be replaced.',
    };
  }

  if (unstable) {
    return {
      state: 'at_risk',
      action: earlyStage ? 'restart_smaller' : 'reshape_habit',
      rationale: earlyStage
        ? 'Early adherence is low. Restart with a smaller version to regain momentum.'
        : 'Adherence dropped. Reshape cue/effort/timing before abandoning.',
    };
  }

  return {
    state: earlyStage ? 'forming' : 'at_risk',
    action: 'reshape_habit',
    rationale: 'Mixed adherence indicates partial fit. Refine the habit for better stickiness.',
  };
}
