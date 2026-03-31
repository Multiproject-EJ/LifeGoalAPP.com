import { readFile } from 'node:fs/promises';

const file = 'supabase/migrations/0203_routines_foundation.sql';
const content = await readFile(file, 'utf8');

const checks = [
  {
    name: 'Creates routines table',
    pattern: /create table if not exists public\.routines\s*\(/im,
  },
  {
    name: 'Creates routine_steps table',
    pattern: /create table if not exists public\.routine_steps\s*\(/im,
  },
  {
    name: 'Creates routine_logs table',
    pattern: /create table if not exists public\.routine_logs\s*\(/im,
  },
  {
    name: 'Enables RLS on routine tables',
    pattern:
      /alter table public\.routines enable row level security;[\s\S]*alter table public\.routine_steps enable row level security;[\s\S]*alter table public\.routine_logs enable row level security;/im,
  },
  {
    name: 'Creates user-isolation policies',
    pattern:
      /create policy "Users can view their own routines"[\s\S]*create policy "Users can view steps for own routines"[\s\S]*create policy "Users can view own routine logs"/im,
  },
  {
    name: 'Creates supporting indexes',
    pattern:
      /create index if not exists idx_routines_user_is_active[\s\S]*create index if not exists idx_routine_steps_routine_order[\s\S]*create index if not exists idx_routine_logs_user_date/im,
  },
  {
    name: 'Adds updated_at triggers',
    pattern:
      /create trigger touch_routines_updated_at[\s\S]*create trigger touch_routine_steps_updated_at[\s\S]*create trigger touch_routine_logs_updated_at/im,
  },
];

let failed = 0;
for (const check of checks) {
  const ok = check.pattern.test(content);
  const prefix = ok ? 'PASS' : 'FAIL';
  console.log(`${prefix}: ${check.name}`);
  if (!ok) {
    failed += 1;
  }
}

if (failed > 0) {
  console.error(`\n${failed} routines migration smoke check(s) failed.`);
  process.exit(1);
}

console.log('\nAll routines migration smoke checks passed.');
