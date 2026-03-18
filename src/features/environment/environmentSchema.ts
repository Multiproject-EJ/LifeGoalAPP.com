import type { Json } from '../../lib/database.types';

export type EnvironmentCueType = 'time' | 'location' | 'event' | 'person' | 'custom';
export type EnvironmentContextSource = 'setup' | 'edit' | 'weekly_review' | 'ai';

export interface EnvironmentContextV1 {
  version: 1;
  place?: string;
  cue?: {
    type?: EnvironmentCueType;
    label?: string;
  };
  blocker?: {
    label?: string;
    tags?: string[];
  };
  hackPlan?: {
    summary?: string;
    selectedHackIds?: string[];
  };
  fallback?: {
    label?: string;
    durationMinutes?: number | null;
  };
  source?: EnvironmentContextSource;
  updatedAt?: string;
  legacyNote?: string;
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function asTrimmedString(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function asStringArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const normalized = value.map(asTrimmedString).filter((item): item is string => Boolean(item));
  return normalized.length > 0 ? normalized : undefined;
}

export function normalizeEnvironmentContext(
  input: Json | null | undefined,
  options?: {
    fallbackText?: string | null | undefined;
    source?: EnvironmentContextSource;
    updatedAt?: string;
  },
): EnvironmentContextV1 | null {
  const fallbackText = asTrimmedString(options?.fallbackText);
  const updatedAt = options?.updatedAt ?? new Date().toISOString();

  if (!isRecord(input)) {
    return fallbackText
      ? {
          version: 1,
          legacyNote: fallbackText,
          source: options?.source,
          updatedAt,
        }
      : null;
  }

  const cue = isRecord(input.cue)
    ? {
        type: (['time', 'location', 'event', 'person', 'custom'] as const).includes(input.cue.type as EnvironmentCueType)
          ? (input.cue.type as EnvironmentCueType)
          : undefined,
        label: asTrimmedString(input.cue.label),
      }
    : undefined;

  const blocker = isRecord(input.blocker)
    ? {
        label: asTrimmedString(input.blocker.label),
        tags: asStringArray(input.blocker.tags),
      }
    : undefined;

  const hackPlan = isRecord(input.hackPlan)
    ? {
        summary: asTrimmedString(input.hackPlan.summary),
        selectedHackIds: asStringArray(input.hackPlan.selectedHackIds),
      }
    : undefined;

  const fallback = isRecord(input.fallback)
    ? {
        label: asTrimmedString(input.fallback.label),
        durationMinutes:
          typeof input.fallback.durationMinutes === 'number' && Number.isFinite(input.fallback.durationMinutes)
            ? input.fallback.durationMinutes
            : null,
      }
    : undefined;

  const normalized: EnvironmentContextV1 = {
    version: 1,
    place: asTrimmedString(input.place),
    cue: cue?.type || cue?.label ? cue : undefined,
    blocker: blocker?.label || blocker?.tags?.length ? blocker : undefined,
    hackPlan: hackPlan?.summary || hackPlan?.selectedHackIds?.length ? hackPlan : undefined,
    fallback: fallback?.label || fallback?.durationMinutes !== null ? fallback : undefined,
    source: (['setup', 'edit', 'weekly_review', 'ai'] as const).includes(input.source as EnvironmentContextSource)
      ? (input.source as EnvironmentContextSource)
      : options?.source,
    updatedAt,
    legacyNote: asTrimmedString(input.legacyNote) ?? fallbackText,
  };

  const hasMeaningfulFields = Boolean(
    normalized.place ||
      normalized.cue?.label ||
      normalized.blocker?.label ||
      normalized.blocker?.tags?.length ||
      normalized.hackPlan?.summary ||
      normalized.hackPlan?.selectedHackIds?.length ||
      normalized.fallback?.label ||
      normalized.legacyNote,
  );

  return hasMeaningfulFields ? normalized : null;
}

export function environmentContextToJson(context: EnvironmentContextV1 | null): Json | null {
  return context ? (context as unknown as Json) : null;
}
