# Island Run — Single Active Device Session Lock Plan

## Goal
Guarantee that **only one active Island Run gameplay session** exists per user at any moment across devices/browsers/PWA installs (Monopoly-Go style takeover semantics):

- Last device that opens Island Run becomes the active owner.
- Previously active devices are forced into paused/read-only mode for Island Run.
- Non-Island-Run app surfaces remain usable.
- Runtime state remains cross-device and conflict-safe.

---

## Current Gap (Why this is happening today)
The current architecture persists one per-user runtime state row with optimistic versioning and realtime hydration, but has no explicit per-device ownership/lease model:

- `island_run_runtime_state` stores game progression per user, not active device ownership.
- Hydration/reconciliation updates state but does not enforce single active gameplay owner.
- No heartbeat/lease expiration semantics tied to a specific `device_session_id`.

Result: multiple devices can continue gameplay if they keep writing local/fallback or alternating updates.

---

## High-Level Solution
Add a **device session lease layer** on top of runtime state.

### New concept
`device_session_id` (client-generated UUID persisted per browser install/tab context) + server lease row with TTL heartbeat.

### Core behavior
1. Entering Island Run performs `claim_session` RPC:
   - If no active lease or existing lease expired → current device wins.
   - If another active lease exists and not expired → current device can force takeover (last opener wins).
2. Winner receives lease token/state and begins heartbeats.
3. Losers are notified via Realtime and immediately paused.
4. Any gameplay write validates ownership (server-side): only lease owner may mutate runtime state.

---

## Data Model Changes

### 1) New table: `island_run_active_sessions`
Columns:
- `user_id uuid primary key references auth.users(id) on delete cascade`
- `device_session_id text not null`
- `lease_version bigint not null default 0`
- `claimed_at timestamptz not null default now()`
- `heartbeat_at timestamptz not null default now()`
- `expires_at timestamptz not null`
- `takeover_reason text null` (e.g., `enter`, `manual_takeover`, `reconnect`)
- `metadata jsonb not null default '{}'::jsonb` (optional: platform/app version)

Indexes:
- `(user_id)` unique via PK
- `(expires_at)` for sweeping/observability

RLS:
- SELECT/INSERT/UPDATE restricted to `auth.uid() = user_id`

### 2) Extend runtime write path (server-authoritative)
Add ownership gate to writes via RPC (preferred) or policy strategy:
- Runtime write accepted only if caller’s `device_session_id` matches active lease row and lease not expired.

---

## Supabase RPCs / Server Logic

### `island_run_claim_active_session(p_device_session_id text, p_force_takeover boolean default true, p_metadata jsonb default '{}'::jsonb)`
Returns:
- `ownership_status`: `granted` | `already_owner`
- `lease_version`
- `expires_at`
- `previous_device_session_id` (if takeover)

Algorithm:
1. Lock user row (`SELECT ... FOR UPDATE`) in `island_run_active_sessions`.
2. If absent or expired → upsert current device as owner.
3. If owned by same device → refresh lease.
4. If owned by another device:
   - if `p_force_takeover = true` → replace owner and increment `lease_version`
   - else reject with `conflict`.

### `island_run_heartbeat_session(p_device_session_id text)`
- Refresh `heartbeat_at` and `expires_at` if caller owns lease.
- If not owner, return `not_owner`.

### `island_run_validate_owner(p_device_session_id text)`
- Lightweight ownership check for client guardrails.

### `island_run_release_active_session(p_device_session_id text)` (best-effort)
- Clear session when leaving Island Run or signing out.
- Not required for correctness because lease TTL handles crashes.

### `island_run_write_runtime_state(...)` (optional but recommended)
Move write into RPC that atomically validates lease + updates runtime state/version.

---

## Client Architecture Changes

## 1) Device session identity
Add service `islandRunDeviceSession.ts`:
- Generate UUID once per install/context and store in localStorage (`island_run_device_session_id`).
- Keep stable for that client to support deterministic ownership.

## 2) Entry flow (IslandRunBoardPrototype)
On Island Run mount:
1. Claim active session via RPC.
2. If granted/already_owner: proceed with hydration + gameplay enable.
3. If rejected/conflict (when no-force mode): show takeover CTA.
4. Subscribe to realtime on `island_run_active_sessions` + runtime table.

## 3) Heartbeat
- Every 10–15s heartbeat while tab visible and Island Run open.
- On hidden/background: relax cadence (30–45s) or keep short if needed.
- If heartbeat returns `not_owner`, immediately pause gameplay.

## 4) Forced pause UX
When ownership lost:
- Show blocking modal: “Island Run opened on another device. This session is paused.”
- Buttons: `Take over here` (calls claim RPC), `Close Island Run`.
- Keep rest of app navigable.

## 5) Write guardrails
Before critical actions (`roll`, `spin`, `buy`, `boss resolve`, etc.):
- Check local `isSessionOwner` boolean.
- If false, block and show takeover message.
- Runtime persistence path should include `device_session_id` and rely on server validation.

## 6) Realtime reactions
Subscribe to active-session row changes for current user:
- If row device_session_id changes away from local one: pause immediately.
- If local regains ownership: unpause and rehydrate from server state.

---

## Concurrency / Correctness Rules

1. **Server is source of truth** for ownership.
2. **Lease TTL** (e.g., 35s) handles disconnect/crash.
3. **Heartbeat interval** must be comfortably below TTL (e.g., 12s).
4. **All gameplay writes** require valid ownership at write time.
5. **Last opener wins** via force takeover claim behavior.
6. **Idempotency**: repeated claims from same device should be no-op refresh.

---

## Migration + Rollout Plan

### Phase 1 — Foundation
- Add `island_run_active_sessions` table + policies.
- Add claim/heartbeat/release RPCs.
- Add basic telemetry fields.

### Phase 2 — Client enforcement
- Introduce device session service.
- Claim on mount + heartbeat loop.
- Add pause/takeover UI + realtime owner-change handling.

### Phase 3 — Authoritative writes
- Route runtime writes through ownership-validated RPC (or equivalent protected path).
- Remove any bypass paths that allow non-owner mutation.

### Phase 4 — Hardening
- Add chaos tests: network drops, dual-open race, tab sleep/wake, offline resume.
- Add dashboards/alerts on takeover rate, heartbeat failures, ownership conflicts.

---

## Observability / Telemetry
Track events:
- `island_run_session_claimed`
- `island_run_session_takeover`
- `island_run_session_lost`
- `island_run_session_heartbeat_failed`
- `island_run_write_rejected_not_owner`

Dimensions:
- `user_id`
- `device_session_id` (hashed/anonymized if needed)
- `lease_version`
- `app_version`
- `visibility_state`

---

## QA Test Matrix

1. Device A enters Island Run, plays.
2. Device B enters Island Run:
   - B becomes owner.
   - A is paused within realtime latency.
3. A presses Roll after losing ownership:
   - blocked in UI.
   - server write rejected if attempted.
4. B closes app without release:
   - lease expires after TTL.
   - A can reclaim and continue.
5. Simultaneous open race (A/B same second):
   - deterministic single winner, no split writes.
6. Offline device tries actions:
   - queued actions do not commit if ownership invalid on reconnect.

---

## Acceptance Criteria
- At no time can two devices successfully perform Island Run gameplay mutations concurrently for the same user.
- Non-owner devices are visibly paused within <= 2s after takeover (typical realtime latency).
- After takeover, owner always sees latest authoritative runtime state.
- If lease backend unavailable, gameplay is blocked (fail-safe) rather than silently local-divergent.
