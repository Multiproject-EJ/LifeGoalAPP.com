// @ts-expect-error Node types are intentionally absent from the lightweight Island Run test tsconfig.
import { readFileSync } from 'node:fs';
import { ISLAND_RUN_CONTROLLER_SLOT_MAP } from '../islandRunControllerVisualContract';
import { assert, assertEqual, type TestCase } from './testHarness';

export const islandRunControllerVisualContractTests: TestCase[] = [
  {
    name: 'upper controller buttons stay mirrored on the white shoulder plates',
    run: () => {
      const left = ISLAND_RUN_CONTROLLER_SLOT_MAP.leftUpper;
      const right = ISLAND_RUN_CONTROLLER_SLOT_MAP.rightUpper;
      assertEqual(left.x, 17.5, 'Upper-left control must stay over its shoulder plate');
      assertEqual(right.x, 100 - left.x, 'Upper controls must remain horizontally mirrored');
      assertEqual(right.y, left.y, 'Upper controls must remain vertically aligned');
      assertEqual(right.rotate, -left.rotate, 'Upper control angles must remain mirrored');
      assertEqual(right.scale, left.scale, 'Upper controls must use the same restrained scale');
    },
  },
  {
    name: 'approved lower controller buttons keep their locked mirrored geometry',
    run: () => {
      const left = ISLAND_RUN_CONTROLLER_SLOT_MAP.leftLower;
      const right = ISLAND_RUN_CONTROLLER_SLOT_MAP.rightLower;

      assertEqual(left.x, 11.5, 'Creatures x must remain at the approved checkpoint');
      assertEqual(left.y, 57.5, 'Creatures y must remain at the approved checkpoint');
      assertEqual(left.rotate, 4, 'Creatures angle must remain at the approved checkpoint');
      assertEqual(left.scale, 0.92, 'Creatures scale must remain at the approved checkpoint');
      assertEqual(right.x, 100 - left.x, 'Market must remain the horizontal mirror of Creatures');
      assertEqual(right.y, left.y, 'Market and Creatures must remain vertically aligned');
      assertEqual(right.rotate, -left.rotate, 'Market angle must remain mirrored');
      assertEqual(right.scale, left.scale, 'Market and Creatures must keep the same scale');
    },
  },
  {
    name: 'both controller surfaces preserve the approved five-percent top trim',
    run: () => {
      const islandCss = readFileSync('src/features/gamification/level-worlds/LevelWorlds.css', 'utf8');
      const overlayCss = readFileSync('src/styles/game-board-overlay.css', 'utf8');
      const trimHeight = 'height: clamp(6.46rem, 49.4%, 9.5rem);';
      const anchoredTop = 'top: calc(var(--slot-y, 50%) + 1.3%);';

      assert(islandCss.includes(trimHeight), 'Island Run lower handles must retain the approved trimmed height');
      assert(islandCss.includes(anchoredTop), 'Island Run lower handles must retain their anchored bottom edge');
      assert(overlayCss.includes(trimHeight), 'Two Tracks lower handles must match the approved trimmed height');
      assert(overlayCss.includes(anchoredTop), 'Two Tracks lower handles must match the approved anchored bottom edge');
    },
  },
  {
    name: 'Market keeps absolute slot positioning instead of escaping the controller shell',
    run: () => {
      const islandCss = readFileSync('src/features/gamification/level-worlds/LevelWorlds.css', 'utf8');
      const staleOverride =
        /\.island-run-prototype__shop-btn,\s*\.island-run-prototype__footer-nav-btn--slot-market\s*\{\s*position:\s*relative/;

      assert(
        !staleOverride.test(islandCss),
        'Market must not be changed to position: relative by the commerce-dot rule',
      );
    },
  },
  {
    name: 'auto-roll drives one reduced-motion-safe jet behind each lower handle',
    run: () => {
      const boardSource = readFileSync(
        'src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx',
        'utf8',
      );
      const islandCss = readFileSync('src/features/gamification/level-worlds/LevelWorlds.css', 'utf8');

      assert(
        boardSource.includes("isAutoRolling ? ' island-run-prototype__footer-controller-shell--auto-rolling' : ''"),
        'The controller shell must expose the live auto-roll presentation state',
      );
      assert(
        boardSource.includes('island-run-prototype__footer-handle-jet--left')
          && boardSource.includes('island-run-prototype__footer-handle-jet--right'),
        'Both lower handles must render an exhaust jet',
      );
      assert(
        islandCss.includes('.island-run-prototype__footer-controller-shell--auto-rolling .island-run-prototype__footer-handle-jet'),
        'Jets must activate only from the controller auto-roll state',
      );
      assert(
        islandCss.includes('@media (prefers-reduced-motion: reduce)')
          && islandCss.includes('animation: none;\n    opacity: 0.82;'),
        'Auto-roll jets must have a steady reduced-motion fallback',
      );
    },
  },
  {
    name: 'yellow max lock emits one independently keyed MAX burst per click',
    run: () => {
      const boardSource = readFileSync(
        'src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx',
        'utf8',
      );
      const islandCss = readFileSync('src/features/gamification/level-worlds/LevelWorlds.css', 'utf8');

      assert(
        boardSource.includes('if (isAtMaxAvailableMultiplier && multiplierMaxJumpLockRef.current)')
          && boardSource.includes('emitMultiplierMaxBurst();'),
        'Clicks during the yellow max lock must emit feedback without wrapping',
      );
      assert(
        boardSource.includes('multiplierMaxBursts.map((burst)')
          && boardSource.includes('key={burst.id}')
          && boardSource.includes('MAX!'),
        'Each max click must render as its own keyed burst so rapid clicks stack',
      );
      assert(
        islandCss.includes('@keyframes island-run-multiplier-max-burst'),
        'The MAX burst must have its own short pop animation',
      );
    },
  },
];
