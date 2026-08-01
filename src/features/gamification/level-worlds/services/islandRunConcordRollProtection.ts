import {
  listIslandTechnologyFragmentPlacements,
  type IslandTechnologyFragmentPlacement,
} from './islandTechnologyFragmentPlacements';

export const CONCORD_SOFT_PITY_MISS_ROLLS = 7;
export const CONCORD_HARD_PITY_MISS_ROLLS = 10;
export const CONCORD_COMPLETION_ROLL_CAP = 55;

/**
 * Minimum Concord progress checkpoints for a fresh Island 1 run. Normal
 * landings can put the player ahead of this curve; the protection only steps
 * in when they fall behind it.
 */
export const CONCORD_COLLECTION_ROLL_SCHEDULE = Object.freeze([
  { roll: 3, minimumCollected: 1 },
  { roll: 16, minimumCollected: 2 },
  { roll: 22, minimumCollected: 3 },
  { roll: 28, minimumCollected: 4 },
  { roll: 34, minimumCollected: 5 },
  { roll: 40, minimumCollected: 6 },
  { roll: 45, minimumCollected: 7 },
  { roll: 50, minimumCollected: 8 },
  { roll: CONCORD_COMPLETION_ROLL_CAP, minimumCollected: 9 },
] as const);

export type ConcordRollProtectionState = {
  rollsTaken: number;
  rollsSinceFragment: number;
};

export type ConcordFragmentPickupReason =
  | 'natural_landing'
  | 'resonance_crossing'
  | 'signal_lock'
  | 'completion_schedule';

export type ConcordFragmentPickup = IslandTechnologyFragmentPlacement & {
  reason: ConcordFragmentPickupReason;
};

export type ConcordRollProtectionResult = {
  state: ConcordRollProtectionState;
  pickup: ConcordFragmentPickup | null;
};

const EMPTY_STATE: ConcordRollProtectionState = Object.freeze({
  rollsTaken: 0,
  rollsSinceFragment: 0,
});

function clampCount(value: unknown, max = Number.MAX_SAFE_INTEGER): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(max, Math.floor(value)));
}

export function sanitizeConcordRollProtectionState(value: unknown): ConcordRollProtectionState {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return { ...EMPTY_STATE };
  const candidate = value as Partial<ConcordRollProtectionState>;
  return {
    rollsTaken: clampCount(candidate.rollsTaken),
    rollsSinceFragment: clampCount(candidate.rollsSinceFragment, CONCORD_HARD_PITY_MISS_ROLLS),
  };
}

function normalizeCollectedSlots(values: readonly number[]): Set<number> {
  return new Set(
    values
      .map((value) => Math.floor(value))
      .filter((value) => Number.isFinite(value) && value >= 0 && value < 9),
  );
}

export function resolveConcordMinimumCollectedAtRoll(rollsTaken: number): number {
  const normalizedRolls = clampCount(rollsTaken);
  let minimumCollected = 0;
  for (const checkpoint of CONCORD_COLLECTION_ROLL_SCHEDULE) {
    if (normalizedRolls < checkpoint.roll) break;
    minimumCollected = checkpoint.minimumCollected;
  }
  return minimumCollected;
}

/**
 * Existing Island 1 saves predate roll tracking. We cannot reconstruct their
 * exact history, so place them on the checkpoint matching their current grid
 * and seed the soft-pity window. That protects an established run without
 * dumping several fragments into the first post-upgrade roll.
 */
export function resolveInitialConcordRollProtectionState(
  collectedSlots: readonly number[],
): ConcordRollProtectionState {
  const collectedCount = normalizeCollectedSlots(collectedSlots).size;
  if (collectedCount <= 0) return { ...EMPTY_STATE };
  if (collectedCount >= 9) {
    return { rollsTaken: CONCORD_COMPLETION_ROLL_CAP, rollsSinceFragment: 0 };
  }
  const matchingCheckpoint = CONCORD_COLLECTION_ROLL_SCHEDULE.find(
    (checkpoint) => checkpoint.minimumCollected === collectedCount,
  );
  return {
    rollsTaken: matchingCheckpoint?.roll ?? 0,
    rollsSinceFragment: CONCORD_SOFT_PITY_MISS_ROLLS - 1,
  };
}

function firstCrossedPlacement(
  hopSequence: readonly number[],
  remaining: readonly IslandTechnologyFragmentPlacement[],
): IslandTechnologyFragmentPlacement | null {
  const remainingByTile = new Map(remaining.map((placement) => [placement.tileIndex, placement]));
  for (const tileIndex of hopSequence) {
    const placement = remainingByTile.get(tileIndex);
    if (placement) return placement;
  }
  return null;
}

function nearestForwardPlacement(
  landingTileIndex: number,
  tileCount: number,
  remaining: readonly IslandTechnologyFragmentPlacement[],
): IslandTechnologyFragmentPlacement | null {
  const safeTileCount = Math.max(1, Math.floor(tileCount));
  const normalizedLanding = ((Math.floor(landingTileIndex) % safeTileCount) + safeTileCount) % safeTileCount;
  return remaining.reduce<IslandTechnologyFragmentPlacement | null>((nearest, placement) => {
    if (!nearest) return placement;
    const placementDistance = (placement.tileIndex - normalizedLanding + safeTileCount) % safeTileCount;
    const nearestDistance = (nearest.tileIndex - normalizedLanding + safeTileCount) % safeTileCount;
    return placementDistance < nearestDistance ? placement : nearest;
  }, null);
}

export function resolveConcordRollProtection(options: {
  islandNumber: number;
  tileCount: number;
  landingTileIndex: number;
  hopSequence: readonly number[];
  collectedSlots: readonly number[];
  state: ConcordRollProtectionState;
}): ConcordRollProtectionResult {
  const currentState = sanitizeConcordRollProtectionState(options.state);
  const collected = normalizeCollectedSlots(options.collectedSlots);
  const placements = listIslandTechnologyFragmentPlacements(options.islandNumber);
  const remaining = placements.filter((placement) => !collected.has(placement.fragmentSlot));

  if (Math.floor(options.islandNumber) !== 1 || remaining.length === 0) {
    return { state: currentState, pickup: null };
  }

  const rollsTaken = currentState.rollsTaken + 1;
  const rollsSinceFragment = currentState.rollsSinceFragment + 1;
  const natural = remaining.find((placement) => placement.tileIndex === Math.floor(options.landingTileIndex)) ?? null;
  if (natural) {
    return {
      state: { rollsTaken, rollsSinceFragment: 0 },
      pickup: { ...natural, reason: 'natural_landing' },
    };
  }

  const crossed = firstCrossedPlacement(options.hopSequence, remaining);
  if (rollsSinceFragment >= CONCORD_SOFT_PITY_MISS_ROLLS && crossed) {
    return {
      state: { rollsTaken, rollsSinceFragment: 0 },
      pickup: { ...crossed, reason: 'resonance_crossing' },
    };
  }

  if (rollsSinceFragment >= CONCORD_HARD_PITY_MISS_ROLLS) {
    const target = nearestForwardPlacement(options.landingTileIndex, options.tileCount, remaining);
    return {
      state: { rollsTaken, rollsSinceFragment: 0 },
      pickup: target ? { ...target, reason: 'signal_lock' } : null,
    };
  }

  const minimumCollected = resolveConcordMinimumCollectedAtRoll(rollsTaken);
  if (collected.size < minimumCollected) {
    const target = crossed ?? nearestForwardPlacement(options.landingTileIndex, options.tileCount, remaining);
    return {
      state: { rollsTaken, rollsSinceFragment: 0 },
      pickup: target ? { ...target, reason: 'completion_schedule' } : null,
    };
  }

  return {
    state: { rollsTaken, rollsSinceFragment },
    pickup: null,
  };
}

export function mergeConcordRollProtectionState(
  remote: ConcordRollProtectionState,
  local: ConcordRollProtectionState,
): ConcordRollProtectionState {
  const safeRemote = sanitizeConcordRollProtectionState(remote);
  const safeLocal = sanitizeConcordRollProtectionState(local);
  if (safeLocal.rollsTaken > safeRemote.rollsTaken) return safeLocal;
  if (safeRemote.rollsTaken > safeLocal.rollsTaken) return safeRemote;
  return {
    rollsTaken: safeLocal.rollsTaken,
    // A reset to zero means one side already observed a pickup on this roll.
    rollsSinceFragment: Math.min(safeLocal.rollsSinceFragment, safeRemote.rollsSinceFragment),
  };
}
