/**
 * Compass Book service — Supabase CRUD for `compass_books` and
 * `compass_chapter_states`, with a demo/local fallback.
 *
 * Best-effort: never throws, so it can never block gameplay. The Compass Book
 * owns ONLY these two new tables. It never writes goals, habits, Island Run
 * state, or the legacy `compass_state`.
 *
 * Not included in the pure unit-test bundle (touches the browser Supabase
 * client). Pure mapping/merging logic lives in `compassBookSerialization.ts`.
 */

import { canUseSupabaseData, getSupabaseClient } from '../../../lib/supabaseClient';
import type { Database } from '../../../lib/database.types';
import {
  COMPASS_CURRICULUM_VERSION,
  type CompassAnswerRecord,
  type CompassBook,
  type CompassBookChapterId,
  type CompassChapterState,
} from '../types';
import {
  emptyChapterState,
  parseBookRow,
  parseChapterStateRow,
  serializeChapterState,
  upsertAnswer,
} from './compassBookSerialization';

type BookRow = Database['public']['Tables']['compass_books']['Row'];
type ChapterRow = Database['public']['Tables']['compass_chapter_states']['Row'];

function devLog(message: string, detail?: unknown): void {
  if (import.meta.env.DEV) console.debug(`[compass-book] ${message}`, detail ?? '');
}

/** Fetch the user's active book for the current curriculum version, or null. */
export async function fetchCompassBook(userId: string): Promise<CompassBook | null> {
  if (!canUseSupabaseData()) return null;
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('compass_books')
      .select('*')
      .eq('user_id', userId)
      .eq('curriculum_version', COMPASS_CURRICULUM_VERSION)
      .maybeSingle<BookRow>();
    if (error) {
      devLog('fetch book skipped', error.message);
      return null;
    }
    return data ? parseBookRow(data) : null;
  } catch (error) {
    devLog('fetch book threw', error);
    return null;
  }
}

/** Create (or return existing) active book for the user. */
export async function ensureCompassBook(userId: string): Promise<CompassBook | null> {
  const existing = await fetchCompassBook(userId);
  if (existing) return existing;
  if (!canUseSupabaseData()) return null;
  try {
    const supabase = getSupabaseClient();
    const insert: Database['public']['Tables']['compass_books']['Insert'] = {
      user_id: userId,
      curriculum_version: COMPASS_CURRICULUM_VERSION,
      status: 'not_started',
    };
    const { data, error } = await supabase
      .from('compass_books')
      .insert(insert)
      .select('*')
      .maybeSingle<BookRow>();
    if (error) {
      devLog('create book skipped', error.message);
      return null;
    }
    return data ? parseBookRow(data) : null;
  } catch (error) {
    devLog('create book threw', error);
    return null;
  }
}

/** Fetch all chapter states for a book, keyed by chapter id. */
export async function fetchChapterStates(
  userId: string,
  bookId: string,
): Promise<Partial<Record<CompassBookChapterId, CompassChapterState>>> {
  if (!canUseSupabaseData()) return {};
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('compass_chapter_states')
      .select('*')
      .eq('user_id', userId)
      .eq('book_id', bookId);
    if (error) {
      devLog('fetch chapter states skipped', error.message);
      return {};
    }
    const result: Partial<Record<CompassBookChapterId, CompassChapterState>> = {};
    for (const row of (data ?? []) as ChapterRow[]) {
      const state = parseChapterStateRow(row);
      result[state.chapterId] = state;
    }
    return result;
  } catch (error) {
    devLog('fetch chapter states threw', error);
    return {};
  }
}

/** Persist a chapter state (insert or update on the book_id + chapter_id pair). */
export async function saveChapterState(
  userId: string,
  bookId: string,
  state: CompassChapterState,
): Promise<CompassChapterState> {
  if (!canUseSupabaseData()) return state;
  try {
    const supabase = getSupabaseClient();
    const row = {
      ...serializeChapterState(state),
      book_id: bookId,
      user_id: userId,
    };
    const { error } = await supabase
      .from('compass_chapter_states')
      .upsert(row, { onConflict: 'book_id,chapter_id' });
    if (error) {
      devLog('save chapter state skipped', error.message);
    }
    return state;
  } catch (error) {
    devLog('save chapter state threw', error);
    return state;
  }
}

/**
 * Convenience: save one answer into a chapter state and persist. Returns the
 * updated (in-memory) state regardless of network outcome.
 */
export async function recordChapterAnswer(
  userId: string,
  bookId: string,
  current: CompassChapterState | null,
  answer: CompassAnswerRecord,
): Promise<CompassChapterState> {
  const base = current ?? emptyChapterState(answer.activityId.split('.')[0] as CompassBookChapterId);
  const next: CompassChapterState = {
    ...base,
    status: base.status === 'locked' || base.status === 'unlocked' ? 'in_progress' : base.status,
    answers: upsertAnswer(base.answers, answer),
  };
  await saveChapterState(userId, bookId, next);
  return next;
}
