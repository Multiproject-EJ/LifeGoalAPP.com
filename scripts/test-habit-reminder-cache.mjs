import assert from 'node:assert/strict';
import { mkdirSync, rmSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { build } = createRequire(require.resolve('vite'))('esbuild');
const source = relativePath => fileURLToPath(new URL(`../${relativePath}`, import.meta.url));
const out = new URL('../.tmp-habit-reminder-cache-tests/', import.meta.url);
mkdirSync(fileURLToPath(out), { recursive: true });

const storage = new Map();
globalThis.localStorage = {
  getItem: key => storage.get(key) ?? null,
  setItem: (key, value) => storage.set(key, String(value)),
};
globalThis.__habitReminderCacheTest = {
  failReads: false,
  failWrites: false,
  queueFailures: false,
  preferences: [
    { habit_id: 'habit-1', title: 'Morning pages', emoji: '✍️', enabled: true, preferred_time: '07:00' },
    { habit_id: 'habit-2', title: 'Walk', emoji: '🚶', enabled: true, preferred_time: '10:00' },
  ],
};

globalThis.fetch = async (_url, options = {}) => {
  const state = globalThis.__habitReminderCacheTest;
  const method = options.method ?? 'GET';
  if (method === 'GET') {
    if (state.failReads) throw new Error('preferences unavailable');
    return { ok: true, json: async () => structuredClone(state.preferences) };
  }
  if (state.failWrites) return { ok: false, status: 503 };
  const payload = JSON.parse(options.body);
  const index = state.preferences.findIndex(preference => preference.habit_id === payload.habit_id);
  const existing = state.preferences[index];
  const next = {
    ...existing,
    enabled: payload.enabled ?? existing.enabled,
    preferred_time: payload.preferred_time !== undefined ? payload.preferred_time : existing.preferred_time,
  };
  state.preferences[index] = next;
  return {
    ok: true,
    json: async () => ({
      habit_id: next.habit_id,
      enabled: next.enabled,
      preferred_time: next.preferred_time,
      created_at: '2026-10-02T00:00:00.000Z',
      updated_at: '2026-10-02T00:00:00.000Z',
    }),
  };
};

try {
  await build({
    entryPoints: [source('src/services/habitReminderPrefs.ts')],
    bundle: true,
    platform: 'node',
    format: 'esm',
    define: {
      'import.meta.env.VITE_SUPABASE_URL': JSON.stringify('https://example.test'),
    },
    outfile: fileURLToPath(new URL('prefs.mjs', out)),
    plugins: [{
      name: 'habit-reminder-cache-services',
      setup(builder) {
        builder.onResolve({
          filter: /^(\.\.\/lib\/(supabaseClient|database\.types)|\.\/(service-health|offline-queue|offlineWriteThrough)|\.\.\/data\/habitReminderPrefsOfflineRepo)$/,
        }, args => ({ path: args.path, namespace: 'habit-reminder-cache-services' }));
        builder.onLoad({ filter: /.*/, namespace: 'habit-reminder-cache-services' }, args => {
          if (args.path.endsWith('supabaseClient')) {
            return { contents: `
              export const canUseSupabaseData = () => true;
              export const getSupabaseClient = () => ({
                auth: { getSession: async () => ({ data: { session: { user: { id: 'user-1' }, access_token: 'token' } }, error: null }) },
              });
            ` };
          }
          if (args.path.endsWith('database.types')) return { contents: 'export {};' };
          if (args.path.endsWith('service-health')) {
            return { contents: `
              export const guardedCloudCall = async (_scope, action) => {
                try { return { ok: true, data: await action() }; }
                catch (error) { return { ok: false, error: { explanation: error.message ?? String(error) } }; }
              };
            ` };
          }
          if (args.path.endsWith('offline-queue')) {
            return { contents: `
              export const getMutationQueue = () => ({ enqueue: async () => {}, list: async () => [] });
              export const getSyncEngine = () => ({ syncNow: async () => {} });
            ` };
          }
          if (args.path.endsWith('offlineWriteThrough')) {
            return { contents: 'export const shouldQueueAfterFailure = () => globalThis.__habitReminderCacheTest.queueFailures;' };
          }
          return { contents: `
            export const buildReminderPrefKey = (userId, habitId) => userId + ':' + habitId;
            export const getLocalReminderPrefRecord = async () => null;
            export const listLocalReminderPrefRecordsForUser = async () => [];
            export const listPendingReminderPrefMutations = async () => [];
            export const removeReminderPrefMutation = async () => {};
            export const removeLocalReminderPrefRecord = async () => {};
            export const upsertLocalReminderPrefRecord = async () => {};
          ` };
        });
      },
    }],
  });

  const api = await import(new URL('prefs.mjs', out));
  const initial = await api.fetchHabitReminderPrefs();
  assert.equal(initial.error, null);
  assert.equal(initial.data.find(preference => preference.habit_id === 'habit-1').preferred_time, '07:00');

  const updated = await api.updateHabitReminderPref('habit-1', { enabled: true, preferred_time: '08:30' });
  assert.equal(updated.error, null);
  globalThis.__habitReminderCacheTest.failReads = true;
  const afterUpdateOutage = await api.fetchHabitReminderPrefs();
  assert.equal(afterUpdateOutage.error, null);
  assert.equal(afterUpdateOutage.data.find(preference => preference.habit_id === 'habit-1').preferred_time, '08:30', 'outage fallback uses the confirmed new time');
  assert.equal(afterUpdateOutage.data.find(preference => preference.habit_id === 'habit-2').preferred_time, '10:00', 'cache patch preserves other habit reminders');

  globalThis.__habitReminderCacheTest.failReads = false;
  const cleared = await api.updateHabitReminderPref('habit-1', { enabled: false, preferred_time: null });
  assert.equal(cleared.error, null);
  globalThis.__habitReminderCacheTest.failReads = true;
  const afterClearOutage = await api.fetchHabitReminderPrefs();
  const clearedFallback = afterClearOutage.data.find(preference => preference.habit_id === 'habit-1');
  assert.equal(clearedFallback.enabled, false, 'outage fallback does not resurrect a cleared reminder');
  assert.equal(clearedFallback.preferred_time, null, 'outage fallback does not resurrect the cleared time');

  globalThis.__habitReminderCacheTest.failReads = false;
  await api.fetchHabitReminderPrefs();
  globalThis.__habitReminderCacheTest.failWrites = true;
  const failed = await api.updateHabitReminderPref('habit-1', { enabled: true, preferred_time: '11:45' });
  assert.ok(failed.error, 'failed server writes remain errors');
  globalThis.__habitReminderCacheTest.failReads = true;
  const afterFailedWrite = await api.fetchHabitReminderPrefs();
  assert.equal(afterFailedWrite.data.find(preference => preference.habit_id === 'habit-1').preferred_time, null, 'failed writes never change the last-known-good cache');

  globalThis.__habitReminderCacheTest.failReads = false;
  await api.fetchHabitReminderPrefs();
  globalThis.__habitReminderCacheTest.failWrites = true;
  globalThis.__habitReminderCacheTest.queueFailures = true;
  const queuedToggle = await api.updateHabitReminderPref('habit-2', { enabled: false });
  assert.equal(queuedToggle.error, null, 'retryable writes are queued');
  assert.equal(queuedToggle.data.enabled, false, 'queued partial update applies the changed field');
  assert.equal(queuedToggle.data.preferred_time, '10:00', 'queued partial update preserves omitted fields from the last-known-good cache');

  console.log('habit-reminder-cache: confirmed writes and clears update outage fallback without inventing partial snapshots.');
} finally {
  rmSync(fileURLToPath(out), { recursive: true, force: true });
}
