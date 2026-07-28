import {
  resolveStoryFastModeState,
  STORY_FAST_MODE_AUTO_ROLL_INTERVAL_MS,
  STORY_FAST_MODE_DICE_THRESHOLD,
  STORY_STANDARD_AUTO_ROLL_INTERVAL_MS,
} from '../islandRunStoryFastMode';
import { assertEqual, type TestCase } from './testHarness';

const record = (active = false) => ({
  technologyUnlocksById: active
    ? { 'story-fast-mode': { active: true, builtAtMs: 123 } }
    : {},
});

export const islandRunStoryFastModeTests: TestCase[] = [
  {
    name: 'story fast mode is available to Pro immediately',
    run: () => {
      const state = resolveStoryFastModeState({
        isStoryJourney: true,
        isPro: true,
        dicePool: 1,
        record: record(),
      });
      assertEqual(state.active, true, 'Pro story journey should be fast immediately');
      assertEqual(state.source, 'pro', 'Pro should be the source');
      assertEqual(state.shouldPersistUnlock, false, 'Pro access should not write an earned unlock');
    },
  },
  {
    name: 'free story journey permanently earns fast mode at 2000 dice',
    run: () => {
      const below = resolveStoryFastModeState({
        isStoryJourney: true,
        isPro: false,
        dicePool: STORY_FAST_MODE_DICE_THRESHOLD - 1,
        record: record(),
      });
      assertEqual(below.active, false, 'Fast mode should stay locked below the threshold');
      assertEqual(below.autoRollIntervalMs, STORY_STANDARD_AUTO_ROLL_INTERVAL_MS, 'Locked cadence stays standard');

      const reached = resolveStoryFastModeState({
        isStoryJourney: true,
        isPro: false,
        dicePool: STORY_FAST_MODE_DICE_THRESHOLD,
        record: record(),
      });
      assertEqual(reached.active, true, 'Fast mode should activate at the threshold');
      assertEqual(reached.source, 'earned', 'Threshold access should be earned');
      assertEqual(reached.shouldPersistUnlock, true, 'First threshold crossing should persist');
      assertEqual(reached.autoRollIntervalMs, STORY_FAST_MODE_AUTO_ROLL_INTERVAL_MS, 'Earned cadence should accelerate');
    },
  },
  {
    name: 'earned fast mode remains active after dice are spent',
    run: () => {
      const state = resolveStoryFastModeState({
        isStoryJourney: true,
        isPro: false,
        dicePool: 12,
        record: record(true),
      });
      assertEqual(state.active, true, 'Persisted unlock should survive a lower dice balance');
      assertEqual(state.permanentlyUnlocked, true, 'Unlock should be permanent');
      assertEqual(state.shouldPersistUnlock, false, 'Persisted unlock should not write twice');
    },
  },
  {
    name: 'fast mode never skips islands outside the story journey',
    run: () => {
      const state = resolveStoryFastModeState({
        isStoryJourney: false,
        isPro: true,
        dicePool: 10_000,
        record: record(true),
      });
      assertEqual(state.active, false, 'Non-story Island Run keeps its existing cadence');
      assertEqual(state.source, 'not-story', 'Non-story source should be explicit');
    },
  },
];
