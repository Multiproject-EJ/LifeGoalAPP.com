/**
 * Pure (de)serialization between Supabase rows and Compass Book domain types.
 * No Supabase/React imports so it can be unit-tested under a plain tsc compile.
 */

import type { Database, Json } from '../../../lib/database.types';
import {
  COMPASS_CURRICULUM_VERSION,
  type CompassAnswerRecord,
  type CompassBook,
  type CompassBookChapterId,
  type CompassBookStatus,
  type CompassChapterState,
  type CompassChapterStatus,
} from '../types';
import { COMPASS_BOOK_CHAPTER_IDS } from '../types';

type BookRow = Database['public']['Tables']['compass_books']['Row'];
type ChapterRow = Database['public']['Tables']['compass_chapter_states']['Row'];

const CHAPTER_ID_SET = new Set<string>(COMPASS_BOOK_CHAPTER_IDS);

function asChapterId(value: string): CompassBookChapterId | null {
  return CHAPTER_ID_SET.has(value) ? (value as CompassBookChapterId) : null;
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

/** Defensive parse of a persisted answers JSONB blob; drops malformed entries. */
export function parseAnswers(value: Json | null): CompassAnswerRecord[] {
  const records: CompassAnswerRecord[] = [];
  for (const raw of asArray(value)) {
    if (!raw || typeof raw !== 'object') continue;
    const r = raw as Record<string, unknown>;
    if (typeof r.activityId !== 'string' || typeof r.questionId !== 'string') continue;
    if (!r.value || typeof r.value !== 'object') continue;
    records.push({
      activityId: r.activityId,
      questionId: r.questionId,
      value: r.value as CompassAnswerRecord['value'],
      sourceMode: (r.sourceMode as CompassAnswerRecord['sourceMode']) ?? 'fixed_guided',
      curriculumVersion:
        typeof r.curriculumVersion === 'string' ? r.curriculumVersion : COMPASS_CURRICULUM_VERSION,
      answeredAt: typeof r.answeredAt === 'string' ? r.answeredAt : new Date(0).toISOString(),
      updatedAt: typeof r.updatedAt === 'string' ? r.updatedAt : new Date(0).toISOString(),
      confirmed: r.confirmed === true,
      promptLabel: typeof r.promptLabel === 'string' ? r.promptLabel : undefined,
      optionLabels:
        r.optionLabels && typeof r.optionLabels === 'object'
          ? (r.optionLabels as Record<string, string>)
          : undefined,
    });
  }
  return records;
}

export function parseChapterStateRow(row: ChapterRow): CompassChapterState {
  const chapterId = asChapterId(row.chapter_id);
  return {
    chapterId: chapterId ?? 'living_wheel',
    contentVersion: row.content_version ?? COMPASS_CURRICULUM_VERSION,
    status: (row.status as CompassChapterStatus) ?? 'unlocked',
    answers: parseAnswers(row.answers),
    draftOutput: row.draft_output ?? null,
    confirmedOutput: row.confirmed_output ?? null,
    completedActivityIds: Array.isArray(row.completed_activity_ids)
      ? row.completed_activity_ids
      : [],
    confirmedAt: row.confirmed_at ?? null,
  };
}

export function serializeChapterState(
  state: CompassChapterState,
): Omit<Database['public']['Tables']['compass_chapter_states']['Insert'], 'book_id' | 'user_id'> {
  return {
    chapter_id: state.chapterId,
    content_version: state.contentVersion,
    status: state.status,
    answers: state.answers as unknown as Json,
    draft_output: state.draftOutput,
    confirmed_output: state.confirmedOutput,
    completed_activity_ids: state.completedActivityIds,
    confirmed_at: state.confirmedAt,
    updated_at: new Date().toISOString(),
  };
}

export function parseBookRow(row: BookRow): CompassBook {
  return {
    id: row.id,
    userId: row.user_id,
    curriculumVersion: row.curriculum_version ?? COMPASS_CURRICULUM_VERSION,
    status: (row.status as CompassBookStatus) ?? 'not_started',
    currentChapterId: row.current_chapter_id ? asChapterId(row.current_chapter_id) : null,
    currentActivityId: row.current_activity_id ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    completedAt: row.completed_at ?? null,
  };
}

/** Build an empty (unsaved) chapter state for a chapter. */
export function emptyChapterState(chapterId: CompassBookChapterId): CompassChapterState {
  return {
    chapterId,
    contentVersion: COMPASS_CURRICULUM_VERSION,
    status: 'unlocked',
    answers: [],
    draftOutput: null,
    confirmedOutput: null,
    completedActivityIds: [],
    confirmedAt: null,
  };
}

/**
 * Upsert one answer into an answer list by (activityId, questionId), preserving
 * `answeredAt` of the first save and bumping `updatedAt`. Pure.
 */
export function upsertAnswer(
  answers: readonly CompassAnswerRecord[],
  next: CompassAnswerRecord,
): CompassAnswerRecord[] {
  const existingIndex = answers.findIndex(
    (a) => a.activityId === next.activityId && a.questionId === next.questionId,
  );
  if (existingIndex === -1) return [...answers, next];
  const merged: CompassAnswerRecord = {
    ...next,
    answeredAt: answers[existingIndex].answeredAt || next.answeredAt,
  };
  const copy = [...answers];
  copy[existingIndex] = merged;
  return copy;
}
