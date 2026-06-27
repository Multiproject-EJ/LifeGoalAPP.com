import {
  DEFAULT_HABIT_RHYTHM_DAYPART,
  buildScheduleWithHabitRhythm,
  extractHabitRhythm,
  getHabitRhythmBonusGold,
  getHabitRhythmMultiplier,
  getCurrentHabitRhythmDaypart,
  isHabitInCurrentRhythmWindow,
  rankHabitsByRhythm,
} from '../habitRhythm';

function assertEqual<T>(actual: T, expected: T, message: string): void {
  if (actual !== expected) {
    throw new Error(`${message}: expected ${String(expected)}, received ${String(actual)}`);
  }
}

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

export function runAllHabitRhythmTests(): void {
  assertEqual(getCurrentHabitRhythmDaypart(new Date('2026-06-27T08:00:00')), 'morning', '08:00 is morning');
  assertEqual(getCurrentHabitRhythmDaypart(new Date('2026-06-27T13:00:00')), 'day', '13:00 is daytime');
  assertEqual(getCurrentHabitRhythmDaypart(new Date('2026-06-27T18:00:00')), 'evening', '18:00 is evening');
  assertEqual(getCurrentHabitRhythmDaypart(new Date('2026-06-27T23:00:00')), 'night', '23:00 is night');
  assertEqual(getCurrentHabitRhythmDaypart(new Date('2026-06-27T03:00:00')), 'night', '03:00 is overnight night');

  const legacy = extractHabitRhythm({ mode: 'daily' });
  assertEqual(legacy.daypart, DEFAULT_HABIT_RHYTHM_DAYPART, 'legacy habits fall back to daytime rhythm');
  assertEqual(legacy.source, 'default', 'legacy fallback source is default');

  const schedule = buildScheduleWithHabitRhythm({ mode: 'daily' }, { daypart: 'anytime', source: 'user' });
  assertEqual(extractHabitRhythm(schedule).daypart, 'anytime', 'anytime choice is preserved (not collapsed to daytime)');
  assert(
    isHabitInCurrentRhythmWindow({ schedule, now: new Date('2026-06-27T03:00:00') }),
    'anytime habits are in-window at any hour',
  );

  assertEqual(getHabitRhythmMultiplier('stalled'), 10, 'struggling habits use the 10x multiplier');
  assertEqual(getHabitRhythmMultiplier('at_risk'), 10, 'at-risk habits use the 10x multiplier');
  assertEqual(getHabitRhythmMultiplier('active'), 3, 'healthy habits use the smaller 3x multiplier');
  assertEqual(getHabitRhythmMultiplier(undefined), 3, 'unknown health defaults to the smaller 3x multiplier');

  const bonus = getHabitRhythmBonusGold({
    baseGold: 42,
    schedule: { mode: 'daily', rhythm: { daypart: 'morning', source: 'user' } },
    healthState: 'at_risk',
    completed: false,
    scheduledToday: true,
    now: new Date('2026-06-27T08:30:00'),
  });
  assertEqual(bonus, 420, 'struggling in-window habits get a 10x rhythm bonus');

  const healthyBonus = getHabitRhythmBonusGold({
    baseGold: 42,
    schedule: { mode: 'daily', rhythm: { daypart: 'morning', source: 'user' } },
    healthState: 'active',
    completed: false,
    scheduledToday: true,
    now: new Date('2026-06-27T08:30:00'),
  });
  assertEqual(healthyBonus, 126, 'healthy in-window habits get a smaller 3x rhythm bonus');

  const noBonus = getHabitRhythmBonusGold({
    baseGold: 42,
    schedule: { mode: 'daily', rhythm: { daypart: 'evening', source: 'user' } },
    healthState: 'at_risk',
    completed: false,
    scheduledToday: true,
    now: new Date('2026-06-27T08:30:00'),
  });
  assertEqual(noBonus, null, 'out-of-window habits do not get a rhythm bonus');

  const habits = [
    { id: 'stable', name: 'Stable', schedule: { mode: 'daily', rhythm: { daypart: 'morning' } } },
    { id: 'struggle', name: 'Struggle', schedule: { mode: 'daily', rhythm: { daypart: 'morning' } } },
    { id: 'later', name: 'Later', schedule: { mode: 'daily', rhythm: { daypart: 'evening' } } },
  ];
  const ranked = rankHabitsByRhythm({
    habits,
    completionsByHabitId: {},
    healthStateByHabitId: {
      stable: 'active',
      struggle: 'stalled',
      later: 'stalled',
    },
    adherenceByHabitId: {
      stable: { percentage: 90 },
      struggle: { percentage: 25 },
      later: { percentage: 10 },
    },
    scheduledTodayByHabitId: {
      stable: true,
      struggle: true,
      later: true,
    },
    now: new Date('2026-06-27T08:30:00'),
  });

  assertEqual(ranked[0]?.id, 'struggle', 'struggling current-window habit ranks first');
  assert(ranked.indexOf(habits[2]) > ranked.indexOf(habits[0]), 'out-of-window habit stays below in-window habits');

  console.log('habit-rhythm-tests: all assertions passed');
}
