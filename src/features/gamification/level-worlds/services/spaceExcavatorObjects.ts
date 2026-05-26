export type SpaceExcavatorObjectTier = 'common' | 'uncommon' | 'rare' | 'epic';

export interface SpaceExcavatorObjectShape {
  objectId: string;
  name: string;
  tier: SpaceExcavatorObjectTier;
  icon: string;
  tileOffsets: ReadonlyArray<readonly [number, number]>;
}

export const SPACE_EXCAVATOR_OBJECT_SHAPES: readonly SpaceExcavatorObjectShape[] = Object.freeze([
  Object.freeze({
    objectId: 'ancient_coin',
    name: 'Ancient Coin',
    tier: 'common',
    icon: '🪙',
    tileOffsets: Object.freeze([[0, 0], [1, 0]] as const),
  }),
  Object.freeze({
    objectId: 'lost_compass',
    name: 'Lost Compass',
    tier: 'uncommon',
    icon: '🧭',
    tileOffsets: Object.freeze([[0, 0], [1, 0], [0, 1]] as const),
  }),
  Object.freeze({
    objectId: 'crystal_shard',
    name: 'Crystal Shard',
    tier: 'rare',
    icon: '🔮',
    tileOffsets: Object.freeze([[0, 0], [0, 1], [0, 2], [1, 2]] as const),
  }),
  Object.freeze({
    objectId: 'micro_satellite_cluster',
    name: 'Micro Satellite Cluster',
    tier: 'common',
    icon: '🛰️',
    tileOffsets: Object.freeze([[0, 0], [2, 0], [0, 2], [2, 2]] as const),
  }),
  Object.freeze({
    objectId: 'fossil_fragments',
    name: 'Fossil Fragments',
    tier: 'uncommon',
    icon: '🦴',
    tileOffsets: Object.freeze([[0, 0], [2, 0], [1, 1], [0, 2], [2, 2]] as const),
  }),
  Object.freeze({
    objectId: 'moon_key',
    name: 'Moon Key',
    tier: 'epic',
    icon: '🗝️',
    tileOffsets: Object.freeze([[0, 0], [1, 0], [2, 0], [2, 1], [2, 2]] as const),
  }),
]);

export function getSpaceExcavatorObjectShape(objectId: string | null | undefined): SpaceExcavatorObjectShape | null {
  return SPACE_EXCAVATOR_OBJECT_SHAPES.find((shape) => shape.objectId === objectId) ?? null;
}

export function chooseSpaceExcavatorObjectShape(eventId: string, boardIndex: number): SpaceExcavatorObjectShape {
  const seed = Array.from(`${eventId}:${boardIndex}:object`).reduce((sum, char) => sum + char.charCodeAt(0), 1);
  const progressionPool = SPACE_EXCAVATOR_OBJECT_SHAPES.filter((shape) => {
    if (boardIndex < 8) return shape.tier === 'common';
    if (boardIndex < 16) return shape.tier === 'common' || shape.tier === 'uncommon';
    if (boardIndex < 26) return shape.tier !== 'epic';
    return true;
  });
  const pool = progressionPool.length > 0 ? progressionPool : SPACE_EXCAVATOR_OBJECT_SHAPES;
  return pool[Math.abs(seed + boardIndex) % pool.length];
}

export function placeSpaceExcavatorObjectShape(options: {
  eventId: string;
  boardIndex: number;
  boardSize: number;
  shape: SpaceExcavatorObjectShape;
}): number[] {
  const { eventId, boardIndex, boardSize, shape } = options;
  const maxX = Math.max(...shape.tileOffsets.map(([x]) => x));
  const maxY = Math.max(...shape.tileOffsets.map(([, y]) => y));
  const originColumns = Math.max(1, boardSize - maxX);
  const originRows = Math.max(1, boardSize - maxY);
  let seed = Array.from(`${eventId}:${boardIndex}:${shape.objectId}:layout`).reduce((sum, char) => sum + char.charCodeAt(0), 0) || 1;
  seed = (seed * 1664525 + 1013904223) >>> 0;
  const originX = seed % originColumns;
  seed = (seed * 1664525 + 1013904223) >>> 0;
  const originY = seed % originRows;
  return shape.tileOffsets
    .map(([x, y]) => (originY + y) * boardSize + originX + x)
    .sort((a, b) => a - b);
}

export function resolveSpaceExcavatorObjectTileIds(progress: {
  objectTileIds?: number[];
  treasureTileIds: number[];
}): number[] {
  return progress.objectTileIds?.length ? progress.objectTileIds : progress.treasureTileIds;
}
