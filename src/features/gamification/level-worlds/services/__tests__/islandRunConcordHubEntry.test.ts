import { resolveIslandRunConcordHubEntryState } from '../islandRunConcordHubEntry';
import { readIslandRunGameStateRecord } from '../islandRunGameStateStore';
import { assertEqual, type TestCase } from './testHarness';

function baseRecord() {
  return readIslandRunGameStateRecord({ user: { id: 'concord-hub-entry-user' } } as import('@supabase/supabase-js').Session);
}

export const islandRunConcordHubEntryTests: TestCase[] = [
  {
    name: 'unread story temporarily takes the shared controller slot',
    run: () => {
      const state = resolveIslandRunConcordHubEntryState(baseRecord(), { hasUnreadStory: true });
      assertEqual(state.label, 'Story', 'unread story receives the controller label');
      assertEqual(state.icon, '📖', 'unread story receives the story icon');
      assertEqual(state.primaryAction, 'open-story', 'unread story opens Story Mode directly');
      assertEqual(state.isConcordActive, false, 'story attention does not alter Concord activation');
    },
  },
  {
    name: 'entry exposes Concord progress before the technology is built',
    run: () => {
      const state = resolveIslandRunConcordHubEntryState(baseRecord());
      assertEqual(state.label, 'Concord 0/9', 'pre-build label exposes the collection goal');
      assertEqual(state.icon, '◈', 'pre-build icon identifies the dormant Concord signal');
      assertEqual(state.primaryAction, 'open-concord-progress', 'pre-build action opens the restoration grid');
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
      assertEqual(state.label, 'Concord 4/9', 'partial build label exposes current progress');
      assertEqual(state.primaryAction, 'open-concord-progress', 'partial build opens the restoration grid');
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
      assertEqual(fullGridWithoutUnlock.label, 'Concord 9/9', 'full grid exposes complete restoration progress');
      assertEqual(fullGridWithoutUnlock.primaryAction, 'open-concord-progress', 'full grid alone does not open the active hub');

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
