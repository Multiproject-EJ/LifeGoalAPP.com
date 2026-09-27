import type * as Sunlight from '../../components/living-controller/controller-sunlight.js';
import { assert, assertEqual, type TestCase } from './testHarness';

async function loadSunlight(): Promise<typeof Sunlight> {
  // @ts-ignore island-run test tsconfig omits node type libs
  const { pathToFileURL } = await import('url');
  // @ts-ignore island-run test tsconfig omits node type libs
  const cwd: string = process.cwd();
  return import(pathToFileURL(`${cwd}/src/features/gamification/level-worlds/components/living-controller/controller-sunlight.js`).href);
}

export const controllerSunlightTests: TestCase[] = [
  {
    name: 'controller shine only lights up in full sun and fades after about a minute',
    run: async () => {
      const { controllerSunlight, controllerShineLevel } = await loadSunlight();
      assertEqual(controllerSunlight(12), 'full_sun', 'Sunken Sands is full sun');
      assertEqual(controllerSunlight(7), 'none', 'underwater: no shine');
      assertEqual(controllerSunlight(20), 'none', 'lava: no shine');
      assertEqual(controllerShineLevel('full_sun', 10), 1, 'full shine after arrival');
      assert(controllerShineLevel('full_sun', 55) > 0 && controllerShineLevel('full_sun', 55) < 1, 'fading');
      assertEqual(controllerShineLevel('full_sun', 61), 0, 'gone after about a minute');
      assertEqual(controllerShineLevel('fair', 5), 0, 'no everyday sparkle on fair islands');
    },
  },
  {
    name: 'controller sunbeams sweep now and then on sunny and fair islands, never at night or with reduced motion',
    run: async () => {
      const { controllerSunbeam } = await loadSunlight();
      assert(controllerSunbeam('full_sun', 9, false) >= 0, 'first beam shortly after arrival');
      assertEqual(controllerSunbeam('full_sun', 20, false), -1, 'most of the time there is no beam');
      assert(controllerSunbeam('full_sun', 8 + 48 + 1, false) >= 0, 'returns on a relaxed rhythm');
      assert(controllerSunbeam('fair', 9, false) >= 0, 'fair islands also get beams');
      assertEqual(controllerSunbeam('none', 9, false), -1, 'none in night, lava, ice or underwater worlds');
      assertEqual(controllerSunbeam('full_sun', 9, true), -1, 'reduced motion: no sweep');
    },
  },
];
