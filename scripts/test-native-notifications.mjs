import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdirSync, rmSync } from 'node:fs';
const require = createRequire(import.meta.url);
const { build } = createRequire(require.resolve('vite'))('esbuild');
const out = new URL('../.tmp-native-notification-tests/', import.meta.url);
mkdirSync(out, { recursive: true });
const storage = new Map();
globalThis.localStorage = { getItem: k => storage.get(k) ?? null, setItem: (k,v) => storage.set(k,v) };
globalThis.window = new EventTarget();
globalThis.__nativeTest = { native: true, permission: 'prompt', requests: 0, schedules: 0, pending: new Map() };
try {
  await build({ entryPoints: ['src/services/nativeNotifications.ts'], bundle: true, platform: 'node', format: 'esm', outfile: new URL('bridge.mjs', out).pathname,
    plugins: [{ name: 'fake-device', setup(builder) {
      builder.onResolve({ filter: /^@capacitor\/(core|local-notifications)$/ }, args => ({ path: args.path, namespace: 'device' }));
      builder.onLoad({ filter: /.*/, namespace: 'device' }, args => ({ contents: args.path.endsWith('/core')
        ? 'export const Capacitor = { isNativePlatform: () => globalThis.__nativeTest.native };'
        : `const state = globalThis.__nativeTest;
          export const LocalNotifications = {
            checkPermissions: async () => ({display:state.permission}),
            requestPermissions: async () => {state.requests++;state.permission='granted';return {display:state.permission}},
            getPending: async () => ({notifications:[...state.pending.values()]}),
            schedule: async ({notifications}) => {state.schedules++;for(const n of notifications)state.pending.set(n.id,n)},
            cancel: async ({notifications}) => {for(const n of notifications)state.pending.delete(n.id)},
          };` }));
    } }],
  });
  const api = await import(new URL('bridge.mjs', out));
  const device = globalThis.__nativeTest;
  const eggs = [1,2,3].map(i => ({key:`egg:${i}`,at:Date.now()+600000,title:'Egg ready',body:'Meet your companion'}));
  await api.syncNativeAlerts('one','eggs',eggs);
  assert.equal(device.pending.size,0,'no alerts before package consent');
  assert.equal(await api.enableNativeAlertPackage('one','eggs'),'granted');
  assert.equal(device.requests,1,'one native OS permission request');
  await api.syncNativeAlerts('one','eggs',eggs);
  assert.equal(device.pending.size,3,'batch eggs all survive');
  await api.syncNativeAlerts('one','eggs',eggs);
  assert.equal(device.schedules,1,'same ledger does not reschedule');
  await api.syncNativeAlerts('one','eggs',eggs.slice(1));
  assert.equal(device.pending.size,2,'opening one egg cancels only its alert');
  api.saveNativeAlertPreferences('one',{eggs:false});
  await api.syncNativeAlerts('one','eggs',eggs);
  assert.equal(device.pending.size,0,'package off cancels pending alerts');
  await api.enableNativeAlertPackage('one','life');
  assert.equal(device.requests,1,'permission is not requested again');
  await api.syncNativeAlerts('one','life',[{key:'habit:one:today',habitId:'habit-one',at:Date.now()+600000,title:'Habit',body:'A small win'}]);
  await api.cancelNativeHabitAlerts(['habit-one']);
  assert.equal(device.pending.size,0,'Today Stalled cancellation removes native reminder');
  await api.syncNativeAlerts('one','life',[{key:'todo:one:today',at:Date.now()+600000,title:'Todo',body:'A small win'}]);
  await api.clearOtherNativeUsers('two');
  assert.equal(device.pending.size,0,'account changes do not leak old alerts');
  device.permission='denied';
  assert.equal(await api.enableNativeAlertPackage('two','eggs'),'denied');
  assert.equal(device.requests,1,'denied permission never loops a system prompt');
  device.native=false;
  await api.syncNativeAlerts('two','eggs',eggs);
  assert.equal(device.pending.size,0,'web cannot invoke native scheduling');
  console.log('Native notification bridge: 13 permission, reconciliation, cancellation and account-isolation checks passed.');
  globalThis.__lifeTest = {
    habits: [{id:'stalled',active:true,schedule:null}, {id:'active',active:true,schedule:null}, {id:'done',active:true,schedule:null}],
    prefs: ['stalled','active','done'].map(id => ({habit_id:id,title:id,enabled:true,preferred_time:'08:30'})),
    logs: [{habit_id:'stalled',date:'2026-09-01',progress_state:'done',done:true}, {habit_id:'active',date:'2026-09-20',progress_state:'doneIsh',done:true}, {habit_id:'done',date:'2026-09-21',progress_state:null,done:true}],
    settings: {window_start:'09:00',quiet_hours_start:null,quiet_hours_end:null,skip_weekends:false},
    goals: [{id:'achieved',title:'Finished',status_tag:'achieved',target_date:'2026-09-21'}, {id:'goal',title:'Next goal',status_tag:'on_track',target_date:'2026-09-21'}],
    todos: [{id:'done',title:'Finished',completed:true,todo_date:'2026-09-21'}, {id:'todo',title:'Next task',completed:false,todo_date:'2026-09-21'}],
  };
  const lifeModules = {
    habitsV2: `export const listHabitsV2=async()=>({data:globalThis.__lifeTest.habits});export const isHabitLifecycleActive=h=>h.active;export const listHabitLogsForRangeMultiV2=async()=>({data:globalThis.__lifeTest.logs});`,
    habitReminderPrefs: `export const fetchHabitReminderPrefs=async()=>({data:globalThis.__lifeTest.prefs});`,
    reminderPrefs: `export const fetchReminderPrefs=async()=>({data:globalThis.__lifeTest.settings});`,
    goals: `export const fetchGoals=async()=>({data:globalThis.__lifeTest.goals});`,
    todayTodos: `export const fetchTodayTodos=async()=>({data:globalThis.__lifeTest.todos});`,
  };
  await build({ entryPoints:['src/services/nativeLifeReminders.ts'],bundle:true,platform:'node',format:'esm',outfile:new URL('life.mjs',out).pathname,
    plugins:[{name:'read-services',setup(builder){
      builder.onResolve({filter:/^\.\/(habitsV2|habitReminderPrefs|reminderPrefs|goals|todayTodos)$/},args=>({path:args.path.slice(2),namespace:'reads'}));
      builder.onLoad({filter:/.*/,namespace:'reads'},args=>({contents:lifeModules[args.path]}));
    }}],
  });
  const {buildNativeLifeReminders}=await import(new URL('life.mjs',out));
  const life=await buildNativeLifeReminders('one',new Date(2026,8,21,7,0));
  assert.deepEqual(life.map(a=>a.key),['habit:active:2026-09-21','todo:todo:2026-09-21','goal:goal:2026-09-21'],'Stalled, completed habits/todos and achieved goals never notify');
  globalThis.__lifeTest.settings.quiet_hours_start='22:00';globalThis.__lifeTest.settings.quiet_hours_end='10:00';
  assert.equal((await buildNativeLifeReminders('one',new Date(2026,8,21,7,0))).length,0,'quiet hours suppress scheduled reminders');
  console.log('Native smart reminder integration: active opportunities, Stalled/completed suppression and quiet hours passed.');

} finally { rmSync(out,{recursive:true,force:true}); }
