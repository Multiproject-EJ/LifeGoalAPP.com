import { resolveIslandRunConcordHubEntryState } from '../islandRunConcordHubEntry';
import { readIslandRunGameStateRecord } from '../islandRunGameStateStore';
import { assertEqual, type TestCase } from './testHarness';

function baseRecord() {
  return readIslandRunGameStateRecord({ user: { id: 'concord-hub-entry-user' } } as import('@supabase/supabase-js').Session);
}

export const islandRunConcordHubEntryTests: TestCase[] = [
  {
    name: 'entry remains Story before Concord technology is built',
    run: () => {
      const state = resolveIslandRunConcordHubEntryState(baseRecord());
      assertEqual(state.label, 'Story', 'pre-build label stays Story');
      assertEqual(state.icon, '📖', 'pre-build icon stays Story');
      assertEqual(state.primaryAction, 'open-story-reader', 'pre-build action opens reader');
      assertEqual(state.isConcordActive, false, 'pre-build Concord inactive');
    },
  },
  {
    name: 'partial fragments do not activate the Concord affordance',
    run: () => {
      const state = resolveIslandRunConcordHubEntryState({
        ...baseRecord(),
        techCollectionByIsland: { '1': [0, 1, 2, 3] },
      });
      assertEqual(state.label, 'Story', 'partial build label stays Story');
      assertEqual(state.primaryAction, 'open-story-reader', 'partial build action stays reader');
      assertEqual(state.collectedFragmentCount, 4, 'partial fragment count exposed for copy');
    },
  },
  {
    name: 'entry becomes Concord only after canonical technology unlock is active',
    run: () => {
      const fullGridWithoutUnlock = resolveIslandRunConcordHubEntryState({
        ...baseRecord(),
        techCollectionByIsland: { '1': [0, 1, 2, 3, 4, 5, 6, 7, 8] },
        technologyUnlocksById: {},
      });
      assertEqual(fullGridWithoutUnlock.label, 'Story', 'full grid alone is not the active Concord label');
      assertEqual(fullGridWithoutUnlock.primaryAction, 'open-story-reader', 'full grid alone does not open hub');

      const active = resolveIslandRunConcordHubEntryState({
        ...baseRecord(),
        technologyUnlocksById: { 'the-concord': { builtAtMs: 123, active: true } },
      });
      assertEqual(active.label, 'Concord', 'active unlock changes label');
      assertEqual(active.icon, '📡', 'active unlock changes icon');
      assertEqual(active.primaryAction, 'open-concord-hub', 'active unlock opens hub');
      assertEqual(active.isConcordActive, true, 'active unlock marks Concord active');
    },
  },
];
