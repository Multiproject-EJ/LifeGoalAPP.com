import { assert, type TestCase } from './testHarness';

export const islandRunControllerRescueTests: TestCase[] = [
  {
    name: 'controller rescue: 🎮 hides a showing controller, and shows + resets a missing one without overriding a newly opened modal',
    run: async () => {
      // @ts-ignore island-run test tsconfig omits node type libs
      const fsMod = await import('fs');
      const board = fsMod.readFileSync('src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx', 'utf8');
      assert(board.includes('const hideControllerForPresentation = controllerHiddenByPresentation && !controllerRescueActive;'), 'the rescue can override a stuck hide flag');
      assert(board.includes('if (!controllerHiddenByPresentation) setControllerRescueActive(false);'), 'the override clears as soon as nothing hides the controller, so the next modal hides it again');
      assert(board.includes('setIsControllerTucked(true);') && board.includes("setControllerResetKey((current) => current + 1);"), 'tap hides when showing; resets (untuck + remount) when missing');
      assert(board.includes('key={`living-controller-${controllerResetKey}`}'), 'reset rebuilds the controller');
      assert(board.includes('className={`island-run-prototype__controller-rescue-floating'), 'the floating 🎮 button sits beside the overview button');
    },
  },
];
