/**
 * Compass Book icon cues — presentation only.
 *
 * The icon is a living compass that now and then dissolves in magic dust into
 * the Book, opens, glows and turns back. When the current island holds a
 * Compass fragment the player has not opened yet, the book also pops a tiny
 * message bubble a few times, then quietly keeps glowing. Nothing here grants,
 * spends or persists gameplay state; the "seen" marker is a per-device UI note.
 */
import { COMPASS_BOOK_VISIBLE_FRAGMENT_START_ISLAND_NUMBER } from './islandRunCompassBookReceipt';

/** Idle rhythm between compass → book transformations. */
export const COMPASS_ICON_IDLE_TRANSFORM_MS = 42_000;
/** First insight nudge after arriving (lets the board settle first). */
export const COMPASS_ICON_FIRST_NUDGE_MS = 3_500;
/** Gap between repeated insight nudges on the same island. */
export const COMPASS_ICON_NUDGE_GAP_MS = 75_000;
/** Insight bubbles per island visit before the icon only glows. */
export const COMPASS_ICON_MAX_NUDGES = 3;
/** How long a message bubble stays readable. */
export const COMPASS_ICON_BUBBLE_MS = 4_200;

const SEEN_KEY_PREFIX = 'lifegoal:compass-book-icon:seen-island';

export function compassIslandKey(cycleIndex: number, islandNumber: number): string {
  return `${Math.max(0, Math.floor(cycleIndex))}:${Math.max(1, Math.floor(islandNumber))}`;
}

/** Islands from 009 reveal a visible fragment, so they carry a new insight. */
export function islandHasCompassInsight(islandNumber: number): boolean {
  return Math.floor(islandNumber) >= COMPASS_BOOK_VISIBLE_FRAGMENT_START_ISLAND_NUMBER;
}

export function hasUnseenCompassInsight(options: { islandNumber: number; islandKey: string; seenIslandKey: string | null }): boolean {
  return islandHasCompassInsight(options.islandNumber) && options.seenIslandKey !== options.islandKey;
}

const MESSAGES = [
  'A new page appeared ✦',
  'Your compass found something',
  'Psst… a new insight',
] as const;

/** Rotates gently so repeated nudges do not feel like a nag. */
export function compassInsightMessage(islandNumber: number, nudgeIndex: number): string {
  if (nudgeIndex === 0 && islandHasCompassInsight(islandNumber)) {
    return `Island ${String(Math.floor(islandNumber)).padStart(3, '0')} fragment revealed ✦`;
  }
  return MESSAGES[Math.abs(Math.floor(islandNumber) + nudgeIndex) % MESSAGES.length]!;
}

/** Delay before the next nudge, or null when this visit has nudged enough. */
export function nextCompassNudgeDelayMs(nudgesShown: number): number | null {
  if (nudgesShown >= COMPASS_ICON_MAX_NUDGES) return null;
  return nudgesShown === 0 ? COMPASS_ICON_FIRST_NUDGE_MS : COMPASS_ICON_NUDGE_GAP_MS;
}

export function readSeenCompassIsland(playerKey: string): string | null {
  try { return window.localStorage.getItem(`${SEEN_KEY_PREFIX}:${playerKey}`); } catch { return null; }
}

export function writeSeenCompassIsland(playerKey: string, islandKey: string): void {
  try { window.localStorage.setItem(`${SEEN_KEY_PREFIX}:${playerKey}`, islandKey); } catch { /* private mode */ }
}
