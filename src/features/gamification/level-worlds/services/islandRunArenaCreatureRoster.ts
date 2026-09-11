import { MAX_ISLANDS } from './islandContentManifest';
import {
  ISLAND_RUN_ARENA_CREATURE_COUNT,
  ISLAND_RUN_ARENA_INTERVAL,
  isIslandRunArenaIsland,
} from './islandRunArenaCreaturePresentation';

export type IslandRunArenaCreatureImplementationStatus = 'implemented' | 'planned';

export interface IslandRunArenaCreatureRosterEntry {
  arenaSlot: number;
  islandNumber: number;
  creatureId: string;
  name: string;
  implementationStatus: IslandRunArenaCreatureImplementationStatus;
}

const ARENA_IDENTITIES = [
  [5, 'rare-crown-drifter', 'Crown Drifter'],
  [10, 'arena-reefback-champion', 'Reefback Champion'],
  [20, 'arena-cloudhorn-regent', 'Cloudhorn Regent'],
  [25, 'arena-moss-titan', 'Moss Titan'],
  [30, 'arena-moonveil-lynx', 'Moonveil Lynx'],
  [35, 'arena-stormglass-roc', 'Stormglass Roc'],
  [40, 'arena-sunken-oracle', 'Sunken Oracle'],
  [45, 'arena-ironbloom-golem', 'Ironbloom Golem'],
  [50, 'arena-aurora-leviathan', 'Aurora Leviathan'],
  [55, 'arena-cinderwing-matriarch', 'Cinderwing Matriarch'],
  [60, 'arena-prismjaw-sentinel', 'Prismjaw Sentinel'],
  [65, 'arena-starroot-behemoth', 'Starroot Behemoth'],
  [70, 'arena-tidal-crown-serpent', 'Tidal Crown Serpent'],
  [75, 'arena-clockwork-chimera', 'Clockwork Chimera'],
  [80, 'arena-dreamfen-stag', 'Dreamfen Stag'],
  [85, 'arena-thunderreef-manta', 'Thunderreef Manta'],
  [90, 'arena-lumen-drake', 'Lumen Drake'],
  [95, 'arena-obsidian-bloom-warden', 'Obsidian Bloom Warden'],
  [100, 'arena-celestial-tortoise', 'Celestial Tortoise'],
  [105, 'arena-voidgarden-sphinx', 'Voidgarden Sphinx'],
  [110, 'arena-solstice-phoenix', 'Solstice Phoenix'],
  [115, 'arena-infinity-kirin', 'Infinity Kirin'],
  [120, 'arena-first-light-colossus', 'First Light Colossus'],
] as const;

/**
 * Stable content identity for arena opponents. Cadence slots remain tied to
 * their island number, so Island 015's ordinary-Boss exception leaves slot 2
 * intentionally unused rather than renumbering every later opponent. Planned
 * entries remain outside the ordinary creature catalog until production-ready.
 */
export const ISLAND_RUN_ARENA_CREATURE_ROSTER: readonly IslandRunArenaCreatureRosterEntry[] = ARENA_IDENTITIES.map(
  ([islandNumber, creatureId, name]) => ({
    arenaSlot: islandNumber / ISLAND_RUN_ARENA_INTERVAL - 1,
    islandNumber,
    creatureId,
    name,
    implementationStatus: islandNumber === 5 ? 'implemented' : 'planned',
  }),
);

if (
  ISLAND_RUN_ARENA_CREATURE_ROSTER.length !== ISLAND_RUN_ARENA_CREATURE_COUNT
  || ISLAND_RUN_ARENA_CREATURE_ROSTER.some((entry) => !isIslandRunArenaIsland(entry.islandNumber))
  || ISLAND_RUN_ARENA_CREATURE_ROSTER.some((entry) => entry.islandNumber > MAX_ISLANDS)
) {
  throw new Error('Arena creature roster must match the arena cadence and its documented ordinary-Boss exceptions.');
}

const ARENA_CREATURE_IDS = new Set(ISLAND_RUN_ARENA_CREATURE_ROSTER.map((entry) => entry.creatureId));
const ARENA_CREATURES_BY_ISLAND = new Map(ISLAND_RUN_ARENA_CREATURE_ROSTER.map((entry) => [entry.islandNumber, entry]));

export function getIslandRunArenaCreatureForIsland(islandNumber: number): IslandRunArenaCreatureRosterEntry | null {
  return ARENA_CREATURES_BY_ISLAND.get(islandNumber) ?? null;
}

export function isIslandRunArenaExclusiveCreatureId(creatureId: string): boolean {
  return ARENA_CREATURE_IDS.has(creatureId);
}
