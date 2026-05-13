export type SpaceExcavatorDepthId = 'surface_ruins' | 'moon_chamber' | 'crystal_vault' | 'ancient_core';
export type SpaceExcavatorDepthTheme = 'surface' | 'moon' | 'crystal' | 'core';

export interface SpaceExcavatorDepthLevel {
  id: SpaceExcavatorDepthId;
  depthNumber: number;
  name: string;
  subtitle: string;
  minBoardNumber: number;
  maxBoardNumber: number;
  theme: SpaceExcavatorDepthTheme;
}

export const SPACE_EXCAVATOR_DEPTH_LEVELS: SpaceExcavatorDepthLevel[] = [
  {
    id: 'surface_ruins',
    depthNumber: 1,
    name: 'Surface Ruins',
    subtitle: 'Warm • Earthy • Beginner',
    minBoardNumber: 1,
    maxBoardNumber: 2,
    theme: 'surface',
  },
  {
    id: 'moon_chamber',
    depthNumber: 2,
    name: 'Moon Chamber',
    subtitle: 'Moonlit • Mystical • Enchanted',
    minBoardNumber: 3,
    maxBoardNumber: 5,
    theme: 'moon',
  },
  {
    id: 'crystal_vault',
    depthNumber: 3,
    name: 'Crystal Vault',
    subtitle: 'Luminous • Refined • Magical',
    minBoardNumber: 6,
    maxBoardNumber: 8,
    theme: 'crystal',
  },
  {
    id: 'ancient_core',
    depthNumber: 4,
    name: 'Ancient Core',
    subtitle: 'Epic • Legendary • Final Depth',
    minBoardNumber: 9,
    maxBoardNumber: 10,
    theme: 'core',
  },
];

export function resolveSpaceExcavatorDepthForBoard(boardNumber: number): SpaceExcavatorDepthLevel {
  const normalizedBoardNumber = Number.isFinite(boardNumber) ? Math.max(1, Math.floor(boardNumber)) : 1;
  return SPACE_EXCAVATOR_DEPTH_LEVELS.find(
    (depth) => normalizedBoardNumber >= depth.minBoardNumber && normalizedBoardNumber <= depth.maxBoardNumber,
  ) ?? SPACE_EXCAVATOR_DEPTH_LEVELS[SPACE_EXCAVATOR_DEPTH_LEVELS.length - 1]; // Future boards stay in the final depth until new metadata is added.
}
