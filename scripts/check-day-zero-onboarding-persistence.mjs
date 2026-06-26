import { readFileSync } from 'node:fs';

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ ${message}`);
    process.exit(1);
  }
  console.log(`✅ ${message}`);
}

const source = readFileSync('src/features/onboarding/DayZeroOnboarding.tsx', 'utf8');
const helper = readFileSync('src/features/onboarding/onboardingPersistence.ts', 'utf8');

assert(source.includes('persistOnboardingStarterRecords'), 'Day Zero onboarding calls the shared persistence helper');
assert(/goalName:\s*fields\.lifeArea/.test(source), 'Day Zero onboarding derives a starter goal from the selected life area');
assert(/habitName:\s*fields\.habit/.test(source), 'Day Zero onboarding passes the tiny habit as habitName');
assert(helper.includes('DAY_ZERO_ONBOARDING_SOURCE'), 'Day Zero source marker exists');
assert(helper.includes('insertGoal(') && helper.includes('quickAddDailyHabit('), 'goal and habit creation paths exist');
assert(helper.includes('namesMatch(goal.title') && helper.includes('namesMatch(habit.title'), 'duplicate guards exist');
