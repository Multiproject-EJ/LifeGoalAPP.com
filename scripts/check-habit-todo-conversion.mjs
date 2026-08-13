import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const migration = readFileSync(
  'supabase/migrations/20260813132704_add_reversible_habit_todo_conversion.sql',
  'utf8',
).toLowerCase();
const tracker = readFileSync('src/features/habits/DailyHabitTracker.tsx', 'utf8');
const service = readFileSync('src/services/habitTodoConversion.ts', 'utf8');
const types = readFileSync('src/lib/database.types.ts', 'utf8');
const css = readFileSync('src/index.css', 'utf8');

assert.match(migration, /add column if not exists source_habit_id uuid/);
assert.match(migration, /add column if not exists source_habit_snapshot jsonb/);
assert.match(migration, /check \(source_habit_id is null or source_habit_snapshot is not null\)/);
assert.match(migration, /to_jsonb\(v_habit\)[\s\S]*snapshot_version/);
assert.match(migration, /create or replace function public\.convert_habit_to_today_todo/);
assert.match(migration, /create or replace function public\.convert_today_todo_to_habit/);
assert.match(migration, /security invoker[\s\S]*set search_path = ''/);
assert.match(
  migration,
  /update public\.habits_v2[\s\S]*archived = true[\s\S]*status = 'archived'/,
  'Habit-to-todo must preserve the habit row and its history by archiving it.',
);
assert.match(
  migration,
  /update public\.habits_v2[\s\S]*archived = false[\s\S]*status = 'active'/,
  'Todo-to-habit must reactivate the original habit row.',
);
assert.match(
  migration,
  /update public\.today_todos[\s\S]*completed = true/,
  'Restoring a habit must complete the source todo in the same transaction.',
);
assert.match(migration, /where id = p_habit_id[\s\S]*user_id = v_user_id/);
assert.match(migration, /where id = p_todo_id[\s\S]*user_id = v_user_id/);
assert.doesNotMatch(migration, /security definer/);

assert.match(service, /\.rpc\('convert_habit_to_today_todo'/);
assert.match(service, /\.rpc\('convert_today_todo_to_habit'/);
assert.match(tracker, /☑️ Convert to todo/);
assert.match(tracker, /Its saved settings and history will return/);
assert.match(tracker, /buildScheduleWithNotes\(rhythmSchedule, todo\.notes/);
assert.match(tracker, /scheduleHabitNotifications\(restoredHabitId/);
assert.match(types, /source_habit_snapshot: Json \| null/);

assert.match(
  css,
  /\.habit-checklist-card__campaign-launcher\s*\{[\s\S]*display: inline-grid;[\s\S]*grid-template-areas:/,
  'Campaign button should use a stable symmetric grid instead of unstyled inline text.',
);
assert.match(css, /\.habit-checklist-card__campaign-copy\s*\{[\s\S]*text-align: center;/);

console.log('habit-todo-conversion: all assertions passed');
