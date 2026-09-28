import {
  getEggManiaPopupSeenKey,
  markEggManiaPopupSeen,
  readEggManiaPopupSeen,
  shouldAutoShowEggManiaPopup,
} from '../eggManiaPopup';
import { assert, assertEqual, createMemoryStorage, installWindowWithStorage, type TestCase } from './testHarness';

const ready = {
  eggFeatureUnlocked: true,
  eggManiaActive: true,
  eggManiaConsumed: false,
  alreadySeen: false,
  screenBusy: false,
};

export const eggManiaPopupTests: TestCase[] = [
  {
    name: 'Egg Mania pops up on an active island with an unused triple set when the screen is free',
    run: () => {
      assert(shouldAutoShowEggManiaPopup(ready), 'fresh Egg Mania island announces itself');
      assert(!shouldAutoShowEggManiaPopup({ ...ready, eggManiaActive: false }), 'quiet islands stay quiet');
      assert(!shouldAutoShowEggManiaPopup({ ...ready, eggManiaConsumed: true }), 'no pop-up after the triple batch is set');
      assert(!shouldAutoShowEggManiaPopup({ ...ready, eggFeatureUnlocked: false }), 'no pop-up before eggs unlock');
      assert(!shouldAutoShowEggManiaPopup({ ...ready, screenBusy: true }), 'waits while another modal or roll owns the screen');
      assert(!shouldAutoShowEggManiaPopup({ ...ready, alreadySeen: true }), 'only once per island visit');
    },
  },
  {
    name: 'the seen marker is per player, cycle and island',
    run: () => {
      installWindowWithStorage(createMemoryStorage());
      const key = getEggManiaPopupSeenKey('player', 0, 7);
      assert(!readEggManiaPopupSeen(key), 'unseen at first');
      markEggManiaPopupSeen(key);
      assert(readEggManiaPopupSeen(key), 'remembered after showing');
      assert(!readEggManiaPopupSeen(getEggManiaPopupSeenKey('player', 0, 8)), 'another island still announces');
      assert(!readEggManiaPopupSeen(getEggManiaPopupSeenKey('player', 1, 7)), 'the next cycle announces again');
      assertEqual(getEggManiaPopupSeenKey('p', -3, 0.4), 'lifegoal:egg-mania-popup:seen:p:0:1', 'inputs are normalised');
    },
  },
  {
    name: 'the Egg Mania pop-up is a scroll-locked viewport portal wired to the board',
    run: async () => {
      // @ts-ignore Node test runner provides fs.
      const fs = await import('fs');
      const component = fs.readFileSync('src/features/gamification/level-worlds/components/EggManiaPopup.tsx', 'utf8');
      assert(component.includes('createPortal') && component.includes('lockPageScroll()'), 'portal with scroll lock');
      const css = fs.readFileSync('src/features/gamification/level-worlds/components/egg-mania-popup.css', 'utf8');
      assert(/\.egg-mania-popup \{[^}]*position: fixed/.test(css), 'viewport-fixed overlay');
      const board = fs.readFileSync('src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx', 'utf8');
      assert(board.includes('shouldAutoShowEggManiaPopup({'), 'board auto-announces Egg Mania');
      assert(board.includes('<EggManiaPopup'), 'icon and auto pop-up share the new component');
    },
  },
];
