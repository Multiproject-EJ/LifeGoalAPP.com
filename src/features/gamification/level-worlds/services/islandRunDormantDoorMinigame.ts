import type { IslandLandmarkDoorStopId } from './islandBoardTileMap';

export type DormantDoorFigure = 'shell' | 'starfish' | 'pearl' | 'coral' | 'leaf' | 'moon';

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

const DORMANT_DOOR_FIGURES: readonly DormantDoorFigure[] = Object.freeze([
  'shell',
  'starfish',
  'pearl',
  'coral',
  'leaf',
  'moon',
]);

export const DORMANT_DOOR_REWARD_LEVELS: readonly DormantDoorRewardLevel[] = Object.freeze([
  { tier: 'small', label: 'Explorer find', essence: 3, dice: 0 },
  { tier: 'medium', label: 'Twin match', essence: 8, dice: 1 },
  { tier: 'jackpot', label: 'Triple match', essence: 15, dice: 3 },
]);

const DOOR_COUNT = 6;
const REQUIRED_PICK_COUNT = 3;

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

function pickFigure(seed: number, offset: number, excluded: ReadonlySet<DormantDoorFigure> = new Set()): DormantDoorFigure {
  const available = DORMANT_DOOR_FIGURES.filter((figure) => !excluded.has(figure));
  const index = Math.floor(seededRandom(seed + offset * 131) * available.length);
  return available[Math.max(0, Math.min(available.length - 1, index))];
}

export function buildDormantDoorMiniGame(input: {
  islandNumber: number;
  tileIndex: number;
  rollIndex: number;
  doorStopId: IslandLandmarkDoorStopId;
}): DormantDoorMiniGameState {
  const safeIsland = Number.isFinite(input.islandNumber) ? Math.max(1, Math.floor(input.islandNumber)) : 1;
  const safeTileIndex = Number.isFinite(input.tileIndex) ? Math.max(0, Math.floor(input.tileIndex)) : 0;
  const safeRollIndex = Number.isFinite(input.rollIndex) ? Math.max(0, Math.floor(input.rollIndex)) : 0;
  const seed = safeIsland * 1009 + safeTileIndex * 97 + safeRollIndex * 17 + input.doorStopId.length * 53;

  const tripleFigure = pickFigure(seed, 1);
  const pairFigure = pickFigure(seed, 2, new Set([tripleFigure]));
  const oddFigure = pickFigure(seed, 3, new Set([tripleFigure, pairFigure]));
  const figures = shuffleDeterministically<DormantDoorFigure>([
    tripleFigure,
    tripleFigure,
    tripleFigure,
    pairFigure,
    pairFigure,
    oddFigure,
  ], seed + 409);

  return {
    doorStopId: input.doorStopId,
    tileIndex: safeTileIndex,
    rewardLevels: DORMANT_DOOR_REWARD_LEVELS,
    doors: figures.slice(0, DOOR_COUNT).map((figure, index) => ({
      id: `dormant-door-${safeIsland}-${safeTileIndex}-${safeRollIndex}-${index}`,
      figure,
    })),
  };
}

export function resolveDormantDoorReward(selectedFigures: readonly DormantDoorFigure[]): DormantDoorRewardLevel {
  const normalized = selectedFigures.slice(0, REQUIRED_PICK_COUNT);
  const counts = new Map<DormantDoorFigure, number>();
  for (const figure of normalized) {
    counts.set(figure, (counts.get(figure) ?? 0) + 1);
  }
  const bestMatchCount = Math.max(0, ...counts.values());
  if (bestMatchCount >= 3) return DORMANT_DOOR_REWARD_LEVELS[2];
  if (bestMatchCount === 2) return DORMANT_DOOR_REWARD_LEVELS[1];
  return DORMANT_DOOR_REWARD_LEVELS[0];
}
