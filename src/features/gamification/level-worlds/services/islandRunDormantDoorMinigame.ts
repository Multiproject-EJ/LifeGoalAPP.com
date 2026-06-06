import { getIslandTotalEssenceCost } from './islandRunContractV2EssenceBuild';
import type { IslandLandmarkDoorStopId } from './islandBoardTileMap';

export type DormantDoorFigure = 'small' | 'medium' | 'large';

export type DormantDoorRewardTier = 'small' | 'medium' | 'jackpot';

export interface DormantDoorMiniGameDoor {
  id: string;
  figure: DormantDoorFigure;
}

export interface DormantDoorRewardLevel {
  tier: DormantDoorRewardTier;
  label: string;
  essence: number;
  dice: number;
}

export interface DormantDoorMiniGameState {
  doorStopId: IslandLandmarkDoorStopId;
  tileIndex: number;
  doors: DormantDoorMiniGameDoor[];
  rewardLevels: readonly DormantDoorRewardLevel[];
}

const BOARD_SIZE = 4;
const DOOR_COUNT = BOARD_SIZE * BOARD_SIZE;
const REQUIRED_MATCH_COUNT = 3;
const MAX_REWARD_BUILD_COST_RATIO = 0.2;

const DORMANT_DOOR_PRIZE_ORDER: readonly DormantDoorFigure[] = Object.freeze(['small', 'medium', 'large']);
const DORMANT_DOOR_BOARD_PRIZE_POOL: readonly DormantDoorFigure[] = Object.freeze([
  'small', 'small', 'small', 'small', 'small', 'small', 'small',
  'medium', 'medium', 'medium', 'medium', 'medium',
  'large', 'large', 'large', 'large',
]);

export function resolveDormantDoorRewardLevels(input?: {
  effectiveIslandNumber?: number;
  remainingIslandBuildCost?: number;
}): readonly DormantDoorRewardLevel[] {
  const effectiveIslandNumber = Number.isFinite(input?.effectiveIslandNumber)
    ? Math.max(1, Math.floor(input?.effectiveIslandNumber ?? 1))
    : 1;
  const totalBuildCost = getIslandTotalEssenceCost(effectiveIslandNumber);
  const remainingBuildCost = Number.isFinite(input?.remainingIslandBuildCost)
    ? Math.max(0, Math.floor(input?.remainingIslandBuildCost ?? 0))
    : 0;
  const rewardBasis = Math.max(1, remainingBuildCost || totalBuildCost);
  const jackpotEssence = Math.max(5, Math.floor(rewardBasis * MAX_REWARD_BUILD_COST_RATIO));
  const mediumEssence = Math.max(3, Math.floor(jackpotEssence * 0.5));
  const smallEssence = Math.max(1, Math.floor(jackpotEssence * 0.2));

  return Object.freeze([
    { tier: 'small', label: 'Small prize', essence: smallEssence, dice: 0 },
    { tier: 'medium', label: 'Medium prize', essence: mediumEssence, dice: 0 },
    { tier: 'jackpot', label: 'Large prize', essence: jackpotEssence, dice: 0 },
  ]);
}

export const DORMANT_DOOR_REWARD_LEVELS: readonly DormantDoorRewardLevel[] = resolveDormantDoorRewardLevels({
  effectiveIslandNumber: 1,
});

const FIGURE_TO_TIER: Readonly<Record<DormantDoorFigure, DormantDoorRewardTier>> = Object.freeze({
  small: 'small',
  medium: 'medium',
  large: 'jackpot',
});

function seededRandom(seed: number): number {
  let s = (seed | 0) || 1;
  s ^= s << 13;
  s ^= s >> 17;
  s ^= s << 5;
  return ((s >>> 0) % 100000) / 100000;
}

function shuffleDeterministically<T>(items: readonly T[], seed: number): T[] {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index--) {
    const swapIndex = Math.floor(seededRandom(seed + index * 97) * (index + 1));
    [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
  }
  return result;
}

function findMatchedFigure(selectedFigures: readonly DormantDoorFigure[]): DormantDoorFigure | null {
  const counts = new Map<DormantDoorFigure, number>();
  for (const figure of selectedFigures) {
    counts.set(figure, (counts.get(figure) ?? 0) + 1);
  }

  for (const figure of [...DORMANT_DOOR_PRIZE_ORDER].reverse()) {
    if ((counts.get(figure) ?? 0) >= REQUIRED_MATCH_COUNT) return figure;
  }
  return null;
}

function rewardForTier(rewardLevels: readonly DormantDoorRewardLevel[], tier: DormantDoorRewardTier): DormantDoorRewardLevel {
  return rewardLevels.find((level) => level.tier === tier) ?? rewardLevels[0] ?? DORMANT_DOOR_REWARD_LEVELS[0];
}

export function buildDormantDoorMiniGame(input: {
  islandNumber: number;
  tileIndex: number;
  rollIndex: number;
  doorStopId: IslandLandmarkDoorStopId;
  remainingIslandBuildCost?: number;
}): DormantDoorMiniGameState {
  const safeIsland = Number.isFinite(input.islandNumber) ? Math.max(1, Math.floor(input.islandNumber)) : 1;
  const safeTileIndex = Number.isFinite(input.tileIndex) ? Math.max(0, Math.floor(input.tileIndex)) : 0;
  const safeRollIndex = Number.isFinite(input.rollIndex) ? Math.max(0, Math.floor(input.rollIndex)) : 0;
  const seed = safeIsland * 1009 + safeTileIndex * 97 + safeRollIndex * 17 + input.doorStopId.length * 53;

  const figures = shuffleDeterministically(DORMANT_DOOR_BOARD_PRIZE_POOL, seed + 409).slice(0, DOOR_COUNT);

  return {
    doorStopId: input.doorStopId,
    tileIndex: safeTileIndex,
    rewardLevels: resolveDormantDoorRewardLevels({
      effectiveIslandNumber: safeIsland,
      remainingIslandBuildCost: input.remainingIslandBuildCost,
    }),
    doors: figures.slice(0, DOOR_COUNT).map((figure, index) => ({
      id: `dormant-door-${safeIsland}-${safeTileIndex}-${safeRollIndex}-${index}`,
      figure,
    })),
  };
}

export function resolveDormantDoorReward(
  selectedFigures: readonly DormantDoorFigure[],
  _selectedIndices: readonly number[] = [],
  rewardLevels: readonly DormantDoorRewardLevel[] = DORMANT_DOOR_REWARD_LEVELS,
): DormantDoorRewardLevel | null {
  const matchedFigure = findMatchedFigure(selectedFigures);
  if (!matchedFigure) return null;
  return rewardForTier(rewardLevels, FIGURE_TO_TIER[matchedFigure]);
}
