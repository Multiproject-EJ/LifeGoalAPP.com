# Service Resilience Framework

> The user should never experience: *"Supabase failed, therefore HabitGame disappeared."*
> They should experience: *"Cloud services are having trouble. HabitGame still works here, your changes are safe, and sync will resume automatically."*

This document describes the offline & service resilience architecture introduced in
`src/services/service-health/` and `src/services/offline-queue/`, and how feature code
adopts it.

## Core philosophy

Cloud availability is a **capability, not an assumption**. No feature decides
"Supabase failed, therefore …" on its own. Instead:

```
Feature → ServiceHealth → Capabilities → UI
```

## Modules

### `src/services/service-health/` — the reliability layer

| Module | Purpose |
| --- | --- |
| `types.ts` | Operating modes, service states, `AppError`, capability types. Environment-agnostic (no DOM, no `import.meta`, no Supabase imports) — compiles for the PWA today and the Capacitor build later. |
| `errorTranslation.ts` | **SupabaseErrorTranslator.** Classifies any provider failure into an application category (`offline`, `timeout`, `quota_exceeded`, `project_restricted`, `maintenance`, `auth_expired`, `invalid_credentials`, `permission_denied`, `storage_unavailable`, `realtime_unavailable`, `edge_function_unavailable`, `rate_limited`, `conflict`, `unknown`) with severity, retryability, safe-local-mode flag, user title and explanation. Raw payloads survive only in `technicalDetail` for diagnostics. |
| `circuitBreaker.ts` | Per-service circuit breaker (closed → open → half-open) with growing cooldowns. Prevents retry storms. |
| `serviceHealthManager.ts` | Central manager. Tracks `auth`, `database`, `storage`, `realtime`, `edgeFunctions` independently; computes the operating mode (`ONLINE`, `DEGRADED`, `OFFLINE`, `MAINTENANCE`, `ACCOUNT_ACTION_REQUIRED`, `UNSAFE`); exposes `subscribe()`, `getSnapshot()`, `reportSuccess/Failure()`, `canRequest()`, recovery probes, and a bounded event log. |
| `capabilities.ts` | The capability matrix. Every feature declares what it requires (network / cloud / auth / realtime / storage / edge functions) and its degradation policy (`local`, `queue`, `pause`, `block`). `getFeatureAvailability(id, snapshot)` is the single availability oracle. |
| `incidentStatus.ts` | Optional external status JSON (set `VITE_SERVICE_STATUS_URL`) so incident messaging does not depend on the failing provider. |
| `boundedLog.ts` | Bounded, sampled, aggregating log buffer. All resilience telemetry goes through this — retention caps by construction (the runaway-logging incident cannot recur here). |
| `guardedCloudCall.ts` | The adoption wrapper for feature services (see below). |
| `browserWiring.ts` | The only DOM/Supabase-aware module: `navigator.onLine` events, lightweight auth/database probes, incident polling. Called once from `main.tsx`. The Capacitor build supplies its own wiring. |

### `src/services/offline-queue/` — durable mutations & sync

| Module | Purpose |
| --- | --- |
| `mutationQueue.ts` | Durable queue of `PendingMutation`s (`pending`/`syncing`/`failed`/`blocked`/`completed`) with idempotency keys, dedupe-by-key (latest local edit wins), restart recovery, and a hard size cap. |
| `storageAdapters.ts` | `QueueStorageAdapter` interface — `localStorage` today; the planned IndexedDB (web) / SQLite (Capacitor) adapters implement the same two methods. Persistence failures flip the app to `UNSAFE` mode rather than silently dropping work. |
| `syncEngine.ts` | Drains the queue on recovery: exponential backoff + jitter, bounded attempts, duplicate prevention via idempotency keys, conflict detection hook (default: server wins, local change parks as `blocked` for review), progress reporting, circuit-breaker gating. Auto-resyncs on the OFFLINE→ONLINE transition via `attachToHealthManager()`. |

### UI — `src/components/service-status/`

- **`ServiceStatusBanner`** — global pill (mounted in `main.tsx`). Invisible while ONLINE; shows "Offline mode…", "Cloud sync delayed…", "Syncing…", "Back online" and opens the modal.
- **`ServiceStatusModal`** — polished incident dialog: mode title/body, per-service status list (Cloud Sync / Authentication / Purchases & AI / Live Updates / File Storage / Local Save), Continue/Retry actions, last-sync + incident code footer.
- **`SyncIndicator`** — compact pending-changes chip for headers/settings.
- **`ServiceDiagnosticsPanel`** — Part 13 diagnostics: cloud status, pending changes, last sync, current mode, export-diagnostics JSON. Currently embedded in the dev `OfflineSyncDevPanel`; drop it into the Settings surface when ready.
- **`useServiceHealth()`** — the only way UI learns about outages.

## Phase 2 adoption status

Shared adoption helpers (use these, do not fork):

- `src/services/offlineWriteThrough.ts` — `writeThroughWithQueue` (guarded
  write → queue on safe-local failures → optimistic local result),
  `shouldQueueAfterFailure`, `toPostgrestError` (translated error in the
  legacy `PostgrestError` shape for old signatures), `generateClientId`
  (client uuids make executor replays idempotent upserts), and a bounded
  read-fallback cache.
- `src/services/offlineSyncExecutors.ts` — all SyncEngine executors,
  registered once from `main.tsx`.
- `src/services/guardedCheckout.ts` — the single entry point for Stripe
  checkout flows; consults the `purchases`/`subscriptions` capabilities.

Migrated onto guardedCloudCall + the shared MutationQueue: **todayTodos,
checkins, journal, goals** (journal and goals include one-time migration of
their legacy ad-hoc queues — `migrateLegacyJournalQueue` /
`migrateLegacyGoalQueue` — pending entries are preserved and `local-…` ids
re-keyed to client uuids). Gated through the capability matrix: all Stripe
checkouts, AI coach / Wisdom Keeper / compass help / goal suggestions /
reflection prompts / vision star (`ai_coach`, `ai_generation`), leaderboard
(`multiplayer`), account reset/delete (`account_ownership`). Telemetry
writers are budgeted and guarded (see telemetry.ts).

Still on their ad-hoc queues (converge next, following the journal/goals
pattern): habitsV2, habitMonthlyQueries, lifeGoals, visionBoard (uploads →
service `'storage'`), habitReminderPrefs, personalityTest, plus gamification
rewards and island-run runtime checkpoints for plain guarded adoption.

## Adopting in a feature service

```ts
import { guardedCloudCall } from '../services/service-health';
import { getMutationQueue, getSyncEngine } from '../services/offline-queue';

// 1. Reads: guard the call; fall back to cache when it fails.
const result = await guardedCloudCall('database', () =>
  supabase.from('habits').select('*').eq('user_id', userId).throwOnError(),
);
if (!result.ok) {
  // result.error is a translated AppError — safe to surface, never raw.
  return readHabitsFromLocalCache();
}

// 2. Writes: apply locally first, then enqueue with a dedupe key.
await getMutationQueue().enqueue({
  feature: 'habit_completion',
  operation: 'habit_log.insert',
  payload: { habitId, day },
  dedupeKey: `${habitId}:${day}`,
});

// 3. Register the executor once at startup. It must use
//    mutation.idempotencyKey for the server write so replays are safe.
getSyncEngine().registerExecutor('habit_log.insert', async (mutation) => {
  const { error } = await supabase.from('habit_logs').upsert(/* … */);
  if (error) throw error;              // engine translates + backs off
  return { outcome: 'success' };
});
```

UI gating goes through the capability matrix, not ad-hoc checks:

```ts
const { snapshot } = useServiceHealth();
const availability = getFeatureAvailability('purchases', snapshot);
if (availability.status !== 'available') {
  return <PausedNotice reason={availability.reason} />; // e.g. purchases pause
}
```

## Rules

1. **No raw provider errors in UI.** Anything shown to users comes from a translated
   `AppError` or the status components.
2. **No feature-local outage logic.** Ask `getFeatureAvailability` / `useServiceHealth`.
3. **No unbounded logs or queues.** Use `BoundedLog` and the capped `MutationQueue`.
4. **Never bypass `block` policies locally** (purchases, premium grants, account
   ownership) — economy and account integrity require the server.
5. **Local persistence failure is the only `UNSAFE` state** — editing pauses to
   protect data instead of pretending to save.

## Tests

`npm run test:service-resilience` (pattern mirrors `test:auth-resilience`) covers:
error translation for every category, circuit-breaker transitions, operating-mode
selection (offline / quota / paused project / maintenance / expired session /
invalid password / partial outages), recovery probes, capability matrix under
partial outages, queue durability across restarts, dedupe, bounded growth, sync
backoff + bounded retries, conflict parking, and the full offline→reconnect
auto-sync flow.

## Capacitor readiness

- Core modules have zero DOM/Vite dependencies (enforced by the CommonJS test build).
- Storage is behind `QueueStorageAdapter`; SQLite support is one adapter class.
- Platform wiring (`browserWiring.ts`) is isolated and replaceable per platform.
