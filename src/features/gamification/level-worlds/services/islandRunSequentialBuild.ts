import type { IslandRunContractV2BuildState } from './islandRunContractV2EssenceBuild';
import { MAX_BUILD_LEVEL } from './islandRunContractV2EssenceBuild';

export type IslandRunSequentialBuildStopId = 'hatchery' | 'habit' | 'mystery' | 'wisdom' | 'boss';
export type IslandRunSequentialBuildTargetLevel = 1 | 2 | 3;
export type IslandRunSequentialBuildPartNumber = 1 | 2 | 3 | 4 | 5;
export type IslandRunSequentialBuildPartStatus = 'complete' | 'active' | 'locked';

export type IslandRunSequentialBuildTarget = {
  stopIndex: number;
  stopId: IslandRunSequentialBuildStopId;
  targetLevel: IslandRunSequentialBuildTargetLevel;
  sequencePosition: number;
  totalSequenceSteps: 15;
};

export type IslandRunSequentialBuildPartState = {
  partNumber: IslandRunSequentialBuildPartNumber;
  status: IslandRunSequentialBuildPartStatus;
  thresholdEssence: number;
  remainingEssence: number;
};

export type IslandRunSequentialBuildView = {
  isFullyBuilt: boolean;
  activeTarget: IslandRunSequentialBuildTarget | null;
  nextTarget: IslandRunSequentialBuildTarget | null;
  completedSequenceSteps: number;
  completedRounds: number;
  currentRound: IslandRunSequentialBuildTargetLevel | null;
  spentEssence: number;
  requiredEssence: number;
  progressRatio: number;
  completedParts: number;
  activePart: IslandRunSequentialBuildPartNumber | null;
  parts: IslandRunSequentialBuildPartState[];
};

export type IslandRunSequentialBuildLockReason =
  | 'not_active_target'
  | 'already_fully_built'
  | 'all_builds_complete';

const CANONICAL_STOP_COUNT = 5;
const TOTAL_SEQUENCE_STEPS = 15 as const;
const PART_COUNT = 5;
const STOP_IDS: readonly IslandRunSequentialBuildStopId[] = ['hatchery', 'habit', 'mystery', 'wisdom', 'boss'];

/**
 * Sequential build order is derived from existing per-stop build state only.
 * This module persists no active target, performs no gameplay writes, and never
 * redistributes uneven/parallel legacy progress; later landmarks that are ahead
 * remain untouched until the canonical sequence reaches them.
 */
export function resolveIslandRunSequentialBuildTarget(
  stopBuildStateByIndex: ReadonlyArray<IslandRunContractV2BuildState | null | undefined>,
): IslandRunSequentialBuildTarget | null {
  const states = normalizeSequentialBuildStates(stopBuildStateByIndex);
  for (let targetLevel = 1; targetLevel <= MAX_BUILD_LEVEL; targetLevel += 1) {
    for (let stopIndex = 0; stopIndex < CANONICAL_STOP_COUNT; stopIndex += 1) {
      if (states[stopIndex].buildLevel < targetLevel) {
        return makeSequentialBuildTarget(stopIndex, targetLevel as IslandRunSequentialBuildTargetLevel);
      }
    }
  }
  return null;
}

export function deriveIslandRunSequentialBuildView(
  stopBuildStateByIndex: ReadonlyArray<IslandRunContractV2BuildState | null | undefined>,
): IslandRunSequentialBuildView {
  const states = normalizeSequentialBuildStates(stopBuildStateByIndex);
  const activeTarget = resolveIslandRunSequentialBuildTarget(states);
  const completedRounds = countCompletedSequentialBuildRounds(states);

  if (!activeTarget) {
    return {
      isFullyBuilt: true,
      activeTarget: null,
      nextTarget: null,
      completedSequenceSteps: TOTAL_SEQUENCE_STEPS,
      completedRounds,
      currentRound: null,
      spentEssence: 0,
      requiredEssence: 0,
      progressRatio: 1,
      completedParts: PART_COUNT,
      activePart: null,
      parts: deriveIslandRunSequentialBuildParts({ requiredEssence: 0, spentEssence: 0 }),
    };
  }

  const activeState = states[activeTarget.stopIndex];
  const parts = deriveIslandRunSequentialBuildParts(activeState);
  const activePart = parts.find((part) => part.status === 'active')?.partNumber ?? null;
  const completedParts = parts.filter((part) => part.status === 'complete').length;
  const requiredEssence = normalizeNonNegativeInteger(activeState.requiredEssence);
  const spentEssence = normalizeNonNegativeInteger(activeState.spentEssence);

  return {
    isFullyBuilt: false,
    activeTarget,
    nextTarget: getNextSequentialBuildTarget(activeTarget),
    completedSequenceSteps: activeTarget.sequencePosition - 1,
    completedRounds,
    currentRound: activeTarget.targetLevel,
    spentEssence,
    requiredEssence,
    progressRatio: requiredEssence > 0 ? Math.min(1, spentEssence / requiredEssence) : 0,
    completedParts,
    activePart,
    parts,
  };
}

/**
 * Five construction portions are visual cumulative Essence thresholds over the
 * active target's numeric progress. They are derived display state only.
 */
export function deriveIslandRunSequentialBuildParts(options: {
  requiredEssence: number;
  spentEssence: number;
}): IslandRunSequentialBuildPartState[] {
  const requiredEssence = normalizeNonNegativeInteger(options.requiredEssence);
  const spentEssence = normalizeNonNegativeInteger(options.spentEssence);
  let activePartAssigned = false;

  return Array.from({ length: PART_COUNT }, (_, index) => {
    const partNumber = (index + 1) as IslandRunSequentialBuildPartNumber;
    const thresholdEssence = requiredEssence > 0 ? Math.ceil((requiredEssence * partNumber) / PART_COUNT) : 0;
    const isComplete = requiredEssence <= 0 || spentEssence >= thresholdEssence;
    let status: IslandRunSequentialBuildPartStatus = 'locked';
    if (isComplete) {
      status = 'complete';
    } else if (!activePartAssigned) {
      status = 'active';
      activePartAssigned = true;
    }

    return {
      partNumber,
      status,
      thresholdEssence,
      remainingEssence: Math.max(0, thresholdEssence - spentEssence),
    };
  });
}

export function getIslandRunSequentialBuildLockReason(
  requestedStopIndex: number,
  stopBuildStateByIndex: ReadonlyArray<IslandRunContractV2BuildState | null | undefined>,
): IslandRunSequentialBuildLockReason | null {
  const states = normalizeSequentialBuildStates(stopBuildStateByIndex);
  const activeTarget = resolveIslandRunSequentialBuildTarget(states);
  if (!activeTarget) return 'all_builds_complete';

  const normalizedStopIndex = Number.isFinite(requestedStopIndex) ? Math.floor(requestedStopIndex) : -1;
  if (normalizedStopIndex === activeTarget.stopIndex) return null;
  if (normalizedStopIndex >= 0 && normalizedStopIndex < CANONICAL_STOP_COUNT && states[normalizedStopIndex].buildLevel >= MAX_BUILD_LEVEL) {
    return 'already_fully_built';
  }
  return 'not_active_target';
}

export function canBuildIslandRunSequentialTarget(
  requestedStopIndex: number,
  stopBuildStateByIndex: ReadonlyArray<IslandRunContractV2BuildState | null | undefined>,
): boolean {
  return getIslandRunSequentialBuildLockReason(requestedStopIndex, stopBuildStateByIndex) === null;
}

function getNextSequentialBuildTarget(target: IslandRunSequentialBuildTarget): IslandRunSequentialBuildTarget | null {
  if (target.sequencePosition >= TOTAL_SEQUENCE_STEPS) return null;
  const zeroBasedPosition = target.sequencePosition;
  const nextLevel = Math.floor(zeroBasedPosition / CANONICAL_STOP_COUNT) + 1;
  const nextStopIndex = zeroBasedPosition % CANONICAL_STOP_COUNT;
  return makeSequentialBuildTarget(nextStopIndex, nextLevel as IslandRunSequentialBuildTargetLevel);
}

function makeSequentialBuildTarget(stopIndex: number, targetLevel: IslandRunSequentialBuildTargetLevel): IslandRunSequentialBuildTarget {
  return {
    stopIndex,
    stopId: STOP_IDS[stopIndex],
    targetLevel,
    sequencePosition: ((targetLevel - 1) * CANONICAL_STOP_COUNT) + stopIndex + 1,
    totalSequenceSteps: TOTAL_SEQUENCE_STEPS,
  };
}

function countCompletedSequentialBuildRounds(states: readonly IslandRunContractV2BuildState[]): number {
  let completedRounds = 0;
  for (let targetLevel = 1; targetLevel <= MAX_BUILD_LEVEL; targetLevel += 1) {
    if (states.every((state) => state.buildLevel >= targetLevel)) {
      completedRounds += 1;
    }
  }
  return completedRounds;
}

function normalizeSequentialBuildStates(
  stopBuildStateByIndex: ReadonlyArray<IslandRunContractV2BuildState | null | undefined>,
): IslandRunContractV2BuildState[] {
  return Array.from({ length: CANONICAL_STOP_COUNT }, (_, stopIndex) => {
    const state = stopBuildStateByIndex[stopIndex];
    return {
      requiredEssence: normalizeNonNegativeInteger(state?.requiredEssence),
      spentEssence: normalizeNonNegativeInteger(state?.spentEssence),
      buildLevel: Math.min(MAX_BUILD_LEVEL, normalizeNonNegativeInteger(state?.buildLevel)),
    };
  });
}

function normalizeNonNegativeInteger(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
}
