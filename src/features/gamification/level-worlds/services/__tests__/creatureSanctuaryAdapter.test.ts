import { CREATURE_CATALOG } from '../creatureCatalog';
import { buildCreatureSanctuaryGalleryModel } from '../creatureSanctuaryAdapter';
import type { IslandRunGameStateRecord } from '../islandRunGameStateStore';
import { assert, assertDeepEqual, assertEqual, type TestCase } from './testHarness';

function createAdapterState(overrides: Partial<IslandRunGameStateRecord> = {}): IslandRunGameStateRecord {
  return {
    creatureCollection: [],
    activeCompanionId: null,
    perIslandEggs: {},
    eggRewardInventory: [],
    ...overrides,
  } as IslandRunGameStateRecord;
}

export const creatureSanctuaryAdapterTests: TestCase[] = [
  {
    name: 'buildCreatureSanctuaryGalleryModel maps discovered and locked catalog cards',
    run: () => {
      const catalog = CREATURE_CATALOG.slice(0, 3);
      const state = createAdapterState({
        creatureCollection: [
          {
            creatureId: catalog[0].id,
            copies: 2,
            firstCollectedAtMs: 100,
            lastCollectedAtMs: 200,
            lastCollectedIslandNumber: 4,
            bondXp: 75,
            bondLevel: 3,
            lastFedAtMs: null,
            claimedBondMilestones: [],
          },
        ],
        activeCompanionId: catalog[0].id,
      });

      const model = buildCreatureSanctuaryGalleryModel(state, catalog);

      assertEqual(model.summary.totalCreatures, 3, 'Expected all catalog creatures to become cards');
      assertEqual(model.summary.discoveredCreatures, 1, 'Expected one discovered creature');
      assertEqual(model.summary.lockedCreatures, 2, 'Expected remaining creatures to be locked');
      assertEqual(model.summary.activeCompanion?.creatureId, catalog[0].id, 'Expected active companion card');
      assertEqual(model.cards[0].copies, 2, 'Expected copies from runtime collection');
      assertEqual(model.cards[0].bondLevel, 3, 'Expected bond level from runtime collection');
      assertEqual(model.cards[0].starLabel, '★', 'Expected common rarity star label');
      assert(!model.cards[1].discovered, 'Expected undiscovered catalog creature to remain locked');
      assertEqual(model.cards[1].bondLevel, null, 'Expected locked creature to omit bond level');
    },
  },
  {
    name: 'buildCreatureSanctuaryGalleryModel exposes rarity labels and discovered tier counts',
    run: () => {
      const catalog = [
        CREATURE_CATALOG.find((creature) => creature.tier === 'common'),
        CREATURE_CATALOG.find((creature) => creature.tier === 'rare'),
        CREATURE_CATALOG.find((creature) => creature.tier === 'mythic'),
      ].filter((creature): creature is (typeof CREATURE_CATALOG)[number] => Boolean(creature));
      const state = createAdapterState({
        creatureCollection: catalog.map((creature, index) => ({
          creatureId: creature.id,
          copies: 1,
          firstCollectedAtMs: 100 + index,
          lastCollectedAtMs: 200 + index,
          lastCollectedIslandNumber: 1,
          bondXp: 0,
          bondLevel: 1,
          lastFedAtMs: null,
          claimedBondMilestones: [],
        })),
      });

      const model = buildCreatureSanctuaryGalleryModel(state, catalog);

      assertDeepEqual(
        model.cards.map((card) => [card.rarityLabel, card.starLabel]),
        [
          ['Common', '★'],
          ['Rare', '★★'],
          ['Mythic', '★★★'],
        ],
        'Expected rarity labels and stars for each tier',
      );
      assertEqual(model.summary.commonDiscovered, 1, 'Expected common discovered count');
      assertEqual(model.summary.rareDiscovered, 1, 'Expected rare discovered count');
      assertEqual(model.summary.mythicDiscovered, 1, 'Expected mythic discovered count');
    },
  },
  {
    name: 'buildCreatureSanctuaryGalleryModel summarizes safe egg counts without resolving eggs',
    run: () => {
      const model = buildCreatureSanctuaryGalleryModel(
        createAdapterState({
          perIslandEggs: {
            '1': { tier: 'common', setAtMs: 1, hatchAtMs: 2, status: 'incubating' },
            '2': { tier: 'rare', setAtMs: 1, hatchAtMs: 2, status: 'ready', location: 'dormant' },
            '3': { tier: 'common', setAtMs: 1, hatchAtMs: 2, status: 'collected' },
            '4': { tier: 'mythic', setAtMs: 1, hatchAtMs: 2, status: 'sold' },
          },
          eggRewardInventory: [
            {
              eggRewardId: 'reward-1',
              source: 'treasure_path',
              sourceSessionKey: 'session',
              sourceRunId: 'run',
              sourceRewardId: 'reward',
              tileId: 1,
              cycleIndex: 0,
              targetIslandNumber: 1,
              eggTier: 'common',
              eggSeed: 123,
              rarityRoll: 1,
              rarityRollDenominator: 500,
              rarityThreshold: 5,
              resolverVersion: 'treasure_path_egg_v1',
              status: 'unopened',
              grantedAtMs: 1,
              openedAtMs: null,
            },
            {
              eggRewardId: 'reward-2',
              source: 'treasure_path',
              sourceSessionKey: 'session',
              sourceRunId: 'run',
              sourceRewardId: 'reward',
              tileId: 2,
              cycleIndex: 0,
              targetIslandNumber: 1,
              eggTier: 'rare',
              eggSeed: 456,
              rarityRoll: 1,
              rarityRollDenominator: 500,
              rarityThreshold: 5,
              resolverVersion: 'treasure_path_egg_v1',
              status: 'opened',
              grantedAtMs: 1,
              openedAtMs: 2,
              openedCreatureId: 'common-sproutling',
            },
          ],
        }),
        CREATURE_CATALOG.slice(0, 1),
      );

      assertDeepEqual(
        model.summary.eggSummary,
        {
          activeEggs: 1,
          readyEggs: 1,
          dormantEggs: 1,
          collectedEggs: 1,
          soldEggs: 1,
          rewardEggsUnopened: 1,
          rewardEggsOpened: 1,
        },
        'Expected read-only egg summary counts',
      );
    },
  },
];
