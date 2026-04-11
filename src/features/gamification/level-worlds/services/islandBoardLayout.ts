export type ZBand = 'back' | 'mid' | 'front';

export interface TileAnchor {
  id: string;
  x: number;
  y: number;
  zBand: ZBand;
  tangentDeg: number;
  scale: number;
}

export interface StopTile {
  stopId: 'stop_hatchery' | 'stop_minigame' | 'stop_market' | 'stop_utility' | 'stop_boss';
  tileIndex: number;
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

export const TILE_ANCHORS: TileAnchor[] = [
  { id: 't00', x: 835, y: 520, zBand: 'front', tangentDeg: 95, scale: 1.08 },
  { id: 't01', x: 800, y: 635, zBand: 'front', tangentDeg: 120, scale: 1.07 },
  { id: 't02', x: 710, y: 735, zBand: 'front', tangentDeg: 145, scale: 1.06 },
  { id: 't03', x: 590, y: 790, zBand: 'front', tangentDeg: 170, scale: 1.04 },
  { id: 't04', x: 455, y: 792, zBand: 'front', tangentDeg: 195, scale: 1.03 },
  { id: 't05', x: 330, y: 740, zBand: 'front', tangentDeg: 225, scale: 1.01 },
  { id: 't06', x: 240, y: 640, zBand: 'mid', tangentDeg: 255, scale: 0.99 },
  { id: 't07', x: 203, y: 525, zBand: 'mid', tangentDeg: 278, scale: 0.98 },
  { id: 't08', x: 220, y: 398, zBand: 'mid', tangentDeg: 298, scale: 0.97 },
  { id: 't09', x: 285, y: 288, zBand: 'back', tangentDeg: 322, scale: 0.95 },
  { id: 't10', x: 390, y: 212, zBand: 'back', tangentDeg: 350, scale: 0.93 },
  { id: 't11', x: 515, y: 188, zBand: 'back', tangentDeg: 12, scale: 0.92 },
  { id: 't12', x: 638, y: 214, zBand: 'back', tangentDeg: 38, scale: 0.93 },
  { id: 't13', x: 735, y: 295, zBand: 'back', tangentDeg: 62, scale: 0.95 },
  { id: 't14', x: 792, y: 397, zBand: 'mid', tangentDeg: 80, scale: 0.98 },
  { id: 't15', x: 828, y: 470, zBand: 'mid', tangentDeg: 88, scale: 1.02 },
  { id: 't16', x: 848, y: 560, zBand: 'front', tangentDeg: 104, scale: 1.08 },
];

export const STOP_TILES: StopTile[] = [
  { stopId: 'stop_hatchery', tileIndex: 0 },
  { stopId: 'stop_minigame', tileIndex: 4 },
  { stopId: 'stop_market', tileIndex: 8 },
  { stopId: 'stop_utility', tileIndex: 12 },
  { stopId: 'stop_boss', tileIndex: 16 },
];

export const TOKEN_START_TILE_INDEX = 0;


export const OUTER_STOP_ANCHORS: OrbitStopAnchor[] = [
  // Four non-boss stops at outer corners around the board ring.
  { id: 'hatchery', x: 140, y: 140 },
  { id: 'stopA', x: 860, y: 140 },
  { id: 'stopB', x: 860, y: 860 },
  { id: 'stopC', x: 140, y: 860 },
  // Boss stop in the middle of the board, inside the ring.
  { id: 'boss', x: 500, y: 500 },
  { id: 'shop', x: 120, y: 500 },
];

// ─── 60-tile board layout (spark60) ──────────────────────────────────────────
//
// 60 tiles arranged around the island ring in canonical 1000×1000 board space.
//
// Stop tiles: 0 (hatchery), 12 (minigame), 24 (market), 36 (utility), 59 (boss).
// All positions are in the canonical 1000×1000 coordinate space.

export const TILE_ANCHORS_60: TileAnchor[] = [
  { id: 't00', x: 200, y: 130, zBand: 'back', tangentDeg: 0, scale: 0.91 },
  { id: 't01', x: 225, y: 117, zBand: 'back', tangentDeg: -26, scale: 0.91 },
  { id: 't02', x: 250, y: 106, zBand: 'back', tangentDeg: -23, scale: 0.90 },
  { id: 't03', x: 275, y: 96, zBand: 'back', tangentDeg: -19, scale: 0.90 },
  { id: 't04', x: 300, y: 89, zBand: 'back', tangentDeg: -16, scale: 0.90 },
  { id: 't05', x: 325, y: 82, zBand: 'back', tangentDeg: -12, scale: 0.90 },
  { id: 't06', x: 350, y: 78, zBand: 'back', tangentDeg: -8, scale: 0.90 },
  { id: 't07', x: 375, y: 75, zBand: 'back', tangentDeg: -5, scale: 0.90 },
  { id: 't08', x: 400, y: 74, zBand: 'back', tangentDeg: -1, scale: 0.90 },
  { id: 't09', x: 425, y: 74, zBand: 'back', tangentDeg: 2, scale: 0.90 },
  { id: 't10', x: 450, y: 76, zBand: 'back', tangentDeg: 7, scale: 0.90 },
  { id: 't11', x: 475, y: 80, zBand: 'back', tangentDeg: 10, scale: 0.90 },
  { id: 't12', x: 500, y: 85, zBand: 'back', tangentDeg: 0, scale: 0.90 },
  { id: 't13', x: 524, y: 80, zBand: 'back', tangentDeg: -8, scale: 0.90 },
  { id: 't14', x: 548, y: 78, zBand: 'back', tangentDeg: -4, scale: 0.90 },
  { id: 't15', x: 573, y: 77, zBand: 'back', tangentDeg: 1, scale: 0.90 },
  { id: 't16', x: 597, y: 79, zBand: 'back', tangentDeg: 6, scale: 0.90 },
  { id: 't17', x: 621, y: 82, zBand: 'back', tangentDeg: 9, scale: 0.90 },
  { id: 't18', x: 645, y: 87, zBand: 'back', tangentDeg: 14, scale: 0.90 },
  { id: 't19', x: 669, y: 94, zBand: 'back', tangentDeg: 20, scale: 0.90 },
  { id: 't20', x: 693, y: 104, zBand: 'back', tangentDeg: 23, scale: 0.90 },
  { id: 't21', x: 718, y: 115, zBand: 'back', tangentDeg: 26, scale: 0.91 },
  { id: 't22', x: 742, y: 128, zBand: 'back', tangentDeg: 30, scale: 0.91 },
  { id: 't23', x: 766, y: 143, zBand: 'back', tangentDeg: 34, scale: 0.91 },
  { id: 't24', x: 790, y: 160, zBand: 'back', tangentDeg: 51, scale: 0.92 },
  { id: 't25', x: 803, y: 188, zBand: 'back', tangentDeg: 66, scale: 0.92 },
  { id: 't26', x: 815, y: 217, zBand: 'back', tangentDeg: 68, scale: 0.93 },
  { id: 't27', x: 826, y: 245, zBand: 'back', tangentDeg: 69, scale: 0.94 },
  { id: 't28', x: 837, y: 273, zBand: 'back', tangentDeg: 71, scale: 0.94 },
  { id: 't29', x: 846, y: 302, zBand: 'mid', tangentDeg: 72, scale: 0.95 },
  { id: 't30', x: 855, y: 330, zBand: 'mid', tangentDeg: 73, scale: 0.96 },
  { id: 't31', x: 863, y: 358, zBand: 'mid', tangentDeg: 75, scale: 0.96 },
  { id: 't32', x: 870, y: 387, zBand: 'mid', tangentDeg: 77, scale: 0.97 },
  { id: 't33', x: 876, y: 415, zBand: 'mid', tangentDeg: 78, scale: 0.98 },
  { id: 't34', x: 882, y: 443, zBand: 'mid', tangentDeg: 80, scale: 0.98 },
  { id: 't35', x: 886, y: 472, zBand: 'mid', tangentDeg: 82, scale: 0.99 },
  { id: 't36', x: 890, y: 500, zBand: 'mid', tangentDeg: 101, scale: 0.99 },
  { id: 't37', x: 875, y: 531, zBand: 'mid', tangentDeg: 120, scale: 1.00 },
  { id: 't38', x: 856, y: 560, zBand: 'mid', tangentDeg: 128, scale: 1.01 },
  { id: 't39', x: 832, y: 587, zBand: 'mid', tangentDeg: 135, scale: 1.01 },
  { id: 't40', x: 804, y: 612, zBand: 'mid', tangentDeg: 140, scale: 1.02 },
  { id: 't41', x: 774, y: 635, zBand: 'front', tangentDeg: 145, scale: 1.02 },
  { id: 't42', x: 741, y: 656, zBand: 'front', tangentDeg: 149, scale: 1.03 },
  { id: 't43', x: 707, y: 676, zBand: 'front', tangentDeg: 151, scale: 1.03 },
  { id: 't44', x: 672, y: 694, zBand: 'front', tangentDeg: 153, scale: 1.04 },
  { id: 't45', x: 637, y: 711, zBand: 'front', tangentDeg: 154, scale: 1.04 },
  { id: 't46', x: 603, y: 727, zBand: 'front', tangentDeg: 155, scale: 1.05 },
  { id: 't47', x: 570, y: 742, zBand: 'front', tangentDeg: 156, scale: 1.05 },
  { id: 't48', x: 539, y: 756, zBand: 'front', tangentDeg: 155, scale: 1.06 },
  { id: 't49', x: 510, y: 770, zBand: 'front', tangentDeg: 153, scale: 1.06 },
  { id: 't50', x: 486, y: 783, zBand: 'front', tangentDeg: 150, scale: 1.06 },
  { id: 't51', x: 465, y: 796, zBand: 'front', tangentDeg: 145, scale: 1.07 },
  { id: 't52', x: 450, y: 808, zBand: 'front', tangentDeg: 135, scale: 1.07 },
  { id: 't53', x: 440, y: 821, zBand: 'front', tangentDeg: 117, scale: 1.07 },
  { id: 't54', x: 437, y: 834, zBand: 'front', tangentDeg: 90, scale: 1.08 },
  { id: 't55', x: 440, y: 847, zBand: 'front', tangentDeg: 60, scale: 1.08 },
  { id: 't56', x: 452, y: 860, zBand: 'front', tangentDeg: 40, scale: 1.08 },
  { id: 't57', x: 472, y: 874, zBand: 'front', tangentDeg: 31, scale: 1.09 },
  { id: 't58', x: 501, y: 889, zBand: 'front', tangentDeg: 25, scale: 1.09 },
  { id: 't59', x: 540, y: 905, zBand: 'front', tangentDeg: 0, scale: 1.09 },
];

/** Stop tile indices for the 60-tile spark board (maps to spark60_preview profile). */
export const STOP_TILE_INDICES_60 = [0, 12, 24, 36, 59] as const;
