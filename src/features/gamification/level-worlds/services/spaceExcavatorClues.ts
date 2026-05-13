export type SpaceExcavatorClueType = 'relic_piece' | 'hot' | 'warm' | 'cold';

export interface SpaceExcavatorClueResult {
  type: SpaceExcavatorClueType;
  label: string;
  shortMessage: string;
  tone: 'relic' | 'hot' | 'warm' | 'cold';
}

const SPACE_EXCAVATOR_CLUES: Record<SpaceExcavatorClueType, SpaceExcavatorClueResult> = Object.freeze({
  relic_piece: Object.freeze({
    type: 'relic_piece',
    label: 'Relic piece found!',
    shortMessage: 'Relic piece found!',
    tone: 'relic',
  }),
  hot: Object.freeze({
    type: 'hot',
    label: 'Hot signal',
    shortMessage: 'Hot signal — relic nearby',
    tone: 'hot',
  }),
  warm: Object.freeze({
    type: 'warm',
    label: 'Warm signal',
    shortMessage: 'Warm signal — keep searching',
    tone: 'warm',
  }),
  cold: Object.freeze({
    type: 'cold',
    label: 'Cold stone',
    shortMessage: 'Cold stone — try another area',
    tone: 'cold',
  }),
});

function toTilePosition(tileId: number, boardSize: number): { x: number; y: number } {
  return {
    x: tileId % boardSize,
    y: Math.floor(tileId / boardSize),
  };
}

export function resolveSpaceExcavatorClue(options: {
  tileId: number;
  boardSize: number;
  objectTileIds: readonly number[];
}): SpaceExcavatorClueResult {
  const boardSize = Math.floor(options.boardSize);
  const tileId = Math.floor(options.tileId);
  const tileCount = boardSize * boardSize;
  if (boardSize < 1 || tileId < 0 || tileId >= tileCount) {
    return SPACE_EXCAVATOR_CLUES.cold;
  }

  const objectTileIds = options.objectTileIds
    .map((objectTileId) => Math.floor(objectTileId))
    .filter((objectTileId) => objectTileId >= 0 && objectTileId < tileCount);

  if (objectTileIds.includes(tileId)) {
    return SPACE_EXCAVATOR_CLUES.relic_piece;
  }

  const tile = toTilePosition(tileId, boardSize);
  let isWarm = false;
  for (const objectTileId of objectTileIds) {
    const objectTile = toTilePosition(objectTileId, boardSize);
    const dx = Math.abs(tile.x - objectTile.x);
    const dy = Math.abs(tile.y - objectTile.y);
    if (dx <= 1 && dy <= 1) {
      return SPACE_EXCAVATOR_CLUES.hot;
    }
    if (dx + dy <= 2) {
      isWarm = true;
    }
  }

  return isWarm ? SPACE_EXCAVATOR_CLUES.warm : SPACE_EXCAVATOR_CLUES.cold;
}
