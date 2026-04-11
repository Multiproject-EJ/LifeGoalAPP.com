# Island Run Ownership Redesign Spec (Calmer, Local-First Feel)

## 1) Problem Statement

Current implementation is technically strong for data integrity, but too aggressive for game UX:
- Ownership is continuously enforced with frequent lease heartbeats.
- Entering on a second device can immediately force takeover.
- Temporary network instability can trigger pauses that feel like app breakage.

Target outcome:
- Keep server-authoritative commit safety.
- Reduce always-on backend coupling.
- Make cross-device handoff explicit, predictable, and calm.

---

## 2) Design Principles

1. **Local-first feel, server-authoritative commits**
   - Gameplay should feel smooth even with imperfect connectivity.
   - Server remains authoritative at commit points.

2. **Explicit handoff over silent takeover**
   - Never silently steal ownership on app open.

3. **Action-oriented authority, not idle-oriented authority**
   - Authority should matter most when mutating state, not when merely viewing.

4. **Human-readable sync state**
   - Always show “last synced X ago” and what takeover means.

---

## 3) New Ownership Rules (v2)

### 3.1 Enter behavior
On game open:
1. Fetch ownership status and latest synced checkpoint metadata.
2. If no active owner (or stale lease), user enters immediately.
3. If active owner exists on another device, show takeover modal (no auto-takeover).

### 3.2 Takeover policy
Takeover requires explicit user action:
- **Resume here**: claims ownership and loads latest synced checkpoint.
- **View only**: opens board in read-only mode, no mutations.
- **Cancel**: closes or returns to hub.

### 3.3 Lease cadence
- Increase lease TTL to 2–5 minutes.
- Do not heartbeat every 12s.
- Heartbeat only:
  - on focus regain,
  - after mutation commits,
  - on occasional coarse keepalive during active interaction windows.

### 3.4 Mutation gate
All mutating actions must pass one final server-side ownership check at commit.
If not owner:
- mutation is rejected,
- user sees takeover prompt with “load latest synced progress”.

### 3.5 Read-only mode
When not owner, board can still render state:
- disable all economy/progression mutation controls,
- clearly show “View only — active on another device”.

---

## 4) UX Specification

## 4.1 Cross-device modal copy
Title:
- **Island Run is active on another device**

Body:
- **Latest synced progress: {relative_time} ago.**
- **Continue on this device? This will pause gameplay on the other device.**

Primary actions:
- **Resume here** (claims ownership)
- **View last synced progress** (read-only)
- **Not now**

### 4.2 Ownership-lost toast/modal
- **Gameplay moved to another device.**
- **You can resume here anytime.**
- CTA: **Resume here**

### 4.3 Sync status indicator
Persistent but subtle label in HUD:
- `Synced just now`
- `Synced 2m ago`
- `Offline — local progress pending sync`

### 4.4 Error tone
Avoid lease jargon (“TTL expired”, “heartbeat failed”).
Use player language:
- “Connection hiccup — your progress is safe.”
- “We’ll sync again when connection improves.”

---

## 5) Supabase / Backend Flow Changes

## 5.1 Keep
- `island_run_active_sessions` table.
- server-side RLS write guard using `last_writer_device_session_id` + active lease.
- optimistic version checks (`runtime_version`) for conflict protection.

### 5.2 Change
1. **Entry claim semantics**
   - default `forceTakeover=false` on initial open.
   - only set true after explicit user confirmation.

2. **Longer lease + lower heartbeat pressure**
   - move from ~35s TTL to 120–300s TTL.
   - heartbeat event-driven, not tight interval loop.

3. **Checkpoint metadata endpoint/fielding**
   - expose last successful sync timestamp and summary for modal copy.

4. **Read-only state support**
   - frontend mode only; backend already protected by write guard.

### 5.3 Optional enhancement
Introduce `takeover_cooldown_until` to prevent ping-pong takeover thrash for a short window (e.g., 20–30s).

---

## 6) Commit Point Strategy

Treat these as authoritative commit points:
- roll result resolved,
- landing tile rewards resolved,
- building purchase finalized,
- reward claim finalized,
- major currency mutations,
- app background / close,
- periodic coarse backup (e.g., every 2–5 minutes while active).

Non-critical visual transitions should avoid forcing immediate network writes.

---

## 7) Failure Handling

1. **Transient network failures**
   - Do not immediately pause on first miss.
   - Use N-strike policy before ownership-lost UX.

2. **Ownership race at mutation time**
   - Reject write server-side.
   - show “progress updated elsewhere” prompt.
   - offer one-tap “Resume here + refresh”.

3. **Offline periods**
   - allow local play buffer only if economy risk allows; otherwise read-only with clear messaging.

---

## 8) Rollout Plan

### Phase 1 (fast UX win)
- Entry no longer auto-forces takeover.
- Add takeover modal + read-only path.
- Keep existing backend protections unchanged.

### Phase 2 (performance)
- Increase TTL and remove tight heartbeat interval.
- Switch to event-driven heartbeat.
- Add telemetry for heartbeat volume, takeover frequency, false pause rate.

### Phase 3 (resilience)
- Add N-strike pause policy.
- Add takeover cooldown anti-thrash.
- Tune checkpoint cadence and sync UX copy.

---

## 9) Success Metrics

Product:
- ↓ “game paused unexpectedly” complaints.
- ↓ confusion around cross-device use.
- ↑ successful cross-device resume completion.

Technical:
- ↓ per-session ownership RPC count.
- ↓ heartbeat failures causing forced pauses.
- stable/unchanged split-progress prevention incidents (should remain near zero).

---

## 10) Non-Goals

- Not removing server-authoritative protection for economy/progression.
- Not allowing unrestricted concurrent writes from multiple devices.
- Not introducing heavy multi-master merge semantics.

---

## 11) Recommendation

Adopt **Option A (explicit takeover + coarse lease)** first.
It preserves today’s integrity guarantees while removing the biggest UX pain: silent takeover + high-churn liveness pressure.

This is the best risk-adjusted step before exploring deeper architectural simplification.
