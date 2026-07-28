import {
  DEFAULT_ARENA_MINIGAME_PREFERENCES,
  getArenaDisabledLimit,
  getArenaPreferenceRows,
  moveArenaEvent,
  normalizeArenaPreferences,
  resolveArenaSessionPace,
  toggleArenaEvent,
} from '../islandRunArenaPreferences';

type TestCase = { name: string; run: () => void };

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

export const islandRunArenaPreferencesTests: TestCase[] = [
  {
    name: 'normalization restores each canonical game exactly once',
    run: () => {
      const result = normalizeArenaPreferences({
        rankedEventIds: ['lucky_spin', 'lucky_spin', 'unknown'],
        disabledEventIds: ['lucky_spin', 'space_excavator'],
      });
      assert(result.rankedEventIds.length === 4, 'expected all four canonical games');
      assert(new Set(result.rankedEventIds).size === 4, 'expected no duplicate games');
      assert(result.disabledEventIds.length === 1, 'expected the 25% disabled cap');
    },
  },
  {
    name: 'only one of four games can be disabled',
    run: () => {
      assert(getArenaDisabledLimit() === 1, 'expected one disabled slot');
      const first = toggleArenaEvent(DEFAULT_ARENA_MINIGAME_PREFERENCES, 'lucky_spin');
      assert(first.changed, 'first pause should succeed');
      const second = toggleArenaEvent(first.preferences, 'feeding_frenzy');
      assert(!second.changed, 'second pause should be refused');
      assert(Boolean(second.reason), 'refusal should explain the cap');
    },
  },
  {
    name: 'ranking produces full, fast, fast, and flash pacing',
    run: () => {
      const rows = getArenaPreferenceRows(DEFAULT_ARENA_MINIGAME_PREFERENCES);
      assert(rows.map((row) => row.pace).join(',') === 'full,fast,fast,flash', 'unexpected pace tiers');
      assert(resolveArenaSessionPace(DEFAULT_ARENA_MINIGAME_PREFERENCES, 'companion_feast') === 'flash', 'last game should flash');
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
