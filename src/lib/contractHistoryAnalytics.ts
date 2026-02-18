import type { ContractEvaluation } from '../types/gamification';

export type ContractTrend = 'improving' | 'steady' | 'needs_attention';

export interface ContractHistorySummary {
  totalWindows: number;
  successCount: number;
  missCount: number;
  successRate: number;
  currentStreak: number;
  bestStreak: number;
  totalBonusAwarded: number;
  totalStakeForfeited: number;
  trend: ContractTrend;
  recentEvaluations: ContractEvaluation[];
}

const RECENT_EVALUATION_LIMIT = 5;

function asAscByEvaluatedAt(evaluations: ContractEvaluation[]): ContractEvaluation[] {
  return evaluations
    .slice()
    .sort((a, b) => new Date(a.evaluatedAt).getTime() - new Date(b.evaluatedAt).getTime());
}

function getCurrentStreak(evaluationsAsc: ContractEvaluation[]): number {
  let streak = 0;
  for (let index = evaluationsAsc.length - 1; index >= 0; index -= 1) {
    if (evaluationsAsc[index].result !== 'success') {
      break;
    }
    streak += 1;
  }
  return streak;
}

function getBestStreak(evaluationsAsc: ContractEvaluation[]): number {
  let best = 0;
  let current = 0;

  for (const evaluation of evaluationsAsc) {
    if (evaluation.result === 'success') {
      current += 1;
      if (current > best) {
        best = current;
      }
      continue;
    }

    current = 0;
  }

  return best;
}

function getTrend(evaluationsAsc: ContractEvaluation[]): ContractTrend {
  if (evaluationsAsc.length < 4) {
    return 'steady';
  }

  const midpoint = Math.floor(evaluationsAsc.length / 2);
  const older = evaluationsAsc.slice(0, midpoint);
  const recent = evaluationsAsc.slice(midpoint);

  const oldRate = older.filter((entry) => entry.result === 'success').length / older.length;
  const newRate = recent.filter((entry) => entry.result === 'success').length / recent.length;

  if (newRate - oldRate >= 0.2) {
    return 'improving';
  }

  if (oldRate - newRate >= 0.2) {
    return 'needs_attention';
  }

  return 'steady';
}

export function summarizeContractHistory(evaluations: ContractEvaluation[]): ContractHistorySummary {
  if (evaluations.length === 0) {
    return {
      totalWindows: 0,
      successCount: 0,
      missCount: 0,
      successRate: 0,
      currentStreak: 0,
      bestStreak: 0,
      totalBonusAwarded: 0,
      totalStakeForfeited: 0,
      trend: 'steady',
      recentEvaluations: [],
    };
  }

  const evaluationsAsc = asAscByEvaluatedAt(evaluations);
  const successCount = evaluationsAsc.filter((entry) => entry.result === 'success').length;
  const missCount = evaluationsAsc.length - successCount;

  return {
    totalWindows: evaluationsAsc.length,
    successCount,
    missCount,
    successRate: successCount / evaluationsAsc.length,
    currentStreak: getCurrentStreak(evaluationsAsc),
    bestStreak: getBestStreak(evaluationsAsc),
    totalBonusAwarded: evaluationsAsc.reduce((sum, item) => sum + item.bonusAwarded, 0),
    totalStakeForfeited: evaluationsAsc.reduce((sum, item) => sum + item.stakeForfeited, 0),
    trend: getTrend(evaluationsAsc),
    recentEvaluations: evaluationsAsc.slice(-RECENT_EVALUATION_LIMIT).reverse(),
  };
}
