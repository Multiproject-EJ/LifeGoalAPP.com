import {
  CREATURE_CATALOG,
  getCompanionBonusForCreature,
  getCreatureSpecialtyForCompanion,
  resolveShipZoneForCreature,
  resolveShipZoneFromHabitat,
  selectCreatureForEgg,
} from '../creatureCatalog';
import { assert, assertEqual, type TestCase } from './testHarness';

export const creatureCatalogTests: TestCase[] = [
  {
    name: 'selectCreatureForEgg is deterministic for identical inputs',
    run: () => {
      const first = selectCreatureForEgg({ eggTier: 'rare', seed: 12345, islandNumber: 8 });
      const second = selectCreatureForEgg({ eggTier: 'rare', seed: 12345, islandNumber: 8 });
      assertEqual(first.id, second.id, 'Expected deterministic creature selection');
    },
  },
  {
    name: 'guardian-style affinities grant heart companion bonuses that scale every 5 bond levels',
    run: () => {
      const creature = selectCreatureForEgg({ eggTier: 'common', seed: 12345, islandNumber: 1 });
      const bonus = getCompanionBonusForCreature({ ...creature, affinity: 'Guardian' }, 6);
      assertEqual(bonus.effect, 'bonus_heart', 'Expected guardian affinity to grant hearts');
      assertEqual(bonus.amount, 2, 'Expected bonus to scale at bond level 6');
      assertEqual(bonus.nextBondMilestoneLevel, 11, 'Expected next heart milestone at level 11');
    },
  },
  {
    name: 'builder-style affinities grant sell bonus specialties',
    run: () => {
      const creature = selectCreatureForEgg({ eggTier: 'common', seed: 67890, islandNumber: 3 });
      const specialty = getCreatureSpecialtyForCompanion({ ...creature, affinity: 'Builder' }, 5);
      assertEqual(specialty.effect, 'sell_bonus_coins', 'Expected builder affinity to boost sell rewards');
      assert(specialty.amount >= 20, 'Expected builder specialty amount to scale upward');
    },
  },
  {
    name: 'all 45 creatures have an explicit shipZone metadata value',
    run: () => {
      assertEqual(CREATURE_CATALOG.length, 45, 'Expected full 45-creature catalog');
      CREATURE_CATALOG.forEach((creature) => {
        assert(
          creature.shipZone === 'zen' || creature.shipZone === 'energy' || creature.shipZone === 'cosmic',
          `Expected shipZone for ${creature.id}`,
        );
      });
    },
  },
  {
    name: 'ship zone fallback resolver maps known habitats to deterministic zones',
    run: () => {
      assertEqual(resolveShipZoneFromHabitat('Zen Garden'), 'zen', 'Expected zen habitat mapping');
      assertEqual(resolveShipZoneFromHabitat('Sky Foundry'), 'energy', 'Expected energy habitat mapping');
      assertEqual(resolveShipZoneFromHabitat('Astral Dome'), 'cosmic', 'Expected cosmic habitat mapping');
      assertEqual(resolveShipZoneFromHabitat('Unknown Habitat'), 'zen', 'Unknown habitat should fallback to zen');

      const creature = CREATURE_CATALOG[0];
      assertEqual(resolveShipZoneForCreature(creature), creature.shipZone, 'Expected resolver to honor explicit shipZone metadata');
    },
  },
];
