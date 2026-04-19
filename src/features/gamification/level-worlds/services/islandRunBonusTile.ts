/**
 * islandRunBonusTile — 9-hit accumulator service for the glowing "bonus" ring tile.
 *
 * **Mechanic.**
 *   Every time the token lands on a bonus tile, a per-(island, tileIndex) counter
 *   increments by 1. The UI lights one more dot per landing (1/8, 2/8, …, 8/8).
 *   At 8/8 the tile enters its "primed" state. The **next** (9th) landing releases
 *   the accumulated bonus payload and resets the counter to 0.
 *
 * **State shape (persisted shape).**
 *   Record<islandNumberString, Record<tileIndex, charge>>
 *   - outer key: island number as string (matches the rest of the per-island maps).
 *   - inner key: tile index (0 .. tileCount-1 on the active board profile).
 *   - value: charge count in [0, BONUS_CHARGE_TARGET]. 0 after a release.
 *
 * **Persistence note.** The state field is added to the canonical runtime record
 * in the renderer-wiring PR that follows this one — the pure service layer in
 * this file does not reach into the runtime store so the game-logic contract
 * can ship and be unit-tested independently of storage plumbing.
 */

/** Charges required before the bonus is primed and the next landing releases. */
export const BONUS_CHARGE_TARGET = 8;

/** Total landings for a full charge-and-release cycle: 8 charges + 1 release = 9. */
export const BONUS_CYCLE_LENGTH = BONUS_CHARGE_TARGET + 1;

/** Persisted shape for the bonus-tile accumulator ledger. */
export type BonusTileChargeByIsland = Record<string, Record<number, number>>;

/** Payload released on the 9th landing. Tuning numbers live here (and the
 *  contract doc) so the renderer never invents values. */
export interface BonusTileReleasePayout {
  /** Essence burst added to the wallet. */
  essence: number;
  /** Extra dice awarded (applied on top of any ambient dice delta). */
  dice: number;
  /** Reward-bar progress delta (same units as feed-tile progress). */
  rewardBarProgress: number;
}

/**
 * Baseline payout for a single bonus release. These numbers are the island-1
 * floor; callers should multiply by `getIslandEssenceMultiplier(effectiveIslandNumber)`
 * (see `islandRunContractV2EssenceBuild`) before awarding so late-game releases
 * scale with the rest of the economy. We keep the raw numbers tiny here so
 * renaming/retuning is a one-line change.
 */
export const BONUS_BASE_RELEASE_PAYOUT: Readonly<BonusTileReleasePayout> = {
  essence: 80,
  dice: 4,
  rewardBarProgress: 5,
};

export interface ApplyBonusTileChargeInput {
  /** Current ledger. `null`/`undefined` is treated as "no charges yet". */
  bonusTileChargeByIsland: BonusTileChargeByIsland | null | undefined;
  /** Island whose bonus tile was landed on. Non-finite values → no-op. */
  islandNumber: number;
  /** Ring tile index that was landed on. Negative or non-finite → no-op. */
  tileIndex: number;
}

export interface ApplyBonusTileChargeResult {
  /** The next ledger map, ready to persist. Always a fresh reference on any
   *  state change; returned as `null` only when the input was invalid. */
  bonusTileChargeByIsland: BonusTileChargeByIsland;
  /** Charge on the tile AFTER this landing (0 when released, otherwise 1..8). */
  chargeAfter: number;
  /** True when this landing triggered the 9th-hit release. */
  released: boolean;
  /** Non-null only when `released` is true. Caller applies it to the wallet. */
  payout: BonusTileReleasePayout | null;
}

/**
 * Read the current charge (0..8) for a bonus tile on a given island. Returns 0
 * when the map or entry is missing, when the value is not a finite integer,
 * when the tile index is negative, or when a malformed value has crept in.
 */
export function getBonusTileCharge(
  bonusTileChargeByIsland: BonusTileChargeByIsland | null | undefined,
  islandNumber: number,
  tileIndex: number,
): number {
  if (!bonusTileChargeByIsland || typeof bonusTileChargeByIsland !== 'object') return 0;
  const perIsland = bonusTileChargeByIsland[String(islandNumber)];
  if (!perIsland || typeof perIsland !== 'object') return 0;
  const raw = perIsland[tileIndex];
  if (typeof raw !== 'number' || !Number.isFinite(raw)) return 0;
  const normalized = Math.floor(raw);
  if (normalized < 0) return 0;
  if (normalized > BONUS_CHARGE_TARGET) return BONUS_CHARGE_TARGET;
  return normalized;
}

/**
 * Apply a single bonus-tile landing and return the next ledger state.
 *
 * - If the tile was at 0..7 charges, increments by 1. No release.
 * - If the tile was at 8 (primed), this landing releases the payout and the
 *   counter resets to 0.
 * - Invalid tile indices or non-integer island numbers leave state unchanged
 *   (still returns a fresh map so callers can treat the result uniformly).
 *
 * The function never mutates its inputs — it returns a new top-level map and
 * a new inner map on the affected island key.
 */
export function applyBonusTileCharge(input: ApplyBonusTileChargeInput): ApplyBonusTileChargeResult {
  const { bonusTileChargeByIsland, islandNumber, tileIndex } = input;

  // Deep-clone the ledger shape we're about to mutate so callers can treat the
  // result as immutable (same pattern as the stop-ticket service).
  const nextMap: BonusTileChargeByIsland = {};
  if (bonusTileChargeByIsland && typeof bonusTileChargeByIsland === 'object') {
    for (const [islandKey, innerRaw] of Object.entries(bonusTileChargeByIsland)) {
      if (!innerRaw || typeof innerRaw !== 'object') continue;
      const innerCopy: Record<number, number> = {};
      for (const [idxKey, chargeRaw] of Object.entries(innerRaw)) {
        const idx = Number(idxKey);
        if (!Number.isFinite(idx)) continue;
        if (typeof chargeRaw !== 'number' || !Number.isFinite(chargeRaw)) continue;
        const normalized = Math.max(0, Math.min(BONUS_CHARGE_TARGET, Math.floor(chargeRaw)));
        if (normalized > 0) innerCopy[idx] = normalized;
      }
      if (Object.keys(innerCopy).length > 0) nextMap[islandKey] = innerCopy;
    }
  }

  const safeIsland = Number.isFinite(islandNumber) ? Math.floor(islandNumber) : NaN;
  const safeTileIndex = Number.isFinite(tileIndex) ? Math.floor(tileIndex) : NaN;
  if (!Number.isFinite(safeIsland) || !Number.isFinite(safeTileIndex) || safeTileIndex < 0) {
    return {
      bonusTileChargeByIsland: nextMap,
      chargeAfter: 0,
      released: false,
      payout: null,
    };
  }

  const islandKey = String(safeIsland);
  const currentIsland = nextMap[islandKey] ?? {};
  const chargeBefore = getBonusTileCharge(nextMap, safeIsland, safeTileIndex);

  // Primed tile → this landing releases.
  if (chargeBefore >= BONUS_CHARGE_TARGET) {
    const innerNext = { ...currentIsland };
    delete innerNext[safeTileIndex];
    if (Object.keys(innerNext).length > 0) {
      nextMap[islandKey] = innerNext;
    } else {
      delete nextMap[islandKey];
    }
    return {
      bonusTileChargeByIsland: nextMap,
      chargeAfter: 0,
      released: true,
      payout: { ...BONUS_BASE_RELEASE_PAYOUT },
    };
  }

  // Otherwise increment by 1.
  const chargeAfter = chargeBefore + 1;
  nextMap[islandKey] = { ...currentIsland, [safeTileIndex]: chargeAfter };
  return {
    bonusTileChargeByIsland: nextMap,
    chargeAfter,
    released: false,
    payout: null,
  };
}

/**
 * Reset all bonus-tile charges for a given island — called on island travel
 * (new island = fresh ring, fresh charges). Mirrors the pattern used by
 * `stopTicketsPaidByIsland` at island travel.
 */
export function resetBonusTileChargeForIsland(
  bonusTileChargeByIsland: BonusTileChargeByIsland | null | undefined,
  islandNumber: number,
): BonusTileChargeByIsland {
  const nextMap: BonusTileChargeByIsland = {};
  if (!bonusTileChargeByIsland || typeof bonusTileChargeByIsland !== 'object') return nextMap;
  const targetKey = String(Math.floor(islandNumber));
  for (const [islandKey, inner] of Object.entries(bonusTileChargeByIsland)) {
    if (islandKey === targetKey) continue;
    if (!inner || typeof inner !== 'object') continue;
    nextMap[islandKey] = { ...inner };
  }
  return nextMap;
}

/**
 * Remove malformed entries and clamp values to `[0, BONUS_CHARGE_TARGET]`. Safe
 * to call on every hydration; callers may also omit it if they trust the
 * source, since `applyBonusTileCharge` and `getBonusTileCharge` both sanitize
 * inline.
 */
export function sanitizeBonusTileChargeByIsland(
  bonusTileChargeByIsland: BonusTileChargeByIsland | null | undefined,
): BonusTileChargeByIsland {
  const nextMap: BonusTileChargeByIsland = {};
  if (!bonusTileChargeByIsland || typeof bonusTileChargeByIsland !== 'object') return nextMap;
  for (const [islandKey, innerRaw] of Object.entries(bonusTileChargeByIsland)) {
    if (!innerRaw || typeof innerRaw !== 'object') continue;
    const innerCopy: Record<number, number> = {};
    for (const [idxKey, chargeRaw] of Object.entries(innerRaw)) {
      const idx = Number(idxKey);
      if (!Number.isFinite(idx) || idx < 0) continue;
      if (typeof chargeRaw !== 'number' || !Number.isFinite(chargeRaw)) continue;
      const normalized = Math.max(0, Math.min(BONUS_CHARGE_TARGET, Math.floor(chargeRaw)));
      if (normalized > 0) innerCopy[Math.floor(idx)] = normalized;
    }
    if (Object.keys(innerCopy).length > 0) nextMap[islandKey] = innerCopy;
  }
  return nextMap;
}
