import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// Regression guard for the Personal Quest "Daily Momentum" calendar.
//
// Bug: opening a door eagerly writes `next_sequential_day = dayIndex + 1`, so
// the day-index resolver has to gate that value by calendar date. If the
// `next_sequential_day` short-circuit runs BEFORE the "already opened today"
// check, the calendar unlocks the next day on the same day and the user can
// chain every door up to day 7 in a single sitting. Exactly one door must be
// openable per calendar day.
//
// Both the client resolver (`computePersonalQuestTodayIndex`) and its
// server-side twin (`personalQuestTodayIndex` in the edge function) share this
// invariant, so both are checked here.

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '..');

const servicePath = resolve(repoRoot, 'src/services/treatCalendarService.ts');
const edgePath = resolve(repoRoot, 'supabase/functions/treat-calendar/index.ts');
const atomicSeasonMigrationPath = resolve(
  repoRoot,
  'supabase/migrations/20260803173000_ensure_personal_quest_season_atomic.sql',
);

const service = readFileSync(servicePath, 'utf8');
const edge = readFileSync(edgePath, 'utf8');
const atomicSeasonMigration = readFileSync(atomicSeasonMigrationPath, 'utf8');

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function functionBody(source, startNeedle, endNeedle) {
  const startIndex = source.indexOf(startNeedle);
  assert(startIndex !== -1, `Missing function start: ${startNeedle}`);
  const endIndex = source.indexOf(endNeedle, startIndex);
  assert(endIndex !== -1, `Missing function end after ${startNeedle}: ${endNeedle}`);
  return source.slice(startIndex, endIndex);
}

function requireOrder(body, earlier, later, label) {
  const earlierIndex = body.indexOf(earlier);
  const laterIndex = body.indexOf(later);
  assert(earlierIndex !== -1, `${label}: missing expected marker "${earlier}"`);
  assert(laterIndex !== -1, `${label}: missing expected marker "${later}"`);
  assert(
    earlierIndex < laterIndex,
    `${label}: the same-day "last_opened_date" gate must appear BEFORE the ` +
      `next_sequential_day short-circuit, otherwise the next day unlocks on the ` +
      `same calendar day and the user can chain doors to day 7.`,
  );
}

// --- Client resolver -------------------------------------------------------
const clientBody = functionBody(
  service,
  'function computePersonalQuestTodayIndex(',
  '\n}\n',
);
requireOrder(
  clientBody,
  'progress.last_opened_date === todayStr',
  'const nextSequentialDay =',
  'computePersonalQuestTodayIndex',
);

// --- Concurrent weekly provisioning ---------------------------------------
assert(
  service.includes(".rpc(\n    'ensure_personal_quest_season'"),
  'Personal Quest provisioning must use the atomic weekly-season RPC.',
);
assert(
  service.includes("onConflict: 'season_id,day_index,door_type'")
    && service.includes('ignoreDuplicates: true'),
  'Concurrent hatch seeding must resolve duplicate definitions without errors.',
);
assert(
  /security invoker/i.test(atomicSeasonMigration)
    && /set search_path = ''/i.test(atomicSeasonMigration),
  'The atomic provisioning RPC must preserve RLS and use a fixed empty search path.',
);
assert(
  /on conflict \(user_id_owner, starts_on\)[\s\S]{0,180}season_type = 'personal_quest'/i.test(atomicSeasonMigration),
  'The RPC must target the existing partial unique index for one season per user/week.',
);
assert(
  /revoke all on function public\.ensure_personal_quest_season\(text, date, date\)[\s\S]{0,100}from public, anon/i.test(atomicSeasonMigration),
  'Anonymous callers must not execute Personal Quest provisioning.',
);

// --- Server (edge function) resolver ---------------------------------------
const edgeBody = functionBody(
  edge,
  'function personalQuestTodayIndex(',
  '\n}\n',
);
requireOrder(
  edgeBody,
  'progress?.last_opened_date === today',
  'const nextSequentialDay =',
  'personalQuestTodayIndex',
);

console.log('personal-quest-day-unlock: all assertions passed');
