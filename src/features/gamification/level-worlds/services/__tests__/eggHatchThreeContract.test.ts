import { createEggHatchThreeModel } from '../../dev/EggHatchThreeModel';
import { summarizeEggHatchRenderProfile } from '../../components/CreatureHatchThreeExperience';
import { assert, assertEqual, type TestCase } from './testHarness';

export const eggHatchThreeContractTests: TestCase[] = [
  {
    name: 'keeps every egg tier at both quality levels inside the 3D runtime budgets',
    run: () => {
      for (const { tier, quality } of [
        { tier: 'common', quality: 'low' },
        { tier: 'rare', quality: 'low' },
        { tier: 'mythic', quality: 'low' },
        { tier: 'common', quality: 'high' },
        { tier: 'rare', quality: 'high' },
        { tier: 'mythic', quality: 'high' },
      ] as const) {
        const model = createEggHatchThreeModel({ tier, paletteId: 'verdant', quality });
        const variant = `${quality} ${tier}`;
        assertEqual(model.metrics.fragments, 8, `${variant} should preserve the authored eight-piece burst`);
        assert(model.metrics.triangles > 1000, `${variant} must be actual 3D geometry, not a flat card`);
        assert(model.metrics.triangles < 72000, `${variant} should stay inside the close-up triangle budget`);
        assert(model.metrics.completePoseDrawCalls <= 95, `${variant} completed hatch should stay inside the 95 draw-call budget`);
        const runtime = model.root.userData.sculptRuntime as { clickableRoots?: string[]; explodableRoots?: string[] };
        assert((runtime.clickableRoots?.length ?? 0) >= 4, `${variant} should expose inspectable roots`);
        assertEqual(runtime.explodableRoots?.length ?? 0, 8, `${variant} should expose all debris roots`);
        model.dispose();
      }
    },
  },
  {
    name: 'summarizes completed render intervals with quality-specific slow-frame thresholds',
    run: () => {
      const high = summarizeEggHatchRenderProfile([16, 16, 32, 48, 0, Number.NaN], 'high');
      assertEqual(high.sampleCount, 4, 'invalid or zero intervals must not enter the profile');
      assertEqual(high.durationMs, 112, 'profile duration should sum actual completed-render intervals');
      assertEqual(high.averageFps, 35.7, 'average FPS should be derived from completed-render cadence');
      assertEqual(high.p95FrameMs, 48, 'P95 should use the deterministic nearest-rank sample');
      assertEqual(high.worstFrameMs, 48, 'worst-frame timing should remain visible');
      assertEqual(high.slowFrameCount, 2, 'high quality treats frames above 25ms as slow');
      assertEqual(high.slowFramePercent, 50, 'slow-frame percentage should be deterministic');
      assertEqual(high.slowFrameThresholdMs, 25, 'high profile threshold should match the phone target');

      const low = summarizeEggHatchRenderProfile([16, 16, 32, 48], 'low');
      assertEqual(low.slowFrameCount, 1, 'low quality should use its more permissive 40ms threshold');
      assertEqual(low.slowFrameThresholdMs, 40, 'low profile threshold should be explicit in the report');
    },
  },
];
