import {
  analyzeHabitDesignSignals,
  type HabitDesignSignalAnalysis,
  type HabitDesignSignalInput,
} from './habitDesignSignals';
import {
  getHabitAdjustmentRecommendation,
  type HabitAdjustmentRecommendationResult,
} from './habitAdjustmentRecommendations';

export interface HabitDesignEngineResult {
  analysis: HabitDesignSignalAnalysis;
  recommendation: HabitAdjustmentRecommendationResult;
}

export function evaluateHabitDesign(input: HabitDesignSignalInput): HabitDesignEngineResult {
  const analysis = analyzeHabitDesignSignals(input);
  const recommendation = getHabitAdjustmentRecommendation(analysis, input);
  return { analysis, recommendation };
}

export function createHabitDesignPromptPayload(input: HabitDesignSignalInput): string[] {
  return evaluateHabitDesign(input).recommendation.promptPayload;
}
