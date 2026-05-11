import { rollEggRewards } from '../eggService';
import { selectCreatureForEgg } from '../creatureCatalog';
import {
  resolveTreasurePathEggRewardOutcome,
  resolveTreasurePathEggTierFromRoll,
  TREASURE_PATH_EGG_RARITY_ROLL_DENOMINATOR,
  TREASURE_PATH_RARE_EGG_THRESHOLD,
  type TreasurePathEggRewardInput,
} from '../islandRunTreasurePathEggReward';
import {
  assert,
  assertDeepEqual,
  assertEqual,
  createMemoryStorage,
  installWindowWithStorage,
  type TestCase,
} from './testHarness';

const BASE_INPUT: TreasurePathEggRewardInput = {
  sessionKey: '2:60',
  runId: 'island-run-lucky-roll:2:60:1000:test-run',
  tileId: 12,
  rewardId: '2:60:12:egg:0',
  cycleIndex: 2,
  targetIslandNumber: 60,
};

export const islandRunTreasurePathEggRewardTests: TestCase[] = [
  {
    name: 'resolveTreasurePathEggRewardOutcome is deterministic for identical inputs',
    run: () => {
      const first = resolveTreasurePathEggRewardOutcome(BASE_INPUT);
      const second = resolveTreasurePathEggRewardOutcome({ ...BASE_INPUT });

      assertDeepEqual(second, first, 'Identical Treasure Path egg input should resolve to identical output');
    },
  },
  {
    name: 'Treasure Path rare chance threshold is exactly 5 in 500',
    run: () => {
      assertEqual(TREASURE_PATH_EGG_RARITY_ROLL_DENOMINATOR, 500, 'Rarity denominator should be 500');
      assertEqual(TREASURE_PATH_RARE_EGG_THRESHOLD, 5, 'Rare threshold should be 5');

      for (let roll = 0; roll < TREASURE_PATH_EGG_RARITY_ROLL_DENOMINATOR; roll += 1) {
        const expected = roll < TREASURE_PATH_RARE_EGG_THRESHOLD ? 'rare' : 'common';
        assertEqual(resolveTreasurePathEggTierFromRoll(roll), expected, `Roll ${roll} should resolve to expected tier`);
      }
    },
  },
  {
    name: 'different Treasure Path egg fields produce different deterministic rolls',
    run: () => {
      const first = resolveTreasurePathEggRewardOutcome(BASE_INPUT);
      const second = resolveTreasurePathEggRewardOutcome({
        ...BASE_INPUT,
        tileId: 18,
        rewardId: '2:60:18:egg:1',
      });

      assert(first.rarityRoll !== second.rarityRoll || first.eggSeed !== second.eggSeed, 'Different egg fields should alter deterministic outcome material');
    },
  },
  {
    name: 'Treasure Path egg resolver uses existing safe egg tier names',
    run: () => {
      const common = resolveTreasurePathEggTierFromRoll(TREASURE_PATH_RARE_EGG_THRESHOLD);
      const rare = resolveTreasurePathEggTierFromRoll(TREASURE_PATH_RARE_EGG_THRESHOLD - 1);
      const resolved = resolveTreasurePathEggRewardOutcome(BASE_INPUT);

      assert(['common', 'rare'].includes(common), 'Common branch should use an existing egg tier');
      assert(['common', 'rare'].includes(rare), 'Rare branch should use an existing egg tier');
      assert(['common', 'rare'].includes(resolved.eggTier), 'Resolved tier should be safe for existing egg tier consumers');
    },
  },
  {
    name: 'Treasure Path egg resolver does not use Math.random',
    run: () => {
      const originalRandom = Math.random;
      Math.random = () => {
        throw new Error('Math.random should not be used by Treasure Path egg resolver');
      };
      try {
        const first = resolveTreasurePathEggRewardOutcome(BASE_INPUT);
        const second = resolveTreasurePathEggRewardOutcome(BASE_INPUT);
        assertDeepEqual(second, first, 'Resolver should stay deterministic without Math.random');
      } finally {
        Math.random = originalRandom;
      }
    },
  },
  {
    name: 'Treasure Path eggSeed is stable for later reward and species resolution',
    run: () => {
      const outcome = resolveTreasurePathEggRewardOutcome(BASE_INPUT);
      const repeated = resolveTreasurePathEggRewardOutcome(BASE_INPUT);
      const rewards = rollEggRewards(outcome.eggTier, outcome.eggSeed);
      const repeatedRewards = rollEggRewards(repeated.eggTier, repeated.eggSeed);
      const creature = selectCreatureForEgg({
        eggTier: outcome.eggTier,
        seed: outcome.eggSeed,
        islandNumber: BASE_INPUT.targetIslandNumber,
      });
      const repeatedCreature = selectCreatureForEgg({
        eggTier: repeated.eggTier,
        seed: repeated.eggSeed,
        islandNumber: BASE_INPUT.targetIslandNumber,
      });

      assertEqual(outcome.eggSeed, repeated.eggSeed, 'eggSeed should be stable');
      assert(Number.isInteger(outcome.eggSeed) && outcome.eggSeed >= 0, 'eggSeed should be a non-negative integer');
      assertDeepEqual(repeatedRewards, rewards, 'eggSeed should produce stable rollEggRewards output');
      assertEqual(repeatedCreature.id, creature.id, 'eggSeed should produce stable creature selection');
    },
  },
  {
    name: 'Treasure Path egg resolver does not mutate input or hatchery/localStorage state',
    run: () => {
      const storage = createMemoryStorage();
      installWindowWithStorage(storage);
      const input = Object.freeze({ ...BASE_INPUT });

      const before = JSON.stringify(input);
      resolveTreasurePathEggRewardOutcome(input);

      assertEqual(JSON.stringify(input), before, 'Resolver should not mutate input');
      assertEqual(window.localStorage.length, 0, 'Resolver should not write localStorage hatchery state');
    },
  },
];
