import {
  buildRoutekeeperSuggestedHabit,
  hasSuitableRoutekeeperHabit,
  ROUTEKEEPER_SUCCESS_BODY,
  ROUTEKEEPER_SUCCESS_TITLE,
  ROUTEKEEPER_TINY_ACTIONS,
} from '../islandRunRoutekeeperTinyActions';
import { assert, assertEqual, type TestCase } from './testHarness';

export const islandRunRoutekeeperTinyActionsTests: TestCase[] = [
  {
    name: 'new player Routekeeper suggestions stay tiny and story-native',
    run: async () => {
      assertEqual(ROUTEKEEPER_TINY_ACTIONS.length, 5, 'Expected five tiny Routekeeper actions');
      assert(ROUTEKEEPER_TINY_ACTIONS.includes('Drink one glass of water.'), 'Expected water action');
      assert(ROUTEKEEPER_TINY_ACTIONS.includes('Take one deep breath.'), 'Expected breath action');
      for (const action of ROUTEKEEPER_TINY_ACTIONS) {
        assert(action.endsWith('.'), `Expected punctuated copy for ${action}`);
        assert(action.split(/\s+/).length <= 5, `Expected extremely small action copy for ${action}`);
        const suggested = buildRoutekeeperSuggestedHabit(action);
        assertEqual(suggested.difficultyTier, 'tiny', `${action}: expected tiny tier`);
        assertEqual(suggested.tinyVersion, action, `${action}: expected exact tiny action`);
      }
      assertEqual(ROUTEKEEPER_SUCCESS_TITLE, 'Routekeeper Steps relit.', 'Expected success title');
      assertEqual(ROUTEKEEPER_SUCCESS_BODY, 'One steady action is enough for today.', 'Expected success body');
    },
  },
  {
    name: 'existing active habits are suitable so users are not forced into duplicate setup',
    run: async () => {
      assertEqual(hasSuitableRoutekeeperHabit([]), false, 'No habits should trigger Routekeeper tiny-action setup');
      assertEqual(hasSuitableRoutekeeperHabit([{ title: 'Meditate', archived: false, status: 'active' }]), true, 'Active habit should preserve existing flow');
      assertEqual(hasSuitableRoutekeeperHabit([{ title: 'Old habit', archived: true, status: 'archived' }]), false, 'Archived habit should not count');
      assertEqual(hasSuitableRoutekeeperHabit([{ title: 'Paused habit', archived: false, status: 'paused' }]), false, 'Paused habit should not count');
    },
  },
];
