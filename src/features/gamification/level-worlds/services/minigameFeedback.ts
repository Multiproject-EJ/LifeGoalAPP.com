import { ARENA_GAME_CATALOG } from './islandRunArenaCatalog';

/**
 * Player feedback (user request 2026-09-30), presentation-only: never a
 * gameplay write. Stored per player on this device and sent as telemetry.
 *
 * - Event mini game rating: a 5-level vertical drag, offered only once the
 *   player has got at least halfway into a game — the round finished, or they
 *   played at least half its typical round length — and at most once per game
 *   per event.
 * - "I'd like to revisit this island" ❤️ on the island-complete screen.
 */

export const MINIGAME_FEEDBACK_STORAGE_PREFIX = 'lifegoal:minigame-feedback:v1';
export const MINIGAME_RATING_HALFWAY = 0.5;

export const MINIGAME_RATING_LEVELS = [
  { value: 1, emoji: '😖', label: 'Not for me' },
  { value: 2, emoji: '😕', label: 'Meh' },
  { value: 3, emoji: '🙂', label: 'Okay' },
  { value: 4, emoji: '😄', label: 'Liked it' },
  { value: 5, emoji: '😍', label: 'Loved it' },
] as const;

export type MinigameRatingValue = (typeof MINIGAME_RATING_LEVELS)[number]['value'];

export interface MinigameFeedbackStore {
  ratings: Record<string, { rating: MinigameRatingValue; atMs: number } | { skipped: true; atMs: number }>;
  revisitIslands: Record<string, boolean>;
}

export function getMinigameRatingKey(gameId: string, eventId: string | null | undefined): string {
  return `${gameId}:${eventId ?? 'no-event'}`;
}

/** Typical round length for a catalogue game (middle of its estimate). */
export function getTypicalRoundMs(gameId: string): number | null {
  const game = ARENA_GAME_CATALOG.find((entry) => entry.id === gameId);
  if (!game) return null;
  const [min, max] = game.estimatedSeconds;
  return ((min + max) / 2) * 1000;
}

export function shouldAskMinigameRating(options: {
  gameId: string | null | undefined;
  eventId: string | null | undefined;
  elapsedMs: number;
  completed: boolean;
  store: MinigameFeedbackStore;
}): boolean {
  if (!options.gameId) return false;
  const typical = getTypicalRoundMs(options.gameId);
  if (typical === null) return false;
  if (options.store.ratings[getMinigameRatingKey(options.gameId, options.eventId)]) return false;
  return options.completed || options.elapsedMs >= typical * MINIGAME_RATING_HALFWAY;
}

/** Drag position (0 = bottom, 1 = top) → one of the 5 levels. */
export function resolveRatingFromDrag(fraction: number): MinigameRatingValue {
  const clamped = Math.min(1, Math.max(0, Number.isFinite(fraction) ? fraction : 0));
  return (Math.min(4, Math.floor(clamped * 5)) + 1) as MinigameRatingValue;
}

export function createMinigameFeedbackStore(): MinigameFeedbackStore {
  return { ratings: {}, revisitIslands: {} };
}

function storageKey(userId: string) {
  return `${MINIGAME_FEEDBACK_STORAGE_PREFIX}:${userId}`;
}

export function readMinigameFeedback(userId: string): MinigameFeedbackStore {
  try {
    if (typeof window === 'undefined') return createMinigameFeedbackStore();
    const raw = window.localStorage.getItem(storageKey(userId));
    const parsed = raw ? JSON.parse(raw) as Partial<MinigameFeedbackStore> : null;
    return {
      ratings: parsed?.ratings && typeof parsed.ratings === 'object' ? parsed.ratings : {},
      revisitIslands: parsed?.revisitIslands && typeof parsed.revisitIslands === 'object' ? parsed.revisitIslands : {},
    };
  } catch {
    return createMinigameFeedbackStore();
  }
}

export function writeMinigameFeedback(userId: string, store: MinigameFeedbackStore): void {
  try {
    if (typeof window !== 'undefined') window.localStorage.setItem(storageKey(userId), JSON.stringify(store));
  } catch {
    // Private mode or full storage: feedback is optional.
  }
}
