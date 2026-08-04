import {
  DEFAULT_ARENA_MINIGAME_PREFERENCES,
  getArenaDisabledLimit,
  getArenaPreferenceRows,
  moveArenaEvent,
  normalizeArenaPreferences,
  resolveArenaSessionPace,
  shouldExposeArenaTimedEvent,
  toggleArenaEvent,
} from '../islandRunArenaPreferences';

type TestCase = { name: string; run: () => void };

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

export const islandRunArenaPreferencesTests: TestCase[] = [
  {
    name: 'timed event games stay admin-only except in an explicitly unlocked local QA session',
    run: () => {
      assert(shouldExposeArenaTimedEvent({ isAdmin: true, isDevModeEnabled: false, isLocalDevelopment: false }), 'admins should see Arena events');
      assert(shouldExposeArenaTimedEvent({ isAdmin: false, isDevModeEnabled: true, isLocalDevelopment: true }), 'local dev mode should expose Arena events for QA');
      assert(!shouldExposeArenaTimedEvent({ isAdmin: false, isDevModeEnabled: true, isLocalDevelopment: false }), 'production guests must not gain Arena event access from dev-mode state');
      assert(!shouldExposeArenaTimedEvent({ isAdmin: false, isDevModeEnabled: false, isLocalDevelopment: true }), 'local guests must explicitly unlock dev mode');
    },
  },
  {
    name: 'normalization restores each canonical game exactly once',
    run: () => {
      const result = normalizeArenaPreferences({
        rankedEventIds: ['lucky_spin', 'lucky_spin', 'unknown'],
        disabledEventIds: ['lucky_spin', 'space_excavator'],
      });
      assert(result.rankedEventIds.length === 9, 'expected four rotation games, Momentum Matrix, and four puzzle exhibitions');
      assert(new Set(result.rankedEventIds).size === 9, 'expected no duplicate games');
      assert(result.disabledEventIds.length === 2, 'expected the 25% disabled cap');
    },
  },
  {
    name: 'only two of nine games can be disabled at the 25% cap',
    run: () => {
      assert(getArenaDisabledLimit() === 2, 'expected two disabled slots');
      const first = toggleArenaEvent(DEFAULT_ARENA_MINIGAME_PREFERENCES, 'lucky_spin');
      assert(first.changed, 'first pause should succeed');
      const second = toggleArenaEvent(first.preferences, 'feeding_frenzy');
      assert(second.changed, 'second pause should succeed');
      const third = toggleArenaEvent(second.preferences, 'signal_path');
      assert(!third.changed, 'third pause should be refused');
      assert(Boolean(third.reason), 'refusal should explain the cap');
    },
  },
  {
    name: 'ranking produces full, middle-fast, and flash pacing',
    run: () => {
      const rows = getArenaPreferenceRows(DEFAULT_ARENA_MINIGAME_PREFERENCES);
      assert(rows.map((row) => row.pace).join(',') === 'full,full,fast,fast,fast,fast,fast,flash,flash', 'unexpected pace tiers');
      assert(resolveArenaSessionPace(DEFAULT_ARENA_MINIGAME_PREFERENCES, 'twin_sigils') === 'flash', 'last game should flash');
    },
  },
  {
    name: 'moving a game changes its pace and paused games have no session',
    run: () => {
      const moved = moveArenaEvent(DEFAULT_ARENA_MINIGAME_PREFERENCES, 'companion_feast', -1);
      const movedAgain = moveArenaEvent(moved, 'companion_feast', -1);
      const movedToTop = moveArenaEvent(movedAgain, 'companion_feast', -1);
      assert(resolveArenaSessionPace(movedToTop, 'companion_feast') === 'full', 'promoted game should become full');
      const paused = toggleArenaEvent(movedToTop, 'lucky_spin').preferences;
      assert(resolveArenaSessionPace(paused, 'lucky_spin') === null, 'paused game should not launch');
    },
  },
];
