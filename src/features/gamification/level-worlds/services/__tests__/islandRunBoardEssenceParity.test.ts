import { assert } from './testHarness';
import type { TestCase } from './testHarness';

declare const process: { cwd: () => string };

async function readBoardSource(): Promise<string> {
  // @ts-ignore island-run test tsconfig omits node type libs
  const fsMod = await import('fs');
  // @ts-ignore island-run test tsconfig omits node type libs
  const pathMod = await import('path');
  const boardPath = pathMod.resolve(process.cwd(), 'src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx');
  return fsMod.readFileSync(boardPath, 'utf8');
}

export const islandRunBoardEssenceParityTests: TestCase[] = [
  {
    name: 'encounter/boss/sanctuary/wisdom essence awards remain direct runtime-state increments (legacy parity)',
    run: async () => {
      const source = await readBoardSource();

      assert(
        source.includes("essence: prev.essence + totalEncounterEssence") &&
          source.includes("essenceLifetimeEarned: prev.essenceLifetimeEarned + totalEncounterEssence"),
        'Encounter reward should preserve direct runtime-state essence increment semantics.',
      );

      assert(
        source.includes("essence: prev.essence + bossReward.essence") &&
          source.includes("essenceLifetimeEarned: prev.essenceLifetimeEarned + bossReward.essence"),
        'Boss reward should preserve direct runtime-state essence increment semantics.',
      );

      assert(
        source.includes("essence: prev.essence + rewardEssence") &&
          source.includes("essenceLifetimeEarned: prev.essenceLifetimeEarned + rewardEssence"),
        'Sanctuary bond rewards should preserve direct runtime-state essence increment semantics.',
      );

      assert(
        source.includes('essence: prev.essence + WISDOM_ESSENCE_BONUS_AMOUNT') &&
          source.includes('essenceLifetimeEarned: prev.essenceLifetimeEarned + WISDOM_ESSENCE_BONUS_AMOUNT'),
        'Wisdom bonus should preserve direct runtime-state essence increment semantics.',
      );
    },
  },
  {
    name: 'legacy parity guard: board essence reward paths do not call awardContractV2Essence',
    run: async () => {
      const source = await readBoardSource();
      assert(
        !source.includes("awardContractV2Essence(totalEncounterEssence, 'encounter_reward')"),
        'Encounter reward should not route via canonical helper in parity mode.',
      );
      assert(
        !source.includes("awardContractV2Essence(bossReward.essence, 'boss_trial_reward')"),
        'Boss reward should not route via canonical helper in parity mode.',
      );
      assert(
        !source.includes("awardContractV2Essence(rewardEssence, 'sanctuary_bond_reward_claim')"),
        'Sanctuary bond reward should not route via canonical helper in parity mode.',
      );
      assert(
        !source.includes("awardContractV2Essence(WISDOM_ESSENCE_BONUS_AMOUNT, 'wisdom_essence_bonus')"),
        'Wisdom bonus should not route via canonical helper in parity mode.',
      );
    },
  },
  {
    name: 'story reward duplicate handler remains removed; only IslandStoryReader onRewardClaim path is kept',
    run: async () => {
      const source = await readBoardSource();
      assert(
        !source.includes('const handleStoryRewardClaim ='),
        'Duplicate local story reward handler should remain removed to prevent split wiring.',
      );
      assert(
        source.includes('onRewardClaim={sanctuaryHandlers.storyRewardClaim}'),
        'IslandStoryReader should remain wired to sanctuaryHandlers.storyRewardClaim.',
      );
    },
  },
];
