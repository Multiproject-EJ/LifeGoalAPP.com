/**
 * Compass Book local store — localStorage persistence for chapter states.
 *
 * Used for demo/offline mode and as an instant-resume cache so the guided flow
 * survives reloads even before a Supabase round-trip completes. Best-effort:
 * never throws. Mirrors (never replaces) the canonical Supabase tables.
 */

import type { CompassBookChapterId, CompassChapterState } from '../types';

const KEY_PREFIX = 'compass_book_v1';

function storageKey(userId: string): string {
  return `${KEY_PREFIX}:${userId || 'local'}`;
}

type StoredBook = {
  chapters: Partial<Record<CompassBookChapterId, CompassChapterState>>;
};

export function loadLocalChapterStates(
  userId: string,
): Partial<Record<CompassBookChapterId, CompassChapterState>> {
  try {
    const raw = localStorage.getItem(storageKey(userId));
    if (!raw) return {};
    const parsed = JSON.parse(raw) as StoredBook;
    return parsed && typeof parsed === 'object' && parsed.chapters ? parsed.chapters : {};
  } catch {
    return {};
  }
}

export function saveLocalChapterState(userId: string, state: CompassChapterState): void {
  try {
    const all = loadLocalChapterStates(userId);
    all[state.chapterId] = state;
    localStorage.setItem(storageKey(userId), JSON.stringify({ chapters: all } satisfies StoredBook));
  } catch {
    /* best-effort */
  }
}
