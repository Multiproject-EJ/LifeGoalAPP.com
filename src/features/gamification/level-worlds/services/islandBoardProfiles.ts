export type IslandBoardProfileId = 'spark40_ring';

export interface IslandBoardProfile {
  id: IslandBoardProfileId;
  tileCount: number;
}

/**
 * Landmarks (a.k.a. "stops") remain external progression structures. The
 * 5 landmark HUD buttons are positioned in screen space by the UI layer
 * (`OUTER_STOP_ANCHORS` in `islandBoardLayout.ts`). Four movement tiles may be
 * overlaid as landmark-door access affordances by the tile-map service, but
 * stop completion/progression remains canonical and independent of door indices.
 */
const BOARD_PROFILES: Record<IslandBoardProfileId, IslandBoardProfile> = {
  spark40_ring: {
    id: 'spark40_ring',
    tileCount: 40,
  },
};

export const DEFAULT_ISLAND_BOARD_PROFILE_ID: IslandBoardProfileId = 'spark40_ring';

export function resolveIslandBoardProfile(profileId: IslandBoardProfileId = DEFAULT_ISLAND_BOARD_PROFILE_ID): IslandBoardProfile {
  return BOARD_PROFILES[profileId] ?? BOARD_PROFILES[DEFAULT_ISLAND_BOARD_PROFILE_ID];
}
