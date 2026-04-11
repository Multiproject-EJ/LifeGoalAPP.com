# Island Run "Single Active Device" Deep Dive

## Scope
This note maps the current production guardrails that attempt to keep Island Run active on only one device per user at a time.

Reviewed areas:
- Front-end Island Run board ownership flow (`IslandRunBoardPrototype.tsx`)
- Front-end ownership API wrapper (`islandRunActiveSessionService.ts`)
- Runtime state persistence gate (`islandRunGameStateStore.ts`)
- Supabase lease table + RPCs (`0196_island_run_active_session_locking.sql`)
- Supabase runtime write guard policies (`0197_island_run_runtime_state_owner_write_guard.sql`)

---

## 1) Data Model and Lease Contract (DB)

The core single-device mechanism is a per-user lease row in `public.island_run_active_sessions`.

- Exactly one row per `user_id` (PK on user_id).
- Row stores `device_session_id`, `lease_version`, `heartbeat_at`, `expires_at`, metadata, and timestamps.
- This models ownership as a time-bounded lease, not a permanent lock.

Key behavior:
- `island_run_claim_active_session(...)`
  - Creates a row if missing (`ownership_status = 'granted'`).
  - If same device claims again, it refreshes TTL (`ownership_status = 'already_owner'`).
  - If another device currently owns an unexpired lease and takeover is disallowed, returns `conflict`.
  - With `p_force_takeover=true` (default), caller can steal ownership; `lease_version` increments.
- `island_run_heartbeat_session(...)`
  - Only current owner can extend TTL.
  - Non-owner receives `not_owner`; missing row returns `missing`.
- `island_run_release_active_session(...)`
  - Deletes lease row only if caller is current owner.
- `island_run_validate_session_owner(...)`
  - Returns whether given device session matches owner and whether lease is currently active.

Implication: enforcement is “single active lease owner at a time” with fast handoff via forced takeover.

---

## 2) Front-End Device Identity

The app creates/stores a stable per-user device session id in localStorage:
- key prefix `island_run_device_session_id_<userId>`
- value is `crypto.randomUUID()` when available.

This id is attached to claim/heartbeat/validate calls and to runtime state writes (`last_writer_device_session_id`).

Implication: a browser profile (localStorage scope) is the “device identity” unit. Clearing storage or private-mode behavior can rotate identity.

---

## 3) Front-End Ownership Lifecycle

### Entry claim
When Island Run board mounts:
- App calls `claimIslandRunActiveSession(... forceTakeover: true, takeoverReason: 'enter')`.
- Because `forceTakeover` is true by default, entering on a second device usually takes ownership immediately.
- If claim fails, UI shows paused messaging.

### Realtime ownership invalidation
The board subscribes to `island_run_active_sessions` changes for the current user.
On any change:
- Calls `validateIslandRunSessionOwner`.
- If no longer owner (or lease inactive), sets paused UI and “moved to another device” messaging.

### Heartbeat renewal
If this device is owner and tab is visible:
- Sends heartbeat every 12s with TTL 35s.
- Heartbeat failure marks session as non-owner and pauses gameplay.

### Paused guardrail
If ownership lost (or runtime sync unavailable), component returns early to a pause screen, with a CTA to “Take over here”.

Implication: gameplay interactions are blocked in UI when ownership is not active on this device.

---

## 4) Server-Side Write Enforcement (Critical Safety Net)

Single-device safety is not only UI-deep:

- Runtime rows include `last_writer_device_session_id`.
- RLS insert/update policies on `island_run_runtime_state` require:
  - authenticated user matches row user,
  - non-empty `last_writer_device_session_id`,
  - matching active lease row in `island_run_active_sessions` with unexpired `expires_at`.

Additionally, before writing, the client explicitly validates ownership via RPC and auto-reclaims if it is owner but lease expired.

Implication: even if UI gating is bypassed, runtime writes should be rejected unless device currently holds an active lease.

---

## 5) Concurrency / Race Characteristics

### Strengths
- DB-side `FOR UPDATE` in claim/heartbeat/release serializes row-level transitions.
- `lease_version` increments on ownership takeovers.
- Runtime writes use conditional version updates (`runtime_version`) and conflict merge path.
- RLS ownership checks prevent stale/non-owner writes.

### Practical behavior under dual open devices
- Device A active.
- Device B enters and force-claims; becomes owner.
- Device A soon receives realtime update or next heartbeat failure and is paused.
- Only B can continue successful runtime writes.

Transient window exists between B claim and A pause rendering, but DB policies should still reject A writes once ownership transferred.

---

## 6) Gaps / Risks Found

1. **Automatic forced takeover on enter**
   - Entry claim uses `forceTakeover: true`, so just opening another device can immediately steal ownership.
   - This favors continuity on the latest opener but may feel abrupt to active users.

2. **No explicit release on unmount/pagehide in board flow**
   - `releaseIslandRunActiveSession` exists but appears unused in Island Run board lifecycle.
   - Current design relies on TTL expiry (35s) and takeover, not graceful release.

3. **Device identity tied to localStorage**
   - Storage clears, private sessions, or browser profile changes effectively create new “devices”.

4. **Availability dependency**
   - If runtime sync/RPC path fails, app intentionally pauses to avoid split progress.
   - Safe for integrity, but can block legitimate play until backend connectivity/migrations are healthy.

---

## 7) Bottom-Line Assessment

Current setup is **robustly designed to enforce one active writer device at a time**, with both:
- UX-level pause/takeover controls, and
- DB/RLS-level ownership checks as authoritative enforcement.

So, from a data-integrity perspective, it is not merely advisory; it is actively enforced server-side for runtime-state mutations.

The biggest product-level tradeoff is aggressive takeover semantics (`forceTakeover: true` on enter), which optimizes for instant access on new device rather than requiring explicit confirmation.

---

## 8) Why this can feel taxing/unstable in practice

Your intuition is fair: the system is intentionally defensive and can feel heavy when viewed from UX/perf perspective.

### Is it continuously syncing with Supabase?
In effect, yes—at least while gameplay screen is open and visible:
- Ownership heartbeat every ~12 seconds (TTL ~35s).
- Realtime subscription for active-session ownership table changes.
- Realtime subscription for runtime-state row changes.
- Additional reconcile calls on focus/visibility/interval triggers.

That means the app is not doing one-time sync; it is running a near-continuous correctness loop.

### Why this exists
It is trying to prevent split progress/data races in a game state that mutates often.
Without frequent lease renewal + ownership checks, two devices can both think they are authoritative.

### Where instability perception comes from
1. **Network jitter sensitivity**
   - Heartbeat misses or RPC hiccups can pause play even if user did nothing wrong.
2. **Aggressive auto-takeover**
   - Opening another device can instantly steal lock, causing confusing interruption on first device.
3. **Many moving parts**
   - Realtime + heartbeat + reconciliation + conditional writes + RLS means multiple failure points.
4. **Backend availability coupling**
   - If sync path is degraded, game intentionally pauses for integrity.

---

## 9) Simpler alternatives / redesign options

Below are practical options from least invasive to most structural.

### Option A — Keep lease model, but make takeover explicit (recommended first step)
Instead of force-taking on enter:
- On entry, call validate first.
- If another active owner exists, show modal:
  - “Game is active on another device.”
  - Buttons: **Take over here** / **Continue there**.
- Only call forced claim if player confirms.

Benefits:
- Removes surprising lock steals.
- Minimal backend change.

### Option B — Reduce heartbeat frequency + adaptive heartbeat
Current ~12s heartbeat with 35s TTL is conservative.
Try:
- TTL 90–120s
- Heartbeat every 30–45s
- Immediate heartbeat on tab focus / major action
- Suspend heartbeat when user is idle in non-critical menus

Benefits:
- Lower Supabase RPC volume and battery/network churn.
Tradeoff:
- Slightly slower stale-owner recovery.

### Option C — Write-intent model (heartbeat only during mutation windows)
Rather than always-on ownership:
- Read-only mode by default.
- Acquire short lease only when user performs mutating action.
- Batch mutations (or queue), then release/let lease expire.

Benefits:
- Big reduction in background lock traffic.
Tradeoff:
- More complex UX for “you lost lock while acting”.

### Option D — Version-first conflict handling, lease as fallback
Rely primarily on optimistic concurrency (`runtime_version`) and merge strategy.
Use ownership lease mainly for high-risk critical writes.

Benefits:
- Less lock contention and takeover complexity.
Tradeoff:
- Requires robust deterministic merge rules for all state fields.

### Option E — User-driven memory pull model (your idea)
On second device:
- Start in “stale view” mode.
- Prompt: “Fetch latest progress from active device?”
- If confirmed, pull latest server snapshot then optionally take control.

Important caveat:
- If first device is offline and unsynced, server snapshot may still be stale.
- So this needs clear copy: “latest synced progress”.

---

## 10) Concrete malfunction scenarios to watch

1. **False pause due to transient heartbeat failure**
   - Symptom: user gets paused even with no second device.
   - Mitigation: require N consecutive heartbeat failures before pausing.

2. **Takeover thrash between two active users/devices**
   - Symptom: both repeatedly steal lock.
   - Mitigation: cooldown window after takeover (e.g., 20–30s), with explicit warning.

3. **Realtime event delay causes stale UI state**
   - Symptom: user can press actions briefly after losing ownership.
   - Mitigation: enforce final ownership check right before mutation (already mostly done), plus local “pending ownership check” interlock.

4. **Offline/spotty connection creates confusing states**
   - Symptom: user sees pause + retry loop with little guidance.
   - Mitigation: clearer states: “Offline local mode (read-only)” vs “Server sync unavailable”.

---

## 11) Suggested phased plan

### Phase 1 (low risk, high UX win)
- Disable automatic force-takeover on entry.
- Add explicit takeover confirmation modal.
- Increase heartbeat interval/TTL moderately.
- Add 2-strike heartbeat failure before pausing.

### Phase 2 (performance hardening)
- Adaptive heartbeat (focus/action-driven).
- Reduce reconcile interval frequency when state is stable.
- Instrument Supabase call counts and pause reasons.

### Phase 3 (architectural simplification)
- Move to write-intent lock or partial optimistic model for non-critical actions.
- Keep strict lease only for the narrowest high-value mutations.

---

## 12) Recommendation

If the goal is **stability + lower load without risking split progress**, best immediate move is:
1. Keep server-side lease/RLS enforcement as safety net.
2. Remove forced takeover-on-enter.
3. Use explicit user confirmation to take control.
4. Tune heartbeat/TTL upward and make heartbeat adaptive.

That preserves integrity while dramatically reducing the “unstable/heavy” feeling.
