import type { IslandRunGameStateRecord } from '../islandRunGameStateStore';
import {
  HABIT_EGG_WARMTH_DAILY_CAP,
  HABIT_EGG_WARMTH_MS,
  canHabitWarmEggsToday,
  countWarmableEggs,
  formatHabitEggWarmthNotice,
  recordHabitEggWarmth,
  warmIncubatingEggs,
} from '../islandRunHabitEggWarmth';
import { assert, assertEqual, type TestCase } from './testHarness';

const HOUR = 60 * 60 * 1000;
const NOW = 1_000_000_000;

function record(overrides: Partial<IslandRunGameStateRecord> = {}): IslandRunGameStateRecord {
  return {
    runtimeVersion: 7,
    activeEggTier: null,
    activeEggSetAtMs: null,
    activeEggHatchDurationMs: null,
    perIslandEggs: {},
    ...overrides,
  } as IslandRunGameStateRecord;
}

function memoryStorage() {
  const map = new Map<string, string>();
  return { getItem: (key: string) => map.get(key) ?? null, setItem: (key: string, value: string) => { map.set(key, value); } };
}

export const habitEggWarmthTests: TestCase[] = [
  {
    name: 'habit egg warmth: pulls every incubating egg 2h earlier and leaves others alone',
    run: () => {
      const result = warmIncubatingEggs(record({
        perIslandEggs: {
          '1': { tier: 'rare', setAtMs: NOW - HOUR, hatchAtMs: NOW + 10 * HOUR, status: 'incubating' },
          '1:1': { tier: 'common', setAtMs: NOW - HOUR, hatchAtMs: NOW + 5 * HOUR, status: 'incubating' },
          '2': { tier: 'common', setAtMs: NOW - HOUR, hatchAtMs: NOW - 1, status: 'ready' },
          '3': { tier: 'common', setAtMs: NOW - HOUR, hatchAtMs: NOW - 1, status: 'collected' },
        },
      }), HABIT_EGG_WARMTH_MS, NOW);
      assertEqual(result.warmedCount, 2, 'two incubating eggs warmed');
      assertEqual(result.record.perIslandEggs['1'].hatchAtMs, NOW + 8 * HOUR, 'rare egg 2h earlier');
      assertEqual(result.record.perIslandEggs['1:1'].hatchAtMs, NOW + 3 * HOUR, 'common egg 2h earlier');
      assertEqual(result.record.perIslandEggs['3'].status, 'collected', 'collected egg untouched');
      assertEqual(result.nextHatchAtMs, NOW + 3 * HOUR, 'next hatch time reported for the notification');
      assertEqual(result.record.runtimeVersion, 8, 'runtime version bumped');
    },
  },
  {
    name: 'habit egg warmth: an egg that reaches now becomes ready, never earlier than now',
    run: () => {
      const result = warmIncubatingEggs(record({
        perIslandEggs: { '4': { tier: 'common', setAtMs: NOW - 20 * HOUR, hatchAtMs: NOW + HOUR, status: 'incubating' } },
      }), HABIT_EGG_WARMTH_MS, NOW);
      assertEqual(result.record.perIslandEggs['4'].hatchAtMs, NOW, 'clamped to now');
      assertEqual(result.record.perIslandEggs['4'].status, 'ready', 'egg is ready');
      assertEqual(result.readyCount, 1, 'ready count');
      assertEqual(result.nextHatchAtMs, null, 'nothing left incubating');
    },
  },
  {
    name: 'habit egg warmth: active egg mirror moves with the ledger',
    run: () => {
      const result = warmIncubatingEggs(record({
        activeEggTier: 'rare',
        activeEggSetAtMs: NOW - HOUR,
        activeEggHatchDurationMs: 5 * HOUR,
        perIslandEggs: { '4': { tier: 'rare', setAtMs: NOW - HOUR, hatchAtMs: NOW + 4 * HOUR, status: 'incubating' } },
      }), HABIT_EGG_WARMTH_MS, NOW);
      const active = (result.record.activeEggSetAtMs as number) + (result.record.activeEggHatchDurationMs as number);
      assertEqual(active, result.record.perIslandEggs['4'].hatchAtMs, 'active egg hatch time agrees with ledger');
    },
  },
  {
    name: 'habit egg warmth: no incubating eggs means no change (and no warmth used)',
    run: () => {
      const base = record({ perIslandEggs: { '2': { tier: 'common', setAtMs: 1, hatchAtMs: 2, status: 'ready' } } });
      const result = warmIncubatingEggs(base, HABIT_EGG_WARMTH_MS, NOW);
      assertEqual(result.warmedCount, 0, 'nothing warmed');
      assert(result.record === base, 'record returned unchanged');
      assertEqual(countWarmableEggs(base, NOW), 0, 'nothing warmable');
    },
  },
  {
    name: 'habit egg warmth: once per habit per day, capped at 3 habits a day',
    run: () => {
      const storage = memoryStorage();
      assert(canHabitWarmEggsToday(storage, 'u', 'h1', '2026-10-03'), 'first habit may warm');
      recordHabitEggWarmth(storage, 'u', 'h1', '2026-10-03');
      assert(!canHabitWarmEggsToday(storage, 'u', 'h1', '2026-10-03'), 'same habit cannot warm twice (uncheck/recheck)');
      recordHabitEggWarmth(storage, 'u', 'h2', '2026-10-03');
      recordHabitEggWarmth(storage, 'u', 'h3', '2026-10-03');
      assertEqual(HABIT_EGG_WARMTH_DAILY_CAP, 3, 'cap is 3 warmths (6h)');
      assert(!canHabitWarmEggsToday(storage, 'u', 'h4', '2026-10-03'), 'fourth habit hits the cap');
      assert(canHabitWarmEggsToday(storage, 'u', 'h4', '2026-10-04'), 'cap resets the next day');
    },
  },
  {
    name: 'egg warmth: habits, Compass answers and the daily visit share one daily cap',
    run: () => {
      const storage = memoryStorage();
      recordHabitEggWarmth(storage, 'u', 'daily-visit', '2026-10-03');
      recordHabitEggWarmth(storage, 'u', 'compass:values.1', '2026-10-03');
      assert(!canHabitWarmEggsToday(storage, 'u', 'compass:values.1', '2026-10-03'), 'same answer cannot warm twice a day');
      recordHabitEggWarmth(storage, 'u', 'habit:h1', '2026-10-03');
      assert(!canHabitWarmEggsToday(storage, 'u', 'habit:h2', '2026-10-03'), 'cap shared across sources');
    },
  },
  {
    name: 'habit egg warmth: notice copy',
    run: () => {
      assertEqual(formatHabitEggWarmthNotice({ warmedCount: 3, readyCount: 0 }, 1), '🔥 Habit done! Your 3 eggs got 2h warmer. (2 more today)', 'plural');
      assertEqual(formatHabitEggWarmthNotice({ warmedCount: 1, readyCount: 1 }, 3, 'compass'), '🔥 Thanks for sharing! Your egg got 2h warmer. One is ready to hatch! (max warmth today)', 'ready + capped');
      assertEqual(formatHabitEggWarmthNotice({ warmedCount: 2, readyCount: 0 }, 2, 'visit'), '🔥 Welcome back! Your 2 eggs got 2h warmer. (1 more today)', 'daily visit');
    },
  },
  {
    name: 'habit egg warmth: wired into habit check-ins through the canonical action; hatch ritual needs 3 taps',
    run: async () => {
      // @ts-ignore
      const fs = await import('fs');
      const tracker = fs.readFileSync('src/features/habits/DailyHabitTracker.tsx', 'utf8') as string;
      assertEqual((tracker.match(/if \(isToday\) warmEggsAfterHabitCheckIn\(habit\.id, dateISO\);/g) ?? []).length, 3, 'toggle, done-ish and stage check-ins warm eggs');
      const action = fs.readFileSync('src/features/gamification/level-worlds/services/islandRunHabitEggWarmthAction.ts', 'utf8') as string;
      assert(action.includes('applyHabitEggWarmth('), 'uses the canonical state action');
      const compass = fs.readFileSync('src/features/compass-book/hooks/useCompassBook.ts', 'utf8') as string;
      assert(compass.includes("warmEggsFromSource({ session, source: `compass:${activityId}` })"), 'Compass answers warm eggs before habits exist');
      const board = fs.readFileSync('src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx', 'utf8') as string;
      assert(board.includes("warmEggsFromSource({ session, source: 'daily-visit' })"), 'first visit of the day warms eggs');
      assert(board.includes('<EggWarmthToastHost />') && tracker.includes('<EggWarmthToastHost />'), 'toast shows on board and Today');
      const modal = fs.readFileSync('src/features/gamification/level-worlds/components/CreatureHatchRevealModal.tsx', 'utf8') as string;
      assert(modal.includes('export const HATCH_RITUAL_TAPS = 3;'), 'three taps to crack');
      assert(!modal.includes('reduced ? 250 : 2200'), 'no auto-crack timer');
    },
  },
];
