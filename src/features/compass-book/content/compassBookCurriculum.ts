/**
 * Compass Book curriculum — assembles all six chapters and exposes lookup and
 * validation helpers. Pure data; no React.
 */

import {
  COMPASS_ACTIVITIES_PER_CHAPTER,
  COMPASS_BOOK_CHAPTER_IDS,
  COMPASS_CURRICULUM_VERSION,
  COMPASS_TOTAL_ISLANDS,
  type CompassBookActivityDefinition,
  type CompassBookChapterDefinition,
  type CompassBookChapterId,
} from '../types';
import { chapter1LivingWheel } from './chapter1LivingWheel';
import { chapter2InnerCompass } from './chapter2InnerCompass';
import { chapter3LivingHorizon } from './chapter3LivingHorizon';
import { chapter4IkigaiMap } from './chapter4IkigaiMap';
import { chapter5QuestForge } from './chapter5QuestForge';
import { chapter6PersonalPlaybook } from './chapter6PersonalPlaybook';

export const COMPASS_BOOK_CHAPTERS: readonly CompassBookChapterDefinition[] = [
  chapter1LivingWheel,
  chapter2InnerCompass,
  chapter3LivingHorizon,
  chapter4IkigaiMap,
  chapter5QuestForge,
  chapter6PersonalPlaybook,
];

const CHAPTER_BY_ID: Record<CompassBookChapterId, CompassBookChapterDefinition> =
  COMPASS_BOOK_CHAPTERS.reduce(
    (acc, chapter) => {
      acc[chapter.id] = chapter;
      return acc;
    },
    {} as Record<CompassBookChapterId, CompassBookChapterDefinition>,
  );

export const COMPASS_BOOK_ACTIVITIES: readonly CompassBookActivityDefinition[] =
  COMPASS_BOOK_CHAPTERS.flatMap((chapter) => chapter.activities);

const ACTIVITY_BY_ID: Record<string, CompassBookActivityDefinition> =
  COMPASS_BOOK_ACTIVITIES.reduce(
    (acc, activity) => {
      acc[activity.id] = activity;
      return acc;
    },
    {} as Record<string, CompassBookActivityDefinition>,
  );

const ACTIVITY_BY_ISLAND: Record<number, CompassBookActivityDefinition> =
  COMPASS_BOOK_ACTIVITIES.reduce(
    (acc, activity) => {
      acc[activity.islandNumber] = activity;
      return acc;
    },
    {} as Record<number, CompassBookActivityDefinition>,
  );

export function getChapterDefinition(chapterId: CompassBookChapterId): CompassBookChapterDefinition {
  return CHAPTER_BY_ID[chapterId];
}

export function getActivityDefinition(activityId: string): CompassBookActivityDefinition | null {
  return ACTIVITY_BY_ID[activityId] ?? null;
}

export function getActivityForIsland(islandNumber: number): CompassBookActivityDefinition | null {
  return ACTIVITY_BY_ISLAND[islandNumber] ?? null;
}

export function getChapterActivities(
  chapterId: CompassBookChapterId,
): readonly CompassBookActivityDefinition[] {
  return CHAPTER_BY_ID[chapterId].activities;
}

// ---------------------------------------------------------------------------
// Validation (used by tests and as a defensive runtime guard)
// ---------------------------------------------------------------------------

export type CompassCurriculumValidationResult = {
  ok: boolean;
  errors: string[];
};

export function validateCompassCurriculum(): CompassCurriculumValidationResult {
  const errors: string[] = [];

  // Exactly six chapters, in the canonical id order.
  if (COMPASS_BOOK_CHAPTERS.length !== COMPASS_BOOK_CHAPTER_IDS.length) {
    errors.push(
      `Expected ${COMPASS_BOOK_CHAPTER_IDS.length} chapters, found ${COMPASS_BOOK_CHAPTERS.length}.`,
    );
  }
  COMPASS_BOOK_CHAPTER_IDS.forEach((id, index) => {
    const chapter = COMPASS_BOOK_CHAPTERS[index];
    if (!chapter || chapter.id !== id) {
      errors.push(`Chapter at position ${index} should be "${id}".`);
    }
    if (chapter && chapter.order !== index + 1) {
      errors.push(`Chapter "${chapter.id}" has order ${chapter.order}, expected ${index + 1}.`);
    }
  });

  // Each chapter has exactly 20 activities with orders 1..20.
  for (const chapter of COMPASS_BOOK_CHAPTERS) {
    if (chapter.activities.length !== COMPASS_ACTIVITIES_PER_CHAPTER) {
      errors.push(
        `Chapter "${chapter.id}" has ${chapter.activities.length} activities, expected ${COMPASS_ACTIVITIES_PER_CHAPTER}.`,
      );
    }
    chapter.activities.forEach((activity, index) => {
      if (activity.order !== index + 1) {
        errors.push(
          `Activity "${activity.id}" has order ${activity.order}, expected ${index + 1}.`,
        );
      }
      if (activity.chapterId !== chapter.id) {
        errors.push(`Activity "${activity.id}" chapterId mismatch.`);
      }
      if (activity.blocks.length === 0) {
        errors.push(`Activity "${activity.id}" has no blocks.`);
      }
      // Unique questionIds within an activity.
      const seen = new Set<string>();
      for (const block of activity.blocks) {
        if (seen.has(block.questionId)) {
          errors.push(`Activity "${activity.id}" has duplicate questionId "${block.questionId}".`);
        }
        seen.add(block.questionId);
      }
    });
  }

  // Island coverage is exactly 1..120, each used once.
  const islandSeen = new Map<number, number>();
  for (const activity of COMPASS_BOOK_ACTIVITIES) {
    islandSeen.set(activity.islandNumber, (islandSeen.get(activity.islandNumber) ?? 0) + 1);
  }
  for (let island = 1; island <= COMPASS_TOTAL_ISLANDS; island += 1) {
    const count = islandSeen.get(island) ?? 0;
    if (count !== 1) {
      errors.push(`Island ${island} is mapped to ${count} activities (expected 1).`);
    }
  }
  if (islandSeen.size !== COMPASS_TOTAL_ISLANDS) {
    errors.push(`Islands mapped: ${islandSeen.size}, expected ${COMPASS_TOTAL_ISLANDS}.`);
  }

  // Globally unique activity ids.
  const idSeen = new Set<string>();
  for (const activity of COMPASS_BOOK_ACTIVITIES) {
    if (idSeen.has(activity.id)) {
      errors.push(`Duplicate activity id "${activity.id}".`);
    }
    idSeen.add(activity.id);
  }

  return { ok: errors.length === 0, errors };
}

export { COMPASS_CURRICULUM_VERSION };
