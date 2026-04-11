export type IslandBoardProfileId = 'spark60_preview';

export interface IslandBoardProfile {
  id: IslandBoardProfileId;
  tileCount: number;
  stopTileIndices: [number, number, number, number, number];
}

const BOARD_PROFILES: Record<IslandBoardProfileId, IslandBoardProfile> = {
  spark60_preview: {
    id: 'spark60_preview',
    tileCount: 60,
    // Dormant preview profile for future Spark topology; not active by default.
    stopTileIndices: [0, 12, 24, 36, 59],
  },
};

export const DEFAULT_ISLAND_BOARD_PROFILE_ID: IslandBoardProfileId = 'spark60_preview';

export function resolveIslandBoardProfile(profileId: IslandBoardProfileId = DEFAULT_ISLAND_BOARD_PROFILE_ID): IslandBoardProfile {
  return BOARD_PROFILES[profileId] ?? BOARD_PROFILES[DEFAULT_ISLAND_BOARD_PROFILE_ID];
}
