/**
 * Service Resilience Framework tests (Part 15).
 *
 * Pure Node tests (no DOM, no Supabase) exercising the failure scenarios the
 * framework exists for: offline, timeouts, quota restriction, project paused,
 * maintenance, auth failure, expired session, storage/realtime/edge failures,
 * sync conflicts, restart during offline edits, and reconnect.
 *
 * Run via `npm run test:service-resilience`.
 */

import { classifyProviderError, translateProviderError, isAppError } from '../errorTranslation';
import { CircuitBreaker } from '../circuitBreaker';
import { BoundedLog } from '../boundedLog';
import { ServiceHealthManager } from '../serviceHealthManager';
import { getFeatureAvailability, isFeatureUsable } from '../capabilities';
import { parseIncidentPayload } from '../incidentStatus';
import type { ServiceHealthSnapshot } from '../types';
import { MutationQueue } from '../../offline-queue/mutationQueue';
import {
  LocalStorageQueueStorage,
  MemoryQueueStorage,
  selectQueueStorage,
} from '../../offline-queue/storageAdapters';
import { IndexedDBQueueStorage, type QueueDatabaseLike } from '../../offline-queue/indexedDbStorage';
import { SyncEngine } from '../../offline-queue/syncEngine';
import type { PendingMutation } from '../../offline-queue/types';

function assertEqual<T>(actual: T, expected: T, message: string): void {
  if (actual !== expected) {
    throw new Error(`${message}: expected ${String(expected)} but received ${String(actual)}`);
  }
}

function assertTrue(actual: boolean, message: string): void {
  assertEqual(actual, true, message);
}

/** Deterministic manual clock for backoff/circuit tests. */
function createClock(startAt = 1_000_000) {
  let now = startAt;
  return {
    now: () => now,
    advance: (ms: number) => {
      now += ms;
    },
  };
}

function createManager(clock: () => number) {
  return new ServiceHealthManager({ clock, failureThreshold: 3, cooldownMs: 10_000 });
}

// ── Part 2: error translation ───────────────────────────────────────────────

function testErrorTranslation(): void {
  assertEqual(
    classifyProviderError(new TypeError('Failed to fetch')),
    'offline',
    'fetch network failure classifies as offline',
  );
  assertEqual(
    classifyProviderError({ message: 'The request timed out' }),
    'timeout',
    'timeout message classifies as timeout',
  );
  assertEqual(
    classifyProviderError({ message: 'You have exceeded the limit of egress quota' }),
    'quota_exceeded',
    'quota message classifies as quota_exceeded',
  );
  assertEqual(
    classifyProviderError({ message: 'Project is paused', status: 400 }),
    'project_restricted',
    'paused project classifies as project_restricted',
  );
  assertEqual(
    classifyProviderError({ status: 503, message: 'Service Unavailable' }),
    'maintenance',
    '503 classifies as maintenance',
  );
  assertEqual(
    classifyProviderError({ message: 'Invalid login credentials', status: 400 }),
    'invalid_credentials',
    'bad password classifies as invalid_credentials',
  );
  assertEqual(
    classifyProviderError({ message: 'JWT expired', status: 401 }),
    'auth_expired',
    'expired JWT classifies as auth_expired',
  );
  assertEqual(
    classifyProviderError({ status: 429, message: 'Too many requests' }),
    'rate_limited',
    '429 classifies as rate_limited',
  );
  assertEqual(
    classifyProviderError({ status: 403, message: 'new row violates row-level security policy' }),
    'permission_denied',
    'RLS violation classifies as permission_denied',
  );
  assertEqual(
    classifyProviderError({ status: 409, message: 'duplicate key value violates unique constraint' }),
    'conflict',
    'duplicate key classifies as conflict',
  );
  assertEqual(
    classifyProviderError({ message: 'Bucket not found' }, { service: 'storage' }),
    'storage_unavailable',
    'storage failure classifies as storage_unavailable',
  );
  assertEqual(
    classifyProviderError({ message: 'WebSocket closed' }, { service: 'realtime' }),
    'realtime_unavailable',
    'realtime failure classifies as realtime_unavailable',
  );
  assertEqual(
    classifyProviderError({ name: 'FunctionsFetchError', message: 'boom' }, { service: 'edgeFunctions' }),
    'edge_function_unavailable',
    'edge function failure classifies as edge_function_unavailable',
  );
  assertEqual(
    classifyProviderError({ message: 'anything' }, { networkOnline: false }),
    'offline',
    'network offline overrides other classification',
  );

  // No raw provider payload in user-facing fields (Part 2 core guarantee).
  const rawDetail = 'PostgrestError: relation "secret_table" does not exist';
  const translated = translateProviderError({ message: rawDetail, status: 500 });
  assertTrue(isAppError(translated), 'translation produces an AppError');
  assertTrue(!translated.title.includes('Postgrest'), 'title contains no provider jargon');
  assertTrue(!translated.explanation.includes('secret_table'), 'explanation contains no raw payload');
  assertTrue(
    (translated.technicalDetail ?? '').includes('secret_table'),
    'technical detail retains raw payload for diagnostics',
  );

  const quota = translateProviderError({ message: 'db_size quota exceeded' });
  assertEqual(quota.retryable, false, 'quota errors are not blindly retryable');
  assertEqual(quota.safeLocalMode, true, 'quota errors permit safe local mode');
  assertEqual(quota.code, 'SVC_QUOTA_EXCEEDED', 'quota errors expose a stable incident code');
}

// ── Part 11: circuit breaker ────────────────────────────────────────────────

function testCircuitBreaker(): void {
  const clock = createClock();
  const breaker = new CircuitBreaker({ failureThreshold: 3, cooldownMs: 5_000, clock: clock.now });

  assertTrue(breaker.canRequest(), 'closed circuit admits requests');
  breaker.recordFailure();
  breaker.recordFailure();
  assertTrue(breaker.canRequest(), 'circuit stays closed below the threshold');
  breaker.recordFailure();
  assertEqual(breaker.state, 'open', 'circuit opens at the failure threshold');
  assertEqual(breaker.canRequest(), false, 'open circuit rejects requests (no retry storm)');

  clock.advance(5_001);
  assertEqual(breaker.state, 'half-open', 'cooldown elapses into half-open');
  assertTrue(breaker.canRequest(), 'half-open admits a single probe');
  assertEqual(breaker.canRequest(), false, 'second concurrent probe is rejected');

  breaker.recordFailure();
  assertEqual(breaker.state, 'open', 'failed probe re-opens the circuit');
  clock.advance(5_001);
  assertEqual(breaker.state, 'open', 'repeated failures extend the cooldown');
  clock.advance(5_000);
  assertTrue(breaker.canRequest(), 'extended cooldown eventually admits a probe');
  breaker.recordSuccess();
  assertEqual(breaker.state, 'closed', 'successful probe closes the circuit');
}

// ── Parts 1 & 10: health manager and operating modes ────────────────────────

function testOperatingModes(): void {
  const clock = createClock();
  const manager = createManager(clock.now);

  assertEqual(manager.getSnapshot().overall, 'ONLINE', 'initial mode is ONLINE');

  // Internet unavailable.
  manager.setNetworkOnline(false);
  assertEqual(manager.getSnapshot().overall, 'OFFLINE', 'network loss enters OFFLINE');
  manager.setNetworkOnline(true);
  assertEqual(manager.getSnapshot().overall, 'ONLINE', 'reconnect restores ONLINE');

  // Database degradation.
  manager.reportFailure('database', { message: 'The request timed out' });
  assertEqual(manager.getSnapshot().overall, 'DEGRADED', 'database timeout enters DEGRADED');
  assertEqual(manager.getSnapshot().services.database, 'degraded', 'database marks degraded');
  manager.reportSuccess('database');
  assertEqual(manager.getSnapshot().overall, 'ONLINE', 'database recovery restores ONLINE');

  // Quota restriction produces a stable incident code and stays DEGRADED.
  manager.reportFailure('database', { message: 'disk quota exceeded' });
  const quotaSnapshot = manager.getSnapshot();
  assertEqual(quotaSnapshot.overall, 'DEGRADED', 'quota restriction enters DEGRADED');
  assertEqual(quotaSnapshot.incidentCode, 'SVC_QUOTA_EXCEEDED', 'incident code reflects quota');
  assertEqual(quotaSnapshot.services.database, 'unavailable', 'non-retryable failure marks unavailable');
  manager.reportSuccess('database');

  // Maintenance dominates.
  manager.reportFailure('database', { status: 503, message: 'maintenance' });
  assertEqual(manager.getSnapshot().overall, 'MAINTENANCE', '503 enters MAINTENANCE');
  manager.reportSuccess('database');

  // Expired session requires account action.
  manager.reportFailure('auth', { message: 'JWT expired', status: 401 });
  assertEqual(
    manager.getSnapshot().overall,
    'ACCOUNT_ACTION_REQUIRED',
    'expired session enters ACCOUNT_ACTION_REQUIRED',
  );
  manager.setAccountActionRequired(false);
  manager.reportSuccess('auth');

  // Invalid password is normal flow, not degradation (Part 3).
  manager.reportFailure('auth', { message: 'Invalid login credentials', status: 400 });
  assertEqual(
    manager.getSnapshot().overall,
    'ONLINE',
    'invalid credentials never degrade service health',
  );

  // Local persistence failure is the only UNSAFE state.
  manager.setLocalPersistenceFailed(true);
  assertEqual(manager.getSnapshot().overall, 'UNSAFE', 'local persistence failure enters UNSAFE');
  manager.setLocalPersistenceFailed(false);

  // Both core services hard-down reads as OFFLINE.
  const outageManager = createManager(clock.now);
  for (let i = 0; i < 3; i += 1) {
    outageManager.reportFailure('auth', { message: 'Failed to fetch' });
    outageManager.reportFailure('database', { message: 'Failed to fetch' });
  }
  assertEqual(
    outageManager.getSnapshot().overall,
    'OFFLINE',
    'core services unavailable reads as OFFLINE',
  );
}

async function testRecoveryProbes(): Promise<void> {
  const clock = createClock();
  const manager = new ServiceHealthManager({ clock: clock.now, failureThreshold: 1, cooldownMs: 1_000 });

  let probeHealthy = false;
  let probeCalls = 0;
  manager.registerProbe('database', async () => {
    probeCalls += 1;
    return probeHealthy;
  });

  manager.reportFailure('database', { message: 'Failed to fetch' });
  assertEqual(manager.getSnapshot().services.database, 'unavailable', 'database down before probe');

  // Circuit open: probe attempts are gated, not stormed.
  await manager.runRecoveryProbes();
  assertEqual(probeCalls, 0, 'open circuit blocks probes during cooldown');

  clock.advance(1_001);
  probeHealthy = true;
  await manager.runRecoveryProbes();
  assertEqual(probeCalls, 1, 'half-open circuit admits one probe');
  assertEqual(manager.getSnapshot().services.database, 'healthy', 'successful probe restores service');
  assertEqual(manager.getSnapshot().overall, 'ONLINE', 'recovery restores ONLINE');
}

// ── Parts 5 & 8: capability matrix ──────────────────────────────────────────

function testCapabilityMatrix(): void {
  const clock = createClock();
  const manager = createManager(clock.now);
  const online = manager.getSnapshot();

  assertEqual(
    getFeatureAvailability('habit_completion', online).status,
    'available',
    'habits available while ONLINE',
  );
  assertEqual(
    getFeatureAvailability('purchases', online).status,
    'available',
    'purchases available while ONLINE',
  );

  manager.setNetworkOnline(false);
  const offline = manager.getSnapshot();

  assertEqual(
    getFeatureAvailability('habit_completion', offline).status,
    'local',
    'habit completion works locally offline',
  );
  assertEqual(
    getFeatureAvailability('island_run', offline).status,
    'local',
    'Island Run remains playable offline',
  );
  assertEqual(
    getFeatureAvailability('image_upload', offline).status,
    'queued',
    'uploads queue while offline',
  );
  assertEqual(
    getFeatureAvailability('purchases', offline).status,
    'paused',
    'purchases pause while offline',
  );
  assertEqual(
    getFeatureAvailability('premium_grant', offline).status,
    'blocked',
    'premium grants are blocked offline (no economy exploits)',
  );
  assertTrue(
    isFeatureUsable('journal', offline),
    'journal stays usable offline',
  );
  assertTrue(
    !isFeatureUsable('subscriptions', offline),
    'subscriptions are not usable offline',
  );

  manager.setNetworkOnline(true);

  // Partial outage: storage down only affects storage-dependent features.
  const storageManager = new ServiceHealthManager({ clock: clock.now, failureThreshold: 1 });
  storageManager.reportFailure('storage', { message: 'Bucket unavailable', status: 500 });
  const storageDown = storageManager.getSnapshot();
  assertEqual(
    getFeatureAvailability('image_upload', storageDown).status,
    'queued',
    'storage outage queues uploads',
  );
  assertEqual(
    getFeatureAvailability('habit_completion', storageDown).status,
    'available',
    'storage outage leaves habits untouched',
  );

  // UNSAFE blocks everything.
  storageManager.setLocalPersistenceFailed(true);
  assertEqual(
    getFeatureAvailability('habit_completion', storageManager.getSnapshot()).status,
    'blocked',
    'UNSAFE mode blocks edits to protect data',
  );
}

// ── Part 6: mutation queue durability ───────────────────────────────────────

async function testMutationQueue(): Promise<void> {
  const clock = createClock();
  const storage = new MemoryQueueStorage();
  let idCounter = 0;
  const queue = new MutationQueue({
    storage,
    clock: clock.now,
    idGenerator: () => `id-${(idCounter += 1)}`,
  });

  await queue.enqueue({ feature: 'habits', operation: 'habit_log.insert', payload: { habitId: 'h1' } });
  await queue.enqueue({
    feature: 'journal',
    operation: 'journal.upsert',
    payload: { text: 'v1' },
    dedupeKey: 'entry-1',
  });
  await queue.enqueue({
    feature: 'journal',
    operation: 'journal.upsert',
    payload: { text: 'v2' },
    dedupeKey: 'entry-1',
  });

  const mutations = await queue.list();
  assertEqual(mutations.length, 2, 'dedupe key replaces the queued mutation');
  const journalMutation = mutations.find((m) => m.feature === 'journal');
  assertEqual(
    (journalMutation?.payload as { text: string }).text,
    'v2',
    'latest local edit wins in the queue',
  );

  // Restart during offline edits: a new queue on the same storage restores
  // pending work, and interrupted 'syncing' entries return to 'pending'.
  const first = mutations[0];
  await queue.markStatus(first.id, 'syncing');
  const restartedQueue = new MutationQueue({ storage, clock: clock.now });
  const restored = await restartedQueue.list();
  assertEqual(restored.length, 2, 'queue survives restart');
  assertTrue(
    restored.every((m) => m.status === 'pending'),
    'interrupted syncing resets to pending after restart',
  );

  const counts = await restartedQueue.counts();
  assertEqual(counts.pending, 2, 'counts reflect restored mutations');
}

async function testQueueBounds(): Promise<void> {
  const clock = createClock();
  const queue = new MutationQueue({ storage: new MemoryQueueStorage(), clock: clock.now, maxEntries: 10 });
  for (let i = 0; i < 25; i += 1) {
    await queue.enqueue({ feature: 'habits', operation: 'noop', payload: { i } });
  }
  const mutations = await queue.list();
  assertTrue(mutations.length <= 10, 'queue growth is bounded (Part 14)');
}

// ── Storage adapters: IndexedDB preference, migration, fallback ─────────────

/** In-memory fake of the minimal idb surface IndexedDBQueueStorage uses. */
function createFakeQueueDatabase(options: { failWrites?: boolean } = {}) {
  const rows = new Map<string, PendingMutation>();
  const database: QueueDatabaseLike = {
    async getAll() {
      return Array.from(rows.values());
    },
    transaction() {
      if (options.failWrites) {
        throw new Error('QuotaExceededError (simulated)');
      }
      return {
        store: {
          async clear() {
            rows.clear();
          },
          async put(value: unknown) {
            const mutation = value as PendingMutation;
            rows.set(mutation.id, mutation);
          },
        },
        done: Promise.resolve(),
      };
    },
  };
  return { database, rows };
}

function makeMutation(id: string): PendingMutation {
  return {
    id,
    feature: 'habits',
    operation: 'habit_log.insert',
    payload: { id },
    createdAt: new Date(0).toISOString(),
    attempts: 0,
    status: 'pending',
    idempotencyKey: `habits:habit_log.insert:${id}`,
    lastErrorCode: null,
    nextAttemptAt: null,
  };
}

function testQueueStorageSelection(): void {
  const localAdapter = new MemoryQueueStorage();
  const withIdb = selectQueueStorage({ indexedDBAvailable: true, localStorageAdapter: localAdapter });
  assertTrue(withIdb instanceof IndexedDBQueueStorage, 'IndexedDB preferred when available');

  const withoutIdb = selectQueueStorage({ indexedDBAvailable: false, localStorageAdapter: localAdapter });
  assertEqual(withoutIdb, localAdapter, 'localStorage adapter used when IndexedDB unavailable');

  const bare = selectQueueStorage({ indexedDBAvailable: false, localStorageAdapter: null });
  assertTrue(bare instanceof MemoryQueueStorage, 'memory storage is the last resort');

  assertEqual(
    IndexedDBQueueStorage.isSupported({}),
    false,
    'support detection is false without indexedDB',
  );
  assertEqual(
    IndexedDBQueueStorage.isSupported({ indexedDB: {} }),
    true,
    'support detection is true with indexedDB present',
  );
}

async function testIndexedDbAdapterRoundTripAndMigration(): Promise<void> {
  // Round trip through the fake database.
  const { database } = createFakeQueueDatabase();
  const storage = new IndexedDBQueueStorage({ openDatabase: async () => database });
  await storage.save([makeMutation('a'), makeMutation('b')]);
  const loaded = await storage.load();
  assertEqual(loaded.length, 2, 'IndexedDB adapter round-trips mutations');

  // Legacy (localStorage) entries are adopted on first load and the legacy
  // store is emptied, so upgrading adapters never strands queued work.
  const legacy = new MemoryQueueStorage();
  await legacy.save([makeMutation('legacy-1'), makeMutation('legacy-2')]);
  const fresh = createFakeQueueDatabase();
  const migrating = new IndexedDBQueueStorage({
    legacy,
    openDatabase: async () => fresh.database,
  });
  const adopted = await migrating.load();
  assertEqual(adopted.length, 2, 'legacy queue entries migrate into IndexedDB');
  assertEqual(fresh.rows.size, 2, 'migrated entries persist in IndexedDB');
  assertEqual((await legacy.load()).length, 0, 'legacy store is cleared after migration');
}

async function testIndexedDbAdapterFallback(): Promise<void> {
  // A broken IndexedDB falls back to the legacy adapter without reporting
  // UNSAFE (durability degrades, work is not lost).
  const legacy = new MemoryQueueStorage();
  let persistenceErrors = 0;
  const failing = new IndexedDBQueueStorage({
    legacy,
    onPersistenceError: () => {
      persistenceErrors += 1;
    },
    openDatabase: async () => {
      throw new Error('InvalidStateError: A mutation operation was attempted');
    },
  });
  await failing.save([makeMutation('x')]);
  assertEqual((await legacy.load()).length, 1, 'writes fall back to legacy storage');
  assertEqual((await failing.load()).length, 1, 'reads fall back to legacy storage');
  assertEqual(persistenceErrors, 0, 'fallback success does not flip UNSAFE');

  // Without any fallback the failure must surface (→ UNSAFE mode upstream).
  let reported = 0;
  const isolated = new IndexedDBQueueStorage({
    onPersistenceError: () => {
      reported += 1;
    },
    openDatabase: async () => {
      throw new Error('InvalidStateError');
    },
  });
  await isolated.save([makeMutation('y')]);
  assertTrue(reported > 0, 'persistence failure without fallback is reported');
}

async function testLocalStorageAdapterStillWorks(): Promise<void> {
  const store = new Map<string, string>();
  const webStorageLike = {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
  };
  const adapter = new LocalStorageQueueStorage(webStorageLike);
  await adapter.save([makeMutation('ls-1')]);
  assertEqual((await adapter.load()).length, 1, 'localStorage adapter round-trips');
}

// ── Part 7: sync engine ─────────────────────────────────────────────────────

interface SyncHarness {
  clock: ReturnType<typeof createClock>;
  manager: ServiceHealthManager;
  queue: MutationQueue;
  engine: SyncEngine;
}

function createSyncHarness(): SyncHarness {
  const clock = createClock();
  const manager = new ServiceHealthManager({ clock: clock.now, failureThreshold: 5, cooldownMs: 1_000 });
  const queue = new MutationQueue({ storage: new MemoryQueueStorage(), clock: clock.now, maxAttempts: 3 });
  const engine = new SyncEngine({
    queue,
    healthManager: manager,
    clock: clock.now,
    baseBackoffMs: 1_000,
    jitterRatio: 0.5,
    random: () => 0.5,
  });
  return { clock, manager, queue, engine };
}

async function testSyncEngineSuccessAndIdempotency(): Promise<void> {
  const { queue, engine } = createSyncHarness();
  const executed: string[] = [];

  engine.registerExecutor('habit_log.insert', async (mutation: PendingMutation) => {
    executed.push(mutation.idempotencyKey);
    return { outcome: 'success' as const };
  });

  await queue.enqueue({
    feature: 'habits',
    operation: 'habit_log.insert',
    payload: {},
    dedupeKey: 'h1:2026-07-11',
  });
  const report = await engine.syncNow();

  assertEqual(report.succeeded, 1, 'queued mutation syncs on recovery');
  assertEqual((await queue.list()).length, 0, 'completed mutations leave the queue');
  assertEqual(
    executed[0],
    'habits:habit_log.insert:h1:2026-07-11',
    'executor receives the stable idempotency key',
  );

  // Re-running immediately performs no duplicate work.
  const secondReport = await engine.syncNow();
  assertEqual(secondReport.attempted, 0, 'nothing to sync twice — no duplicates');
}

async function testSyncEngineRetryBackoff(): Promise<void> {
  const { clock, queue, engine } = createSyncHarness();
  let attempts = 0;
  let failuresRemaining = 2;

  engine.registerExecutor('goal.update', async () => {
    attempts += 1;
    if (failuresRemaining > 0) {
      failuresRemaining -= 1;
      throw { message: 'The request timed out' };
    }
    return { outcome: 'success' as const };
  });

  await queue.enqueue({ feature: 'goals', operation: 'goal.update', payload: {} });

  let report = await engine.syncNow();
  assertEqual(attempts, 1, 'first attempt runs immediately');
  assertEqual(report.retriedLater, 1, 'failure schedules a later retry');

  // Not due yet — retries are bounded by backoff, not hammered.
  report = await engine.syncNow();
  assertEqual(attempts, 1, 'retry waits for the backoff window');

  clock.advance(2_000); // 1s base * 2^0 * jitter(1.25) = 1.25s
  report = await engine.syncNow();
  assertEqual(attempts, 2, 'retry runs after backoff elapses');

  clock.advance(4_000); // second retry backoff (2.5s with jitter)
  report = await engine.syncNow();
  assertEqual(attempts, 3, 'second retry runs after longer backoff');
  assertEqual(report.succeeded, 1, 'mutation eventually succeeds');
  assertEqual((await queue.counts()).pending, 0, 'queue drains after success');
}

async function testSyncEngineBoundedRetries(): Promise<void> {
  const { clock, queue, engine } = createSyncHarness();
  let attempts = 0;
  engine.registerExecutor('journal.upsert', async () => {
    attempts += 1;
    throw { message: 'The request timed out' };
  });
  await queue.enqueue({ feature: 'journal', operation: 'journal.upsert', payload: {} });

  for (let i = 0; i < 10; i += 1) {
    await engine.syncNow();
    clock.advance(60_000);
  }
  assertEqual(attempts, 3, 'retries stop at maxAttempts (bounded)');
  const counts = await queue.counts();
  assertEqual(counts.failed, 1, 'exhausted mutation parks as failed');

  // User-driven retry re-arms it without losing the payload.
  await queue.retryFailed();
  assertEqual((await queue.counts()).pending, 1, 'failed mutations can be re-armed');
}

async function testSyncEngineNonRetryableAndConflict(): Promise<void> {
  const { queue, engine } = createSyncHarness();

  engine.registerExecutor('settings.update', async () => {
    throw { message: 'new row violates row-level security policy', status: 403 };
  });
  engine.registerExecutor('goal.update', async () => ({ outcome: 'conflict' as const, detail: 'server newer' }));

  await queue.enqueue({ feature: 'settings', operation: 'settings.update', payload: {} });
  await queue.enqueue({ feature: 'goals', operation: 'goal.update', payload: {} });

  const report = await engine.syncNow();
  assertEqual(report.failed, 1, 'non-retryable failure does not loop');
  assertEqual(report.conflicts, 1, 'conflicts are detected and counted');

  const mutations = await queue.list();
  const conflicted = mutations.find((m) => m.feature === 'goals');
  assertEqual(conflicted?.status, 'blocked', 'conflicts park for review by default');
  assertEqual(conflicted?.lastErrorCode, 'SYNC_CONFLICT', 'conflict carries the stable code');
}

async function testOfflineToReconnectFlow(): Promise<void> {
  // The end-to-end story: user works offline, edits queue, connection
  // returns, sync engine drains automatically via the health subscription.
  const { clock, manager, queue, engine } = createSyncHarness();
  const synced: unknown[] = [];
  engine.registerExecutor('habit_log.insert', async (mutation: PendingMutation) => {
    if (!manager.getSnapshot().networkOnline) throw { message: 'Failed to fetch' };
    synced.push(mutation.payload);
    return { outcome: 'success' as const };
  });
  engine.attachToHealthManager();

  manager.setNetworkOnline(false);
  assertEqual(manager.getSnapshot().overall, 'OFFLINE', 'outage begins');

  await queue.enqueue({ feature: 'habits', operation: 'habit_log.insert', payload: { day: 1 } });
  await queue.enqueue({ feature: 'habits', operation: 'habit_log.insert', payload: { day: 2 } });

  // While offline the engine does not attempt network work.
  const offlineReport = await engine.syncNow();
  assertEqual(offlineReport.attempted, 0, 'no attempts while OFFLINE (circuit + network gate)');
  assertEqual((await queue.counts()).pending, 2, 'work is preserved while offline');

  manager.setNetworkOnline(true);
  // attachToHealthManager fires syncNow asynchronously; drain microtasks.
  await Promise.resolve();
  await new Promise((resolve) => setTimeout(resolve, 0));
  clock.advance(1);

  assertEqual(synced.length, 2, 'queued work syncs automatically on reconnect');
  assertEqual((await queue.counts()).pending, 0, 'queue empties after reconnect sync');
  engine.detach();
}

// ── Parts 12 & 14: incident status and bounded logging ─────────────────────

function testIncidentStatusParsing(): void {
  assertEqual(parseIncidentPayload(null), null, 'null payload rejected');
  assertEqual(parseIncidentPayload({ active: 'yes' }), null, 'malformed active flag rejected');
  assertEqual(
    parseIncidentPayload({ active: true, title: 'Outage' }),
    null,
    'active incident without message rejected',
  );
  const incident = parseIncidentPayload({
    active: true,
    title: 'Cloud maintenance',
    message: 'Back at 14:00 UTC',
    code: 'INC-42',
  });
  assertEqual(incident?.title, 'Cloud maintenance', 'valid incident parses');
  const inactive = parseIncidentPayload({ active: false });
  assertEqual(inactive?.active, false, 'inactive incident parses without copy');
}

function testBoundedLog(): void {
  const clock = createClock();
  const log = new BoundedLog<{ n: number }>({ maxEntries: 5, aggregationWindowMs: 1_000, clock: clock.now });

  // Aggregation: identical keys inside the window collapse into one entry.
  log.push('retry', { n: 1 });
  log.push('retry', { n: 2 });
  log.push('retry', { n: 3 });
  assertEqual(log.size, 1, 'repeated events aggregate instead of appending');
  assertEqual(log.list()[0].count, 3, 'aggregated entry counts occurrences');

  // Rotation: the cap holds regardless of volume.
  for (let i = 0; i < 50; i += 1) {
    clock.advance(2_000);
    log.push(`event-${i}`, { n: i });
  }
  assertEqual(log.size, 5, 'log never exceeds its cap (no runaway growth)');

  const sampled = new BoundedLog<{ n: number }>({ maxEntries: 100, sampleRate: 10, aggregationWindowMs: 0, clock: clock.now });
  for (let i = 0; i < 100; i += 1) {
    clock.advance(10_000);
    sampled.push('noisy', { n: i });
  }
  assertEqual(sampled.size, 10, 'sampling keeps 1-in-N high-volume entries');
  assertEqual(sampled.sampledOutCount, 90, 'sampled-out volume is tracked');
}

// ── Runner ──────────────────────────────────────────────────────────────────

export async function runAllServiceResilienceTests(): Promise<void> {
  testErrorTranslation();
  testCircuitBreaker();
  testOperatingModes();
  await testRecoveryProbes();
  testCapabilityMatrix();
  testIncidentStatusParsing();
  testBoundedLog();

  await testMutationQueue();
  await testQueueBounds();
  testQueueStorageSelection();
  await testIndexedDbAdapterRoundTripAndMigration();
  await testIndexedDbAdapterFallback();
  await testLocalStorageAdapterStillWorks();
  await testSyncEngineSuccessAndIdempotency();
  await testSyncEngineRetryBackoff();
  await testSyncEngineBoundedRetries();
  await testSyncEngineNonRetryableAndConflict();
  await testOfflineToReconnectFlow();
}
