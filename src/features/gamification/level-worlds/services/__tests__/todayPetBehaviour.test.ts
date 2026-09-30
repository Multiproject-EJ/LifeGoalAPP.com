import {
  hasTodayPet3dModel,
  planTodayPetAction,
  resolveTodayPetCompanion,
  resolveTodayPetPose,
  todayPetBubbles,
  TODAY_PET_SIZE_PX,
} from '../../../../habits/todayPet/todayPetBehaviour';
import { assert, assertEqual, type TestCase } from './testHarness';

const entry = (creatureId: string, firstCollectedAtMs: number, copies = 1) => ({
  creatureId, copies, firstCollectedAtMs, lastCollectedAtMs: firstCollectedAtMs, lastCollectedIslandNumber: 1,
  bondXp: 0, bondLevel: 1, lastFedAtMs: null, claimedBondMilestones: [],
});

export const todayPetBehaviourTests: TestCase[] = [
  {
    name: 'Today pet: the paired companion, else the first creature waiting to be made a pet',
    run: () => {
      const collection = [entry('common-mossling', 300), entry('common-sproutling', 100)];
      assertEqual(resolveTodayPetCompanion({ activeCompanionId: 'common-mossling', creatureCollection: collection })?.creatureId, 'common-mossling', 'paired pet');
      const unpaired = resolveTodayPetCompanion({ activeCompanionId: null, creatureCollection: collection });
      assertEqual(unpaired?.creatureId, 'common-sproutling', 'the first creature collected');
      assertEqual(unpaired?.paired, false, 'offered as Make my pet');
      assertEqual(resolveTodayPetCompanion({ activeCompanionId: null, creatureCollection: [] }), null, 'no creatures, no pet');
      assertEqual(resolveTodayPetCompanion({ activeCompanionId: 'common-mossling', creatureCollection: [entry('common-mossling', 1, 0)] }), null, 'unowned companion is not shown');
      assertEqual(TODAY_PET_SIZE_PX, 60, 'one shared maximum size');
    },
  },
  {
    name: 'Today pet: wanders, idles, naps, plays and sometimes leaves for a while; three tap bubbles',
    run: () => {
      const seq = (values: number[]) => { let i = 0; return () => values[i++ % values.length]!; };
      assertEqual(planTodayPetAction(0.5, seq([0.1, 0.9])).kind, 'walk', 'wanders');
      assertEqual(planTodayPetAction(0.5, seq([0.5])).kind, 'idle', 'idles');
      assertEqual(planTodayPetAction(0.5, seq([0.7])).kind, 'play', 'plays');
      assertEqual(planTodayPetAction(0.5, seq([0.85, 0.5])).kind, 'sleep', 'naps');
      const away = planTodayPetAction(0.2, seq([0.95, 0.5]));
      assert(away.kind === 'away' && away.side === 'left' && away.ms >= 20_000, 'leaves off the nearer side for a while');
      assert(planTodayPetAction(0.5, seq([0.95]), true).kind !== 'away', 'reduced motion: stays put');
      assertEqual(todayPetBubbles(true).join(','), 'feed,pet,play', 'paired: Feed, Pet, Play');
      assertEqual(todayPetBubbles(false).join(','), 'pair,pet,play', 'unpaired: Make my pet first');
    },
  },
  {
    name: 'Today pet 3D: only creatures with a real model render in 3D; moods read clearly',
    run: () => {
      assert(hasTodayPet3dModel('common-sproutling'), 'Sproutling has the canonical 3D model');
      assert(!hasTodayPet3dModel('common-mossling'), 'creatures without a model keep their own 2D art');
      assertEqual(resolveTodayPetPose('sleep', 1).eyesClosed, 1, 'sleeping eyes are closed');
      const hops = [0.1, 0.2, 0.3].map((t) => resolveTodayPetPose('happy', t).lift);
      assert(Math.max(...hops) > 0.1, 'happy hops');
      assertEqual(resolveTodayPetPose('walk', 2, true).lift, 0, 'reduced motion: no bobbing');
      assertEqual(resolveTodayPetPose('sleep', 2, true).eyesClosed, 1, 'reduced motion still shows sleep');
    },
  },
];
