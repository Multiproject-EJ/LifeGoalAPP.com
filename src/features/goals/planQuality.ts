import type { Json } from '../../lib/database.types';

export type GoalPlanQualityPriority = 'now' | 'later';

export type GoalPlanQualityInput = {
  goalOutcomeStatement: string | null | undefined;
  successMetric: string | null | undefined;
  targetDate: string | null | undefined;
  firstAction: string | null | undefined;
  weeklyWorkloadTarget: number | null | undefined;
  priorityLevel: GoalPlanQualityPriority | string | null | undefined;
};

export type PlanQualityBreakdown = {
  outcomeSpecific: boolean;
  metricMeasurable: boolean;
  targetDateValid: boolean;
  firstActionActionable: boolean;
  workloadRealistic: boolean;
};

export type PlanQualityMissingCriterion = keyof PlanQualityBreakdown;

export type PlanQualityResult = {
  score: number;
  stars: string;
  breakdown: PlanQualityBreakdown;
  missingCriteria: PlanQualityMissingCriterion[];
};

const STAR_LOOKUP = ['☆☆☆☆☆', '★☆☆☆☆', '★★☆☆☆', '★★★☆☆', '★★★★☆', '★★★★★'] as const;

function hasThreeOrMoreWords(value: string): boolean {
  return value.trim().split(/\s+/).filter(Boolean).length >= 3;
}

function looksMeasurable(value: string): boolean {
  return /\d|%|hours?|minutes?|times?|sessions?|days?|weeks?|months?|km|mi|lb|kg/i.test(value);
}

function looksActionableFirstStep(value: string): boolean {
  return /\b(start|write|draft|call|plan|review|walk|run|send|schedule|outline|research|create|practice|read)\b/i.test(value);
}

function parseDurationMinutes(value: string): number | null {
  const minuteMatch = value.match(/(\d+)\s*(m|min|mins|minute|minutes)\b/i);
  if (minuteMatch) {
    return Number(minuteMatch[1]);
  }

  const hourMatch = value.match(/(\d+)\s*(h|hr|hrs|hour|hours)\b/i);
  if (hourMatch) {
    return Number(hourMatch[1]) * 60;
  }

  return null;
}

export function computePlanQuality(input: GoalPlanQualityInput): PlanQualityResult {
  const goalOutcomeStatement = (input.goalOutcomeStatement ?? '').trim();
  const successMetric = (input.successMetric ?? '').trim();
  const firstAction = (input.firstAction ?? '').trim();
  const priority = input.priorityLevel === 'later' ? 'later' : 'now';

  const targetDate = input.targetDate ? new Date(input.targetDate) : null;
  const now = new Date();

  const firstActionMinutes = parseDurationMinutes(firstAction);

  const breakdown: PlanQualityBreakdown = {
    outcomeSpecific: goalOutcomeStatement.length >= 12 && hasThreeOrMoreWords(goalOutcomeStatement),
    metricMeasurable: successMetric.length > 0 && looksMeasurable(successMetric),
    targetDateValid:
      Boolean(targetDate) &&
      !Number.isNaN(targetDate?.valueOf()) &&
      (targetDate?.valueOf() ?? 0) > now.valueOf(),
    firstActionActionable:
      firstAction.length > 0 &&
      looksActionableFirstStep(firstAction) &&
      (firstActionMinutes === null || firstActionMinutes <= 30),
    workloadRealistic:
      typeof input.weeklyWorkloadTarget === 'number' &&
      input.weeklyWorkloadTarget >= 1 &&
      (priority === 'now' ? input.weeklyWorkloadTarget <= 14 : input.weeklyWorkloadTarget <= 7),
  };

  const score = (Object.values(breakdown).filter(Boolean).length);
  const missingCriteria = (Object.keys(breakdown) as PlanQualityMissingCriterion[]).filter(
    (criterion) => !breakdown[criterion],
  );

  return {
    score,
    stars: STAR_LOOKUP[score],
    breakdown,
    missingCriteria,
  };
}

export function toPlanQualityBreakdownJson(breakdown: PlanQualityBreakdown): Json {
  return breakdown as Json;
}
