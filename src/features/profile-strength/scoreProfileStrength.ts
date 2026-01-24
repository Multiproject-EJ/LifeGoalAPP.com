import { PROFILE_STRENGTH_CONFIG } from '../../constants/profileStrength';
import type {
  AreaKey,
  AreaSignalInput,
  NextTask,
  ProfileStrengthInput,
  ProfileStrengthResult,
  ReasonCode,
} from './profileStrengthTypes';

const AREA_KEYS: AreaKey[] = [
  'goals',
  'habits',
  'journal',
  'vision_board',
  'life_wheel',
  'identity',
];

const AREA_NAV_TARGETS: Record<AreaKey, string> = {
  goals: 'support',
  habits: 'habits',
  journal: 'journal',
  vision_board: 'insights',
  life_wheel: 'rituals',
  identity: 'identity',
};

const AREA_LABELS: Record<AreaKey, string> = {
  goals: 'goal',
  habits: 'habit',
  journal: 'journal entry',
  vision_board: 'vision board',
  life_wheel: 'life wheel check-in',
  identity: 'identity profile',
};

const clamp = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value));

const clampScore = (value: number): number => clamp(Math.round(value), 0, 10);

const buildTask = (area: AreaKey, reason: ReasonCode): NextTask => {
  const label = AREA_LABELS[area];
  const target = AREA_NAV_TARGETS[area];
  const baseTask = {
    area,
    action: {
      type: 'navigate' as const,
      target,
    },
    xpReward: 25,
  };

  switch (reason) {
    case 'no_data':
      return {
        ...baseTask,
        id: `profile-strength-${area}-start`,
        title: `Add your first ${label}`,
        description: `Capture a ${label} so this area can start guiding you.`,
        etaMinutes: 2,
        reasonCodes: ['no_data'],
      };
    case 'low_coverage':
      return {
        ...baseTask,
        id: `profile-strength-${area}-coverage`,
        title: `Expand your ${label} coverage`,
        description: `Add another ${label} so this area reflects more of your life.`,
        etaMinutes: 3,
        reasonCodes: ['low_coverage'],
      };
    case 'low_quality':
      return {
        ...baseTask,
        id: `profile-strength-${area}-quality`,
        title: `Add details to your ${label}`,
        description: `Add a clear metric or next step to improve quality.`,
        etaMinutes: 3,
        reasonCodes: ['low_quality'],
      };
    case 'low_recency':
      return {
        ...baseTask,
        id: `profile-strength-${area}-recency`,
        title: `Log a fresh ${label} update`,
        description: `Add a recent update to keep this area active.`,
        etaMinutes: 1,
        reasonCodes: ['low_recency'],
      };
    case 'needs_review':
      return {
        ...baseTask,
        id: `profile-strength-${area}-review`,
        title: `Review your ${label}`,
        description: `Scan for anything that needs adjustment or cleanup.`,
        etaMinutes: 2,
        reasonCodes: ['needs_review'],
      };
    default:
      return {
        ...baseTask,
        id: `profile-strength-${area}-refresh`,
        title: `Refresh your ${label}`,
        description: `Revisit this area to confirm it is still accurate.`,
        etaMinutes: 2,
        reasonCodes: [reason],
      };
  }
};

const getRecencyScore = (recencyDays: number | null | undefined): number => {
  if (recencyDays === null || recencyDays === undefined) {
    return 0;
  }
  if (recencyDays <= 7) {
    return 1;
  }
  if (recencyDays <= 30) {
    return 0.6;
  }
  if (recencyDays <= 90) {
    return 0.3;
  }
  return 0;
};

const scoreArea = (
  area: AreaKey,
  signal: AreaSignalInput | null | undefined,
): { score: number | null; reasons: ReasonCode[]; tasks: NextTask[] } => {
  if (!signal || signal.status === 'unavailable') {
    return { score: null, reasons: ['error_fallback'], tasks: [] };
  }

  if (signal.status === 'no_data') {
    return { score: 0, reasons: ['no_data'], tasks: [buildTask(area, 'no_data')] };
  }

  const reasons: ReasonCode[] = [];
  const coverageMissing = signal.coverage === null || signal.coverage === undefined;
  const qualityMissing = signal.quality === null || signal.quality === undefined;
  const recencyMissing = signal.recencyDays === null || signal.recencyDays === undefined;

  if (coverageMissing || qualityMissing || recencyMissing) {
    reasons.push('stale_snapshot');
  }

  const coverage = clamp(signal.coverage ?? 0, 0, 1);
  const quality = clamp(signal.quality ?? 0, 0, 1);
  const recencyScore = getRecencyScore(signal.recencyDays ?? null);

  if (coverage < 0.4) {
    reasons.push('low_coverage');
  }
  if (quality < 0.4) {
    reasons.push('low_quality');
  }
  if (recencyScore < 0.4) {
    reasons.push('low_recency');
  }
  if (signal.needsReview) {
    reasons.push('needs_review');
  }

  const score = clampScore(coverage * 4 + quality * 3 + recencyScore * 3);
  const tasks = reasons
    .filter((reason) => reason !== 'stale_snapshot')
    .slice(0, 2)
    .map((reason) => buildTask(area, reason));

  return { score, reasons, tasks };
};

export const scoreProfileStrength = (input: ProfileStrengthInput = {}): ProfileStrengthResult => {
  const areaScores = {} as ProfileStrengthResult['areaScores'];
  const reasonsByArea = {} as ProfileStrengthResult['reasonsByArea'];
  const nextTasksByArea = {} as ProfileStrengthResult['nextTasksByArea'];

  let usedFallbackData = false;

  for (const area of AREA_KEYS) {
    const signal = input.areas?.[area] ?? null;
    const { score, reasons, tasks } = scoreArea(area, signal);

    if (score === null) {
      usedFallbackData = true;
    }

    areaScores[area] = score;
    reasonsByArea[area] = reasons;
    nextTasksByArea[area] = tasks;
  }

  const hasUnknownScores = AREA_KEYS.some((area) => areaScores[area] === null);
  let overallPercent: number | null = null;

  if (!hasUnknownScores) {
    const totalWeight = AREA_KEYS.reduce(
      (sum, area) => sum + (PROFILE_STRENGTH_CONFIG.areaWeights[area] ?? 1),
      0,
    );
    const totalScore = AREA_KEYS.reduce((sum, area) => {
      const weight = PROFILE_STRENGTH_CONFIG.areaWeights[area] ?? 1;
      return sum + (areaScores[area] ?? 0) * weight;
    }, 0);
    overallPercent = Math.round((totalScore / (totalWeight * 10)) * 100);
  }

  const globalNextTask =
    AREA_KEYS.map((area) => nextTasksByArea[area]).flat().find(Boolean) ?? null;

  return {
    areaScores,
    overallPercent,
    reasonsByArea,
    nextTasksByArea,
    globalNextTask,
    meta: {
      computedAt: input.computedAt ?? new Date().toISOString(),
      usedFallbackData,
    },
  };
};
