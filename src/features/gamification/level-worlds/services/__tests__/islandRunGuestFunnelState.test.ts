import {
  ISLAND_RUN_GUEST_FUNNEL_STORAGE_KEY,
  createIslandRunGuestFunnelState,
  markIslandRunGuestSavePromptDismissed,
  patchIslandRunGuestFunnelState,
  readIslandRunGuestFunnelState,
} from '../islandRunGuestFunnelState';
import { assert, assertEqual, createMemoryStorage, type TestCase } from './testHarness';

export const islandRunGuestFunnelStateTests: TestCase[] = [
  {
    name: 'creates versioned UI-only guest funnel state',
    run: () => {
      const state = createIslandRunGuestFunnelState({ guestId: 'guest_test', now: 100, entrySource: 'direct_island_run' });
      assertEqual(state.version, 1, 'Expected v1 funnel state');
      assertEqual(state.guestId, 'guest_test', 'Expected supplied guest id');
      assertEqual(state.createdAtMs, 100, 'Expected stable creation timestamp');
      assertEqual(state.entrySource, 'direct_island_run', 'Expected entry source');
      assertEqual(state.claimStatus, 'guest', 'Expected new users to start as guests');
    },
  },
  {
    name: 'persists stable guest id across reads',
    run: () => {
      const storage = createMemoryStorage();
      const first = readIslandRunGuestFunnelState({ storage, now: 200 });
      const second = readIslandRunGuestFunnelState({ storage, now: 300 });
      assertEqual(second.guestId, first.guestId, 'Expected persisted guest id to be stable');
      assertEqual(second.createdAtMs, first.createdAtMs, 'Expected original creation timestamp to persist');
    },
  },
  {
    name: 'recovers from corrupted localStorage JSON',
    run: () => {
      const storage = createMemoryStorage({ [ISLAND_RUN_GUEST_FUNNEL_STORAGE_KEY]: '{bad json' });
      const recovered = readIslandRunGuestFunnelState({ storage, now: 400 });
      assert(recovered.guestId.startsWith('guest_'), 'Expected fresh guest id after corrupted storage');
      const raw = storage.getItem(ISLAND_RUN_GUEST_FUNNEL_STORAGE_KEY);
      assert(raw?.includes('"version":1'), 'Expected recovered state to be rewritten to storage');
    },
  },
  {
    name: 'persists prompt dismissal counters and seen flags',
    run: () => {
      const storage = createMemoryStorage();
      readIslandRunGuestFunnelState({ storage, now: 500 });
      markIslandRunGuestSavePromptDismissed({ prompt: 'soft_after_arena', storage, now: 600 });
      const state = readIslandRunGuestFunnelState({ storage });
      assertEqual(state.hasSeenSoftSavePromptAfterArena, true, 'Expected soft save prompt seen flag');
      assertEqual(state.savePromptDismissals, 1, 'Expected dismissal count to persist');
    },
  },

  {
    name: 'stores free-play timeline completion and lightweight name ship customization',
    run: () => {
      const storage = createMemoryStorage();
      const next = patchIslandRunGuestFunnelState({
        entrySource: 'landing_cta',
        hasSeenGuestTimeline: true,
        displayName: 'Captain Ivo Jr.',
        shipName: 'First Light Skiff',
      }, { storage, now: 900 });
      assertEqual(next.hasSeenGuestTimeline, true, 'Expected timeline completion to persist');
      assertEqual(next.displayName, 'Captain Ivo Jr.', 'Expected captain name to persist');
      assertEqual(next.shipName, 'First Light Skiff', 'Expected ship name to persist');
      assertEqual(next.entrySource, 'landing_cta', 'Expected landing CTA source to persist');
    },
  },
  {
    name: 'does not store gameplay fields in guest funnel state patches',
    run: () => {
      const storage = createMemoryStorage();
      patchIslandRunGuestFunnelState({ displayName: 'Miri' }, { storage, now: 700 });
      patchIslandRunGuestFunnelState({ dice: 99, essence: 20, creatures: ['poko'], travelState: { island: 2 } } as never, { storage, now: 800 });
      const raw = storage.getItem(ISLAND_RUN_GUEST_FUNNEL_STORAGE_KEY) ?? '';
      assert(!raw.includes('dice'), 'Expected dice to be excluded');
      assert(!raw.includes('essence'), 'Expected essence to be excluded');
      assert(!raw.includes('creatures'), 'Expected creatures to be excluded');
      assert(!raw.includes('travelState'), 'Expected travel state to be excluded');
      assertEqual(readIslandRunGuestFunnelState({ storage }).displayName, 'Miri', 'Expected UI-only field to persist');
    },
  },
];
