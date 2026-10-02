import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdirSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { build } = createRequire(require.resolve('vite'))('esbuild');
const out = new URL('../.tmp-quick-reminder-tests/', import.meta.url);
mkdirSync(fileURLToPath(out), { recursive: true });

const storage = new Map();
globalThis.localStorage = {
  getItem: (key) => storage.get(key) ?? null,
  setItem: (key, value) => storage.set(key, value),
};
globalThis.window = new EventTarget();
globalThis.__quickReminderTest = {
  native: false,
  permission: 'granted',
  nativeRefreshes: 0,
  updates: [],
  habitPrefs: [{ habit_id: 'habit-1', title: 'Read', emoji: '📚', enabled: false, preferred_time: null }],
};

try {
  await build({
    entryPoints: ['src/services/quickItemReminders.ts'],
    bundle: true,
    platform: 'node',
    format: 'esm',
    outfile: fileURLToPath(new URL('quick.mjs', out)),
    plugins: [{
      name: 'quick-reminder-services',
      setup(builder) {
        builder.onResolve({ filter: /^\.\/(habitReminderPrefs|nativeNotifications)$/ }, (args) => ({
          path: args.path.slice(2),
          namespace: 'quick-reminder-services',
        }));
        builder.onLoad({ filter: /.*/, namespace: 'quick-reminder-services' }, (args) => ({
          contents: args.path === 'habitReminderPrefs'
            ? `const state = globalThis.__quickReminderTest;
               export const fetchHabitReminderPrefs = async () => ({ data: state.habitPrefs, error: null });
               export const updateHabitReminderPref = async (habitId, updates) => {
                 state.updates.push({ habitId, updates });
                 return { data: { habit_id: habitId, ...updates }, error: null };
               };`
            : `const state = globalThis.__quickReminderTest;
               export const isNativeNotifications = () => state.native;
               export const enableNativeAlertPackage = async (_userId, kind) => { state.enabledKind = kind; return state.permission; };
               export const notifyNativeAlertsChanged = () => { state.nativeRefreshes += 1; };`,
        }));
      },
    }],
  });

  const api = await import(new URL('quick.mjs', out));
  assert.equal(api.normalizeReminderTime('8:05'), '08:05');
  assert.equal(api.normalizeReminderTime('23:59:00'), '23:59');
  assert.equal(api.normalizeReminderTime('24:00'), null);
  assert.equal(api.normalizeReminderTime('later'), null);

  const at = api.reminderDateTime('2026-10-04', '09:15');
  assert.ok(at instanceof Date);
  assert.equal(at.getFullYear(), 2026);
  assert.equal(at.getMonth(), 9);
  assert.equal(at.getDate(), 4);
  assert.equal(at.getHours(), 9);
  assert.equal(at.getMinutes(), 15);

  await assert.rejects(
    api.saveTodoQuickReminder({
      userId: 'user-1', todoId: 'todo-1', title: 'Call Mum', todoDate: '2026-10-04', time: '18:30', now: new Date('2026-10-03T12:00:00'),
    }),
    /iPhone app/,
  );
  assert.equal(api.readNativeTodoReminderPreferences('user-1')['todo-1'], undefined, 'PWA does not show a non-delivering todo bell');

  globalThis.__quickReminderTest.native = true;
  const savedTodo = await api.saveTodoQuickReminder({
    userId: 'user-1',
    todoId: 'todo-1',
    title: 'Call Mum',
    todoDate: '2026-10-04',
    time: '18:30',
    now: new Date('2026-10-03T12:00:00'),
  });
  assert.equal(savedTodo.permission, 'granted');
  assert.equal(savedTodo.reminder.title, 'Todo reminder', 'exact todo text is not persisted for lock-screen delivery');
  assert.deepEqual(api.readNativeTodoReminderPreferences('user-1')['todo-1'], savedTodo.reminder);
  assert.equal(api.readNativeTodoReminderPreferences('user-2')['todo-1'], undefined, 'todo reminders stay user-isolated');
  await assert.rejects(
    api.saveTodoQuickReminder({
      userId: 'user-1', todoId: 'past', title: 'Past', todoDate: '2026-10-03', time: '11:00', now: new Date('2026-10-03T12:00:00'),
    }),
    /future time/,
  );
  assert.deepEqual(api.readNativeTodoReminderPreferences('user-1')['todo-1'], savedTodo.reminder, 'a rejected overwrite preserves the valid reminder');

  globalThis.__quickReminderTest.permission = 'denied';
  const deniedTodo = await api.saveTodoQuickReminder({
    userId: 'user-1', todoId: 'todo-2', title: 'Private title', todoDate: '2026-10-04', time: '19:30', now: new Date('2026-10-03T12:00:00'),
  });
  assert.equal(deniedTodo.permission, 'denied');
  assert.equal(api.readNativeTodoReminderPreferences('user-1')['todo-2'].time, '19:30', 'chosen time survives denied OS permission');
  api.clearTodoQuickReminder('user-1', 'todo-1');
  assert.equal(api.readNativeTodoReminderPreferences('user-1')['todo-1'], undefined);

  globalThis.__quickReminderTest.permission = 'granted';
  const savedHabit = await api.saveHabitQuickReminder('user-1', 'habit-1', '07:45');
  assert.equal(savedHabit.permission, 'granted');
  assert.equal(globalThis.__quickReminderTest.enabledKind, 'selected');
  assert.deepEqual(globalThis.__quickReminderTest.updates.at(-1), {
    habitId: 'habit-1',
    updates: { enabled: true, preferred_time: '07:45' },
  });
  await api.clearHabitQuickReminder('user-1', 'habit-1');
  assert.deepEqual(globalThis.__quickReminderTest.updates.at(-1), {
    habitId: 'habit-1',
    updates: { enabled: false, preferred_time: null },
  });
  globalThis.__quickReminderTest.habitPrefs = Array.from({ length: api.SELECTED_REMINDER_LIMIT }, (_, index) => ({
    habit_id: `full-${index}`,
    title: `Habit ${index}`,
    emoji: null,
    enabled: true,
    preferred_time: '08:00',
  }));
  await assert.rejects(
    api.saveTodoQuickReminder({
      userId: 'user-1', todoId: 'over-cap', title: 'One too many', todoDate: '2026-10-04', time: '20:30', now: new Date('2026-10-03T12:00:00'),
    }),
    /12 chosen habit and todo alerts/,
  );
  assert.ok(globalThis.__quickReminderTest.nativeRefreshes >= 3, 'every saved/cleared preference refreshes native reconciliation');

  console.log('quick-item-reminders: native-only todo delivery, validation, privacy, capacity, persistence, permission and clear checks passed.');
} finally {
  rmSync(fileURLToPath(out), { recursive: true, force: true });
}
