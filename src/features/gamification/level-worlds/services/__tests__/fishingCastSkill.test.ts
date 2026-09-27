import {
  FISHING_CAST_GOOD_MIN,
  FISHING_CAST_OVERSWING,
  FISHING_CAST_SWEET_SPOT,
  fishingAssistedCastPowerAt,
  fishingCastPowerAt,
  isFishingCastHit,
  judgeFishingCast,
} from '../fishingCastSkill';
import { assert, assertEqual, type TestCase } from './testHarness';

export const fishingCastSkillTests: TestCase[] = [
  {
    name: 'cast judgement: early is short, the green is a hit, the gold is perfect, too much overswings',
    run: () => {
      assertEqual(judgeFishingCast(FISHING_CAST_GOOD_MIN - 0.05), 'short', 'early throw falls short');
      assertEqual(judgeFishingCast(0.66), 'good', 'green zone lands');
      assertEqual(judgeFishingCast(FISHING_CAST_SWEET_SPOT), 'perfect', 'sweet spot is perfect');
      assertEqual(judgeFishingCast(FISHING_CAST_OVERSWING + 0.01), 'overswing', 'too much power hits the ground');
      assert(!isFishingCastHit('short') && !isFishingCastHit('overswing'), 'misses do not hook');
      assertEqual(judgeFishingCast(1.1, true), 'good', 'assisted casts can never overswing');
    },
  },
  {
    name: 'the needle gets more violent near the sweet spot, so waiting too long risks an overswing',
    run: () => {
      const spread = (fromMs: number, toMs: number) => {
        let min = Infinity; let max = -Infinity;
        for (let t = fromMs; t <= toMs; t += 7) { const p = fishingCastPowerAt(t, 1.3); min = Math.min(min, p); max = Math.max(max, p); }
        return { min, max };
      };
      const early = spread(300, 700);
      const late = spread(3500, 5000);
      assert(early.max < FISHING_CAST_OVERSWING, 'an early throw can never overswing');
      assert(late.max - late.min > (early.max - early.min), 'jitter grows as the needle nears the sweet spot');
      assert(late.max >= FISHING_CAST_OVERSWING, 'holding too long can overswing');
      let hittable = false;
      for (let t = 800; t <= 2600; t += 10) if (isFishingCastHit(judgeFishingCast(fishingCastPowerAt(t, 1.3)))) hittable = true;
      assert(hittable, 'a normal window exists to land a good cast');
      assert(Math.abs(fishingAssistedCastPowerAt(2000) - FISHING_CAST_SWEET_SPOT) < 0.03, 'assisted needle settles on the sweet spot');
    },
  },
];
