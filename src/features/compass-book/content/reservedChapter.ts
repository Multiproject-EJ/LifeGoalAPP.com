/**
 * Builder for chapters 2–6 in the MVP foundation.
 *
 * These chapters expose their full set of 20 stable, island-numbered slots with
 * real titles (from the curriculum brief's activity arcs) but only a single
 * placeholder reflection block each. They are marked `authored: false` so the UI
 * can render them as "coming soon" without breaking curriculum validation.
 * Full block content is added per-chapter in later PRs (PR 6–10).
 */

import type {
  CompassBookActivityDefinition,
  CompassBookChapterDefinition,
  CompassBookChapterId,
  CompassChapterStageIndex,
} from '../types';

function stageForOrder(order: number): CompassChapterStageIndex {
  if (order <= 4) return 1;
  if (order <= 8) return 2;
  if (order <= 12) return 3;
  if (order <= 16) return 4;
  return 5;
}

export type ReservedChapterInput = {
  id: CompassBookChapterId;
  order: number; // 1..6
  title: string;
  subtitle?: string;
  coreQuestion: string;
  visualMetaphor: string;
  outputFields: string[];
  /** Exactly 20 short slot titles, in order. */
  slotTitles: string[];
};

export function buildReservedChapter(input: ReservedChapterInput): CompassBookChapterDefinition {
  if (input.slotTitles.length !== 20) {
    throw new Error(
      `Reserved chapter "${input.id}" must define exactly 20 slot titles (got ${input.slotTitles.length}).`,
    );
  }

  const startIsland = (input.order - 1) * 20 + 1;

  const activities: CompassBookActivityDefinition[] = input.slotTitles.map((title, index) => {
    const order = index + 1;
    return {
      id: `${input.id}.a${String(order).padStart(2, '0')}`,
      chapterId: input.id,
      islandNumber: startIsland + index,
      order,
      stage: stageForOrder(order),
      title,
      shortTitle: title,
      required: order === 20, // only the final confirmation is required until authored
      authored: false,
      blocks: [
        {
          questionId: 'placeholder',
          type: order === 20 ? 'confirmation' : 'reflection',
          prompt:
            order === 20
              ? `Confirm and seal "${input.title}" (full content coming soon).`
              : `${title} — full guided content for this fragment is coming soon.`,
          required: order === 20,
          maxLength: 280,
        },
      ],
    };
  });

  return {
    id: input.id,
    order: input.order,
    title: input.title,
    subtitle: input.subtitle,
    coreQuestion: input.coreQuestion,
    visualMetaphor: input.visualMetaphor,
    outputFields: input.outputFields,
    islandRange: [startIsland, startIsland + 19],
    activities,
  };
}
