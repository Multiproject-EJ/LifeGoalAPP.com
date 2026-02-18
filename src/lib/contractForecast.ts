import type { CommitmentContract } from '../types/gamification';

export type ContractPaceStatus = 'target_met' | 'on_pace' | 'at_risk';

export interface ContractPaceForecast {
  status: ContractPaceStatus;
  remainingCompletions: number;
  timeRemainingLabel: string;
  rescueSuggestion: string;
}

function formatTimeRemaining(ms: number): string {
  const totalHours = Math.max(0, Math.floor(ms / (1000 * 60 * 60)));
  const days = Math.floor(totalHours / 24);
  const hours = totalHours % 24;

  if (days > 0) {
    return `${days}d ${hours}h`;
  }

  if (hours <= 0) {
    return 'under 1h';
  }

  return `${hours}h`;
}

function getWindowEnd(contract: CommitmentContract): Date {
  const windowStart = new Date(contract.currentWindowStart);
  const end = new Date(windowStart);

  if (contract.cadence === 'daily') {
    end.setHours(23, 59, 59, 999);
  } else {
    end.setDate(end.getDate() + 6);
    end.setHours(23, 59, 59, 999);
  }

  return end;
}

export function getContractPaceForecast(
  contract: CommitmentContract,
  now: Date = new Date(),
): ContractPaceForecast {
  const targetWithGrace = Math.max(0, contract.targetCount - contract.graceDays);
  const remainingCompletions = Math.max(0, targetWithGrace - contract.currentProgress);

  if (remainingCompletions <= 0) {
    return {
      status: 'target_met',
      remainingCompletions: 0,
      timeRemainingLabel: 'window complete',
      rescueSuggestion: 'You are fully covered for this window. Keep momentum with an optional extra completion.',
    };
  }

  const windowStart = new Date(contract.currentWindowStart);
  const windowEnd = getWindowEnd(contract);
  const totalWindowMs = Math.max(1, windowEnd.getTime() - windowStart.getTime());
  const elapsedMs = Math.min(totalWindowMs, Math.max(0, now.getTime() - windowStart.getTime()));
  const elapsedRatio = elapsedMs / totalWindowMs;

  const expectedProgress = targetWithGrace * elapsedRatio;
  const deficit = expectedProgress - contract.currentProgress;
  const msRemaining = Math.max(0, windowEnd.getTime() - now.getTime());
  const timeRemainingLabel = formatTimeRemaining(msRemaining);

  const atRisk = deficit >= 1 || msRemaining <= 12 * 60 * 60 * 1000;

  return {
    status: atRisk ? 'at_risk' : 'on_pace',
    remainingCompletions,
    timeRemainingLabel,
    rescueSuggestion: atRisk
      ? `Rescue window: log ${remainingCompletions} completion${remainingCompletions === 1 ? '' : 's'} in the next ${timeRemainingLabel}.`
      : `You are on pace. ${remainingCompletions} completion${remainingCompletions === 1 ? '' : 's'} left with ${timeRemainingLabel} remaining.`,
  };
}
