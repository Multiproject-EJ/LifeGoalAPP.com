import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const gamificationSource = readFileSync('src/services/gamification.ts', 'utf8');
const gamificationPreferencesSource = readFileSync('src/services/gamificationPrefs.ts', 'utf8');
const powerUpsSource = readFileSync('src/services/powerUps.ts', 'utf8');

assert.match(
  gamificationSource,
  /\.from\('habit_logs_v2'\)[\s\S]{0,240}\.eq\('done', true\)/,
  'Habit-completion achievements must count completed habit logs.',
);
assert.doesNotMatch(
  gamificationSource,
  /\.from\('habits_v2'\)[\s\S]{0,240}\.eq\('completed', true\)/,
  'Habit definitions do not have a completed column.',
);

for (const [serviceName, source, helperName] of [
  ['gamification', gamificationSource, 'canUseCloudGamificationData'],
  ['gamification preferences', gamificationPreferencesSource, 'canUseCloudGamificationPreferences'],
  ['power ups', powerUpsSource, 'canUseCloudPowerUpData'],
]) {
  assert.match(
    source,
    new RegExp(`function ${helperName}\\(userId: string\\): boolean \\{[\\s\\S]{0,160}userId !== DEMO_USER_ID`),
    `${serviceName} must keep the synthetic demo ID out of Supabase UUID columns.`,
  );
}

for (const functionName of [
  'fetchXPTransactions',
  'awardXP',
  'updateStreak',
  'checkAchievements',
  'fetchAchievementsWithProgress',
  'resetXP',
]) {
  const functionStart = gamificationSource.indexOf(`function ${functionName}`);
  assert.notEqual(functionStart, -1, `${functionName} must remain present.`);
  const functionBodyPrefix = gamificationSource.slice(functionStart, functionStart + 900);
  assert.match(
    functionBodyPrefix,
    /canUseCloudGamificationData\(userId\)/,
    `${functionName} must route demo users to local data.`,
  );
}

console.log('gamification-data-routing: all assertions passed');
