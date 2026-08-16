import type { IslandTileType } from './islandBoardTileMap';

export interface IslandBoardTileLegendEntry {
  tileType: IslandTileType;
  label: string;
  shortLabel: string;
  description: string;
}

/**
 * Player-facing language for the real canonical board symbols. This is
 * presentation metadata only: rewards and stop progression remain owned by
 * their existing actions.
 */
export const ISLAND_BOARD_TILE_LEGEND: readonly IslandBoardTileLegendEntry[] = Object.freeze([
  { tileType: 'currency', label: 'Money', shortLabel: 'Money', description: 'Adds money to your island wallet.' },
  { tileType: 'chest', label: 'Treasure chest', shortLabel: 'Chest', description: 'A larger money discovery with chest rewards.' },
  { tileType: 'micro', label: 'Route spark', shortLabel: 'Spark', description: 'Quick route progress and a small board reward.' },
  { tileType: 'hazard', label: 'Hazard', shortLabel: 'Hazard', description: 'A rare setback that can cost money.' },
  { tileType: 'encounter', label: 'Challenge', shortLabel: 'Challenge', description: 'Opens a short island encounter. A check means completed.' },
  { tileType: 'card', label: 'Caretaker clue', shortLabel: 'Clue', description: 'A reflection or caretaker clue on milestone islands.' },
  { tileType: 'landmark_door', label: 'Landmark door', shortLabel: 'Door', description: 'Opens the current landmark. Door symbols identify its family.' },
  { tileType: 'traffic_light', label: 'Traffic-light bonus', shortLabel: 'Bonus', description: 'Passing charges its lamps. Full charge unlocks the rare bonus.' },
  { tileType: 'build_discount', label: 'Builder discount', shortLabel: 'Discount', description: 'Offers the next landmark ticket at a reduced price.' },
  { tileType: 'free_ticket', label: 'Event ticket', shortLabel: 'Ticket', description: 'Adds a play ticket for the active timed event.' },
]);

export const ISLAND_BOARD_SIGNATURE_SYMBOLS = Object.freeze([
  { symbol: '⛏', label: 'Frostwell drill', description: 'Queues one Frostwell drilling-wheel spin.' },
  { symbol: '⚙', label: 'Powerworks part', description: 'Collects one missing Rootheart engine component.' },
]);
