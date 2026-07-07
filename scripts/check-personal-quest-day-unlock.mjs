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

const service = readFileSync(servicePath, 'utf8');
const edge = readFileSync(edgePath, 'utf8');

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
