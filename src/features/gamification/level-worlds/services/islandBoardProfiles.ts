export type IslandBoardProfileId = 'spark40_ring';

export interface IslandBoardProfile {
  id: IslandBoardProfileId;
  tileCount: number;
}

/**
 * Landmarks (a.k.a. "stops") are **fully decoupled from tile indices**. The
 * 5 landmark HUD buttons are positioned in screen space by the UI layer
 * (`OUTER_STOP_ANCHORS` in `islandBoardLayout.ts`) and the player token never
 * lands on one. The ring remains `tileCount` pure movement tiles generated
 * by the normal tile-map generator — nothing about those tiles is reserved
 * for landmarks.
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
