/**
 * Cadence gate for the ring-tile "Daily Clue Card" draw.
 *
 * The board has two *adjacent* card-station tiles, so a player circling the ring
 * hits a draw roughly every lap — and the adjacent pair can fire on back-to-back
 * rolls — which made the Card Draw feel like it popped up constantly. This pure
 * helper decides whether a given card-tile landing should actually open the draw,
 * applying:
 *   - a **roll cooldown** so two landings close together don't both fire (covers
 *     the adjacent-tile double and rapid re-laps), and
 *   - a **per-island cap** so a long island visit yields a handful of draws, not
 *     a dozen.
 *
 * State is intentionally ephemeral (held in a board ref, reset per island / on
 * reload): this gates modal *cadence* only, never gameplay rewards or
 * progression, so it does not belong in the authoritative runtime record.
 *
 * Pure — no React, no I/O — so it is unit-testable under a plain tsc compile.
 */

/** Rolls that must pass after a shown draw before another may open. */
export const CARD_DRAW_COOLDOWN_ROLLS = 6;
/** Most draws that may open during a single island visit. */
export const CARD_DRAW_MAX_PER_ISLAND = 3;

export type CardDrawCadenceState = {
  /** Island the counters below belong to (-1 = uninitialised). */
  islandNumber: number;
  /** Draws already shown during this island visit. */
  drawsThisIsland: number;
  /** Roll index at which the last draw was shown (-Infinity = none yet). */
  lastShownRollIndex: number;
};

export type CardDrawSuppressReason = 'cooldown' | 'island_cap';

export type CardDrawDecision = {
  show: boolean;
  nextState: CardDrawCadenceState;
  /** Why the draw was suppressed (absent when `show` is true). */
  reason?: CardDrawSuppressReason;
};

export function initialCardDrawCadenceState(): CardDrawCadenceState {
  return { islandNumber: -1, drawsThisIsland: 0, lastShownRollIndex: -Infinity };
}

/**
 * Decide whether a card-tile landing should open the Daily Clue Card.
 * Always returns the next cadence state to store, whether or not it showed.
 */
export function decideCardDraw(
  state: CardDrawCadenceState,
  input: { islandNumber: number; rollIndex: number },
): CardDrawDecision {
  const { islandNumber, rollIndex } = input;

  // Reset the counters when the player has moved to a different island.
  const base: CardDrawCadenceState =
    state.islandNumber === islandNumber
      ? state
      : { islandNumber, drawsThisIsland: 0, lastShownRollIndex: -Infinity };

  if (base.drawsThisIsland >= CARD_DRAW_MAX_PER_ISLAND) {
    return { show: false, nextState: { ...base, islandNumber }, reason: 'island_cap' };
  }

  if (rollIndex - base.lastShownRollIndex < CARD_DRAW_COOLDOWN_ROLLS) {
    return { show: false, nextState: { ...base, islandNumber }, reason: 'cooldown' };
  }

  return {
    show: true,
    nextState: {
      islandNumber,
      drawsThisIsland: base.drawsThisIsland + 1,
      lastShownRollIndex: rollIndex,
    },
  };
}
