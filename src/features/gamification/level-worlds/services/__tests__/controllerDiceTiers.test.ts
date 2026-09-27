import type * as Tiers from '../../components/living-controller/dice-tiers.js';
import { assert, assertEqual, type TestCase } from './testHarness';

async function loadTiers(): Promise<typeof Tiers> {
  // @ts-ignore island-run test tsconfig omits node type libs
  const { pathToFileURL } = await import('url');
  // @ts-ignore island-run test tsconfig omits node type libs
  const cwd: string = process.cwd();
  return import(pathToFileURL(`${cwd}/src/features/gamification/level-worlds/components/living-controller/dice-tiers.js`).href);
}

export const controllerDiceTiersTests: TestCase[] = [
  {
    name: 'Roll button charges up in dice steps: 0–100 base, then 100+, 250, 500, 1k, 2k, 5k, 10k max',
    run: async () => {
      const { diceTier, diceTierStyle } = await loadTiers();
      assertEqual(diceTier(0), 0, 'empty');
      assertEqual(diceTier(100), 0, '0–100 is the start');
      assertEqual(diceTier(101), 1, 'over 100 upgrades');
      assertEqual(diceTier(250), 2, '250');
      assertEqual(diceTier(500), 3, '500');
      assertEqual(diceTier(1000), 4, '1,000');
      assertEqual(diceTier(2000), 5, '2,000');
      assertEqual(diceTier(5000), 6, '5,000');
      assertEqual(diceTier(10000), 7, '10,000 is max');
      assertEqual(diceTier(250000), 7, 'never beyond max');
      const low = diceTierStyle(1), high = diceTierStyle(7);
      assert(high.rings > low.rings && high.glow > low.glow, 'more rings and glow with each step');
      assert(high.sparks > 0 && high.band && high.warm === 1, 'max adds sparks, an energy band and warms to gold');
      assert(!diceTierStyle(3).pulse && diceTierStyle(4).pulse, 'breathing starts at 1,000');
    },
  },
  {
    name: 'auto-roll lights the rocket fuel and hovers gently; nothing with reduced motion',
    run: async () => {
      const { autoRollHover } = await loadTiers();
      const hover = autoRollHover(3.2, true, false);
      assert(hover.thrust > 0.1 && Math.abs(hover.bobY) < 0.06 && Math.abs(hover.swayZ) < 0.03, 'small, flying hover');
      assertEqual(autoRollHover(3.2, false, false).thrust, 0, 'engines off when not auto-rolling');
      assertEqual(autoRollHover(3.2, true, true).thrust, 0, 'reduced motion: no hover');
    },
  },
];
