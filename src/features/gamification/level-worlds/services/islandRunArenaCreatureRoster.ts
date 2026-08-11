import { MAX_ISLANDS } from './islandContentManifest';
import { ISLAND_RUN_ARENA_INTERVAL } from './islandRunArenaCreaturePresentation';

export type IslandRunArenaCreatureImplementationStatus = 'implemented' | 'planned';

export interface IslandRunArenaCreatureRosterEntry {
  arenaSlot: number;
  islandNumber: number;
  creatureId: string;
  name: string;
  implementationStatus: IslandRunArenaCreatureImplementationStatus;
}

const ARENA_NAMES = [
  ['rare-crown-drifter', 'Crown Drifter'],
  ['arena-reefback-champion', 'Reefback Champion'],
  ['arena-embercrest-rook', 'Embercrest Rook'],
  ['arena-cloudhorn-regent', 'Cloudhorn Regent'],
  ['arena-moss-titan', 'Moss Titan'],
  ['arena-moonveil-lynx', 'Moonveil Lynx'],
  ['arena-stormglass-roc', 'Stormglass Roc'],
  ['arena-sunken-oracle', 'Sunken Oracle'],
  ['arena-ironbloom-golem', 'Ironbloom Golem'],
  ['arena-aurora-leviathan', 'Aurora Leviathan'],
  ['arena-cinderwing-matriarch', 'Cinderwing Matriarch'],
  ['arena-prismjaw-sentinel', 'Prismjaw Sentinel'],
  ['arena-starroot-behemoth', 'Starroot Behemoth'],
  ['arena-tidal-crown-serpent', 'Tidal Crown Serpent'],
  ['arena-clockwork-chimera', 'Clockwork Chimera'],
  ['arena-dreamfen-stag', 'Dreamfen Stag'],
  ['arena-thunderreef-manta', 'Thunderreef Manta'],
  ['arena-lumen-drake', 'Lumen Drake'],
  ['arena-obsidian-bloom-warden', 'Obsidian Bloom Warden'],
  ['arena-celestial-tortoise', 'Celestial Tortoise'],
  ['arena-voidgarden-sphinx', 'Voidgarden Sphinx'],
  ['arena-solstice-phoenix', 'Solstice Phoenix'],
  ['arena-infinity-kirin', 'Infinity Kirin'],
  ['arena-first-light-colossus', 'First Light Colossus'],
] as const;

/**
 * Stable content identity for the 24 every-fifth-island opponents. Planned
 * entries deliberately remain outside the ordinary creature catalog until
 * their art, 3D model, egg, and acquisition metadata are production-ready.
 */
export const ISLAND_RUN_ARENA_CREATURE_ROSTER: readonly IslandRunArenaCreatureRosterEntry[] = ARENA_NAMES.map(
  ([creatureId, name], arenaSlot) => ({
    arenaSlot,
    islandNumber: (arenaSlot + 1) * ISLAND_RUN_ARENA_INTERVAL,
    creatureId,
    name,
    implementationStatus: arenaSlot === 0 ? 'implemented' : 'planned',
  }),
);

if (ISLAND_RUN_ARENA_CREATURE_ROSTER.length !== MAX_ISLANDS / ISLAND_RUN_ARENA_INTERVAL) {
  throw new Error('Arena creature roster must define one unique opponent for every fifth island.');
}

const ARENA_CREATURE_IDS = new Set(ISLAND_RUN_ARENA_CREATURE_ROSTER.map((entry) => entry.creatureId));
const ARENA_CREATURES_BY_ISLAND = new Map(ISLAND_RUN_ARENA_CREATURE_ROSTER.map((entry) => [entry.islandNumber, entry]));

export function getIslandRunArenaCreatureForIsland(islandNumber: number): IslandRunArenaCreatureRosterEntry | null {
  return ARENA_CREATURES_BY_ISLAND.get(islandNumber) ?? null;
}

export function isIslandRunArenaExclusiveCreatureId(creatureId: string): boolean {
  return ARENA_CREATURE_IDS.has(creatureId);
}
