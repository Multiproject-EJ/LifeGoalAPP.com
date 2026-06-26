import { readFileSync } from 'node:fs';

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ ${message}`);
    process.exit(1);
  }
  console.log(`✅ ${message}`);
}

const leapSource = readFileSync('src/features/leap-progress/LeapProgress.tsx', 'utf8');
const helperSource = readFileSync('src/features/onboarding/onboardingPersistence.ts', 'utf8');
const packageJson = JSON.parse(readFileSync('package.json', 'utf8'));

assert(leapSource.includes('persistOnboardingStarterRecords'), 'Game of Life onboarding imports/calls the shared persistence helper');
assert(/goalName:\s*questLine/.test(leapSource), 'Game of Life onboarding passes the captured goalName value');
assert(/habitName:\s*ritualName/.test(leapSource), 'Game of Life onboarding passes the captured habitName value');
assert(helperSource.includes('GAME_OF_LIFE_ONBOARDING_SOURCE'), 'Game of Life duplicate guard source marker exists');
assert(helperSource.includes('namesMatch(goal.title') && helperSource.includes('namesMatch(habit.title'), 'duplicate-resume guards check existing goal and habit names');
assert(helperSource.includes('insertGoal('), 'goal creation path is represented');
assert(helperSource.includes('quickAddDailyHabit('), 'habit creation path is represented');
assert(helperSource.includes('existingHabit') && helperSource.includes('created: false'), 'habit reuse path is represented');
assert(packageJson.scripts?.['check:game-of-life-onboarding-persistence'] === 'node scripts/check-game-of-life-onboarding-persistence.mjs', 'package.json exposes the Game of Life onboarding persistence check');
