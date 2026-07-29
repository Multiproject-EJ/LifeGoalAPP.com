// @ts-expect-error Node types are intentionally absent from the lightweight Island Run test tsconfig.
import { readFileSync } from 'node:fs';
import { ISLAND_RUN_CONTROLLER_SLOT_MAP } from '../islandRunControllerVisualContract';
import { assert, assertEqual, type TestCase } from './testHarness';

export const islandRunControllerVisualContractTests: TestCase[] = [
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
];
