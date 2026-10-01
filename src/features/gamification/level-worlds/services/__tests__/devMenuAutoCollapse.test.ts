import { assert, type TestCase } from './testHarness';

const BOARD = 'src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx';
const DEBUG = 'src/features/gamification/level-worlds/components/IslandRunDebugPanel.tsx';

export const devMenuAutoCollapseTests: TestCase[] = [
  {
    name: 'dev menus: board-affecting actions collapse the menu so the board is visible; repeatable grants keep it open',
    run: async () => {
      // @ts-ignore island-run test tsconfig omits node type libs
      const fsMod = await import('fs');
      const board = fsMod.readFileSync(BOARD, 'utf8');
      const debug = fsMod.readFileSync(DEBUG, 'utf8');
      assert(board.includes('setShowTopbarMenu(false); void handleDevJumpToIsland();'), 'Load Island closes the top-bar menu');
      assert(board.includes('setShowTopbarMenu(false); void handleDevResetCurrentIslandMission();'), 'Clear mission closes the top-bar menu');
      for (const action of ['handleQaMarkBossResolved();', 'void handleQaAdvanceIsland();', 'void handleQaResetProgression();', 'focusNextAvailableStop();']) {
        assert(board.includes(`${action} setIsDevPanelOpen(false);`), `${action} closes the dev panel`);
      }
      assert(debug.includes('onClose(); void runPackGrantAction('), 'pack actions close the debug panel');
      assert(debug.includes('onClose(); onOpenLuckyRollDevOverlay?.('), 'Lucky Roll preview closes the debug panel');
      assert(debug.includes('onClose(); onOpenPostRareTreasurePathOverlay?.('), 'treasure path preview closes the debug panel');
      assert(!/onGrantDevEssence\([^)]*\);\s*onClose\(\)/.test(debug), 'essence grants keep the panel open');
      assert(!/onGrantDevTimedEventTickets\([^)]*\);\s*onClose\(\)/.test(debug), 'ticket grants keep the panel open');
    },
  },
];
