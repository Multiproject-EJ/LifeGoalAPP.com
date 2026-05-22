import {
  analyzeHabitDesignSignals,
  type HabitDesignSignalAnalysis,
  type HabitDesignSignalInput,
} from './habitDesignSignals';
import {
  getHabitAdjustmentRecommendation,
  type HabitAdjustmentRecommendationResult,
} from './habitAdjustmentRecommendations';
import {
  resolveHabitAlternatives,
  type HabitAlternativeReasonTag,
} from './habitAlternativeResolver';

export interface HabitDesignEngineResult {
  analysis: HabitDesignSignalAnalysis;
  recommendation: HabitAdjustmentRecommendationResult;
}

export function evaluateHabitDesign(input: HabitDesignSignalInput): HabitDesignEngineResult {
  const analysis = analyzeHabitDesignSignals(input);
  const baseRecommendation = getHabitAdjustmentRecommendation(analysis, input);
  const alternativeReason = resolveAlternativeReasonTag(analysis, input);

  if (!alternativeReason) {
    return { analysis, recommendation: baseRecommendation };
  }

  const alternatives = resolveHabitAlternatives(
    {
      id: input.habitId ?? input.linkedGoalId ?? 'habit-design-engine',
      title: input.habitTitle ?? 'Current habit',
      lifeWheelArea: input.lifeWheelArea ?? null,
      habit_intent: input.habitIntent ?? [],
      goal_id: input.linkedGoalId ?? null,
      environment_risk_tags: input.environmentRiskTags ?? null,
      defaultTiming: input.defaultTiming ?? null,
    },
    alternativeReason,
  );

  if (alternatives.length === 0) {
    return { analysis, recommendation: baseRecommendation };
  }

  const recommendation: HabitAdjustmentRecommendationResult = {
    recommendation: 'try_alternative_path',
    reason: 'Same goal, lighter method: try a supportive alternative path for this habit.',
    promptPayload: ['Same goal, lighter method — let\'s try a supportive alternative that fits your life right now.'],
    alternatives: alternatives.slice(0, 3).map((alternative) => ({
      suggestedHabitId: alternative.suggestedHabitId,
      title: alternative.title,
      supportiveCopy: alternative.supportiveCopy,
    })),
  };

  return { analysis, recommendation };
}

function resolveAlternativeReasonTag(
  analysis: HabitDesignSignalAnalysis,
  input: HabitDesignSignalInput,
): HabitAlternativeReasonTag | null {
  if (analysis.state === 'too_hard') return 'habit_too_hard';
  if (analysis.state === 'stale') return 'habit_stale';
  if (analysis.environmentRiskScore >= 0.34) return 'environment_mismatch';
  if (analysis.state === 'fragile' && (input.timingAdherenceRate ?? 1) < 0.55) return 'timing_mismatch';
  if (analysis.riskScore >= 0.38) return 'friction_too_high';
  if (input.resumedRecently && analysis.riskScore >= 0.3) return 'restart_relapse_pattern';
  return null;
}

export function createHabitDesignPromptPayload(input: HabitDesignSignalInput): string[] {
  return evaluateHabitDesign(input).recommendation.promptPayload;
}
