/**
 * islandRunStopTickets — essence-ticket unlock service for the 5 per-island stops.
 *
 * Canonical rule (per the gameplay contract):
 *   On a new island, only the Hatchery (stop 0) is open. The remaining 4 stops
 *   each require:
 *     1. The previous stop's objective to be complete (or "effectively" complete
 *        for Hatchery, which counts as done the moment an egg is set).
 *     2. A one-time essence "ticket" to be paid to open the stop on THIS island.
 *
 * This replaces the old "auto-open next stop" rule so the player can't burn
 * through all 5 stops in a couple of minutes — they have to earn essence on the
 * board first.
 *
 * Ticket state lives on the runtime state as:
 *   stopTicketsPaidByIsland: Record<string, number[]>
 * where the key is the islandNumber (as a string) and the value is the list
 * of stop indices whose ticket has been paid for that island (the Hatchery
 * stop, index 0, is always implicitly "paid" — it is never listed).
 */

import { getIslandEssenceMultiplier } from './islandRunContractV2EssenceBuild';

/**
 * Base essence ticket cost per stop index, before the island multiplier is
 * applied. The curve steepens toward the boss so late landmarks carry real
 * economic weight rather than being a cosmetic step-up:
 *   - Stop 0 (Hatchery): free (always open on a fresh island).
 *   - Stop 1 (Habit):     30 essence
 *   - Stop 2 (Mystery):   70 essence
 *   - Stop 3 (Wisdom):   130 essence
 *   - Stop 4 (Boss):     220 essence
 * On island 1 the total to open all 4 is 450 essence; it still scales up each
 * tier by `getIslandEssenceMultiplier` so cycle 2 is meaningfully pricier.
 */
export const STOP_TICKET_BASE_COSTS: readonly [number, number, number, number, number] = [
  0,
  30,
  70,
  130,
  220,
];

/** Number of stops on an island (including Hatchery + Boss). */
export const STOP_COUNT = 5;

/** Returns the essence cost to open `stopIndex` on an island whose effective
 *  number (cycleIndex × 120 + islandNumber) is `effectiveIslandNumber`.
 *
 *  - Stop 0 (Hatchery) is always free → returns 0.
 *  - All other stops scale by `getIslandEssenceMultiplier(effectiveIslandNumber)`.
 */
export function getStopTicketCost(options: {
  effectiveIslandNumber: number;
  stopIndex: number;
}): number {
  const idx = Math.max(0, Math.min(STOP_COUNT - 1, Math.floor(options.stopIndex)));
  const base = STOP_TICKET_BASE_COSTS[idx] ?? 0;
  if (base <= 0) return 0;
  const mult = getIslandEssenceMultiplier(Math.max(1, Math.floor(options.effectiveIslandNumber)));
  return Math.max(1, Math.floor(base * mult));
}

/** Returns the list of paid-ticket stop indices for a given island number.
 *
 * Agrees with `sanitizeStopTicketsPaidByIsland`: entries for the hatchery
 * (idx 0 — always implicitly paid) and out-of-range indices are filtered
 * out so malformed payloads can't desync the two code paths.
 */
export function getStopTicketsPaidForIsland(
  stopTicketsPaidByIsland: Record<string, number[]> | undefined | null,
  islandNumber: number,
): number[] {
  if (!stopTicketsPaidByIsland) return [];
  const entry = stopTicketsPaidByIsland[String(islandNumber)];
  if (!Array.isArray(entry)) return [];
  // Defensive: sanitize to unique, in-range integers. Index 0 (Hatchery) is
  // implicitly free and must never appear in the list — mirror the rule in
  // `sanitizeStopTicketsPaidByIsland`.
  const seen = new Set<number>();
  const out: number[] = [];
  for (const raw of entry) {
    const idx = Math.floor(raw);
    if (!Number.isFinite(idx)) continue;
    if (idx <= 0 || idx >= STOP_COUNT) continue;
    if (seen.has(idx)) continue;
    seen.add(idx);
    out.push(idx);
  }
  return out;
}

/** True if the stop's ticket is paid (or it's Hatchery, which is always free). */
export function isStopTicketPaid(options: {
  ticketsPaid: readonly number[];
  stopIndex: number;
}): boolean {
  if (options.stopIndex === 0) return true;
  return options.ticketsPaid.includes(options.stopIndex);
}

export type PayStopTicketReason =
  | 'already_paid'
  | 'invalid_stop_index'
  | 'previous_stop_not_complete'
  | 'insufficient_essence';

export type PayStopTicketResult =
  | {
      ok: true;
      essence: number;
      essenceLifetimeSpent: number;
      stopTicketsPaidByIsland: Record<string, number[]>;
      cost: number;
      /**
       * True when the result is a no-op because the requested stop is free
       * (Hatchery / stop 0). Callers that want to differentiate "paid now"
       * from "already free" should check this flag. Wallet fields are
       * returned unchanged when `alreadyFree === true`.
       */
      alreadyFree?: boolean;
    }
  | {
      ok: false;
      reason: PayStopTicketReason;
      cost: number;
    };

/**
 * Attempt to pay the ticket for a stop. Deducts the essence cost from the
 * wallet, and marks the stop index as paid in `stopTicketsPaidByIsland`.
 *
 * Preconditions (checked in order):
 *   - stopIndex 0 (Hatchery) is a **no-op success**: returns `ok: true` with
 *     `alreadyFree: true`, cost 0, and wallet fields unchanged. Hatchery is
 *     implicitly free on every island, so a caller clicking "pay ticket" for
 *     it is a legitimate request that simply does nothing — not an error.
 *   - stopIndex must be in [0, STOP_COUNT-1]; out-of-range returns
 *     `invalid_stop_index`.
 *   - Ticket must not already be paid.
 *   - Previous stop's objective must be marked complete
 *     (stopStatesByIndex[stopIndex-1].objectiveComplete === true).
 *   - Wallet must hold at least the ticket cost.
 */
export function payStopTicket(options: {
  effectiveIslandNumber: number;
  islandNumber: number;
  stopIndex: number;
  essence: number;
  essenceLifetimeSpent: number;
  stopTicketsPaidByIsland: Record<string, number[]> | undefined | null;
  stopStatesByIndex: ReadonlyArray<{ objectiveComplete: boolean } | null | undefined>;
}): PayStopTicketResult {
  const stopIndex = Math.floor(options.stopIndex);
  const cost = getStopTicketCost({
    effectiveIslandNumber: options.effectiveIslandNumber,
    stopIndex,
  });

  if (stopIndex === 0) {
    // Hatchery is implicitly free. Return a no-op success so callers don't
    // have to special-case an error reason for a legitimate click.
    return {
      ok: true,
      essence: Math.max(0, Math.floor(options.essence)),
      essenceLifetimeSpent: Math.max(0, Math.floor(options.essenceLifetimeSpent)),
      stopTicketsPaidByIsland: { ...(options.stopTicketsPaidByIsland ?? {}) },
      cost: 0,
      alreadyFree: true,
    };
  }
  if (stopIndex < 0 || stopIndex >= STOP_COUNT) {
    return { ok: false, reason: 'invalid_stop_index', cost };
  }

  const paid = getStopTicketsPaidForIsland(options.stopTicketsPaidByIsland, options.islandNumber);
  if (paid.includes(stopIndex)) return { ok: false, reason: 'already_paid', cost };

  const prev = options.stopStatesByIndex[stopIndex - 1];
  if (!prev?.objectiveComplete) {
    return { ok: false, reason: 'previous_stop_not_complete', cost };
  }

  const wallet = Math.max(0, Math.floor(options.essence));
  if (wallet < cost) return { ok: false, reason: 'insufficient_essence', cost };

  // Build the next map immutably.
  const nextMap: Record<string, number[]> = { ...(options.stopTicketsPaidByIsland ?? {}) };
  const key = String(options.islandNumber);
  nextMap[key] = [...paid, stopIndex].sort((a, b) => a - b);

  return {
    ok: true,
    essence: wallet - cost,
    essenceLifetimeSpent: Math.max(0, Math.floor(options.essenceLifetimeSpent)) + cost,
    stopTicketsPaidByIsland: nextMap,
    cost,
  };
}

/**
 * Ensure the hatchery (stop 0) doesn't get polluted into the paid array by
 * legacy writes — Hatchery is implicitly always paid. Also de-dupes and bounds.
 * Safe to call on every hydration.
 */
export function sanitizeStopTicketsPaidByIsland(
  stopTicketsPaidByIsland: Record<string, number[]> | undefined | null,
): Record<string, number[]> {
  if (!stopTicketsPaidByIsland || typeof stopTicketsPaidByIsland !== 'object') return {};
  const out: Record<string, number[]> = {};
  for (const [key, value] of Object.entries(stopTicketsPaidByIsland)) {
    if (!Array.isArray(value)) continue;
    const seen = new Set<number>();
    const cleaned: number[] = [];
    for (const raw of value) {
      const idx = Math.floor(raw);
      if (!Number.isFinite(idx)) continue;
      // Drop entries that cannot be a legitimate paid ticket:
      //   - idx <= 0 covers both the free hatchery (0) and malformed negative values
      //   - idx >= STOP_COUNT covers out-of-range (>= 5) entries
      if (idx <= 0 || idx >= STOP_COUNT) continue;
      if (seen.has(idx)) continue;
      seen.add(idx);
      cleaned.push(idx);
    }
    cleaned.sort((a, b) => a - b);
    if (cleaned.length > 0) out[key] = cleaned;
  }
  return out;
}
