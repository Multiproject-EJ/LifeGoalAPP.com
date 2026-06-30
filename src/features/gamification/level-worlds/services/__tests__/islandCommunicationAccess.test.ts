import { getIslandCommunicationAccess } from '../islandCommunicationAccess';
import { getCreatureChannelLine, getCreatureDialogueFamily } from '../islandCreatureChannel';
import { buildFreshIslandRunRecord } from '../islandRunProgressReset';
import { assertDeepEqual, assertEqual, type TestCase } from './testHarness';

const base = buildFreshIslandRunRecord({} as never);
const withConcord = { ...base, technologyUnlocksById: { 'the-concord': { builtAtMs: 123, active: true } } };
const withCompanion = {
  ...withConcord,
  activeCompanionId: 'common-glowtail',
  creatureCollection: [{ creatureId: 'common-glowtail', copies: 1, firstCollectedAtMs: 1, lastCollectedAtMs: 1, lastCollectedIslandNumber: 1, bondXp: 0, bondLevel: 1, lastFedAtMs: null, claimedBondMilestones: [] }],
};

export const islandCommunicationAccessTests: TestCase[] = [
  { name: 'inhabitant denied before Concord', run: () => assertDeepEqual(getIslandCommunicationAccess(base, 'inhabitant'), { allowed: false, reason: 'concord-not-built' }, 'expected Concord denial') },
  { name: 'inhabitant allowed after Concord', run: () => assertDeepEqual(getIslandCommunicationAccess(withConcord, 'inhabitant'), { allowed: true, reason: 'available' }, 'expected inhabitant access') },
  { name: 'creature denied before Concord', run: () => assertDeepEqual(getIslandCommunicationAccess({ ...base, activeCompanionId: 'common-glowtail' }, 'creature'), { allowed: false, reason: 'concord-not-built' }, 'expected Concord denial first') },
  { name: 'creature denied without active companion', run: () => assertDeepEqual(getIslandCommunicationAccess(withConcord, 'creature'), { allowed: false, reason: 'no-active-companion' }, 'expected no active companion') },
  { name: 'creature denied for stale unowned companion', run: () => assertDeepEqual(getIslandCommunicationAccess({ ...withConcord, activeCompanionId: 'common-glowtail', creatureCollection: [] }, 'creature'), { allowed: false, reason: 'invalid-state' }, 'expected stale denial') },
  { name: 'creature allowed with Concord plus valid owned active companion', run: () => assertDeepEqual(getIslandCommunicationAccess(withCompanion, 'creature'), { allowed: true, reason: 'available' }, 'expected creature access') },
  { name: 'malformed state fails safely', run: () => assertDeepEqual(getIslandCommunicationAccess(null as never, 'inhabitant'), { allowed: false, reason: 'invalid-state' }, 'expected invalid state') },
  { name: 'later-island user with Concord remains allowed', run: () => assertEqual(getIslandCommunicationAccess({ ...withConcord, currentIslandNumber: 4 }, 'inhabitant').allowed, true, 'expected global Concord access') },
  { name: 'creature dialogue families are deterministic with fallback', run: () => {
    assertEqual(getCreatureDialogueFamily({ affinity: 'Grounded' }), 'steady', 'grounded steady');
    assertEqual(getCreatureDialogueFamily({ affinity: 'Visionary' }), 'curious', 'visionary curious');
    assertEqual(getCreatureDialogueFamily({ affinity: 'Challenger' }), 'brave', 'challenger brave');
    assertEqual(getCreatureDialogueFamily({ affinity: 'Caregiver' }), 'caring', 'caregiver caring');
    assertEqual(getCreatureDialogueFamily({ affinity: 'Unknown' }), 'generic', 'unknown generic');
    assertEqual(getCreatureChannelLine({ affinity: 'Unknown' }).includes('signal'), true, 'generic fallback copy');
  } },
];
