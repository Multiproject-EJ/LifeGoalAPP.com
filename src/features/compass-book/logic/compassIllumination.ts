import type { CompassBookChapterId } from '../types';

export type CompassIlluminationSignalId = 'know' | 'choose' | 'act' | 'sustain';

export type CompassChapterCompletionCount = {
  completed: number;
  total: number;
};

export type CompassIlluminationSignal = {
  id: CompassIlluminationSignalId;
  label: string;
  question: string;
  score: 0 | 1 | 2 | 3 | 4;
  stateLabel: string;
  completed: number;
  total: number;
};

const SIGNAL_DEFINITIONS: ReadonlyArray<{
  id: CompassIlluminationSignalId;
  label: string;
  question: string;
  chapters: readonly CompassBookChapterId[];
}> = [
  {
    id: 'know',
    label: 'Know',
    question: 'What is true for me?',
    chapters: ['living_wheel', 'inner_compass'],
  },
  {
    id: 'choose',
    label: 'Choose',
    question: 'What life am I choosing?',
    chapters: ['living_horizon', 'ikigai_map'],
  },
  {
    id: 'act',
    label: 'Act',
    question: 'What matters now?',
    chapters: ['quest_forge'],
  },
  {
    id: 'sustain',
    label: 'Sustain',
    question: 'What will keep working?',
    chapters: ['personal_playbook'],
  },
];

export const COMPASS_ILLUMINATION_STATE_LABELS = [
  'Open potential',
  'First clues',
  'Taking shape',
  'Clear path',
  'Strong signal',
] as const;

/**
 * Convert authored-activity completion into a kind 0–4 clarity signal.
 * It measures how much of the book is illuminated, never the person's worth.
 */
export function scoreCompassIllumination(completed: number, total: number): 0 | 1 | 2 | 3 | 4 {
  if (total <= 0 || completed <= 0) return 0;
  const ratio = Math.min(1, Math.max(0, completed / total));
  if (ratio <= 0.25) return 1;
  if (ratio <= 0.5) return 2;
  if (ratio < 0.85) return 3;
  return 4;
}

export function buildCompassIllumination(
  counts: Partial<Record<CompassBookChapterId, CompassChapterCompletionCount>>,
): CompassIlluminationSignal[] {
  return SIGNAL_DEFINITIONS.map((definition) => {
    const aggregate = definition.chapters.reduce(
      (result, chapterId) => {
        const chapter = counts[chapterId];
        return {
          completed: result.completed + (chapter?.completed ?? 0),
          total: result.total + (chapter?.total ?? 0),
        };
      },
      { completed: 0, total: 0 },
    );
    const score = scoreCompassIllumination(aggregate.completed, aggregate.total);
    return {
      id: definition.id,
      label: definition.label,
      question: definition.question,
      score,
      stateLabel: COMPASS_ILLUMINATION_STATE_LABELS[score],
      completed: aggregate.completed,
      total: aggregate.total,
    };
  });
}

export function getCompassSignalIdForChapter(
  chapterId: CompassBookChapterId,
): CompassIlluminationSignalId {
  return SIGNAL_DEFINITIONS.find((definition) => definition.chapters.includes(chapterId))?.id
    ?? 'know';
}
