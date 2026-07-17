import { readFile } from 'node:fs/promises';

const file = 'supabase/migrations/20260716024447_quest_campaign_goal_foundations.sql';
const sql = await readFile(file, 'utf8');

const checks = [
  ['Campaigns link to canonical Goals', /alter table public\.campaigns[\s\S]*add column if not exists goal_id uuid references public\.goals\(id\)/i],
  ['Creates canonical Quests', /create table if not exists public\.quests\s*\(/i],
  ['Creates normalized Quest habit links', /create table if not exists public\.quest_habit_links\s*\([\s\S]*habit_id uuid not null references public\.habits_v2\(id\)/i],
  ['Creates Quest reflections and ally replies', /create table if not exists public\.quest_reflections\s*\([\s\S]*ally_reply/i],
  ['Enables RLS on every new table', /alter table public\.quests enable row level security;[\s\S]*alter table public\.quest_habit_links enable row level security;[\s\S]*alter table public\.quest_reflections enable row level security;/i],
  ['Ownership policies verify linked entities', /quests_insert_own_links[\s\S]*g\.user_id = \(select auth\.uid\(\)\)[\s\S]*c\.owner_id = \(select auth\.uid\(\)\)/i],
  ['Anonymous access is revoked', /revoke all on table public\.quests, public\.quest_habit_links, public\.quest_reflections from anon;/i],
  ['Authenticated Data API grants are explicit', /grant select, insert, update, delete[\s\S]*to authenticated;/i],
  ['Quest bundles save through one atomic function', /create or replace function public\.save_quest_bundle\([\s\S]*insert into public\.habits_v2[\s\S]*insert into public\.quests[\s\S]*insert into public\.quest_habit_links/i],
  ['Atomic save runs with caller permissions', /save_quest_bundle\([\s\S]*security invoker[\s\S]*set search_path\s*=\s*''/i],
  ['Atomic save validates linked ownership', /goal is not owned by the authenticated user[\s\S]*campaign is not owned by the authenticated user[\s\S]*quest habit goal is not owned by the authenticated user/i],
  ['Atomic save is denied to anonymous callers', /revoke all on function public\.save_quest_bundle\(jsonb, jsonb, jsonb\) from public, anon;/i],
  ['User data limits cover all Quest tables', /\('quests',[\s\S]*\('quest_habit_links',[\s\S]*\('quest_reflections'/i],
];

let failed = 0;
for (const [name, pattern] of checks) {
  const passed = pattern.test(sql);
  console.log(`${passed ? 'PASS' : 'FAIL'}: ${name}`);
  if (!passed) failed += 1;
}

if (failed) {
  console.error(`\n${failed} Quest foundation migration check(s) failed.`);
  process.exit(1);
}

console.log('\nAll Quest foundation migration checks passed.');
