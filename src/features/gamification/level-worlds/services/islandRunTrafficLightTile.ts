import type { BonusTileChargeByIsland } from './islandRunBonusTile';
import { getBonusTileCharge } from './islandRunBonusTile';
import { STICKER_FRAGMENTS_PER_STICKER } from './islandRunContractV2RewardBar';

// Bottom-centre tile of the ring. On the 36-tile ring index 19 sits at ~6
// o'clock (was index 21 on the 40-tile ring). Chosen to avoid colliding with
// the landmark-door indices (5/14/23/32) and the fraction-derived feature
// tiles (build_discount/free_ticket/card/encounter).
export const TRAFFIC_LIGHT_TILE_INDEX = 19;
export const TRAFFIC_LIGHT_CHARGE_TARGET = 8;

export type TrafficLightCoinSide = 'heads' | 'tails';
export type TrafficLightMysteryBoxId = 'box_1' | 'box_2';

export interface TrafficLightPassResult {
  bonusTileChargeByIsland: BonusTileChargeByIsland;
  chargeAfter: number;
  unlocked: boolean;
}

export interface TrafficLightCoinFlipReward {
  side: TrafficLightCoinSide;
  boxId: TrafficLightMysteryBoxId;
  label: string;
  dice: number;
  essence: number;
  stickerFragments: number;
  /** Progress contributed toward the active timed event's reward bar (see islandRunContractV2RewardBar.ts). */
  rewardBarProgress: number;
  /** Tickets granted for the active timed event's minigame, range 1-5. */
  minigameTickets: number;
}

const MIN_MINIGAME_TICKETS = 1;
const MAX_MINIGAME_TICKETS = 5;

function seededRandom(seed: number): number {
  let s = (seed | 0) || 1;
  s ^= s << 13;
  s ^= s >> 17;
  s ^= s << 5;
  return ((s >>> 0) % 100000) / 100000;
}

function cloneBonusLedger(input: BonusTileChargeByIsland | null | undefined): BonusTileChargeByIsland {
  const next: BonusTileChargeByIsland = {};
  if (!input || typeof input !== 'object') return next;
  for (const [islandKey, innerRaw] of Object.entries(input)) {
    if (!innerRaw || typeof innerRaw !== 'object') continue;
    const inner: Record<number, number> = {};
    for (const [tileKey, raw] of Object.entries(innerRaw)) {
      const tileIndex = Number(tileKey);
      if (!Number.isFinite(tileIndex) || typeof raw !== 'number' || !Number.isFinite(raw)) continue;
      const normalized = Math.max(0, Math.min(TRAFFIC_LIGHT_CHARGE_TARGET, Math.floor(raw)));
      if (normalized > 0) inner[tileIndex] = normalized;
    }
    if (Object.keys(inner).length > 0) next[islandKey] = inner;
  }
  return next;
}

export function getTrafficLightCharge(
  bonusTileChargeByIsland: BonusTileChargeByIsland | null | undefined,
  islandNumber: number,
): number {
  return Math.max(0, Math.min(
    TRAFFIC_LIGHT_CHARGE_TARGET,
    getBonusTileCharge(bonusTileChargeByIsland, islandNumber, TRAFFIC_LIGHT_TILE_INDEX),
  ));
}

export function applyTrafficLightPass(input: {
  bonusTileChargeByIsland: BonusTileChargeByIsland | null | undefined;
  islandNumber: number;
}): TrafficLightPassResult {
  const next = cloneBonusLedger(input.bonusTileChargeByIsland);
  const safeIsland = Number.isFinite(input.islandNumber) ? Math.floor(input.islandNumber) : NaN;
  if (!Number.isFinite(safeIsland)) {
    return { bonusTileChargeByIsland: next, chargeAfter: 0, unlocked: false };
  }

  const islandKey = String(safeIsland);
  const currentIsland = next[islandKey] ?? {};
  const chargeBefore = getTrafficLightCharge(next, safeIsland);
  const chargeAfter = chargeBefore + 1;

  if (chargeAfter >= TRAFFIC_LIGHT_CHARGE_TARGET) {
    const innerNext = { ...currentIsland };
    delete innerNext[TRAFFIC_LIGHT_TILE_INDEX];
    if (Object.keys(innerNext).length > 0) next[islandKey] = innerNext;
    else delete next[islandKey];
    return { bonusTileChargeByIsland: next, chargeAfter: TRAFFIC_LIGHT_CHARGE_TARGET, unlocked: true };
  }

  next[islandKey] = { ...currentIsland, [TRAFFIC_LIGHT_TILE_INDEX]: chargeAfter };
  return { bonusTileChargeByIsland: next, chargeAfter, unlocked: false };
}

export function resolveTrafficLightCoinFlipReward(input: {
  seed: number;
  stickerFragments: number;
}): TrafficLightCoinFlipReward {
  const side: TrafficLightCoinSide = seededRandom(input.seed) < 0.5 ? 'heads' : 'tails';

  // Only ever offer puzzle pieces when the player is actually missing some —
  // never top off a full sticker. When exactly one is missing, grant two
  // (rather than exactly one) so the reward always overflows into the next
  // sticker instead of landing on a flat, unexciting "just enough" claim.
  const missingFragments = Math.max(
    0,
    Math.min(STICKER_FRAGMENTS_PER_STICKER, STICKER_FRAGMENTS_PER_STICKER - Math.max(0, Math.floor(input.stickerFragments))),
  );
  const grantsPuzzlePieces = missingFragments > 0 && seededRandom(input.seed + 7919) < 0.35;

  const minigameTickets = MIN_MINIGAME_TICKETS
    + Math.floor(seededRandom(input.seed + 104729) * (MAX_MINIGAME_TICKETS - MIN_MINIGAME_TICKETS + 1));

  if (side === 'heads') {
    return {
      side,
      boxId: 'box_1',
      label: 'Mystery Box 1',
      dice: 8,
      essence: 35,
      stickerFragments: grantsPuzzlePieces ? 2 : 0,
      rewardBarProgress: 3,
      minigameTickets,
    };
  }

  return {
    side,
    boxId: 'box_2',
    label: 'Mystery Box 2',
    dice: 4,
    essence: 70,
    stickerFragments: grantsPuzzlePieces ? 2 : 0,
    rewardBarProgress: 3,
    minigameTickets,
  };
}
