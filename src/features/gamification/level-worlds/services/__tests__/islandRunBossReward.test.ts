import { getIslandRunBossReward, getIslandRunIslandClearDice } from '../islandRunBossReward';
import { resolveIslandCompleteTitleEntrance } from '../../components/IslandCompleteTitle';
import { assert, assertEqual, type TestCase } from './testHarness';

export const islandRunBossRewardTests: TestCase[] = [
  {
    name: 'island-clear dice start at 50 and step up by 5 every five islands to a cap of 120',
    run: () => {
      assertEqual(getIslandRunIslandClearDice(1), 50, 'Island 1 pays 50 dice');
      assertEqual(getIslandRunIslandClearDice(5), 50, 'Islands 1-5 share the first step');
      assertEqual(getIslandRunIslandClearDice(6), 55, 'Island 6 steps up to 55');
      assertEqual(getIslandRunIslandClearDice(20), 65, 'Island 20 pays 65');
      assertEqual(getIslandRunIslandClearDice(71), 120, 'the cap is reached on Island 71');
      assertEqual(getIslandRunIslandClearDice(120), 120, 'later islands stay at the cap');
      let previous = 0;
      for (let island = 1; island <= 120; island += 1) {
        const dice = getIslandRunIslandClearDice(island);
        assert(dice >= previous && dice <= 120, `dice never drop and never exceed 120 (island ${island})`);
        previous = dice;
      }
      assertEqual(getIslandRunBossReward(12).dice, getIslandRunIslandClearDice(12), 'the boss/island-clear payout uses the same curve');
    },
  },
  {
    name: 'island complete title rotates through four letter entrances',
    run: () => {
      const entrances = [1, 2, 3, 4, 5].map(resolveIslandCompleteTitleEntrance);
      assertEqual(entrances.slice(0, 4).join(','), 'wave,explode,pop,shrink', 'consecutive islands get different entrances');
      assertEqual(entrances[4], 'wave', 'the rotation repeats');
      assertEqual(resolveIslandCompleteTitleEntrance(Number.NaN), 'wave', 'bad input falls back safely');
    },
  },
  {
    name: 'island completion hands off through the Mission Phone signal, with no keep-playing exit',
    run: async () => {
      // @ts-ignore island-run test tsconfig omits node type libs
      const fsMod = await import('fs');
      const board = fsMod.readFileSync('src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx', 'utf8');
      assert(!board.includes('Keep Playing For Now'), 'the celebration no longer offers Keep Playing');
      assert(board.includes("'📡 Send assignment completed signal'"), 'the Mission Phone offers the completed signal');
      assert(/setShowIslandClearCelebration\(false\);\s*setIsIslandClearSignalPending\(true\);\s*setShowMissionPhoneBriefing\(true\);/.test(board), 'after claiming, the celebration closes and the Mission Phone opens on the signal step');
      assert(/const handleSendAssignmentCompletedSignal = \(\) => \{[\s\S]{0,260}void handleTravelFromCelebration\(\);/.test(board), 'sending the signal departs through the canonical, completion-checked travel path');
      assert(board.includes("isIslandClearSignalPending ? ' island-run-mission-phone--signal' : ''"), 'an unsent signal marks the phone icon');
    },
  },
];
