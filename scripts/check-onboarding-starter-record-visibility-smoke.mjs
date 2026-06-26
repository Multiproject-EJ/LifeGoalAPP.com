import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

function read(path) {
  return readFileSync(resolve(root, path), 'utf8');
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
  console.log(`✅ ${message}`);
}

function assertIncludes(source, needle, message) {
  assert(source.includes(needle), message);
}

function assertMatches(source, pattern, message) {
  assert(pattern.test(source), message);
}

const helper = read('src/features/onboarding/onboardingPersistence.ts');
const leapProgress = read('src/features/leap-progress/LeapProgress.tsx');
const dayZero = read('src/features/onboarding/DayZeroOnboarding.tsx');
const goalsService = read('src/services/goals.ts');
const habitsService = read('src/services/habitsV2.ts');
const goalWorkspace = read('src/features/goals/GoalWorkspace.tsx');
const habitsModule = read('src/features/habits/HabitsModule.tsx');
const unifiedTodayView = read('src/features/habits/UnifiedTodayView.tsx');
const packageJson = JSON.parse(read('package.json'));

// This is intentionally a lightweight authenticated/domain-boundary smoke instead of a
// full browser-auth E2E: the repository does not provide seeded credentials or a stable
// test Supabase project for non-interactive navigation. The check protects the contract
// that authenticated onboarding writes use the same domain services read by the Goals
// and Habits workspaces after navigation.

assertIncludes(
  leapProgress,
  'persistOnboardingStarterRecords',
  'Game of Life / Leap Progress completion uses the shared onboarding persistence helper.',
);
assertMatches(
  leapProgress,
  /goalName:\s*questLine/m,
  'Game of Life / Leap Progress persists the captured starter goal name.',
);
assertMatches(
  leapProgress,
  /habitName:\s*ritualName/m,
  'Game of Life / Leap Progress persists the captured starter habit name.',
);
assertIncludes(
  leapProgress,
  'GAME_OF_LIFE_ONBOARDING_SOURCE',
  'Game of Life / Leap Progress tags starter records with the Game of Life source.',
);

assertIncludes(dayZero, 'persistOnboardingStarterRecords', 'Day Zero completion remains on the shared persistence helper.');
assertMatches(
  dayZero,
  /goalName:\s*fields\.lifeArea\s*\?\s*`Build momentum in \$\{fields\.lifeArea\}`\s*:\s*null/m,
  'Day Zero persists a starter goal derived from the selected life area.',
);
assertMatches(dayZero, /habitName:\s*fields\.habit/m, 'Day Zero persists the selected tiny habit as a starter habit.');
assertIncludes(dayZero, 'DAY_ZERO_ONBOARDING_SOURCE', 'Day Zero tags starter records with the Day Zero source.');

assertIncludes(helper, "import { fetchGoals, insertGoal } from '../../services/goals';", 'Onboarding goal writes and duplicate checks go through the goals domain service.');
assertIncludes(helper, "import { listHabitsV2, quickAddDailyHabit } from '../../services/habitsV2';", 'Onboarding habit writes and duplicate checks go through the habits domain service.');
assertMatches(helper, /const existingGoals = await fetchGoals\(\);[\s\S]*namesMatch\(goal\.title, normalizedGoalName\)/m, 'Starter goal duplicate/resume guard checks the UI-facing goals list by normalized title.');
assertMatches(helper, /const existingHabits = await listHabitsV2\(\{ includeInactive: true \}\);[\s\S]*namesMatch\(habit\.title, normalizedHabitName\)/m, 'Starter habit duplicate/resume guard checks active and inactive habits by normalized title.');
assertMatches(helper, /result\.goal = \{ id: existingGoal\.id, created: false, skipped: false \}/m, 'Starter goal duplicate/resume guard reuses the existing goal instead of creating another.');
assertMatches(helper, /result\.habit = \{ id: existingHabit\.id, created: false, skipped: false \}/m, 'Starter habit duplicate/resume guard reuses the existing habit instead of creating another.');
assertIncludes(helper, 'insertGoal({', 'Starter goals are created via insertGoal.');
assertIncludes(helper, 'quickAddDailyHabit(', 'Starter habits are created via quickAddDailyHabit.');

assertMatches(goalsService, /export async function fetchGoals\(\)[\s\S]*await syncQueuedGoals\(\);[\s\S]*\.from\('goals'\)[\s\S]*mergeLocalGoalsOverRemote/m, 'fetchGoals is the authenticated UI-facing path that reads remote goals and local queued goal records.');
assertMatches(habitsService, /export async function listHabitsV2\(params\?: \{ includeInactive\?: boolean \}\)[\s\S]*\.from\('habits_v2'\)[\s\S]*mergeLocalHabitsOverRemote/m, 'listHabitsV2 is the authenticated UI-facing path that reads remote habits and local queued habit records.');

assertIncludes(goalWorkspace, 'fetchGoals', 'Goals workspace loads records through fetchGoals after navigation.');
assertMatches(goalWorkspace, /const \{ data, error \} = await fetchGoals\(\);[\s\S]*const loadedGoals = data \?\? \[\];[\s\S]*setGoals\(loadedGoals\)/m, 'Goals workspace renders the fetchGoals result set.');
assertIncludes(goalWorkspace, 'listHabitsV2', 'Goals workspace goal creation/review surfaces can discover habits through listHabitsV2.');
assertIncludes(habitsModule, 'listHabitsV2({ includeInactive: true })', 'Habits workspace loads active and inactive records through listHabitsV2 after navigation.');
assertIncludes(unifiedTodayView, 'listHabitsV2()', 'Today habits UI-facing path loads active starter habits through listHabitsV2.');

assert(
  packageJson.scripts?.['check:onboarding-starter-record-visibility'] ===
    'node scripts/check-onboarding-starter-record-visibility-smoke.mjs',
  'package.json exposes the onboarding starter record visibility smoke check.',
);

console.log('onboarding-starter-record-visibility-smoke: all assertions passed');
