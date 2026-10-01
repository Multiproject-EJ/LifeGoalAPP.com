import { assert, assertEqual, type TestCase } from './testHarness';
import {
  ISLAND_3D_LEARNED_TIER_MAX_AGE_MS,
  ISLAND_3D_MIN_PIXEL_SCALE,
  createIsland3DAdaptiveState,
  parseIsland3DLearnedTier,
  resolveIsland3DMaxTier,
  resolveIsland3DStartTier,
  serializeIsland3DLearnedTier,
  stepIsland3DAdaptiveQuality,
  type Island3DAdaptiveAction,
  type Island3DAdaptiveState,
} from '../islandRun3DAdaptiveQuality';
import type { Island3DQuality } from '../../dev/island5ThreePilotContract';

function feed(state: Island3DAdaptiveState, fps: number, count: number, maxTier: Island3DQuality = 'high', busy = false) {
  const actions: Island3DAdaptiveAction[] = [];
  let current = state;
  for (let i = 0; i < count; i += 1) {
    const step = stepIsland3DAdaptiveQuality(current, { fps, busy, maxTier });
    current = step.state;
    if (step.action.kind !== 'none') actions.push(step.action);
  }
  return { state: current, actions };
}

async function readSource(path: string): Promise<string> {
  // @ts-ignore island-run test tsconfig omits node type libs
  const fsMod = await import('fs');
  return fsMod.readFileSync(`src/features/gamification/level-worlds/${path}`, 'utf8');
}

export const islandRun3DAdaptiveQualityTests: TestCase[] = [
  {
    name: '3D adaptive quality: a struggling phone lowers resolution first, then the tier',
    run: () => {
      const slow = feed(createIsland3DAdaptiveState('medium'), 22, 30);
      const kinds = slow.actions.map((action) => action.kind);
      assertEqual(kinds[0], 'scale', 'cheapest lever first');
      const firstTier = kinds.indexOf('tier');
      assert(firstTier > 0, 'tier drop only after resolution');
      const scalesBefore = slow.actions.slice(0, firstTier).map((action) => (action as { pixelScale: number }).pixelScale);
      assertEqual(scalesBefore[scalesBefore.length - 1], ISLAND_3D_MIN_PIXEL_SCALE, 'resolution reaches its floor before the tier drops');
      assertEqual(slow.state.tier, 'low', 'ends on low');
      const floor = feed(createIsland3DAdaptiveState('low'), 10, 40);
      assert(floor.state.tier === 'low' && floor.state.pixelScale >= ISLAND_3D_MIN_PIXEL_SCALE, 'never below low or the resolution floor');
    },
  },
  {
    name: '3D adaptive quality: a strong phone earns the excellent tier once, at full resolution',
    run: () => {
      const strong = feed(createIsland3DAdaptiveState('medium'), 60, 25);
      assertEqual(JSON.stringify(strong.actions), JSON.stringify([{ kind: 'tier', tier: 'high', reason: 'headroom' }]), 'medium → high');
      const again = feed({ ...strong.state, tier: 'medium' }, 60, 40);
      assertEqual(again.actions.length, 0, 'only one upgrade per session');
      const reduced = feed(createIsland3DAdaptiveState('low'), 60, 40, 'low');
      assertEqual(reduced.actions.length, 0, 'reduced motion never climbs');
      const recovering = feed({ ...createIsland3DAdaptiveState('medium'), pixelScale: 0.7 }, 60, 30);
      assert(recovering.actions[0]?.kind === 'scale', 'resolution recovers before any tier change');
    },
  },
  {
    name: '3D adaptive quality: authored bursts and hidden tabs never count as a verdict',
    run: () => {
      const busy = feed(createIsland3DAdaptiveState('high'), 12, 40, 'high', true);
      assertEqual(busy.actions.length, 0, 'construction / hidden tab ignored');
      const blip = feed(createIsland3DAdaptiveState('high'), 20, 2);
      assertEqual(blip.actions.length, 0, 'a short blip does not change anything');
      const steady = feed(createIsland3DAdaptiveState('high'), 50, 40);
      assertEqual(steady.actions.length, 0, 'healthy high stays put');
    },
  },
  {
    name: '3D adaptive quality: the settled tier is remembered and expires after a month',
    run: () => {
      const now = Date.UTC(2026, 9, 1);
      const raw = serializeIsland3DLearnedTier('low', now);
      assertEqual(parseIsland3DLearnedTier(raw, now + 1000)?.tier, 'low', 'round trip');
      assertEqual(parseIsland3DLearnedTier(raw, now + ISLAND_3D_LEARNED_TIER_MAX_AGE_MS + 1), null, 'expires');
      assertEqual(parseIsland3DLearnedTier('{"tier":"ultra","learnedAtMs":1}', now), null, 'unknown tier ignored');
      assertEqual(parseIsland3DLearnedTier('not json', now), null, 'garbage ignored');
      assertEqual(resolveIsland3DStartTier({ detected: 'medium', learned: { tier: 'high', learnedAtMs: now }, maxTier: 'high' }), 'high', 'remembered tier wins');
      assertEqual(resolveIsland3DStartTier({ detected: 'medium', learned: { tier: 'high', learnedAtMs: now }, maxTier: 'low' }), 'low', 'capped by max tier');
      assertEqual(resolveIsland3DMaxTier({ prefersReducedMotion: true }), 'low', 'reduced motion stays low');
      assertEqual(resolveIsland3DMaxTier({}), 'high', 'iPhones without memory hints can still reach high');
    },
  },
  {
    name: '3D adaptive quality: the board applies resolution live and persists tier changes',
    run: async () => {
      const pilot = await readSource('dev/Island5ThreePilot.tsx');
      assert(pilot.includes('stepIsland3DAdaptiveQuality(adaptiveQualityRef.current'), 'controller wired');
      assert(pilot.includes('applyPixelScaleRef.current = (scale: number) => renderer.setPixelRatio(basePixelRatio * scale);'), 'live resolution');
      assert(pilot.includes('serializeIsland3DLearnedTier(action.tier, Date.now())'), 'tier remembered');
      assert(pilot.includes("explicitQualityOverride || qualitySelection !== 'auto' || profilerStatus === 'running'"), 'explicit QA choices untouched');
    },
  },
];
