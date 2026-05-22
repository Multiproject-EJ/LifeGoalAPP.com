export type HabitDifficultyState = 'too_easy' | 'healthy' | 'fragile' | 'too_hard' | 'stale';

export type HabitDesignRecommendation =
  | 'shrink_to_tiny'
  | 'upgrade_to_normal'
  | 'upgrade_to_stretch'
  | 'add_environment_cue'
  | 'simplify_timing'
  | 'restart_gently'
  | 'link_to_goal'
  | 'celebrate_consistency'
  | 'no_change';

export interface HabitDesignSignalInput {
  completionRate: number;
  streakConsistency: number;
  missesLast14: number;
  skipsLast14: number;
  logsLast14: number;
  pausedRecently?: boolean;
  resumedRecently?: boolean;
  timingAdherenceRate?: number;
  environmentRiskTags?: string[];
  linkedGoalId?: string | null;
}

export interface HabitDesignSignalAnalysis {
  state: HabitDifficultyState;
  riskScore: number;
  stabilityScore: number;
  staleScore: number;
  environmentRiskScore: number;
  notes: string[];
}

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, value));
}

export function analyzeHabitDesignSignals(input: HabitDesignSignalInput): HabitDesignSignalAnalysis {
  const completionRate = clamp01(input.completionRate);
  const consistency = clamp01(input.streakConsistency);
  const misses = Math.max(0, input.missesLast14);
  const skips = Math.max(0, input.skipsLast14);
  const logs = Math.max(0, input.logsLast14);
  const timingAdherence = input.timingAdherenceRate == null ? undefined : clamp01(input.timingAdherenceRate);
  const environmentRiskScore = Math.min(1, (input.environmentRiskTags?.length ?? 0) / 3);

  const frictionFromMisses = Math.min(1, (misses + skips * 0.6) / 10);
  const fragilityFromTiming = timingAdherence == null ? 0 : Math.max(0, 0.7 - timingAdherence);
  const staleScore = logs === 0 ? 1 : Math.max(0, (3 - logs) / 3);

  const riskScore = clamp01(
    (1 - completionRate) * 0.45 +
      (1 - consistency) * 0.25 +
      frictionFromMisses * 0.2 +
      fragilityFromTiming * 0.1,
  );

  const stabilityScore = clamp01((completionRate * 0.6 + consistency * 0.4) * (1 - staleScore * 0.5));

  const notes: string[] = [];

  if (staleScore >= 0.8) {
    notes.push('No recent logs suggest the habit is stale.');
  }
  if (environmentRiskScore >= 0.34) {
    notes.push('Environment risk tags indicate cue friction.');
  }

  const isTooHard = riskScore >= 0.62 || misses >= 8;
  const isFragile = !isTooHard && (riskScore >= 0.38 || (timingAdherence != null && timingAdherence < 0.55));
  const isTooEasy = completionRate >= 0.92 && consistency >= 0.88 && misses <= 1 && staleScore < 0.34;
  const isStale = staleScore >= 0.8 && completionRate <= 0.2;

  const state: HabitDifficultyState = isStale
    ? 'stale'
    : isTooHard
      ? 'too_hard'
      : isFragile
        ? 'fragile'
        : isTooEasy
          ? 'too_easy'
          : 'healthy';

  return {
    state,
    riskScore,
    stabilityScore,
    staleScore,
    environmentRiskScore,
    notes,
  };
}
