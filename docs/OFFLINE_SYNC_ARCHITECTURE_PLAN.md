# Offline Sync Architecture Plan (PWA-first)

Last updated: 2026-03-24

## Why this exists

We are moving from a **service-worker-transport queue** model to an **app-level local-first sync model**.

The old model could return synthetic queued responses from the service worker for failed Supabase writes. Some application flows expect server-shaped payloads immediately (for example `insert(...).select().single()` paths), which creates correctness risks.

As of the latest merged change, service-worker write queueing is now **opt-in only** via `X-LifeGoal-Offline-Queue: 1`.

---

## Current state (after merged SW fix)

- App shell caching and Supabase GET caching remain in the service worker.
- Supabase write interception for POST/PUT/PATCH/DELETE is no longer global.
- Queueing from SW is available only for explicitly offline-aware callers.

### Implication

The service worker is now a caching/network helper rather than the default write-orchestration layer.

---

## Target architecture

## Principle

**App layer owns data correctness.**

- Local stores (IndexedDB) are the source of truth for unsynced writes.
- A mutation queue in app code schedules retries and reconciliation.
- Service worker may assist with network/background triggers, but does not fabricate domain success by default.

## Building blocks

1. `offline/queue` (generic mutation queue)
2. `offline/stores` (feature-specific local entity stores)
3. `offline/sync-engine` (retry, backoff, idempotency, conflict handling)
4. UI sync-state surfaces (global + per-item status)

---

## Proposed IndexedDB schema (generic)

### Store: `mutation_queue`

- `id` (uuid)
- `user_id`
- `entity_type` (`journal`, `goal`, `habit`, `personality_test`, ...)
- `entity_local_id`
- `operation` (`create` | `update` | `delete`)
- `payload`
- `idempotency_key`
- `status` (`pending` | `processing` | `retry` | `dead_letter`)
- `attempt_count`
- `next_retry_at`
- `last_error`
- `created_at`
- `updated_at`

Indexes:
- `by_user_status_next_retry`
- `by_entity_type`
- `by_created_at`

### Store: `<entity>_local` (example: `journal_local`)

- `local_id`
- `server_id` (nullable)
- domain fields
- `sync_state` (`synced` | `pending_create` | `pending_update` | `pending_delete` | `conflict` | `failed`)
- `base_server_updated_at` (nullable)
- `updated_at_local`
- `last_sync_error` (nullable)

---

## Sync state machine (entity-level)

`draft/local edit`
→ `pending_create|pending_update|pending_delete`
→ `processing`
→ `synced` (success)
→ `retry` (transient failure)
→ `failed` (terminal)
→ `conflict` (version mismatch / merge required)

### Retry policy

- Exponential backoff with jitter
- Respect online/offline events
- Manual retry action for failed/conflict

### Idempotency policy

- Every mutation carries `idempotency_key`
- Server endpoint or row-level logic deduplicates by key

### Conflict policy (initial)

- Conservative: mark as `conflict` and do not auto-overwrite
- UI asks user to choose local vs remote or merge text fields where feasible

---

## UX copy baseline

### Global
- Offline: `You're offline. Changes are saved on this device and will sync when you're back online.`
- Syncing: `Syncing your latest changes...`
- Retry: `Some changes are still queued. We'll retry automatically.`
- Failed: `Some changes couldn't sync. Tap to review.`

### Per item
- `Not synced yet`
- `Syncing...`
- `Needs review`
- `Sync failed — Retry`

### Destructive warning

Before sign-out/reset/clear local data (when queue not empty):

`You have unsynced changes on this device. Clearing local data now will permanently remove unsynced content.`

---

## Feature rollout order

## Phase 0 (done)
- SW write queue changed to opt-in only.

## Phase 1 (done)
- Journal local store + queue + sync engine integration
- Journal per-entry sync badges and global status
- Unsynced-destructive-action warnings

## Phase 2 (done)
- Goals + life goal steps/substeps/alerts migration to same queue engine

## Phase 3 (done)
- Habits + habit logs/reminders migration

## Phase 4 (done)
- Personality tests align fully with shared queue engine
- Vision board (URL entries first, then file upload staging)

## Phase 5 (done - polished hardening)
- Telemetry: offline sync events (queue, retry, success/failure, clear) persisted locally for diagnostics.
- Recovery tooling: feature-level retry-failed and clear-queue actions for personality tests and vision board.
- Performance: bounded telemetry ring-buffer and periodic queue polling.
- Conflict tooling: surfaced failure state + retry path to avoid silent stalls.
- Dev observability: in-app Offline Sync Debug Panel (dev-only) for queue snapshots + telemetry stream.

---

## Feature inventory needing robust offline-first parity

Priority A:
- Journal entries
- Goals
- Life goal steps/substeps/alerts
- Habits + habit logs

Priority B:
- Personality tests (partially local-first already)
- Vision board writes/uploads

Priority C:
- Gamification/economy side-effect writes (ensure idempotent server-side derivation where possible)

---

## Non-goals (for now)

- Full CRDT-style collaborative merges
- Cross-user shared-object offline co-editing
- Background sync guarantees on unsupported browsers

---

## Success metrics

- Queue age p95
- Queue failure rate
- Conflict rate
- Data-loss incidents due to local clear with pending writes
- Time-to-sync after reconnect

---

## Implementation notes

- Keep compatibility with existing local DB usage and migrate incrementally.
- Prefer adapter-based entity integrations over custom per-feature sync loops.
- Add a small developer panel to inspect queue state in non-production builds.
