export type IslandBoardProfileId = 'spark40_ring';

export interface IslandBoardProfile {
  id: IslandBoardProfileId;
  tileCount: number;
  stopTileIndices: [number, number, number, number, number];
}

const BOARD_PROFILES: Record<IslandBoardProfileId, IslandBoardProfile> = {
  spark40_ring: {
    id: 'spark40_ring',
    tileCount: 40,
    // 40-tile ring matching Monopoly GO's tile count — stops at quarters (0, 10, 20, 30) + boss (39).
    stopTileIndices: [0, 10, 20, 30, 39],
  },
};

export const DEFAULT_ISLAND_BOARD_PROFILE_ID: IslandBoardProfileId = 'spark40_ring';

export function resolveIslandBoardProfile(profileId: IslandBoardProfileId = DEFAULT_ISLAND_BOARD_PROFILE_ID): IslandBoardProfile {
  return BOARD_PROFILES[profileId] ?? BOARD_PROFILES[DEFAULT_ISLAND_BOARD_PROFILE_ID];
}
