import assert from 'node:assert/strict';
import { mkdirSync, rmSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { build } = createRequire(require.resolve('vite'))('esbuild');
const source = relativePath => fileURLToPath(new URL(`../${relativePath}`, import.meta.url));
const out = new URL('../.tmp-native-notification-tests/', import.meta.url);
mkdirSync(fileURLToPath(out), { recursive: true });

const storage = new Map();
globalThis.localStorage = {
  getItem: key => storage.get(key) ?? null,
  setItem: (key, value) => storage.set(key, String(value)),
  removeItem: key => storage.delete(key),
  clear: () => storage.clear(),
};
globalThis.window = new EventTarget();

function resetDevice({ native = true, permission = 'granted', requestResult = 'granted', requestError = null } = {}) {
  globalThis.__nativeTest = {
    native,
    permission,
    requestResult,
    requestError,
    requests: 0,
    schedules: 0,
    cancellations: 0,
    pending: new Map(),
  };
  return globalThis.__nativeTest;
}

function futureAlert(key, minutes = 10, extra = {}) {
  return {
    key,
    at: Date.now() + minutes * 60_000,
    title: 'A small step for you',
    body: 'Open HabitGame when you are ready.',
    ...extra,
  };
}

function localDate(year, month, day, hour = 0, minute = 0) {
  return new Date(year, month - 1, day, hour, minute, 0, 0);
}

try {
  await build({
    entryPoints: [source('src/services/nativeNotifications.ts')],
    bundle: true,
    platform: 'node',
    format: 'esm',
    outfile: fileURLToPath(new URL('bridge.mjs', out)),
    plugins: [{
      name: 'fake-device',
      setup(builder) {
        builder.onResolve({ filter: /^@capacitor\/(core|local-notifications)$/ }, args => ({
          path: args.path,
          namespace: 'device',
        }));
        builder.onLoad({ filter: /.*/, namespace: 'device' }, args => ({
          contents: args.path.endsWith('/core')
            ? 'export const Capacitor = { isNativePlatform: () => globalThis.__nativeTest.native };'
            : `const state = () => globalThis.__nativeTest;
              export const LocalNotifications = {
                checkPermissions: async () => ({ display: state().permission }),
                requestPermissions: async () => {
                  state().requests += 1;
                  if (state().requestError) throw state().requestError;
                  state().permission = state().requestResult;
                  return { display: state().permission };
                },
                getPending: async () => ({ notifications: [...state().pending.values()] }),
                schedule: async ({ notifications }) => {
                  state().schedules += 1;
                  for (const notification of notifications) state().pending.set(notification.id, notification);
                },
                cancel: async ({ notifications }) => {
                  state().cancellations += 1;
                  for (const notification of notifications) state().pending.delete(notification.id);
                },
              };`,
        }));
      },
    }],
  });

  const api = await import(new URL('bridge.mjs', out));

  // A failed native prompt did not finish an attempt. It can be retried the
  // next time the user chooses a reminder, while a resolved prompt remains
  // guarded against loops.
  storage.clear();
  let device = resetDevice({ permission: 'prompt', requestResult: 'prompt', requestError: new Error('native prompt failed') });
  await assert.rejects(
    api.enableNativeAlertPackage('retry-user', 'selected'),
    /native prompt failed/,
  );
  assert.equal(api.readNativeAlertPreferences('retry-user').selected, true, 'selected intent survives a thrown OS prompt');
  assert.equal(device.requests, 1);
  device.requestError = null;
  assert.equal(await api.enableNativeAlertPackage('retry-user', 'selected'), 'prompt');
  assert.equal(device.requests, 2, 'a thrown prompt is retried because no completed-attempt marker was stored');
  assert.equal(await api.enableNativeAlertPackage('retry-user', 'selected'), 'prompt');
  assert.equal(device.requests, 2, 'a resolved prompt stores the attempt marker and does not loop');

  // A selected reminder records user intent even if iOS leaves the permission
  // undecided. That same item must not trigger a permission-prompt loop.
  storage.clear();
  device = resetDevice({ permission: 'prompt', requestResult: 'prompt' });
  assert.equal(await api.enableNativeAlertPackage('prompt-user', 'selected'), 'prompt');
  assert.equal(api.readNativeAlertPreferences('prompt-user').selected, true, 'selected intent survives an unresolved OS prompt');
  assert.equal(device.requests, 1, 'selected reminder requests native permission once');
  assert.equal(await api.enableNativeAlertPackage('prompt-user', 'selected'), 'prompt');
  assert.equal(device.requests, 1, 'selected reminder never loops an unresolved system prompt');
  device.permission = 'granted';
  await api.syncNativeAlerts('prompt-user', 'selected', [futureAlert('habit:prompt')]);
  assert.equal(device.pending.size, 1, 'stored selected intent schedules after permission is granted in Settings');

  // Existing users who enabled the old Life package retain selected habit
  // reminders after the selected package is introduced.
  storage.clear();
  device = resetDevice();
  api.saveNativeAlertPreferences('migration-user', { life: true, selected: false });
  await api.syncNativeAlerts('migration-user', 'selected', [futureAlert('habit:migrated')]);
  assert.equal(device.pending.size, 1, 'legacy Life consent enables migrated selected reminders');
  assert.equal([...device.pending.values()][0].extra.scope, 'selected');

  // Selected and ambient reminders reconcile independently and use separate
  // slot ceilings (12 explicit choices, 3 ambient opportunities).
  storage.clear();
  device = resetDevice();
  api.saveNativeAlertPreferences('scope-user', { selected: true, life: true });
  const selectedAlerts = Array.from({ length: 15 }, (_, index) => futureAlert(`habit:selected-${index}`, 10 + index));
  const ambientAlerts = Array.from({ length: 7 }, (_, index) => futureAlert(`todo-opportunity:${index}`, 40 + index));
  await api.syncNativeAlerts('scope-user', 'selected', selectedAlerts);
  await api.syncNativeAlerts('scope-user', 'life', ambientAlerts);
  const pendingByScope = scope => [...device.pending.values()].filter(notification => notification.extra.scope === scope);
  assert.equal(pendingByScope('selected').length, 12, 'selected reminders have their own 12-slot ceiling');
  assert.equal(pendingByScope('life').length, 3, 'ambient reminders remain capped at three');
  assert.equal(device.pending.size, 15, 'ambient admission never consumes selected slots');

  api.saveNativeAlertPreferences('scope-user', { life: false });
  await api.syncNativeAlerts('scope-user', 'life', ambientAlerts);
  assert.equal(pendingByScope('life').length, 0, 'clearing Life removes only ambient notifications');
  assert.equal(pendingByScope('selected').length, 12, 'selected notifications persist when Life is cleared');
  assert.equal(api.readNativeAlertPreferences('scope-user').selected, true, 'clearing Life does not clear selected intent');

  // A device-local todo reconciliation must never treat unavailable habit
  // data as an empty habit list. Updating or clearing the todo partition keeps
  // the last-known habit notification intact and still shares the 12-slot cap.
  storage.clear();
  device = resetDevice();
  api.saveNativeAlertPreferences('partition-user', { selected: true });
  const preservedHabit = futureAlert('habit:preserved', 20, { habitId: 'preserved' });
  const originalTodo = futureAlert('todo:local', 30, { todoId: 'local' });
  await api.syncNativeAlerts('partition-user', 'selected', [preservedHabit, originalTodo]);
  const preservedHabitId = [...device.pending.values()].find(notification => notification.extra.habitId === 'preserved').id;
  await api.syncSelectedNativeAlerts('partition-user', 'todo', [
    { ...originalTodo, at: originalTodo.at + 60_000, body: 'Updated generic todo copy.' },
  ]);
  assert.equal(device.pending.has(preservedHabitId), true, 'todo update preserves the last-known habit schedule');
  assert.equal(device.pending.size, 2, 'todo update reconciles only its selected partition');
  await api.syncSelectedNativeAlerts('partition-user', 'todo', []);
  assert.equal(device.pending.has(preservedHabitId), true, 'todo cancellation preserves the last-known habit schedule');
  assert.equal(device.pending.size, 1, 'todo cancellation removes only the local todo notification');

  device = resetDevice();
  const elevenHabits = Array.from({ length: 11 }, (_, index) => futureAlert(`habit:reserved-${index}`, 40 + index, { habitId: `reserved-${index}` }));
  await api.syncNativeAlerts('partition-user', 'selected', elevenHabits);
  await api.syncSelectedNativeAlerts('partition-user', 'todo', [
    futureAlert('todo:first', 70, { todoId: 'first' }),
    futureAlert('todo:second', 71, { todoId: 'second' }),
  ]);
  assert.equal(device.pending.size, 12, 'partitioned reconciliation still enforces the shared selected-slot cap');
  assert.equal([...device.pending.values()].filter(notification => notification.extra.todoId).length, 1, 'todo partition uses only unreserved selected slots');

  // Calendar repeats map the Capacitor weekday and deliberately omit the
  // moving next-occurrence timestamp from the reconciliation signature.
  storage.clear();
  device = resetDevice();
  api.saveNativeAlertPreferences('repeat-user', { selected: true });
  const mondayRepeat = futureAlert('habit:monday', 50, {
    habitId: 'monday',
    repeat: { hour: 8, minute: 35, weekday: 2 },
  });
  await api.syncNativeAlerts('repeat-user', 'selected', [mondayRepeat]);
  const scheduledRepeat = [...device.pending.values()][0];
  assert.deepEqual(scheduledRepeat.schedule, { on: { hour: 8, minute: 35, weekday: 2 } }, 'repeat uses Capacitor Sunday=1 weekday numbering');
  assert.equal(device.schedules, 1);
  await api.syncNativeAlerts('repeat-user', 'selected', [{ ...mondayRepeat, at: mondayRepeat.at + 7 * 86_400_000 }]);
  assert.equal(device.schedules, 1, 'moving at does not churn an equivalent repeating notification');
  assert.equal(device.cancellations, 0, 'moving at does not cancel an equivalent repeating notification');

  // Baseline egg reconciliation and native/web boundaries remain intact.
  storage.clear();
  device = resetDevice({ permission: 'prompt', requestResult: 'granted' });
  const eggs = [1, 2, 3].map(index => futureAlert(`egg:${index}`));
  await api.syncNativeAlerts('egg-user', 'eggs', eggs);
  assert.equal(device.pending.size, 0, 'eggs do not schedule before package consent');
  assert.equal(await api.enableNativeAlertPackage('egg-user', 'eggs'), 'granted');
  assert.equal(device.requests, 1);
  await api.syncNativeAlerts('egg-user', 'eggs', eggs);
  assert.equal(device.pending.size, 3);
  await api.syncNativeAlerts('egg-user', 'eggs', eggs.slice(1));
  assert.equal(device.pending.size, 2, 'opening one egg cancels only that egg alert');
  device.native = false;
  await api.syncNativeAlerts('egg-user', 'eggs', eggs);
  assert.equal(device.pending.size, 2, 'web cannot invoke native scheduling or cancellation');

  console.log('Native notification bridge: selected intent, prompt-once, migration, isolated caps, persistence, repeat signatures, and egg boundaries passed.');

  // Builder fixture: 2026-09-21 is a Monday in every local timezone. Using
  // component Date construction keeps schedule logic deterministic in local
  // time instead of depending on UTC parsing offsets.
  const now = localDate(2026, 9, 21, 7, 0);
  assert.equal(now.getDay(), 1);
  globalThis.__lifeTest = {
    habits: [
      { id: 'daily', active: true, schedule: { mode: 'daily' }, autoprog: null, target_num: null },
      { id: 'specific-monday', active: true, schedule: { mode: 'specific_days', days: [1] }, autoprog: null, target_num: null },
      { id: 'specific-tuesday', active: true, schedule: { mode: 'specific_days', days: [2] }, autoprog: null, target_num: null },
      { id: 'completed-daily', active: true, schedule: { mode: 'daily' }, autoprog: null, target_num: null },
      { id: 'inactive', active: false, schedule: { mode: 'daily' }, autoprog: null, target_num: null },
    ],
    prefs: [
      { habit_id: 'daily', title: 'Secret morning ritual', enabled: true, preferred_time: '08:30' },
      { habit_id: 'specific-monday', title: 'Secret Monday ritual', enabled: true, preferred_time: '09:00' },
      { habit_id: 'specific-tuesday', title: 'Secret Tuesday ritual', enabled: true, preferred_time: '09:15' },
      { habit_id: 'completed-daily', title: 'Secret completed ritual', enabled: true, preferred_time: '08:45' },
      { habit_id: 'inactive', title: 'Secret inactive ritual', enabled: true, preferred_time: '10:00' },
    ],
    logs: [
      { habit_id: 'daily', date: '2026-09-20', progress_state: 'done', done: true },
      { habit_id: 'specific-monday', date: '2026-09-20', progress_state: 'done', done: true },
      { habit_id: 'specific-tuesday', date: '2026-09-20', progress_state: 'done', done: true },
      { habit_id: 'completed-daily', date: '2026-09-21', progress_state: 'done', done: true },
    ],
    settings: {
      window_start: '09:30',
      quiet_hours_start: null,
      quiet_hours_end: null,
      skip_weekends: false,
    },
    goals: [
      { id: 'goal', title: 'Private target', status_tag: 'on_track', target_date: '2026-09-21' },
      { id: 'achieved', title: 'Finished private target', status_tag: 'achieved', target_date: '2026-09-21' },
    ],
    todos: [
      { id: 'explicit-todo', title: 'Secret medical todo', completed: false, todo_date: '2026-09-21' },
      { id: 'ambient-todo', title: 'Secret ambient todo', completed: false, todo_date: '2026-09-21' },
      { id: 'completed-todo', title: 'Secret completed todo', completed: true, todo_date: '2026-09-21' },
    ],
    todoPrefs: {
      'explicit-todo': {
        todoId: 'explicit-todo',
        title: 'Secret medical todo',
        todoDate: '2026-09-21',
        time: '10:30',
        at: localDate(2026, 9, 21, 10, 30).getTime(),
        updatedAt: localDate(2026, 9, 21, 6, 0).getTime(),
      },
    },
    habitsError: null,
    prefsError: null,
    logsError: null,
    settingsError: null,
    goalsError: null,
    todosError: null,
  };

  const lifeModules = {
    habitsV2: `
      export const listHabitsV2 = async () => ({ data: globalThis.__lifeTest.habits, error: globalThis.__lifeTest.habitsError });
      export const isHabitLifecycleActive = habit => habit.active;
      export const listHabitLogsForRangeMultiV2 = async () => ({ data: globalThis.__lifeTest.logs, error: globalThis.__lifeTest.logsError });
    `,
    habitReminderPrefs: `export const fetchHabitReminderPrefs = async () => ({ data: globalThis.__lifeTest.prefs, error: globalThis.__lifeTest.prefsError });`,
    reminderPrefs: `export const fetchReminderPrefs = async () => ({ data: globalThis.__lifeTest.settings, error: globalThis.__lifeTest.settingsError });`,
    goals: `export const fetchGoals = async () => ({ data: globalThis.__lifeTest.goals, error: globalThis.__lifeTest.goalsError });`,
    todayTodos: `export const fetchTodayTodos = async () => ({ data: globalThis.__lifeTest.todos, error: globalThis.__lifeTest.todosError });`,
    quickItemReminders: `export const readNativeTodoReminderPreferences = () => globalThis.__lifeTest.todoPrefs;`,
  };

  await build({
    entryPoints: [source('src/services/nativeLifeReminders.ts')],
    bundle: true,
    platform: 'node',
    format: 'esm',
    outfile: fileURLToPath(new URL('life.mjs', out)),
    plugins: [{
      name: 'read-services',
      setup(builder) {
        builder.onResolve({
          filter: /^\.\/(habitsV2|habitReminderPrefs|reminderPrefs|goals|todayTodos|quickItemReminders)$/,
        }, args => ({ path: args.path.slice(2), namespace: 'reads' }));
        builder.onLoad({ filter: /.*/, namespace: 'reads' }, args => ({ contents: lifeModules[args.path] }));
      },
    }],
  });

  const { buildNativeLifeReminderGroups, buildNativeTodoReminderAlerts } = await import(new URL('life.mjs', out));
  const groups = await buildNativeLifeReminderGroups('builder-user', now);
  const selectedByKey = new Map(groups.selected.map(alert => [alert.key, alert]));

  assert.deepEqual(selectedByKey.get('habit:daily').repeat, { hour: 8, minute: 30 }, 'daily habit uses a daily calendar trigger');
  assert.equal(selectedByKey.get('habit:daily').at, localDate(2026, 9, 21, 8, 30).getTime());
  assert.deepEqual(selectedByKey.get('habit:specific-monday').repeat, { hour: 9, minute: 0, weekday: 2 }, 'Monday maps to Capacitor weekday 2');
  assert.equal(selectedByKey.get('habit:specific-tuesday').at, localDate(2026, 9, 22, 9, 15).getTime(), 'rest-day habit advances to its next scheduled day');
  assert.deepEqual(selectedByKey.get('habit:specific-tuesday').repeat, { hour: 9, minute: 15, weekday: 3 }, 'Tuesday maps to Capacitor weekday 3');
  assert.equal(selectedByKey.get('habit:completed-daily').at, localDate(2026, 9, 22, 8, 45).getTime(), 'completed-today habit defers to tomorrow');
  assert.equal(selectedByKey.get('habit:completed-daily').repeat, undefined, 'completed-today habit avoids a repeating trigger that could still fire today');
  assert.equal(selectedByKey.has('habit:inactive'), false, 'inactive habits never receive selected notifications');

  assert.equal(selectedByKey.has('todo:explicit-todo'), true, 'explicit todo remains in the selected group');
  assert.equal(groups.ambient.some(alert => alert.todoId === 'explicit-todo'), false, 'explicit todo is excluded from ambient reminders');
  assert.equal(groups.ambient.some(alert => alert.todoId === 'ambient-todo'), true, 'todo without a bell remains eligible for one ambient opportunity');
  assert.equal(groups.ambient.some(alert => alert.key.startsWith('goal:goal:')), true, 'eligible goal remains ambient');
  assert.equal(groups.ambient.some(alert => alert.key.includes('achieved')), false, 'achieved goal is suppressed');

  const sensitiveText = [
    ...globalThis.__lifeTest.prefs.map(preference => preference.title),
    ...globalThis.__lifeTest.todos.map(todo => todo.title),
    ...globalThis.__lifeTest.goals.map(goal => goal.title),
  ];
  const deliveredText = [...groups.selected, ...groups.ambient]
    .map(alert => `${alert.title}\n${alert.body}`)
    .join('\n');
  for (const secret of sensitiveText) {
    assert.equal(deliveredText.includes(secret), false, `notification content does not expose ${secret}`);
  }
  assert.equal(groups.selected.every(alert => alert.title && alert.body), true, 'selected notifications use generic non-empty copy');

  globalThis.__lifeTest.settings.quiet_hours_start = '22:00';
  globalThis.__lifeTest.settings.quiet_hours_end = '10:00';
  const quietGroups = await buildNativeLifeReminderGroups('builder-user', now);
  assert.deepEqual(quietGroups.selected.map(alert => alert.key), groups.selected.map(alert => alert.key), 'quiet hours never suppress user-selected reminders');
  assert.deepEqual(quietGroups.ambient, [], 'quiet hours suppress ambient reminders');
  globalThis.__lifeTest.settings.quiet_hours_start = null;
  globalThis.__lifeTest.settings.quiet_hours_end = null;

  globalThis.__lifeTest.habitsError = new Error('habits unavailable offline');
  await assert.rejects(
    buildNativeLifeReminderGroups('builder-user', now),
    /habits unavailable offline/,
    'an unavailable habit list rejects instead of cancelling enabled selected schedules',
  );
  globalThis.__lifeTest.habitsError = null;

  globalThis.__lifeTest.logsError = new Error('habit logs unavailable offline');
  await assert.rejects(
    buildNativeLifeReminderGroups('builder-user', now),
    /habit logs unavailable offline/,
    'an unavailable completion log rejects instead of guessing reminder intent',
  );
  globalThis.__lifeTest.logsError = null;

  globalThis.__lifeTest.prefsError = new Error('reminder preferences unavailable offline');
  const offlineTodoAlerts = buildNativeTodoReminderAlerts('builder-user', now);
  assert.deepEqual(
    offlineTodoAlerts.map(alert => alert.key),
    ['todo:explicit-todo'],
    'local todo reminders remain buildable without habit preferences or logs',
  );
  await assert.rejects(
    buildNativeLifeReminderGroups('builder-user', now),
    /reminder preferences unavailable offline/,
    'an unavailable preference list rejects instead of reconciling to empty',
  );
  globalThis.__lifeTest.prefsError = null;

  console.log('Native reminder builder: daily/specific/rest-day/completed behavior, privacy, explicit isolation, quiet hours, and offline preservation passed.');
} finally {
  rmSync(fileURLToPath(out), { recursive: true, force: true });
}
