"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_ISLAND_BOARD_PROFILE_ID = void 0;
exports.resolveIslandBoardProfile = resolveIslandBoardProfile;
/**
 * Landmarks (a.k.a. "stops") are **fully decoupled from tile indices**. The
 * 5 landmark HUD buttons are positioned in screen space by the UI layer
 * (`OUTER_STOP_ANCHORS` in `islandBoardLayout.ts`) and the player token never
 * lands on one. The ring remains `tileCount` pure movement tiles generated
 * by the normal tile-map generator — nothing about those tiles is reserved
 * for landmarks.
 */
const BOARD_PROFILES = {
    spark40_ring: {
        id: 'spark40_ring',
        tileCount: 40,
    },
};
exports.DEFAULT_ISLAND_BOARD_PROFILE_ID = 'spark40_ring';
function resolveIslandBoardProfile(profileId = exports.DEFAULT_ISLAND_BOARD_PROFILE_ID) {
    return BOARD_PROFILES[profileId] ?? BOARD_PROFILES[exports.DEFAULT_ISLAND_BOARD_PROFILE_ID];
}
