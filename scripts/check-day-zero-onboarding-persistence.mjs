import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const onboardingPath = resolve(__dirname, '../src/features/onboarding/DayZeroOnboarding.tsx');
const persistencePath = resolve(__dirname, '../src/features/onboarding/dayZeroPersistence.ts');
const habitsPath = resolve(__dirname, '../src/services/habitsV2.ts');

const onboarding = readFileSync(onboardingPath, 'utf8');
const persistence = readFileSync(persistencePath, 'utf8');
const habits = readFileSync(habitsPath, 'utf8');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function assertIncludes(source, needle, message) {
  assert(source.includes(needle), message);
}

function assertMatches(source, pattern, message) {
  assert(pattern.test(source), message);
}

assertIncludes(
  onboarding,
  "import { ensureDayZeroStarterRecords } from './dayZeroPersistence';",
  'DayZeroOnboarding must import the starter-record persistence helper.',
);
assertMatches(
  onboarding,
  /await ensureDayZeroStarterRecords\(\{[\s\S]*userId: session\.user\.id,[\s\S]*lifeArea: fields\.lifeArea,[\s\S]*habit: fields\.habit,[\s\S]*reminder: fields\.reminder,[\s\S]*reward: fields\.reward,[\s\S]*\}\)/m,
  'DayZeroOnboarding completion must persist the selected life area, habit, reminder, and reward.',
);
assertIncludes(
  onboarding,
  'starter_goal_id: starterRecords.goalId',
  'Onboarding telemetry must include the starter goal id.',
);
assertIncludes(
  onboarding,
  'starter_habit_id: starterRecords.habitId',
  'Onboarding telemetry must include the starter habit id.',
);

assertIncludes(
  persistence,
  "const DAY_ZERO_SOURCE = 'day-zero-onboarding';",
  'Persistence helper must use a stable Day Zero source marker.',
);
assertIncludes(
  persistence,
  'export async function ensureDayZeroStarterRecords',
  'Persistence helper must export ensureDayZeroStarterRecords.',
);
assertMatches(
  persistence,
  /export function buildDayZeroStarterSeedKey[\s\S]*DAY_ZERO_SOURCE[\s\S]*normalizeForSeed\(input\.lifeArea\)[\s\S]*normalizeForSeed\(input\.habit\)/m,
  'Persistence helper must build a deterministic duplicate-guard seed key from life area and habit.',
);
assertMatches(
  persistence,
  /await findExistingDayZeroGoal\(seedKey, goalTitle, input\.userId\)[\s\S]*if \(!goalId\) \{[\s\S]*await insertGoal\(/m,
  'Persistence helper must check for an existing starter goal before inserting.',
);
assertMatches(
  persistence,
  /await findExistingDayZeroHabit\(seedKey, habitTitle, input\.userId, lifeWheelCategory\)[\s\S]*if \(!habitId\) \{[\s\S]*await quickAddDailyHabit\(/m,
  'Persistence helper must check for an existing starter habit before inserting.',
);
assertIncludes(
  persistence,
  'habitIntent: `Source: ${DAY_ZERO_SOURCE}\\nSeed: ${seedKey}`',
  'Created starter habits must carry the Day Zero duplicate marker.',
);
assertMatches(
  persistence,
  /const LIFE_AREA_TO_CATEGORY: Record<string, LifeWheelCategoryKey> = \{[\s\S]*Health: 'health_fitness',[\s\S]*Mind: 'spirituality_community',[\s\S]*Relationships: 'love_relations',[\s\S]*Work: 'career_development',[\s\S]*Home: 'living_spaces',[\s\S]*Growth: 'career_development',[\s\S]*\}/m,
  'Day Zero life areas must map to canonical Life Wheel category keys.',
);

assertMatches(
  habits,
  /quickAddDailyHabit\(params: \{[\s\S]*habitIntent\?: string \| null;[\s\S]*habit_intent: params\.habitIntent \?\? null,/m,
  'quickAddDailyHabit must accept and persist an optional habit intent marker.',
);

console.log('day-zero-onboarding-persistence: all assertions passed');
