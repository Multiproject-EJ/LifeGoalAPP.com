import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const appPath = resolve(__dirname, '../src/App.tsx');
const source = readFileSync(appPath, 'utf8');

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function sectionBetween(start, end) {
  const startIndex = source.indexOf(start);
  assert(startIndex !== -1, `Missing section start: ${start}`);

  const endIndex = source.indexOf(end, startIndex);
  assert(endIndex !== -1, `Missing section end after ${start}: ${end}`);

  return source.slice(startIndex, endIndex);
}

const personalQuestLauncher = sectionBetween(
  'const openPersonalQuestDailyTreatsCalendar = useCallback(() => {',
  'const launchDailyTreatsMenu = useCallback(() => {',
);
assert(
  personalQuestLauncher.includes("setCalendarLaunchMode('personal_quest')"),
  'Daily Treats launcher must use personal_quest mode.',
);
assert(
  personalQuestLauncher.includes('setShowCalendarPlaceholder(true)'),
  'Daily Treats launcher must open CountdownCalendarModal.',
);
assert(
  !personalQuestLauncher.includes("setCalendarLaunchMode('auto')"),
  'Daily Treats launcher must not use auto mode.',
);
assert(
  !personalQuestLauncher.includes('setShowDailyTreatsMenu(true)'),
  'Daily Treats launcher must not open the old Daily Treats menu.',
);

const todayDailyTreatsPath = sectionBetween(
  'const launchDailyTreatsMenu = useCallback(() => {',
  'const launchHolidayCalendar = useCallback(() => {',
);
assert(
  todayDailyTreatsPath.includes('openPersonalQuestDailyTreatsCalendar();'),
  'Today Daily Treats must route to the Personal Quest calendar.',
);
assert(
  !todayDailyTreatsPath.includes('setShowDailyTreatsMenu(true)'),
  'Today Daily Treats path must not open the old Daily Treats menu.',
);
assert(
  !todayDailyTreatsPath.includes("setCalendarLaunchMode('auto')"),
  'Today Daily Treats path must not use auto mode.',
);
assert(
  !source.includes('handleDailyTreatsCongratsClose'),
  'Daily Treats should not use legacy visit/congrats routing.',
);
assert(
  !source.includes('DAILY_TREATS_DAILY_VISIT_KEY'),
  'Daily Treats done state must not use the legacy daily visit key.',
);

const holidayLauncher = sectionBetween(
  'const launchHolidayCalendar = useCallback(() => {',
  'const {',
);
assert(
  holidayLauncher.includes("setCalendarLaunchMode('holiday')"),
  'Holiday Calendar launcher must keep holiday mode.',
);
assert(
  holidayLauncher.includes('setShowCalendarPlaceholder(true)'),
  'Holiday Calendar launcher must open CountdownCalendarModal.',
);

const dailyTreatsDoneState = sectionBetween(
  'const refreshDailyTreatsOpenedState = useCallback(async () => {',
  'const refreshHolidayCalendarOpenedState = useCallback(async () => {',
);
assert(
  source.includes('getPersonalQuestSeason'),
  'App must fetch Personal Quest calendar progress for Daily Treats done state.',
);
assert(
  dailyTreatsDoneState.includes('getPersonalQuestSeason(userId)'),
  'Daily Treats done state must load the Personal Quest season.',
);
assert(
  dailyTreatsDoneState.includes('try {') && dailyTreatsDoneState.includes('} catch {'),
  'Daily Treats done-state refresh must handle Personal Quest service failures.',
);
assert(
  dailyTreatsDoneState.includes('Array.isArray(season.progress?.opened_days)'),
  'Daily Treats done state must guard malformed Personal Quest opened_days.',
);
assert(
  dailyTreatsDoneState.includes('openedDays.includes(todayIndex)'),
  'Daily Treats done state must be based on today Personal Quest door progress.',
);
assert(
  !dailyTreatsDoneState.includes('season.progress?.opened_days.includes(todayIndex)'),
  'Daily Treats done state must not call includes on possibly missing opened_days.',
);
assert(
  !source.includes('showDailyTreatsMenu'),
  'Old Daily Treats 3-card hub state should be removed.',
);
assert(
  !source.includes('dailyTreatsModal'),
  'Old Daily Treats 3-card hub modal should be removed.',
);

console.log('daily-treats-routing: all assertions passed');
