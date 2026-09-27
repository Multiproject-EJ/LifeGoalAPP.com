import type * as Backlight from '../../components/living-controller/icon-backlight.js';
import { assert, assertEqual, type TestCase } from './testHarness';

async function loadBacklight(): Promise<typeof Backlight> {
  // @ts-ignore island-run test tsconfig omits node type libs
  const { pathToFileURL } = await import('url');
  // @ts-ignore island-run test tsconfig omits node type libs
  const cwd: string = process.cwd();
  return import(pathToFileURL(`${cwd}/src/features/gamification/level-worlds/components/living-controller/icon-backlight.js`).href);
}

const base = { pressAt: -10, lastInteractionAt: 0, isBuild: false, buildReady: false, baseColor: '#7fe6ff', reduced: true };

export const controllerIconBacklightTests: TestCase[] = [
  {
    name: 'controller icon backlight: tap flares then fades, Build glows red only while a build is affordable',
    run: async () => {
      const { iconBacklight, ICON_BACKLIGHT_BUILD_READY } = await loadBacklight();
      const resting = iconBacklight({ ...base, now: 10 });
      const tapped = iconBacklight({ ...base, now: 10, pressAt: 9.95 });
      const later = iconBacklight({ ...base, now: 14, pressAt: 9.95 });
      assert(tapped.intensity > resting.intensity + 0.5, 'a tap flares the neon strip');
      assert(Math.abs(later.intensity - resting.intensity) < 0.05, 'and fades back down');
      assertEqual(iconBacklight({ ...base, now: 10, isBuild: true, buildReady: true }).color, ICON_BACKLIGHT_BUILD_READY, 'affordable build glows red');
      assertEqual(iconBacklight({ ...base, now: 10, isBuild: true, buildReady: false }).color, '#7fe6ff', 'fully built / unaffordable: red turns off');
      assertEqual(iconBacklight({ ...base, now: 10, isBuild: false, buildReady: true }).color, '#7fe6ff', 'only the Build icon turns red');
    },
  },
  {
    name: 'controller icon backlight: two idle minutes dim every strip; any touch wakes it',
    run: async () => {
      const { iconBacklight } = await loadBacklight();
      const active = iconBacklight({ ...base, now: 60, lastInteractionAt: 0 });
      const idle = iconBacklight({ ...base, now: 130, lastInteractionAt: 0 });
      const woken = iconBacklight({ ...base, now: 130, lastInteractionAt: 129.9, pressAt: 129.9 });
      assert(idle.intensity < active.intensity * 0.5, 'after 2 minutes unused the backlight fades down');
      assert(idle.intensity >= 0.12, 'never fully dark');
      assert(woken.intensity > active.intensity, 'a touch wakes it immediately');
    },
  },
];
