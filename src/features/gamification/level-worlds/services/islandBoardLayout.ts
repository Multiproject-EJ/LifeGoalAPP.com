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
  { id: 'hatchery', x: 200, y: 130 },
  { id: 'stopA', x: 500, y: 85 },
  { id: 'stopB', x: 790, y: 160 },
  { id: 'stopC', x: 890, y: 500 },
  { id: 'boss', x: 540, y: 905 },
  { id: 'shop', x: 120, y: 500 },
];
