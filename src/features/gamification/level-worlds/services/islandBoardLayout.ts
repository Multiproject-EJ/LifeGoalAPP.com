export type ZBand = 'back' | 'mid' | 'front';

export interface TileAnchor {
  id: string;
  x: number;
  y: number;
  zBand: ZBand;
  tangentDeg: number;
  scale: number;
}


export interface OrbitStopAnchor {
  id: 'hatchery' | 'stopA' | 'stopB' | 'stopC' | 'boss' | 'shop';
  x: number;
  y: number;
}

export const CANONICAL_BOARD_SIZE = {
  width: 1000,
  height: 1000,
} as const;

export const TOKEN_START_TILE_INDEX = 0;

const OUTER_STOP_CORNER_PAD = 120;
const OUTER_STOP_CORNER_MAX = CANONICAL_BOARD_SIZE.width - OUTER_STOP_CORNER_PAD;

export const OUTER_STOP_ANCHORS: OrbitStopAnchor[] = [
  // Four non-boss stops at outer corners around the board ring.
  { id: 'hatchery', x: OUTER_STOP_CORNER_PAD, y: OUTER_STOP_CORNER_PAD },
  { id: 'stopA', x: OUTER_STOP_CORNER_MAX, y: OUTER_STOP_CORNER_PAD },
  { id: 'stopB', x: OUTER_STOP_CORNER_MAX, y: OUTER_STOP_CORNER_MAX },
  { id: 'stopC', x: OUTER_STOP_CORNER_PAD, y: OUTER_STOP_CORNER_MAX },
  // Boss stop in the middle of the board, inside the ring.
  { id: 'boss', x: 500, y: 500 },
  { id: 'shop', x: 120, y: 500 },
];

// ─── 40-tile board layout (spark40 / ring40) ─────────────────────────────────
//
// 40 tiles arranged around the island ring in canonical 1000×1000 board space.
// Matches Monopoly GO's tile count — larger tiles, perfectly readable on mobile.
//
// Stop tiles: 0 (hatchery), 10 (minigame), 20 (market), 30 (utility), 39 (boss).
// All positions are in the canonical 1000×1000 coordinate space.

const SPARK40_CENTER_X = 500;
const SPARK40_CENTER_Y = 500;
const SPARK40_RADIUS = 340;
const SPARK40_ROTATION_OFFSET_RAD = (-6 * Math.PI) / 180;

export const TILE_ANCHORS_40: TileAnchor[] = Array.from({ length: 40 }, (_, index) => {
  const theta = ((index / 40) * Math.PI * 2) - (Math.PI / 2) + SPARK40_ROTATION_OFFSET_RAD;
  const x = SPARK40_CENTER_X + Math.cos(theta) * SPARK40_RADIUS;
  const y = SPARK40_CENTER_Y + Math.sin(theta) * SPARK40_RADIUS;

  const zBand: ZBand = y < 430 ? 'back' : y > 570 ? 'front' : 'mid';
  const tangentDeg = ((theta * 180) / Math.PI) + 90;
  const normalizedY = (y - SPARK40_CENTER_Y) / SPARK40_RADIUS;
  const scale = Number((1 + normalizedY * 0.08).toFixed(2));

  return {
    id: `t${String(index).padStart(2, '0')}`,
    x: Number(x.toFixed(0)),
    y: Number(y.toFixed(0)),
    zBand,
    tangentDeg: Number(tangentDeg.toFixed(0)),
    scale,
  };
});

/** Stop tile indices for the 40-tile ring board.
 *  Profile ID is 'spark60_preview' for backwards-compatibility with persisted state;
 *  the name no longer implies 60 tiles. */
export const STOP_TILE_INDICES_40 = [0, 10, 20, 30, 39] as const;
