import type { EnvironmentContextV1 } from './environmentSchema';

export type EnvironmentAuditBreakdown = {
  hasSpecificPlace: boolean;
  hasCue: boolean;
  hasBlocker: boolean;
  hasHackPlan: boolean;
  hasFallback: boolean;
};

export type EnvironmentAuditMissingCriterion = keyof EnvironmentAuditBreakdown;
export type EnvironmentAuditBand = 'fragile' | 'usable' | 'strong';

export type EnvironmentAuditResult = {
  score: number;
  breakdown: EnvironmentAuditBreakdown;
  missingCriteria: EnvironmentAuditMissingCriterion[];
  band: EnvironmentAuditBand;
};

function hasThreeOrMoreWords(value: string): boolean {
  return value.trim().split(/\s+/).filter(Boolean).length >= 3;
}

function parseDurationMinutes(value: string): number | null {
  const minuteMatch = value.match(/(\d+)\s*(m|min|mins|minute|minutes)\b/i);
  if (minuteMatch) return Number(minuteMatch[1]);

  const hourMatch = value.match(/(\d+)\s*(h|hr|hrs|hour|hours)\b/i);
  if (hourMatch) return Number(hourMatch[1]) * 60;

  return null;
}

function hasIfThenShape(value: string): boolean {
  return /\bif\b.+\bthen\b.+/i.test(value);
}

function inferBand(score: number): EnvironmentAuditBand {
  if (score <= 2) return 'fragile';
  if (score === 3) return 'usable';
  return 'strong';
}

export function computeEnvironmentAudit(context: EnvironmentContextV1 | null | undefined): EnvironmentAuditResult {
  const place = context?.place?.trim() ?? '';
  const cueLabel = context?.cue?.label?.trim() ?? '';
  const blockerLabel = context?.blocker?.label?.trim() ?? '';
  const hackSummary = context?.hackPlan?.summary?.trim() ?? '';
  const fallbackLabel = context?.fallback?.label?.trim() ?? '';
  const fallbackMinutes =
    typeof context?.fallback?.durationMinutes === 'number' && Number.isFinite(context.fallback.durationMinutes)
      ? context.fallback.durationMinutes
      : parseDurationMinutes(fallbackLabel);

  const breakdown: EnvironmentAuditBreakdown = {
    hasSpecificPlace: place.length > 0 && hasThreeOrMoreWords(place),
    hasCue: cueLabel.length > 0 || Boolean(context?.cue?.type),
    hasBlocker: blockerLabel.length > 0 || Boolean(context?.blocker?.tags?.length),
    hasHackPlan:
      hackSummary.length > 0
      ? hasIfThenShape(hackSummary) || Boolean(context?.hackPlan?.selectedHackIds?.length)
      : Boolean(context?.hackPlan?.selectedHackIds?.length),
    hasFallback:
      fallbackLabel.length > 0 && (fallbackMinutes === null || fallbackMinutes <= 10),
  };

  const score = Object.values(breakdown).filter(Boolean).length;
  const missingCriteria = (Object.keys(breakdown) as EnvironmentAuditMissingCriterion[]).filter(
    (criterion) => !breakdown[criterion],
  );

  return {
    score,
    breakdown,
    missingCriteria,
    band: inferBand(score),
  };
}
