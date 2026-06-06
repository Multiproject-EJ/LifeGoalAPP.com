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

const DOOR_COUNT = 9;
const REQUIRED_PICK_COUNT = 3;
const MAX_REWARD_BUILD_COST_RATIO = 0.2;

export const DORMANT_DOOR_WINNING_LINES: readonly (readonly number[])[] = Object.freeze([
  Object.freeze([0, 1, 2]),
  Object.freeze([3, 4, 5]),
  Object.freeze([6, 7, 8]),
  Object.freeze([0, 3, 6]),
  Object.freeze([1, 4, 7]),
  Object.freeze([2, 5, 8]),
  Object.freeze([0, 4, 8]),
  Object.freeze([2, 4, 6]),
]);

const DORMANT_DOOR_ROW_LINES: readonly (readonly number[])[] = Object.freeze([
  Object.freeze([0, 1, 2]),
  Object.freeze([3, 4, 5]),
  Object.freeze([6, 7, 8]),
]);

const DORMANT_DOOR_COLUMN_LINES: readonly (readonly number[])[] = Object.freeze([
  Object.freeze([0, 3, 6]),
  Object.freeze([1, 4, 7]),
  Object.freeze([2, 5, 8]),
]);

const DORMANT_DOOR_PRIZE_ORDER: readonly DormantDoorFigure[] = Object.freeze(['small', 'medium', 'large']);

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

function pickPrizeLines(seed: number): readonly (readonly number[])[] {
  const lineSet = seededRandom(seed + 131) >= 0.5 ? DORMANT_DOOR_COLUMN_LINES : DORMANT_DOOR_ROW_LINES;
  return shuffleDeterministically(lineSet, seed + 409);
}

function findCompletedLine(selectedIndices: readonly number[]): readonly number[] | null {
  const selected = new Set(selectedIndices.slice(0, REQUIRED_PICK_COUNT));
  if (selected.size < REQUIRED_PICK_COUNT) return null;
  return DORMANT_DOOR_WINNING_LINES.find((line) => line.every((index) => selected.has(index))) ?? null;
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

  const figures: DormantDoorFigure[] = Array.from({ length: DOOR_COUNT }, () => 'small');
  const prizeLines = pickPrizeLines(seed);
  const prizeOrder = shuffleDeterministically(DORMANT_DOOR_PRIZE_ORDER, seed + 811);
  prizeLines.forEach((line, lineIndex) => {
    const figure = prizeOrder[lineIndex] ?? 'small';
    for (const index of line) figures[index] = figure;
  });

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
  selectedIndices: readonly number[] = [],
  rewardLevels: readonly DormantDoorRewardLevel[] = DORMANT_DOOR_REWARD_LEVELS,
): DormantDoorRewardLevel {
  const normalizedFigures = selectedFigures.slice(0, REQUIRED_PICK_COUNT);
  const completedLine = findCompletedLine(selectedIndices);
  if (!completedLine) return rewardForTier(rewardLevels, 'small');

  const [firstFigure] = normalizedFigures;
  const isSamePrizeLine = Boolean(firstFigure) && normalizedFigures.length === REQUIRED_PICK_COUNT
    && normalizedFigures.every((figure) => figure === firstFigure);
  if (!isSamePrizeLine || !firstFigure) return rewardForTier(rewardLevels, 'small');

  return rewardForTier(rewardLevels, FIGURE_TO_TIER[firstFigure]);
}
