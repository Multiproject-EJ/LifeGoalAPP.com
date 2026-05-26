import { buildCreatureSanctuaryGalleryModel } from '../creatureSanctuaryAdapter';
import { CREATURE_CATALOG } from '../creatureCatalog';
import {
  deriveCreatureCollectionProgressFromGalleryModel,
  formatCreatureCollectionProgress,
} from '../creatureCollectionProgress';
import type { IslandRunGameStateRecord } from '../islandRunGameStateStore';
import { assertEqual, type TestCase } from './testHarness';

function createGalleryState(discoveredIds: string[]): IslandRunGameStateRecord {
  const nowMs = 1_710_000_000_000;
  return {
    creatureCollection: discoveredIds.map((creatureId, index) => ({
      creatureId,
      copies: 1,
      firstCollectedAtMs: nowMs + index,
      lastCollectedAtMs: nowMs + index,
      lastCollectedIslandNumber: 1,
      bondXp: 0,
      bondLevel: 1,
      claimedBondMilestones: [],
    })),
    perIslandEggs: {},
    eggRewardInventory: [],
  } as unknown as IslandRunGameStateRecord;
}

export const creatureCollectionProgressTests: TestCase[] = [
  {
    name: 'formats normal collection progress with zero-padded discovered count',
    run: () => {
      assertEqual(formatCreatureCollectionProgress(8, 45), '08/45', 'should format 8 of 45');
    },
  },
  {
    name: 'formats zero discovered count',
    run: () => {
      assertEqual(formatCreatureCollectionProgress(0, 45), '00/45', 'should format 0 of 45');
    },
  },
  {
    name: 'formats full collection progress',
    run: () => {
      assertEqual(formatCreatureCollectionProgress(45, 45), '45/45', 'should format full collection');
    },
  },
  {
    name: 'clamps negative discovered values to zero',
    run: () => {
      assertEqual(formatCreatureCollectionProgress(-4, 45), '00/45', 'negative discovered should clamp to zero');
    },
  },
  {
    name: 'clamps discovered values above total down to total',
    run: () => {
      assertEqual(formatCreatureCollectionProgress(99, 45), '45/45', 'discovered above total should clamp to total');
    },
  },
  {
    name: 'returns deterministic safe output when total is zero or negative',
    run: () => {
      assertEqual(formatCreatureCollectionProgress(5, 0), '00/00', 'total zero should return safe default');
      assertEqual(formatCreatureCollectionProgress(5, -3), '00/00', 'negative total should return safe default');
    },
  },
  {
    name: 'pads discovered count width using total digit width with floor of 2',
    run: () => {
      assertEqual(formatCreatureCollectionProgress(8, 120), '008/120', '3-digit totals should use 3-digit discovered padding');
      assertEqual(formatCreatureCollectionProgress(8, 9), '08/9', 'single-digit totals should still keep 2-digit discovered padding');
    },
  },
  {
    name: 'derives progress label from sanctuary gallery summary counts',
    run: () => {
      const discoveredIds = CREATURE_CATALOG.slice(0, 3).map((creature) => creature.id);
      const gallery = buildCreatureSanctuaryGalleryModel(createGalleryState(discoveredIds), CREATURE_CATALOG);
      assertEqual(
        deriveCreatureCollectionProgressFromGalleryModel(gallery),
        formatCreatureCollectionProgress(3, CREATURE_CATALOG.length),
        'derived label should match formatted summary counts',
      );
    },
  },
];
