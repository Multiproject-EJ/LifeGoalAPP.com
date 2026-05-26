import assert from 'node:assert/strict';

function getActiveTodayTodos(todos, activeDate) {
  return todos.filter((todo) => todo.todo_date === activeDate && !todo.completed);
}

function getCompletedTodayTodos(todos, activeDate) {
  return todos.filter((todo) => todo.todo_date === activeDate && todo.completed);
}

const fixtures = [
  { id: 'a', todo_date: '2026-05-26', title: 'Active today', completed: false },
  { id: 'b', todo_date: '2026-05-26', title: 'Done today', completed: true },
  { id: 'c', todo_date: '2026-05-27', title: 'Tomorrow item', completed: false },
];

assert.deepEqual(getActiveTodayTodos(fixtures, '2026-05-26').map((t) => t.id), ['a']);
assert.deepEqual(getCompletedTodayTodos(fixtures, '2026-05-26').map((t) => t.id), ['b']);
assert.deepEqual(getActiveTodayTodos(fixtures, '2026-05-27').map((t) => t.id), ['c']);
assert.deepEqual(getActiveTodayTodos(fixtures, '2026-05-28').map((t) => t.id), []);

console.log('today-todos-tests: all assertions passed');
