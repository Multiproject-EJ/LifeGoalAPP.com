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
      const { ARRIVAL_STYLES, ARRIVAL_FLIGHT, personalityPose } = await loadPersonality();
      for (const style of ARRIVAL_STYLES) {
        const start = personalityPose({ kind: 'arrival', style, age: 0.05 });
        const moved = Math.abs(start.x) + Math.abs(start.y) + Math.abs(start.ry) + Math.abs(1 - start.scale) > 0.3;
        assert(moved, `${style} starts visibly away from its resting pose`);
        const landed = personalityPose({ kind: 'arrival', style, age: ARRIVAL_FLIGHT - 0.01 });
        assert(Math.abs(landed.x) < 0.02 && Math.abs(landed.y) < 0.02 && Math.abs(landed.scale - 1) < 0.02, `${style} lands in place`);
        assert(personalityPose({ kind: 'arrival', style, age: ARRIVAL_FLIGHT + 0.1 }).burst > 0, `${style} ends with the landing burst`);
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
  {
    name: 'the fly-in is fast and engine-powered; the power-on landing keeps its pace',
    run: async () => {
      const { ARRIVAL_STYLES, ARRIVAL_FLIGHT, ARRIVAL_LANDING, personalityPose, createPersonalityClock } = await loadPersonality();
      assert(ARRIVAL_FLIGHT <= 1, 'the flight takes under a second');
      assertEqual(ARRIVAL_LANDING, 0.8, 'the landing/power-on beat is unchanged');
      for (const style of ARRIVAL_STYLES) {
        assert(personalityPose({ kind: 'arrival', style, age: ARRIVAL_FLIGHT * 0.3 }).thrust > 0.4, `${style} fires its engines in flight`);
        assertEqual(personalityPose({ kind: 'arrival', style, age: ARRIVAL_FLIGHT + 0.05 }).thrust, 0, `${style} cuts the engines on landing`);
      }
      const swoop = personalityPose({ kind: 'arrival', style: 'swoop-left', age: 0.2 });
      assert(swoop.x < 0 && swoop.flameX < 0, 'exhaust trails behind the swoop');
      const clock = createPersonalityClock();
      const start = clock(1, { ...rest, arrivalKey: 'arrival-test-duration' });
      assertEqual(start.kind, 'arrival', 'arrives');
      assertEqual(clock(1 + ARRIVAL_FLIGHT + ARRIVAL_LANDING + 0.01, { ...rest, arrivalKey: 'arrival-test-duration' }).kind, 'rest', 'done after flight + landing');
    },
  },
  {
    name: 'the canvas overscans only during the fly-in and maps button hits back to its box',
    run: async () => {
      // @ts-ignore island-run test tsconfig omits node type libs
      const fsMod = await import('fs');
      const renderer = fsMod.readFileSync('src/features/gamification/level-worlds/components/living-controller/renderer.js', 'utf8');
      assert(renderer.includes("performance.kind==='arrival'&&performance.age<ARRIVAL_FLIGHT+.15"), 'overscan only while flying');
      assert(renderer.includes('camera.setViewOffset(w,h,-o.l*w,-o.t*h,cw,ch)'), 'same framing, larger drawing area');
      assert(!/placeHit[^\n]*host\.clientWidth/.test(renderer), 'hit areas use the view mapping');
      assert(renderer.includes('!m.userData.keepLit'), 'engine flames stay lit while the shell is dark');
    },
  },
];
