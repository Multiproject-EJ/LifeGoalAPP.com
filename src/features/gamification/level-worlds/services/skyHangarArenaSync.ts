import { ARENA_GAME_CATALOG, type ArenaGameId } from './islandRunArenaCatalog';

/**
 * Island 002 Covered Sky Hangar ↔ Event Arena sync (presentation rules only).
 *
 * Once the hangar reaches Level 3 it becomes the Event Arena's airfield: the
 * plane that takes off tows a banner for the game in the current timed-event
 * rotation, and tapping the hangar flies the player to the Event Arena, which
 * keeps its own game choice, tickets and gating. The banner follows the
 * rotation, so it changes whenever the arena's event changes.
 */

export const SKY_HANGAR_READY_LEVEL = 3;
/** Takeoff before the arena opens (the plane rolls out and lifts off). */
export const SKY_HANGAR_LAUNCH_DELAY_MS = 2200;
export const SKY_HANGAR_LAUNCH_DELAY_REDUCED_MS = 300;

export interface SkyHangarFlight {
  gameId: ArenaGameId;
  displayName: string;
  icon: string;
  accent: string;
  /** Short text for the towed banner. */
  bannerText: string;
}

export function resolveSkyHangarFlight(options: {
  hangarLevel: number;
  activeEventType: string | null | undefined;
  /** Journey Disc takes over the arena surface on its islands. */
  journeyDiscReplacesEvent?: boolean;
}): SkyHangarFlight | null {
  if (options.hangarLevel < SKY_HANGAR_READY_LEVEL) return null;
  const gameId = options.journeyDiscReplacesEvent ? 'journey_disc_arena' : options.activeEventType;
  const game = ARENA_GAME_CATALOG.find((entry) => entry.id === gameId);
  if (!game) return null;
  return {
    gameId: game.id,
    displayName: game.displayName,
    icon: game.icon,
    accent: game.accent,
    bannerText: `${game.icon} ${game.shortName}`,
  };
}

/** What a tap on the hangar does. */
export function resolveSkyHangarTap(options: { hangarLevel: number; flight: SkyHangarFlight | null }): 'build' | 'fly' {
  return options.hangarLevel >= SKY_HANGAR_READY_LEVEL && options.flight ? 'fly' : 'build';
}
