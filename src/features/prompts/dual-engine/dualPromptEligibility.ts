import {
  type DualPromptCandidate,
  type DualPromptCompletedCooldownsMs,
  type DualPromptContext,
  type DualPromptHistoryRecord,
} from './dualPromptTypes';

const DAY_MS = 24 * 60 * 60 * 1000;

export interface DualPromptEligibilityPolicy {
  maxInsideGamePromptsPerSession?: number;
  maxOutsideGamePromptsPerDay?: number;
  skipCooldownMs?: number;
  completedCooldownByTypeMs?: DualPromptCompletedCooldownsMs;
}

const DEFAULT_POLICY: Required<Omit<DualPromptEligibilityPolicy, 'completedCooldownByTypeMs'>> = {
  maxInsideGamePromptsPerSession: 1,
  maxOutsideGamePromptsPerDay: 1,
  skipCooldownMs: DAY_MS,
};

function getLatestRecordForType(type: DualPromptCandidate['type'], history: DualPromptHistoryRecord[]) {
  return history
    .filter((record) => record.promptType === type)
    .sort((a, b) => b.shownAtMs - a.shownAtMs)[0];
}

export function isDualPromptEligible(
  candidate: DualPromptCandidate,
  context: DualPromptContext,
  history: DualPromptHistoryRecord[],
  nowMs: number,
  policy: DualPromptEligibilityPolicy = {},
): boolean {
  const effectivePolicy = { ...DEFAULT_POLICY, ...policy };
  const completedByType = policy.completedCooldownByTypeMs ?? {};

  if (context === 'inside_game') {
    const shownInsideSession = history.filter((record) => record.context === 'inside_game').length;
    if (shownInsideSession >= effectivePolicy.maxInsideGamePromptsPerSession) {
      return false;
    }
  }

  if (context === 'outside_game') {
    const startOfDayMs = nowMs - (nowMs % DAY_MS);
    const shownOutsideToday = history.filter(
      (record) => record.context === 'outside_game' && record.shownAtMs >= startOfDayMs,
    ).length;
    if (shownOutsideToday >= effectivePolicy.maxOutsideGamePromptsPerDay) {
      return false;
    }
  }

  const latestTypeRecord = getLatestRecordForType(candidate.type, history);
  if (!latestTypeRecord) {
    return true;
  }

  const elapsedSinceShownMs = nowMs - latestTypeRecord.shownAtMs;
  if (!latestTypeRecord.completedAtMs && elapsedSinceShownMs < effectivePolicy.skipCooldownMs) {
    return false;
  }

  if (latestTypeRecord.completedAtMs) {
    const completedCooldownMs = completedByType[candidate.type] ?? effectivePolicy.skipCooldownMs;
    const elapsedSinceCompletedMs = nowMs - latestTypeRecord.completedAtMs;
    if (elapsedSinceCompletedMs < completedCooldownMs) {
      return false;
    }
  }

  return true;
}
