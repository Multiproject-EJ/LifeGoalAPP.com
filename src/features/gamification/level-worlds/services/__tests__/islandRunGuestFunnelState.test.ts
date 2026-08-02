import {
  ISLAND_RUN_GUEST_FUNNEL_STORAGE_KEY,
  createIslandRunGuestFunnelState,
  markIslandRunGuestFirstProgressRecapSeen,
  markIslandRunGuestSavePromptDismissed,
  patchIslandRunGuestFunnelState,
  readIslandRunGuestFunnelState,
} from '../islandRunGuestFunnelState';
import { buildIslandRunOnboardingNameSuggestions } from '../islandRunOnboardingNames';
import {
  cleanPublicIdentityLabel,
  containsBlockedPublicIdentityLanguage,
} from '../../../../../services/publicIdentity';
import { assert, assertEqual, createMemoryStorage, type TestCase } from './testHarness';

export const islandRunGuestFunnelStateTests: TestCase[] = [
  {
    name: 'offers four deterministic safe captain and ship pairs without network AI',
    run: () => {
      const first = buildIslandRunOnboardingNameSuggestions(7);
      const again = buildIslandRunOnboardingNameSuggestions(7);
      assertEqual(first.length, 4, 'Expected four one-tap name choices');
      assertEqual(JSON.stringify(first), JSON.stringify(again), 'Expected deterministic on-device suggestions');
      assert(
        first.every((pair) => pair.captainName.startsWith('Captain ') && pair.shipName.startsWith('The ')),
        'Expected every suggestion to be a complete captain/ship pair',
      );
    },
  },
  {
    name: 'public identity labels apply the same safe fallback policy to winner tables',
    run: () => {
      assertEqual(containsBlockedPublicIdentityLanguage('Friendly Nova'), false, 'Expected ordinary name to pass');
      assertEqual(containsBlockedPublicIdentityLanguage('f-u-c-k'), true, 'Expected separated profanity to be detected');
      assertEqual(cleanPublicIdentityLabel('  Captain Nova  ', 'Explorer', 60), 'Captain Nova', 'Expected clean public label');
      assertEqual(cleanPublicIdentityLabel('f-u-c-k', 'Explorer', 60), 'Explorer', 'Expected unsafe public label to use fallback');
    },
  },
  {
    name: 'creates versioned UI-only guest funnel state',
    run: () => {
      const state = createIslandRunGuestFunnelState({ guestId: 'guest_test', now: 100, entrySource: 'direct_island_run' });
      assertEqual(state.version, 1, 'Expected v1 funnel state');
      assertEqual(state.guestId, 'guest_test', 'Expected supplied guest id');
      assertEqual(state.createdAtMs, 100, 'Expected stable creation timestamp');
      assertEqual(state.entrySource, 'direct_island_run', 'Expected entry source');
      assertEqual(state.claimStatus, 'guest', 'Expected new users to start as guests');
      assertEqual(state.hasSeenFirstProgressRecapAfterArena, false, 'Expected recap to start unseen');
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
      markIslandRunGuestFirstProgressRecapSeen({ storage, now: 550 });
      markIslandRunGuestSavePromptDismissed({ prompt: 'soft_after_arena', storage, now: 600 });
      const state = readIslandRunGuestFunnelState({ storage });
      assertEqual(state.hasSeenFirstProgressRecapAfterArena, true, 'Expected first progress recap seen flag');
      assertEqual(state.hasSeenSoftSavePromptAfterArena, true, 'Expected soft save prompt seen flag');
      assertEqual(state.savePromptDismissals, 1, 'Expected dismissal count to persist');
    },
  },

  {
    name: 'stores free-play timeline completion and UI-only entry audio choices',
    run: () => {
      const storage = createMemoryStorage();
      const next = patchIslandRunGuestFunnelState({
        entrySource: 'landing_cta',
        hasSeenGuestTimeline: true,
        entryAudioChoiceCompleted: true,
        entryAmbienceEnabled: true,
        entryMusicEnabled: false,
        entrySfxEnabled: true,
      }, { storage, now: 900 });
      assertEqual(next.hasSeenGuestTimeline, true, 'Expected timeline completion to persist');
      assertEqual(next.entryAudioChoiceCompleted, true, 'Expected audio choice gate to persist');
      assertEqual(next.entryAmbienceEnabled, true, 'Expected ambience preference to persist');
      assertEqual(next.entryMusicEnabled, false, 'Expected music preference to persist');
      assertEqual(next.entrySfxEnabled, true, 'Expected player sound preference to persist');
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
