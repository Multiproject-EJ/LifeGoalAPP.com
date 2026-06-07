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

function getTodoSwipeAction(isExpanded) {
  return isExpanded ? null : 'complete';
}

function getTodoSwipeArmedDirection({ clampedOffsetPx, armThresholdPx, swipeAction }) {
  if (!swipeAction) return null;
  return clampedOffsetPx >= armThresholdPx ? 'right' : null;
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

console.log('today-todos-tests: all assertions passed');
