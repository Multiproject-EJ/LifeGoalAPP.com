import assert from 'node:assert/strict';

function getActiveTodayTodos(todos, activeDate) {
  return todos.filter((todo) => todo.todo_date === activeDate && !todo.completed);
}

function getCompletedTodayTodos(todos, activeDate) {
  return todos.filter((todo) => todo.todo_date === activeDate && todo.completed);
}

function getPendingYesterdaySundownTodos(todos, yesterdayDate) {
  return todos.filter((todo) => todo.todo_date === yesterdayDate && !todo.completed);
}

function moveYesterdaySundownTodosToToday(todos, yesterdayDate, todayDate) {
  return todos.map((todo) => (
    todo.todo_date === yesterdayDate && !todo.completed
      ? { ...todo, todo_date: todayDate, completed: false }
      : todo
  ));
}

const STALE_TODO_COACH_PILL_THRESHOLD_MS = 15 * 60 * 60 * 1000;

function shouldShowStaleTodoCoachPill(todo, nowMs) {
  if (todo.completed || !todo.created_at) return false;
  const createdAtMs = Date.parse(todo.created_at);
  return Number.isFinite(createdAtMs) && nowMs - createdAtMs > STALE_TODO_COACH_PILL_THRESHOLD_MS;
}

function getTodoSwipeAction(isExpanded) {
  return isExpanded ? null : 'complete';
}

function getTodoSwipeArmedDirection({ clampedOffsetPx, armThresholdPx, swipeAction }) {
  if (!swipeAction) return null;
  return clampedOffsetPx >= armThresholdPx ? 'right' : null;
}

// Mirrors reorderTodoIds in src/features/habits/todoSwipeHelpers.ts
function reorderTodoIds(ids, fromIndex, toIndex) {
  if (fromIndex < 0 || fromIndex >= ids.length) return ids.slice();
  const clampedTo = Math.max(0, Math.min(ids.length - 1, toIndex));
  if (fromIndex === clampedTo) return ids.slice();
  const next = ids.slice();
  const [moved] = next.splice(fromIndex, 1);
  next.splice(clampedTo, 0, moved);
  return next;
}

// Mirrors computeTodoReorderTargetIndex in src/features/habits/todoSwipeHelpers.ts
function computeTodoReorderTargetIndex({ pointerY, startIndex, midpoints }) {
  let target = startIndex;
  if (pointerY > (midpoints[startIndex] ?? pointerY)) {
    for (let i = startIndex + 1; i < midpoints.length; i += 1) {
      if (pointerY > midpoints[i]) target = i;
      else break;
    }
  } else {
    for (let i = startIndex - 1; i >= 0; i -= 1) {
      if (pointerY < midpoints[i]) target = i;
      else break;
    }
  }
  return target;
}

const fixtures = [
  { id: 'a', todo_date: '2026-05-26', title: 'Active today', completed: false },
  { id: 'b', todo_date: '2026-05-26', title: 'Done today', completed: true },
  { id: 'c', todo_date: '2026-05-27', title: 'Tomorrow item', completed: false },
  { id: 'd', todo_date: '2026-05-25', title: 'Yesterday sundown task', completed: false },
  { id: 'e', todo_date: '2026-05-25', title: 'Yesterday finished task', completed: true },
];

assert.deepEqual(getActiveTodayTodos(fixtures, '2026-05-26').map((t) => t.id), ['a']);
assert.deepEqual(getCompletedTodayTodos(fixtures, '2026-05-26').map((t) => t.id), ['b']);
assert.deepEqual(getActiveTodayTodos(fixtures, '2026-05-27').map((t) => t.id), ['c']);
assert.deepEqual(getActiveTodayTodos(fixtures, '2026-05-28').map((t) => t.id), []);
assert.deepEqual(getPendingYesterdaySundownTodos(fixtures, '2026-05-25').map((t) => t.id), ['d']);
assert.deepEqual(
  moveYesterdaySundownTodosToToday(fixtures, '2026-05-25', '2026-05-26')
    .filter((t) => t.todo_date === '2026-05-26' && !t.completed)
    .map((t) => t.id),
  ['a', 'd'],
);
const staleTodoNowMs = Date.parse('2026-05-26T16:30:00.000Z');
assert.equal(
  shouldShowStaleTodoCoachPill({ id: 'old', completed: false, created_at: '2026-05-26T01:00:00.000Z' }, staleTodoNowMs),
  true,
);
assert.equal(
  shouldShowStaleTodoCoachPill({ id: 'fresh', completed: false, created_at: '2026-05-26T02:00:00.000Z' }, staleTodoNowMs),
  false,
);
assert.equal(
  shouldShowStaleTodoCoachPill({ id: 'done-old', completed: true, created_at: '2026-05-26T01:00:00.000Z' }, staleTodoNowMs),
  false,
);
assert.equal(
  shouldShowStaleTodoCoachPill({ id: 'missing-created-at', completed: false, created_at: null }, staleTodoNowMs),
  false,
);
assert.equal(getTodoSwipeAction(false), 'complete');
assert.equal(getTodoSwipeAction(true), null);
assert.equal(
  getTodoSwipeArmedDirection({ clampedOffsetPx: 84, armThresholdPx: 84, swipeAction: 'complete' }),
  'right',
);
assert.equal(
  getTodoSwipeArmedDirection({ clampedOffsetPx: 60, armThresholdPx: 84, swipeAction: 'complete' }),
  null,
);
assert.equal(
  getTodoSwipeArmedDirection({ clampedOffsetPx: 200, armThresholdPx: 84, swipeAction: null }),
  null,
);

// Drag-to-reorder: moving an item down, up, no-op, and out-of-range clamping.
assert.deepEqual(reorderTodoIds(['a', 'b', 'c', 'd'], 0, 2), ['b', 'c', 'a', 'd']);
assert.deepEqual(reorderTodoIds(['a', 'b', 'c', 'd'], 3, 1), ['a', 'd', 'b', 'c']);
assert.deepEqual(reorderTodoIds(['a', 'b', 'c'], 1, 1), ['a', 'b', 'c']);
assert.deepEqual(reorderTodoIds(['a', 'b', 'c'], 0, 99), ['b', 'c', 'a']);
assert.deepEqual(reorderTodoIds(['a', 'b', 'c'], -1, 0), ['a', 'b', 'c']);

// Reordering only touches todos, never mutating the source array order used elsewhere.
const sourceIds = ['a', 'b', 'c'];
reorderTodoIds(sourceIds, 0, 2);
assert.deepEqual(sourceIds, ['a', 'b', 'c']);

// Target-index resolution from pointer position vs cached row midpoints (rows at y = 100, 200, 300).
const midpoints = [100, 200, 300];
assert.equal(computeTodoReorderTargetIndex({ pointerY: 250, startIndex: 0, midpoints }), 1);
assert.equal(computeTodoReorderTargetIndex({ pointerY: 320, startIndex: 0, midpoints }), 2);
assert.equal(computeTodoReorderTargetIndex({ pointerY: 90, startIndex: 2, midpoints }), 0);
assert.equal(computeTodoReorderTargetIndex({ pointerY: 205, startIndex: 1, midpoints }), 1);

console.log('today-todos-tests: all assertions passed');
