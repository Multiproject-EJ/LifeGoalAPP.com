import { assert, assertEqual, type TestCase } from './testHarness';
import {
  buildLuckySpinConfetti,
  LUCKY_SPIN_LAUNCH_OPEN_MS,
  LUCKY_SPIN_LAUNCH_TOTAL_MS,
  LUCKY_SPIN_TILE_MAX_AHEAD,
  LUCKY_SPIN_TILE_MIN_AHEAD,
  resolveLuckySpinTileIndex,
} from '../luckySpinTile';

export const luckySpinTileTests: TestCase[] = [
  {
    name: 'lucky spin tile: sits a few tiles ahead of the player, stable per day, wraps the loop',
    run: () => {
      for (const day of ['2026-09-27', '2026-09-28', '2026-10-01', '2027-01-15']) {
        const tile = resolveLuckySpinTileIndex({ tokenIndex: 10, tileCount: 36, dayKey: day })!;
        const ahead = tile - 10;
        assert(ahead >= LUCKY_SPIN_TILE_MIN_AHEAD && ahead <= LUCKY_SPIN_TILE_MAX_AHEAD, `${day}: ${ahead} tiles ahead`);
        assertEqual(resolveLuckySpinTileIndex({ tokenIndex: 10, tileCount: 36, dayKey: day }), tile, `${day}: stable`);
      }
      const wrapped = resolveLuckySpinTileIndex({ tokenIndex: 34, tileCount: 36, dayKey: '2026-09-27' })!;
      assert(wrapped >= 0 && wrapped < 36 && wrapped < 34, 'wraps past the start tile');
      assertEqual(resolveLuckySpinTileIndex({ tokenIndex: 0, tileCount: 4, dayKey: 'x' }), null, 'tiny boards skip the badge');
    },
  },
  {
    name: 'lucky spin tile: the wheel opens mid-launch, and the confetti burst is deterministic',
    run: () => {
      assert(LUCKY_SPIN_LAUNCH_OPEN_MS < LUCKY_SPIN_LAUNCH_TOTAL_MS, 'the wheel opens while the effect is still playing');
      const a = buildLuckySpinConfetti();
      assertEqual(JSON.stringify(a), JSON.stringify(buildLuckySpinConfetti()), 'same burst every time');
      assert(a.every((piece) => piece.angle <= -10 && piece.angle >= -170), 'confetti bursts upward');
    },
  },
  {
    name: 'lucky spin tile: a real 3D wheel on the tile replaces the side button and only launches the existing wheel',
    run: async () => {
      // @ts-ignore island-run test tsconfig omits node type libs
      const fsMod = await import('fs');
      const board = fsMod.readFileSync('src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx', 'utf8');
      assert(board.includes('featureAccess.dailyWheel && !luckySpinBoardReady ?'), 'side button hides while the badge rides the board');
      assert(board.includes('window.setTimeout(() => onOpenDailySpinWheel(), LUCKY_SPIN_LAUNCH_OPEN_MS)'), 'launch opens the existing daily wheel');
      assert(board.includes('luckySpinLandRef.current(tileIndex);'), 'landing on the tile launches too');
      assert(board.includes('luckySpinTileIndex={showLuckySpinBadge ? luckySpinTileIndex : null}'), 'the 3D scene gets the spin tile');
      assert(!board.includes('className="island-run-lucky-spin-badge"'), 'no DOM badge floats over menus any more');
      assert(board.includes('className="island-run-lucky-spin-a11y"'), 'a visually hidden button keeps it keyboard/screen-reader reachable');
      const pilot = fsMod.readFileSync('src/features/gamification/level-worlds/dev/Island5ThreePilot.tsx', 'utf8');
      assert(pilot.includes('function createLuckySpinWheelObject()') && pilot.includes('scene.add(luckySpinWheel.root)'), 'the wheel is a real 3D object in the scene');
      assert(pilot.includes('raycaster.intersectObject(luckySpinWheel.root, true)'), 'tapping the 3D wheel launches the spin');
    },
  },
];
