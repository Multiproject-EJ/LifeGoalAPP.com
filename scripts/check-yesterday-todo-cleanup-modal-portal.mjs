import { readFileSync } from 'node:fs';

const source = readFileSync('src/features/habits/DailyHabitTracker.tsx', 'utf8');

function assert(condition, message) {
  if (!condition) {
    console.error(`yesterday-todo-cleanup-modal-portal: ${message}`);
    process.exit(1);
  }
}

const compactReturnStart = source.indexOf('if (isCompact) {');
assert(compactReturnStart !== -1, 'could not find compact return branch');

const compactReturnEnd = source.indexOf('\n  return (\n    <section className="habit-tracker">', compactReturnStart);
assert(compactReturnEnd !== -1, 'could not find end of compact return branch');

const compactReturn = source.slice(compactReturnStart, compactReturnEnd);
assert(
  compactReturn.includes('{yesterdaySundownTodoPortal}'),
  'compact Today view must render the yesterday todo cleanup portal so scroll lock never hides an unmounted modal',
);

const fullReturnStart = source.indexOf('return (', compactReturnEnd);
assert(fullReturnStart !== -1, 'could not find full return branch');
const fullReturn = source.slice(fullReturnStart);
assert(
  fullReturn.includes('{yesterdaySundownTodoPortal}'),
  'full Today view must keep rendering the yesterday todo cleanup portal',
);

console.log('yesterday-todo-cleanup-modal-portal: all assertions passed');
