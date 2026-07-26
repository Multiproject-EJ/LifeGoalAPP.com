/**
 * Page-turn logic — which way the paper moves when the player changes pages.
 *
 * A book only reads as a book if turning to a later chapter looks different from
 * turning back to an earlier one. This module answers that question and nothing
 * else: the animation itself is CSS, driven by the class name chosen here.
 *
 * Pure — no React, no DOM, no timers.
 */

import { COMPASS_BOOK_PAGE_IDS, type CompassBookPageId } from './reading';

export type CompassTurnDirection =
  /** Toward a later chapter — paper lifts from the fore edge and falls left. */
  | 'forward'
  /** Back toward the Reading — paper falls back to the right. */
  | 'back'
  /** Same page: no turn. */
  | 'none';

/** Position of a page in the book, the Reading first (0) then chapters 1..6. */
export function pageIndex(pageId: CompassBookPageId): number {
  const index = COMPASS_BOOK_PAGE_IDS.indexOf(pageId);
  return index < 0 ? 0 : index;
}

/** Which way the paper travels going from one page to another. */
export function turnDirection(
  from: CompassBookPageId | null,
  to: CompassBookPageId,
): CompassTurnDirection {
  // Opening the book is not a turn — the cover handles that moment.
  if (from === null) return 'none';
  const delta = pageIndex(to) - pageIndex(from);
  if (delta === 0) return 'none';
  return delta > 0 ? 'forward' : 'back';
}

/**
 * How many sheets the turn crosses. Jumping the rail from chapter I to VI is a
 * bigger movement than stepping one page, and the animation leans on this to
 * stay believable instead of playing an identical flick every time.
 */
export function turnDistance(
  from: CompassBookPageId | null,
  to: CompassBookPageId,
): number {
  if (from === null) return 0;
  return Math.abs(pageIndex(to) - pageIndex(from));
}

/** The modifier class the page container wears while the turn plays. */
export function turnClassName(direction: CompassTurnDirection): string | null {
  if (direction === 'none') return null;
  return `compass-book__page--turn-${direction}`;
}

/**
 * Duration in ms for a turn. Longer jumps take a little more time, but the range
 * stays tight so the book never feels slow to navigate.
 */
export const TURN_MIN_MS = 320;
export const TURN_MAX_MS = 460;

export function turnDurationMs(distance: number): number {
  if (distance <= 0) return 0;
  const scaled = TURN_MIN_MS + (distance - 1) * 26;
  return Math.min(TURN_MAX_MS, scaled);
}
