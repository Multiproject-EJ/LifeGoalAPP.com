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

// ─── 36-tile board layout (spark40 / ring36) ─────────────────────────────────
//
// 36 tiles arranged around the island ring in canonical 1000×1000 board space.
// Reduced from 40 → 36: fewer, larger tiles on the same ring radius so the
// board reads cleaner on mobile without changing the circle's size.
//
// The 36 indices are movement tiles whose on-land effect is picked by the
// tile-map generator (currency / chest / micro / hazard / encounter / …).
// Four outer tiles can be overlaid as landmark-door access affordances by the
// tile-map service; those doors open the same canonical landmark modals and do
// not own stop completion/progression. The 5 landmark HUD buttons remain
// positioned in screen space by OUTER_STOP_ANCHORS above.
// All positions are in the canonical 1000×1000 coordinate space.

// Ring geometry is unchanged from the 40-tile layout — same centre and radius,
// so the circle keeps its exact size. Only the tile COUNT changes (40 → 36),
// which widens each tile's arc.
const SPARK_RING_TILE_COUNT = 36;
const SPARK40_CENTER_X = 500;
const SPARK40_CENTER_Y = 500;
const SPARK40_RADIUS = 340;
const SPARK40_ROTATION_OFFSET_RAD = (-6 * Math.PI) / 180;

export const TILE_ANCHORS_40: TileAnchor[] = Array.from({ length: SPARK_RING_TILE_COUNT }, (_, index) => {
  const theta = ((index / SPARK_RING_TILE_COUNT) * Math.PI * 2) - (Math.PI / 2) + SPARK40_ROTATION_OFFSET_RAD;
  const x = SPARK40_CENTER_X + Math.cos(theta) * SPARK40_RADIUS;
  const y = SPARK40_CENTER_Y + Math.sin(theta) * SPARK40_RADIUS;

  const zBand: ZBand = y < 430 ? 'back' : y > 570 ? 'front' : 'mid';
  const tangentDeg = ((theta * 180) / Math.PI) + 90;

  return {
    id: `t${String(index).padStart(2, '0')}`,
    // Sub-pixel anchor precision: the ring tiles are exact tessellating wedges
    // (see the spark40 tile CSS), so rounding centres to whole pixels opens
    // hairline seams between neighbouring borders.
    x: Number(x.toFixed(2)),
    y: Number(y.toFixed(2)),
    zBand,
    tangentDeg: Number(tangentDeg.toFixed(0)),
    // Uniform tile scale keeps the wedge tessellation seam-free — any per-tile
    // depth scaling directly becomes overlap (front) or gaps (back) along the
    // shared radial edges. Depth is carried by zBand stacking, the extruded
    // side wall, and the contact shadows instead.
    scale: 1,
  };
});

/** Legacy stop tile indices for the ring board (profile: spark40_ring).
 *  Kept only for backward-compat; stops are decoupled from tile indices.
 *  Rescaled to the 36-tile ring so no index is out of range. */
export const STOP_TILE_INDICES_40 = [0, 9, 18, 27, 35] as const;
