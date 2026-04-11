# Island Run Migration Plan: Lease Ownership → Versioned Action Commits

## Goal

Replace continuous single-device lease enforcement with **server-authoritative action commits**:
- No heartbeat loop as core control path.
- No realtime ownership invalidation as gameplay gate.
- No forced takeover on board open.
- Mutations succeed only via versioned commit RPC with idempotency.

---

## 1) Current repo touchpoints (what exists now)

### Frontend ownership/lease flow
- `src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx`
  - claims ownership on enter
  - subscribes to `island_run_active_sessions` realtime
  - runs periodic heartbeat
  - pauses board when not owner
- `src/features/gamification/level-worlds/services/islandRunActiveSessionService.ts`
  - wrappers for claim/heartbeat/release/validate RPCs
- `src/features/gamification/level-worlds/services/islandRunDeviceSession.ts`
  - localStorage-backed device session id

### Runtime write path
- `src/features/gamification/level-worlds/services/islandRunGameStateStore.ts`
  - hydration and write logic
  - `runtime_version` conditional write + conflict merge
  - currently validates lease ownership before remote persist

### Database lease model
- `supabase/migrations/0196_island_run_active_session_locking.sql`
  - `island_run_active_sessions`
  - `island_run_claim_active_session`
  - `island_run_heartbeat_session`
  - `island_run_release_active_session`
  - `island_run_validate_session_owner`

### Database runtime write guard
- `supabase/migrations/0197_island_run_runtime_state_owner_write_guard.sql`
  - RLS policies requiring active lease + `last_writer_device_session_id`

---

## 2) Target architecture

## 2.1 Core rule
Enforce:
- **one successful writer per action commit**, not one active owner at every moment.

## 2.2 Read/write behavior
- Multiple devices may load/view latest runtime state.
- Every mutation goes through one RPC: `island_run_commit_action(...)`.
- RPC checks `expected_runtime_version`.
- On mismatch: return `conflict` + latest state.
- Client reloads state and asks user to retry.

## 2.3 Idempotency
- Each action includes `client_action_id` (UUID).
- If already applied, RPC returns previous result instead of duplicating mutation.

---

## 3) New backend contract

## 3.1 RPC: `public.island_run_commit_action`

### Inputs
- `p_device_session_id text`
- `p_expected_runtime_version bigint`
- `p_action_type text`
- `p_action_payload jsonb`
- `p_client_action_id uuid`

### Returns
- `status text` (`applied | conflict | duplicate | invalid`)
- `runtime_version bigint`
- `state_json jsonb`
- `server_message text`
- `applied_action_id uuid`

### Transaction behavior
1. Resolve `auth.uid()` user.
2. `SELECT ... FOR UPDATE` runtime row.
3. Check idempotency by `(user_id, client_action_id)` log lookup.
4. If version mismatch, return `conflict` with latest state/version.
5. Validate action against current state.
6. Apply deterministic state transition.
7. Increment version.
8. Persist runtime state + `last_writer_device_session_id`.
9. Write action log row.
10. Return updated snapshot.

---

## 4) Data model changes (SQL migration draft)

## 4.1 Runtime table hardening
Add columns if missing:
- `state_json jsonb not null default '{}'::jsonb` (optional if denormalized field model is retained)
- `last_action_type text`
- `last_action_at timestamptz`
- `last_action_id uuid`

## 4.2 Action log table (recommended)
`public.island_run_action_log`:
- `id bigint generated always as identity primary key`
- `user_id uuid not null references auth.users(id) on delete cascade`
- `device_session_id text not null`
- `client_action_id uuid not null`
- `action_type text not null`
- `expected_runtime_version bigint not null`
- `applied_runtime_version bigint`
- `status text not null`
- `payload_json jsonb not null default '{}'::jsonb`
- `response_json jsonb not null default '{}'::jsonb`
- `created_at timestamptz not null default now()`
- unique `(user_id, client_action_id)`

## 4.3 RLS / privilege direction
- Keep owner `SELECT` on runtime state.
- Restrict direct gameplay mutation path on runtime table.
- Grant execute on `island_run_commit_action` to authenticated.
- Put concurrency + validation logic inside RPC.

---

## 5) Frontend refactor plan

## 5.1 Remove lease as gameplay gate in board
In `IslandRunBoardPrototype.tsx`:
- remove mount claim flow as required step.
- remove active-session realtime subscription.
- remove heartbeat interval loop.
- remove lease-loss hard pause screen.
- replace with conflict/reload UX state.

## 5.2 Introduce action commit service
New file proposal:
- `src/features/gamification/level-worlds/services/islandRunCommitActionService.ts`

Responsibilities:
- build commit payload (`deviceSessionId`, `expectedVersion`, `actionType`, `actionPayload`, `clientActionId`)
- call RPC
- normalize statuses (`applied|conflict|duplicate|invalid`)

## 5.3 Route mutations through commitAction
Existing mutation call sites (roll resolution, rewards, purchases, etc.) should:
1. prepare deterministic action payload
2. call commitAction
3. apply returned authoritative state on success
4. on conflict: open modal + reload latest server state

## 5.4 Keep useful pieces
- keep `runtime_version` conflict awareness from `islandRunGameStateStore.ts`
- keep `deviceSessionId` generation utility
- keep hydration/reconciliation utilities where still useful for fetch/reload

---

## 6) Phased migration (commit-sized)

## Phase A — Add new path without breaking old
1. Add SQL migration:
   - action log table
   - new RPC skeleton with no-op action validation for 1–2 actions
2. Add TS service wrapper for commit RPC.
3. Add feature flag: `ISLAND_RUN_ACTION_COMMIT_V1`.

## Phase B — Move first critical action
1. Migrate one mutation (e.g., reward claim) to commit RPC.
2. Implement conflict modal + reload flow.
3. Ship telemetry for statuses.

## Phase C — Migrate all mutating actions
1. Roll/move/tile/reward/purchase/etc.
2. Ensure idempotency key used everywhere.
3. De-risk with action-level rollout flags if needed.

## Phase D — Remove continuous lease dependency
1. Remove required claim-on-enter path.
2. Remove heartbeat loop.
3. Remove ownership realtime gating.
4. Keep legacy lease objects temporarily for rollback.

## Phase E — Backend cleanup
1. Remove lease-based write guard dependency for gameplay writes.
2. Deprecate claim/heartbeat/release/validate RPC usage.
3. Optionally drop `island_run_active_sessions` once stable.

---

## 7) Risks and mitigations

1. **Server reducer complexity**
   - Mitigation: migrate one action family at a time.
2. **Duplicate actions on flaky networks**
   - Mitigation: required `client_action_id` + unique constraint.
3. **Conflict frequency spikes**
   - Mitigation: clearer UX + instant reload payload in conflict response.
4. **Rollback safety**
   - Mitigation: feature flag retaining old lease flow until full confidence.

---

## 8) Rollback plan

If production issues occur:
1. Disable `ISLAND_RUN_ACTION_COMMIT_V1` flag.
2. Route mutations back to prior write path.
3. Re-enable existing lease-gated UX as temporary control.
4. Keep action log data for postmortem and replay analysis.

---

## 9) Deliverables checklist

- [ ] SQL migration: `island_run_action_log` + `island_run_commit_action`
- [ ] RPC tests (status: applied/conflict/duplicate/invalid)
- [ ] Frontend commit service + typed contract
- [ ] Conflict modal + reload UX
- [ ] Action-by-action migration PRs
- [ ] Lease flow removal PR
- [ ] Cleanup PR (deprecate old RPCs/policies)

---

## 10) Success criteria

- Significant drop in Island Run ownership-related RPC volume.
- Near-zero “random pause / ownership lost” complaints.
- Conflict handling is understandable and recoverable.
- No increase in economy corruption/duplication incidents.
- Equal or better write success reliability in poor network conditions.
