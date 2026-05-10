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

const congratsClosePath = sectionBetween(
  'const handleDailyTreatsCongratsClose = useCallback(() => {',
  'const {',
);
assert(
  congratsClosePath.includes('openPersonalQuestDailyTreatsCalendar();'),
  'Daily Treats congrats close must route to the Personal Quest calendar.',
);
assert(
  !congratsClosePath.includes('setShowDailyTreatsMenu(true)'),
  'Daily Treats congrats close must not open the old Daily Treats menu.',
);

const holidayLauncher = sectionBetween(
  'const launchHolidayCalendar = useCallback(() => {',
  'const handleDailyTreatsCongratsClose = useCallback(() => {',
);
assert(
  holidayLauncher.includes("setCalendarLaunchMode('holiday')"),
  'Holiday Calendar launcher must keep holiday mode.',
);
assert(
  holidayLauncher.includes('setShowCalendarPlaceholder(true)'),
  'Holiday Calendar launcher must open CountdownCalendarModal.',
);

console.log('daily-treats-routing: all assertions passed');
