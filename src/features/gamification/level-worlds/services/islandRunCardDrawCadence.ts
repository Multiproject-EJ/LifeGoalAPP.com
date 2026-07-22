/**
 * Cadence gate for the caretaker-led milestone clue encounter.
 *
 * The old Daily Clue Card could appear on every island and several times per
 * visit. That made a reflective prompt feel like routine modal noise. The
 * caretaker now offers one visual clue encounter only on milestone islands
 * (5, 10, 15, ...), at most once per visit.
 *
 * State is intentionally ephemeral (held in a board ref, reset per island / on
 * reload): this gates modal *cadence* only, never gameplay rewards or
 * progression, so it does not belong in the authoritative runtime record.
 *
 * Pure — no React, no I/O — so it is unit-testable under a plain tsc compile.
 */

/** The caretaker offers a wheel clue on every fifth island. */
export const CARETAKER_CLUE_ISLAND_INTERVAL = 5;
/** A milestone clue is a special encounter, not a repeatable station. */
export const CARD_DRAW_MAX_PER_ISLAND = 1;

export function isCaretakerClueIsland(islandNumber: number): boolean {
  if (!Number.isFinite(islandNumber)) return false;
  const safeIsland = Math.max(1, Math.floor(islandNumber));
  return safeIsland % CARETAKER_CLUE_ISLAND_INTERVAL === 0;
}

export type CardDrawCadenceState = {
  /** Island the counters below belong to (-1 = uninitialised). */
  islandNumber: number;
  /** Draws already shown during this island visit. */
  drawsThisIsland: number;
  /** Roll index at which the last draw was shown (-Infinity = none yet). */
  lastShownRollIndex: number;
};

export type CardDrawSuppressReason = 'not_milestone_island' | 'island_cap';

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
 * Decide whether a card-tile landing should open the caretaker clue encounter.
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

  if (!isCaretakerClueIsland(islandNumber)) {
    return { show: false, nextState: { ...base, islandNumber }, reason: 'not_milestone_island' };
  }

  if (base.drawsThisIsland >= CARD_DRAW_MAX_PER_ISLAND) {
    return { show: false, nextState: { ...base, islandNumber }, reason: 'island_cap' };
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
