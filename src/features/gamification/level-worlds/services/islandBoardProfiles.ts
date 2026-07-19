export type IslandBoardProfileId = 'spark36_ring';
export type LegacyIslandBoardProfileId = 'spark40_ring';
export type IslandBoardProfileInputId = IslandBoardProfileId | LegacyIslandBoardProfileId;

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
  spark36_ring: {
    id: 'spark36_ring',
    // 36 larger tiles on the established ring radius. The old
    // `spark40_ring` identifier is normalized below for compatibility.
    tileCount: 36,
  },
};

export const DEFAULT_ISLAND_BOARD_PROFILE_ID: IslandBoardProfileId = 'spark36_ring';

export function resolveIslandBoardProfile(
  profileId: IslandBoardProfileInputId | string = DEFAULT_ISLAND_BOARD_PROFILE_ID,
): IslandBoardProfile {
  const canonicalProfileId = profileId === 'spark40_ring' ? 'spark36_ring' : profileId;
  return BOARD_PROFILES[canonicalProfileId as IslandBoardProfileId]
    ?? BOARD_PROFILES[DEFAULT_ISLAND_BOARD_PROFILE_ID];
}
