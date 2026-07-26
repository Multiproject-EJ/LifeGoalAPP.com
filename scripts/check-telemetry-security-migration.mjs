import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const migrationPath =
  'supabase/migrations/20260726040810_enforce_security_invoker_on_public_views.sql';
const sql = readFileSync(migrationPath, 'utf8').toLowerCase();

for (const viewName of [
  'v_habit_streaks',
  'v_challenge_scores',
  'vb_board_stats',
  'reminder_actions_daily',
  'reminder_sends_daily',
  'reminder_failures_daily',
  'v_users_with_active_reminders',
]) {
  assert.match(
    sql,
    new RegExp(`alter view if exists public\\.${viewName}[\\s\\S]{0,80}security_invoker = true`),
    `${viewName} must execute with the caller's RLS context.`,
  );
}

assert.match(
  sql,
  /revoke all on table public\.reminder_metrics_aggregate_30d[\s\S]{0,80}from anon, authenticated/,
  'The reminder materialized view must not be directly exposed to API roles.',
);
assert.match(
  sql,
  /alter function public\.apply_permanent_upgrade\(uuid, text, integer\)[\s\S]{0,80}security invoker/,
  'Permanent upgrades must not bypass the caller’s row-level permissions.',
);

const fixedSearchPathCount = (sql.match(/set search_path = pg_catalog, public/g) ?? []).length;
assert.equal(fixedSearchPathCount, 24, 'Every function flagged by the advisor must get a fixed search path.');

for (const serviceOnlySignature of [
  'get_users_with_active_reminders\\(\\)',
  'rollup_telemetry_daily\\(integer\\)',
  'rollup_telemetry_user_activity\\(integer\\)',
  'increment_user_dice_rolls\\(uuid, integer\\)',
  'evaluate_due_commitment_contracts_sweep\\(integer, integer\\)',
]) {
  assert.match(
    sql,
    new RegExp(`revoke execute on function public\\.${serviceOnlySignature}[\\s\\S]{0,80}from anon, authenticated`),
    `${serviceOnlySignature} must remain unavailable to client API roles.`,
  );
}

assert.match(
  sql,
  /create policy "case_threads_admin_update_all"[\s\S]*with check \([\s\S]*admin_row\.user_id = auth\.uid\(\)[\s\S]*admin_row\.active = true/,
  'Admin case-thread updates must retain the same active-admin condition after the write.',
);
assert.doesNotMatch(
  sql,
  /revoke\s+(all|execute)\s+on\s+all functions/i,
  'The migration must not use a broad function revoke that could break public RPCs.',
);

console.log('telemetry-security-migration: all assertions passed');
