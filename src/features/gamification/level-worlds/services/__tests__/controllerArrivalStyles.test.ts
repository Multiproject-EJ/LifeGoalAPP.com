import type * as Personality from '../../components/living-controller/personality.js';
import { assert, assertEqual, type TestCase } from './testHarness';

// The controller's presentation modules are plain JS the test compiler does
// not emit, so load the source file directly.
async function loadPersonality(): Promise<typeof Personality> {
  // @ts-ignore island-run test tsconfig omits node type libs
  const { pathToFileURL } = await import('url');
  // @ts-ignore island-run test tsconfig omits node type libs
  const cwd: string = process.cwd();
  return import(pathToFileURL(`${cwd}/src/features/gamification/level-worlds/components/living-controller/personality.js`).href);
}

const rest = { blocked: false, rolling: false, autoRolling: false, jackpot: false, hidden: false, reduced: false, dice: 10, activity: 0 };

export const controllerArrivalStylesTests: TestCase[] = [
  {
    name: 'each island gets its own controller entrance, stable per island',
    run: async () => {
      const { ARRIVAL_STYLES, resolveArrivalStyle } = await loadPersonality();
      const seen = new Set(Array.from({ length: 12 }, (_, i) => resolveArrivalStyle(String(i + 1))));
      assertEqual(seen.size, ARRIVAL_STYLES.length, 'consecutive islands cycle through every entrance');
      assertEqual(resolveArrivalStyle('7'), resolveArrivalStyle('7'), 'the same island always arrives the same way');
      assert(ARRIVAL_STYLES.includes(resolveArrivalStyle('overlay-4')), 'overlay keys resolve too');
    },
  },
  {
    name: 'every entrance starts away from rest and settles exactly into place',
    run: async () => {
      const { ARRIVAL_STYLES, personalityPose } = await loadPersonality();
      for (const style of ARRIVAL_STYLES) {
        const start = personalityPose({ kind: 'arrival', style, age: 0.05 });
        const moved = Math.abs(start.x) + Math.abs(start.y) + Math.abs(start.ry) + Math.abs(1 - start.scale) > 0.3;
        assert(moved, `${style} starts visibly away from its resting pose`);
        const landed = personalityPose({ kind: 'arrival', style, age: 2.29 });
        assert(Math.abs(landed.x) < 0.02 && Math.abs(landed.y) < 0.02 && Math.abs(landed.scale - 1) < 0.02, `${style} lands in place`);
        assert(personalityPose({ kind: 'arrival', style, age: 2.4 }).burst > 0, `${style} ends with the landing burst`);
      }
    },
  },
  {
    name: 'the controller also arrives on first load, not only on island change',
    run: async () => {
      const { createPersonalityClock } = await loadPersonality();
      const clock = createPersonalityClock();
      const first = clock(1, { ...rest, arrivalKey: 'arrival-test-first-load' });
      assertEqual(first.kind, 'arrival', 'first mount plays the entrance');
      const reduced = createPersonalityClock()(1, { ...rest, reduced: true, arrivalKey: 'arrival-test-reduced' });
      assertEqual(reduced.kind, 'rest', 'reduced motion skips it');
    },
  },
];
