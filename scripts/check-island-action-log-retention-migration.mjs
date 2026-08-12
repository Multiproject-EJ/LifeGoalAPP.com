import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const migrationPath =
  'supabase/migrations/20260812212402_scale_island_action_log_retention.sql';
const sql = readFileSync(migrationPath, 'utf8').toLowerCase();

assert.match(
  sql,
  /cron\.alter_job\([\s\S]*schedule\s*:=\s*'\*\/5 \* \* \* \*'[\s\S]*active\s*:=\s*true/,
  'The existing retention job must be activated on a five-minute cadence.',
);
assert.match(
  sql,
  /cron\.schedule\([\s\S]*'island-run-action-log-retention'[\s\S]*'\*\/5 \* \* \* \*'/,
  'A missing retention job must be recreated on the same cadence.',
);
assert.match(
  sql,
  /clock_timestamp\(\)\s*-\s*interval\s*'48 hours'/,
  'The idempotency window must remain 48 hours.',
);
assert.match(
  sql,
  /ops\.delete_old_rows\([\s\S]*5000/,
  'Production must keep using the bounded cleanup helper when available.',
);
assert.match(
  sql,
  /with victims as \([\s\S]*order by created_at[\s\S]*limit 5000[\s\S]*delete from public\.island_run_action_log/,
  'Fresh environments need a bounded 5,000-row fallback.',
);
assert.doesNotMatch(
  sql,
  /(?:insert\s+into|update|delete\s+from)\s+cron\.job\b/,
  'Cron jobs must only be modified through cron.schedule/cron.alter_job.',
);
assert.doesNotMatch(
  sql,
  /truncate\s+(?:table\s+)?public\.island_run_action_log/,
  'The idempotency log must never be truncated.',
);
assert.match(
  sql,
  /rollback \(cadence only; keeps the bounded command and does not delete data\)/,
  'The migration must document a non-destructive cadence rollback.',
);

console.log('island-action-log-retention-migration: all assertions passed');
