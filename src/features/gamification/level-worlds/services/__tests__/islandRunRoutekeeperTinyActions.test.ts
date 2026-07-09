import {
  buildRoutekeeperSuggestedHabit,
  getRoutekeeperTinyActionForSignal,
  hasSuitableRoutekeeperHabit,
  ROUTEKEEPER_BODY_COPY,
  ROUTEKEEPER_FIRST_QUESTION,
  ROUTEKEEPER_SIGNAL_CHOICES,
  ROUTEKEEPER_SUCCESS_BODY,
  ROUTEKEEPER_SUCCESS_TITLE,
  ROUTEKEEPER_TINY_ACTIONS,
} from '../islandRunRoutekeeperTinyActions';
import { assert, assertEqual, type TestCase } from './testHarness';

export const islandRunRoutekeeperTinyActionsTests: TestCase[] = [
  {
    name: 'new player Routekeeper suggestions stay tiny and story-native',
    run: async () => {
      assertEqual(ROUTEKEEPER_FIRST_QUESTION, 'What is one good thing you already do, even sometimes?', 'Expected personal first question');
      assert(ROUTEKEEPER_BODY_COPY.includes('one real thing you already care about'), 'Expected already-care-about framing');
      assertEqual(ROUTEKEEPER_SIGNAL_CHOICES.length, 6, 'Expected six meaningful signal choices');
      assertEqual(ROUTEKEEPER_TINY_ACTIONS.length, 6, 'Expected six tiny Routekeeper actions');
      assert(ROUTEKEEPER_TINY_ACTIONS.includes('Drink one glass of water.'), 'Expected water action');
      assert(ROUTEKEEPER_TINY_ACTIONS.includes('Write one honest sentence.'), 'Expected honest sentence action');
      for (const action of ROUTEKEEPER_TINY_ACTIONS) {
        assert(action.endsWith('.'), `Expected punctuated copy for ${action}`);
        assert(action.split(/\s+/).length <= 7, `Expected small action copy for ${action}`);
        const suggested = buildRoutekeeperSuggestedHabit(action);
        assertEqual(suggested.difficultyTier, 'tiny', `${action}: expected tiny tier`);
        assertEqual(suggested.tinyVersion, action, `${action}: expected exact tiny action`);
      }
      assertEqual(ROUTEKEEPER_SUCCESS_TITLE, 'Routekeeper Steps relit.', 'Expected success title');
      assertEqual(ROUTEKEEPER_SUCCESS_BODY, 'One steady action is enough for today.', 'Expected success body');
    },
  },
  {
    name: 'signal choices map to canonical tiny actions',
    run: async () => {
      assertEqual(getRoutekeeperTinyActionForSignal('body'), 'Move for two minutes.', 'Body signal should anchor movement');
      assertEqual(getRoutekeeperTinyActionForSignal('energy'), 'Drink one glass of water.', 'Energy signal should anchor water');
      assertEqual(getRoutekeeperTinyActionForSignal('mind'), 'Write one honest sentence.', 'Mind signal should anchor reflection');
      assertEqual(getRoutekeeperTinyActionForSignal('home'), 'Reset one small surface.', 'Home signal should anchor reset');
      assertEqual(getRoutekeeperTinyActionForSignal('future'), 'Do one two-minute focus step.', 'Future signal should anchor focus');
      assertEqual(getRoutekeeperTinyActionForSignal('connection'), 'Send or answer one kind message.', 'Connection signal should anchor kindness');
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
