import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const migrationUrl = new URL(
  '../supabase/migrations/20260927164558_align_daily_spin_bonus_with_active_habit_logs.sql',
  import.meta.url,
);
const sql = readFileSync(migrationUrl, 'utf8');

for (const fragment of [
  'from public.habit_completions as completion',
  'from public.habit_logs_v2 as completion_v2',
  'from public.habit_logs as legacy_completion',
  'join public.habits as legacy_habit',
  'join public.goals as legacy_goal',
  'legacy_goal.user_id = v_user_id',
  'v_user_id uuid := (select auth.uid())',
  'revoke execute on function public.claim_daily_spin_habit_bonus(date)',
  'to authenticated, service_role',
]) {
  assert.ok(sql.includes(fragment), `missing daily-spin security/eligibility guard: ${fragment}`);
}

assert.doesNotMatch(sql, /grant execute[\s\S]*\bto\s+(public|anon)\b/i);
console.log('Daily-spin active habit-log migration check passed.');
