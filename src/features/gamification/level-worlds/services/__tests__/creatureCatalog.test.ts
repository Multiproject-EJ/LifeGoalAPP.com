import {
  CREATURE_CATALOG,
  getCompanionBonusForCreature,
  getCreatureSpecialtyForCompanion,
  resolveShipZoneForCreature,
  resolveShipZoneFromHabitat,
  selectCreatureForEgg,
  selectCreatureForEggWithEarlyFeaturedPool,
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
    name: 'early featured pool resolver returns baseline when feature flag is off',
    run: () => {
      const baseline = selectCreatureForEgg({ eggTier: 'rare', seed: 44444, islandNumber: 3 });
      const flaggedOff = selectCreatureForEggWithEarlyFeaturedPool({
        eggTier: 'rare',
        seed: 44444,
        islandNumber: 3,
        earlyFeaturedPool: { enabled: false },
      });
      assertEqual(flaggedOff.id, baseline.id, 'Expected exact baseline creature when flag is off');
    },
  },
  {
    name: 'early featured pool can return sproutling for common eggs on islands 1-5',
    run: () => {
      const creature = selectCreatureForEggWithEarlyFeaturedPool({
        eggTier: 'common',
        seed: 12345,
        islandNumber: 1,
        earlyFeaturedPool: { enabled: true, featuredWeightPercent: 100 },
      });
      assertEqual(creature.id, 'common-sproutling', 'Expected featured common creature for island 1');
    },
  },
  {
    name: 'early featured pool returns only featured rare creatures for islands 1-5',
    run: () => {
      const allowed = new Set(['rare-aurora-finch', 'rare-nebula-wisp', 'rare-ember-sprout']);
      const creature = selectCreatureForEggWithEarlyFeaturedPool({
        eggTier: 'rare',
        seed: 98765,
        islandNumber: 5,
        earlyFeaturedPool: { enabled: true, featuredWeightPercent: 100 },
      });
      assert(allowed.has(creature.id), `Expected rare featured creature, got ${creature.id}`);
    },
  },
  {
    name: 'early featured pool keeps mythic tier constrained to starhorn on early islands',
    run: () => {
      const creature = selectCreatureForEggWithEarlyFeaturedPool({
        eggTier: 'mythic',
        seed: 24680,
        islandNumber: 4,
        earlyFeaturedPool: { enabled: true, featuredWeightPercent: 100 },
      });
      assertEqual(creature.id, 'mythic-starhorn-seraph', 'Expected mythic early featured creature');
    },
  },
  {
    name: 'early featured pool falls back to baseline on island 6+',
    run: () => {
      const baseline = selectCreatureForEgg({ eggTier: 'rare', seed: 24680, islandNumber: 6 });
      const featured = selectCreatureForEggWithEarlyFeaturedPool({
        eggTier: 'rare',
        seed: 24680,
        islandNumber: 6,
        earlyFeaturedPool: { enabled: true, featuredWeightPercent: 100 },
      });
      assertEqual(featured.id, baseline.id, 'Expected baseline behavior on islands after early window');
    },
  },
  {
    name: 'early featured pool resolver remains deterministic for same inputs',
    run: () => {
      const first = selectCreatureForEggWithEarlyFeaturedPool({
        eggTier: 'rare',
        seed: 314159,
        islandNumber: 2,
        earlyFeaturedPool: { enabled: true, featuredWeightPercent: 70 },
      });
      const second = selectCreatureForEggWithEarlyFeaturedPool({
        eggTier: 'rare',
        seed: 314159,
        islandNumber: 2,
        earlyFeaturedPool: { enabled: true, featuredWeightPercent: 70 },
      });
      assertEqual(first.id, second.id, 'Expected deterministic featured resolver');
    },
  },
  {
    name: 'early featured pool never leaks across tiers',
    run: () => {
      const creature = selectCreatureForEggWithEarlyFeaturedPool({
        eggTier: 'common',
        seed: 54321,
        islandNumber: 3,
        earlyFeaturedPool: { enabled: true, featuredWeightPercent: 100 },
      });
      assertEqual(creature.tier, 'common', 'Expected common egg to stay in common tier');
    },
  },
  {
    name: 'guardian-style affinities grant essence companion bonuses that scale every 5 bond levels',
    run: () => {
      const creature = selectCreatureForEgg({ eggTier: 'common', seed: 12345, islandNumber: 1 });
      const bonus = getCompanionBonusForCreature({ ...creature, affinity: 'Guardian' }, 6);
      assertEqual(bonus.effect, 'bonus_essence', 'Expected guardian affinity to grant essence');
      assertEqual(bonus.amount, 10, 'Expected bonus to scale at bond level 6 (2 * 5 essence)');
      assertEqual(bonus.nextBondMilestoneLevel, 11, 'Expected next essence milestone at level 11');
    },
  },
  {
    name: 'builder-style affinities grant sell bonus specialties',
    run: () => {
      const creature = selectCreatureForEgg({ eggTier: 'common', seed: 67890, islandNumber: 3 });
      const specialty = getCreatureSpecialtyForCompanion({ ...creature, affinity: 'Builder' }, 5);
      assertEqual(specialty.effect, 'sell_bonus_essence', 'Expected builder affinity to boost sell rewards');
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
