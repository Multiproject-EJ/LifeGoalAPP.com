import {
  canCreatureBeAcquiredFromSource,
  getCreatureAcquisitionPool,
  getCreatureById,
  selectCreatureForEgg,
} from '../creatureCatalog';
import {
  getIslandRunArenaCreatureForIsland,
  ISLAND_RUN_ARENA_CREATURE_ROSTER,
} from '../islandRunArenaCreatureRoster';
import { buildCreaturePackCards } from '../islandRunCreaturePackResolver';
import type { IslandRunGameStateRecord } from '../islandRunGameStateStore';
import { assert, assertEqual, type TestCase } from './testHarness';

const CROWN_DRIFTER_ID = 'rare-crown-drifter';

function packState(): IslandRunGameStateRecord {
  return {
    currentIslandNumber: 5,
    cycleIndex: 0,
    runtimeVersion: 1,
    creatureCollection: [],
  } as unknown as IslandRunGameStateRecord;
}

export const islandRunArenaCreatureRosterTests: TestCase[] = [
  {
    name: 'defines 24 unique creature identities on Islands 005 through 120',
    run: () => {
      assertEqual(ISLAND_RUN_ARENA_CREATURE_ROSTER.length, 24, 'one identity is reserved for every fifth island');
      assertEqual(ISLAND_RUN_ARENA_CREATURE_ROSTER[0]?.islandNumber, 5, 'first identity belongs to Island 005');
      assertEqual(ISLAND_RUN_ARENA_CREATURE_ROSTER[23]?.islandNumber, 120, 'last identity belongs to Island 120');
      assertEqual(new Set(ISLAND_RUN_ARENA_CREATURE_ROSTER.map((entry) => entry.creatureId)).size, 24, 'creature ids must be unique');
      assertEqual(new Set(ISLAND_RUN_ARENA_CREATURE_ROSTER.map((entry) => entry.name)).size, 24, 'creature names must be unique');
      ISLAND_RUN_ARENA_CREATURE_ROSTER.forEach((entry, arenaSlot) => {
        assertEqual(entry.arenaSlot, arenaSlot, `slot ${arenaSlot} should stay stable`);
        assertEqual(entry.islandNumber, (arenaSlot + 1) * 5, `slot ${arenaSlot} should map to its fifth island`);
        assertEqual(getIslandRunArenaCreatureForIsland(entry.islandNumber)?.creatureId, entry.creatureId, `Island ${entry.islandNumber} should resolve its reserved opponent`);
      });
    },
  },
  {
    name: 'marks only the completed Island 005 pilot as implemented',
    run: () => {
      const implemented = ISLAND_RUN_ARENA_CREATURE_ROSTER.filter((entry) => entry.implementationStatus === 'implemented');
      assertEqual(implemented.length, 1, 'future creatures must not masquerade as completed assets');
      assertEqual(implemented[0]?.creatureId, CROWN_DRIFTER_ID, 'Crown Drifter is the implemented pilot');
      assertEqual(getCreatureById(CROWN_DRIFTER_ID)?.name, 'Crown Drifter', 'existing collections can still resolve the creature metadata');
    },
  },
  {
    name: 'source eligibility makes Crown Drifter arena-only without blocking explicit dev grants',
    run: () => {
      assertEqual(canCreatureBeAcquiredFromSource(CROWN_DRIFTER_ID, 'arena'), true, 'arena victory may grant Crown Drifter');
      assertEqual(canCreatureBeAcquiredFromSource(CROWN_DRIFTER_ID, 'generic_egg'), false, 'ordinary eggs must not grant Crown Drifter');
      assertEqual(canCreatureBeAcquiredFromSource(CROWN_DRIFTER_ID, 'creature_pack'), false, 'ordinary packs must not grant Crown Drifter');
      assertEqual(canCreatureBeAcquiredFromSource(CROWN_DRIFTER_ID, 'dev'), true, 'explicit development fixtures remain possible');
      assertEqual(canCreatureBeAcquiredFromSource('common-sproutling', 'generic_egg'), true, 'ordinary creatures remain available to eggs');
      assertEqual(canCreatureBeAcquiredFromSource('common-sproutling', 'arena'), false, 'ordinary creature identity is not silently treated as an arena reward');
    },
  },
  {
    name: 'ordinary egg pools have an empty intersection with the implemented arena roster',
    run: () => {
      const arenaIds = new Set(ISLAND_RUN_ARENA_CREATURE_ROSTER.map((entry) => entry.creatureId));
      const ordinaryIds = new Set(getCreatureAcquisitionPool({ source: 'generic_egg' }).map((entry) => entry.id));
      assertEqual([...arenaIds].filter((creatureId) => ordinaryIds.has(creatureId)).length, 0, 'generic egg candidates and arena roster must not intersect');
      for (let seed = 0; seed < 500; seed += 1) {
        const creature = selectCreatureForEgg({ eggTier: 'rare', seed, islandNumber: (seed % 120) + 1 });
        assert(!arenaIds.has(creature.id), `generic egg seed ${seed} leaked ${creature.id}`);
      }
    },
  },
  {
    name: 'ordinary creature packs exclude arena identities in tier and fallback paths',
    run: () => {
      const arenaIds = new Set(ISLAND_RUN_ARENA_CREATURE_ROSTER.map((entry) => entry.creatureId));
      const packPool = getCreatureAcquisitionPool({ source: 'creature_pack' });
      assertEqual(packPool.filter((entry) => arenaIds.has(entry.id)).length, 0, 'pack candidate pool and arena roster must not intersect');

      for (let openedAtMs = 1; openedAtMs <= 120; openedAtMs += 1) {
        const cards = buildCreaturePackCards({
          current: packState(),
          openedAtMs,
          userId: `arena-exclusion-${openedAtMs}`,
          seedScope: 'arena_exclusion_regression',
          slotWeights: Array.from({ length: 5 }, () => [{ tier: 'rare' as const, weight: 1 }]),
          minNewCreatureCards: 5,
        });
        assert(cards.every((card) => !arenaIds.has(card.creatureId)), `pack ${openedAtMs} leaked an arena creature`);
      }
    },
  },
];
