import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(path, 'utf8');

const supabaseClient = read('src/lib/supabaseClient.ts');
const telemetry = read('src/services/telemetry.ts');
const actions = read('src/services/actions.ts');
const projects = read('src/services/projects.ts');
const demoWaitlist = read('src/services/demoWaitlist.ts');
const publicWaitlist = read('src/services/publicLaunchWaitlist.ts');
const zenGarden = read('src/services/zenGarden.ts');
const habitMonthly = read('src/services/habitMonthlyQueries.ts');
const habitsV2 = read('src/services/habitsV2.ts');
const waitlistMigration = read('supabase/migrations/20260801204019_harden_public_launch_waitlist.sql');

assert.match(
  supabaseClient,
  /function canUseSupabaseDataForUser[\s\S]{0,420}isSupabaseAuthUserId\(userId\)[\s\S]{0,160}activeSession\?\.user\?\.id === userId/,
  'Cloud calls scoped by user ID must require a real UUID matching the active Supabase session.',
);

for (const [serviceName, source] of [
  ['telemetry', telemetry],
  ['zen garden', zenGarden],
]) {
  assert.match(
    source,
    /canUseSupabaseDataForUser\(/,
    `${serviceName} must route by the requested user, not only global session presence.`,
  );
}

assert.doesNotMatch(
  telemetry,
  /\bcanUseSupabaseData\(\)/,
  'Telemetry must never send a synthetic or mismatched user ID to UUID columns.',
);

for (const [serviceName, source, localInsert] of [
  ['actions', actions, 'addDemoAction'],
  ['projects', projects, 'addDemoProject'],
]) {
  assert.match(source, /isDemoUserId\(/, `${serviceName} must recognize synthetic demo IDs.`);
  assert.match(source, new RegExp(`${localInsert}\\(DEMO_USER_ID`), `${serviceName} must persist demo writes locally.`);
  assert.match(source, /canUseSupabaseDataForUser\(/, `${serviceName} cloud writes must match the active user.`);
}

assert.match(
  habitMonthly,
  /getHabitCompletionsByMonth[\s\S]{0,700}!canUseSupabaseDataForUser\(userId\)/,
  'Monthly habit queries must keep demo IDs out of cloud filters.',
);

assert.match(
  habitsV2,
  /listHabitsV2[\s\S]{0,500}!canUseSupabaseData\(\)[\s\S]{0,420}getDemoHabitsForUser\(DEMO_USER_ID\)/,
  'Signed-out habit-list reads must stay local instead of querying habits_v2 as anon.',
);
assert.match(
  habitsV2,
  /listHabitStreaksV2[\s\S]{0,360}!canUseSupabaseDataForUser\(userId\)/,
  'Habit streak queries must reject demo IDs and mismatched Supabase sessions.',
);

assert.match(
  demoWaitlist,
  /isDemoUserId\(userId\)[\s\S]{0,180}joinPublicLaunchWaitlist\(email/,
  'The in-demo waitlist must use the public email collector instead of a fake UUID upsert.',
);
assert.match(publicWaitlist, /source,[\s\S]{0,80}channel,/, 'Public waitlist writes must include source and channel.');

assert.match(waitlistMigration, /CREATE TRIGGER public_launch_waitlist_rate_limit/i);
assert.match(waitlistMigration, /current_attempts > 5/);
assert.match(waitlistMigration, /SET search_path = ''/);
assert.match(waitlistMigration, /REVOKE ALL ON FUNCTION private\.enforce_public_launch_waitlist_rate_limit\(\)/);
assert.match(waitlistMigration, /source IN \('world_home', 'island_3_gate'\)/);
assert.match(waitlistMigration, /channel IN \('email', 'push'\)/);

for (const componentPath of [
  'src/components/GamificationHeader.tsx',
  'src/features/power-ups/PowerUpsStore.tsx',
  'src/features/zen-garden/ZenGarden.tsx',
]) {
  assert.doesNotMatch(read(componentPath), /['"]demo_user['"]/, `${componentPath} must use the canonical demo ID.`);
}

console.log('demo-cloud-routing: all assertions passed');
