import { assert, assertEqual, type TestCase } from './testHarness';
import { resolveSightCutawayMask, SIGHT_CUTAWAY_MIN_OPACITY } from '../../dev/landmarkSightCutaway';

const start = [0, 20, 20] as const;
const end = [0, 0.5, -3] as const;

export const landmarkSightCutawayTests: TestCase[] = [
  {
    name: 'sight cutaway: only the part on the line of sight fades, softly, and never what is behind the piece',
    run: () => {
      const onLine = [0, 20 + (0.5 - 20) * 0.8, 20 + (-3 - 20) * 0.8] as const;
      assertEqual(resolveSightCutawayMask({ point: onLine, start, end, radius: 2 }), 1, 'the blocking part is muted');
      const edge = [1.5, onLine[1], onLine[2]] as const;
      const soft = resolveSightCutawayMask({ point: edge, start, end, radius: 2 });
      assert(soft > 0 && soft < 1, 'soft edge');
      assertEqual(resolveSightCutawayMask({ point: [3, onLine[1], onLine[2]], start, end, radius: 2 }), 0, 'the sides of the building stay solid');
      assertEqual(resolveSightCutawayMask({ point: [0, 0.5, -5], start, end, radius: 2 }), 0, 'nothing beyond the piece fades');
      assert(SIGHT_CUTAWAY_MIN_OPACITY > 0.1 && SIGHT_CUTAWAY_MIN_OPACITY < 0.3, 'muted, never erased');
    },
  },
  {
    name: 'sight cutaway: the pilot mutes a tunnel through the centre landmark (and its batched surfaces) instead of hiding it',
    run: async () => {
      // @ts-ignore island-run test tsconfig omits node type libs
      const fsMod = await import('fs');
      const pilot = fsMod.readFileSync('src/features/gamification/level-worlds/dev/Island5ThreePilot.tsx', 'utf8');
      assert(pilot.includes('createLandmarkSightCutaway(bossRootForOcclusion, {'), 'the centre landmark uses the tunnel');
      assert(pilot.includes('/_SURFACE_BATCHES$/.test(child.name)'), 'batched landmark surfaces are included');
      assert(pilot.includes('const wholeLandmarkFade = shouldFadeBoss && !useSightCutaway;'), 'the whole-building fade only remains for special worlds');
      const cutaway = fsMod.readFileSync('src/features/gamification/level-worlds/dev/landmarkSightCutaway.ts', 'utf8');
      assert(cutaway.includes('if (cutKeep < cutBayer) discard;'), 'dithered, so materials stay opaque');
      assert(cutaway.includes('|sight-cutaway-v1'), 'batched programs are never shared with unpatched ones');
    },
  },
];
