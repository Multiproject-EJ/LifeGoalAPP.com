import { readFile } from 'node:fs/promises';

const checks = [
  {
    name: 'Routines service exposes routine CRUD entry points',
    file: 'src/services/routines.ts',
    pattern:
      /export async function listRoutines[\s\S]*export async function createRoutine[\s\S]*export async function updateRoutine[\s\S]*export async function deleteRoutine/m,
  },
  {
    name: 'Routines service exposes step CRUD entry points',
    file: 'src/services/routines.ts',
    pattern:
      /export async function listRoutineSteps[\s\S]*export async function createRoutineStep[\s\S]*export async function updateRoutineStep[\s\S]*export async function deleteRoutineStep/m,
  },
  {
    name: 'Routines service exposes routine log upsert and range listing',
    file: 'src/services/routines.ts',
    pattern:
      /export async function upsertRoutineLog[\s\S]*onConflict:\s*'routine_id,user_id,date'[\s\S]*export async function listRoutineLogsForRange/m,
  },
  {
    name: 'Routines today lane computes due routines with schedule interpreter',
    file: 'src/features/routines/RoutinesTodayLane.tsx',
    pattern: /function isRoutineDueToday[\s\S]*parseSchedule\(routine\.schedule\)/m,
  },
  {
    name: 'Routine completion writes through existing habit log service',
    file: 'src/features/routines/RoutinesTodayLane.tsx',
    pattern: /logHabitCompletionV2\(\{ habit_id: step\.habit_id, done: true, value: null \}, session\.user\.id\)/m,
  },
  {
    name: 'Routine completion also updates routine-level log',
    file: 'src/features/routines/RoutinesTodayLane.tsx',
    pattern: /await upsertRoutineLog\(\{[\s\S]*routineId,[\s\S]*completed:\s*isComplete/m,
  },
  {
    name: 'Routine-only steps hide from standalone lane',
    file: 'src/features/routines/RoutinesTodayLane.tsx',
    pattern: /if \(step\.display_mode === 'inside_routine_only'\)[\s\S]*hidden\.add\(step\.habit_id\)/m,
  },
  {
    name: 'App planning shell does not directly mount RoutinesTodayLane',
    file: 'src/App.tsx',
    pattern: /<RoutinesTodayLane[\s>]/,
    negate: true,
  },
  {
    name: 'Routines lane is mounted from DailyHabitTracker near contracts flow',
    file: 'src/features/habits/DailyHabitTracker.tsx',
    pattern: /<TodayExpandableActionSection[\s\S]*title="Routines"[\s\S]*expanded=\{openTodayExpandableSection === 'routines'\}[\s\S]*<RoutinesTodayLane[\s\S]*onHideStandaloneHabitsChange=\{handleRoutineHiddenHabitIdsChange\}[\s\S]*variant="panel"/m,
  },
];

let failed = 0;
for (const check of checks) {
  const content = await readFile(check.file, 'utf8');
  const matches = check.pattern.test(content);
  const ok = check.negate ? !matches : matches;
  const prefix = ok ? 'PASS' : 'FAIL';
  console.log(`${prefix}: ${check.name}`);
  if (!ok) {
    console.log(`  file: ${check.file}`);
    failed += 1;
  }
}

if (failed > 0) {
  console.error(`\n${failed} routines regression smoke check(s) failed.`);
  process.exit(1);
}

console.log('\nAll routines regression smoke checks passed.');
