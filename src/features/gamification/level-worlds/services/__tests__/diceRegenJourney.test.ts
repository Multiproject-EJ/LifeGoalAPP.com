import { assert, assertEqual, type TestCase } from './testHarness';
import { resolveDiceRegenConfig, resolveDiceRegenJourney } from '../islandRunDiceRegeneration';

export const diceRegenJourneyTests: TestCase[] = [
  {
    name: 'dice engine journey: history so far, where you are, and the next upgrade',
    run: () => {
      const start = resolveDiceRegenJourney(1);
      assertEqual(start.current.maxDice, 30, 'level 1 tank');
      assertEqual(start.next?.minLevel, 5, 'next upgrade at level 5');
      assertEqual(start.levelsToNext, 4, 'four levels to go');
      assertEqual(start.maxDiceGainedSinceStart, 0, 'nothing gained yet');
      const mid = resolveDiceRegenJourney(12);
      assertEqual(mid.current.maxDice, resolveDiceRegenConfig(12).maxDice, 'matches the live regen config');
      assertEqual(mid.steps.filter((step) => step.status === 'reached').length, 2, 'two bands already unlocked');
      assertEqual(mid.steps.filter((step) => step.status === 'current').length, 1, 'one current band');
      assertEqual(mid.next?.status, 'next', 'the next band is highlighted');
      assertEqual(mid.levelsToNext, 8, 'level 20 is eight levels away');
      assertEqual(mid.maxDiceGainedSinceStart, 45, '+45 tank since level 1');
      const top = resolveDiceRegenJourney(500);
      assertEqual(top.next, null, 'max engine has no next step');
      assert(top.steps.every((step) => step.status === 'reached' || step.status === 'current'), 'all bands unlocked');
      assertEqual(resolveDiceRegenJourney(Number.NaN).level, 1, 'invalid level is safe');
    },
  },
];
