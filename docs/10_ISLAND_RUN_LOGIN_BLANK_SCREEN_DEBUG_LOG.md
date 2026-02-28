# Island Run login blank-screen debug log

Status: **Mitigated (awaiting prod verification)**
Owner: Island Run migration track (M7O+)
Last updated: 2026-03-01

## 1) Problem statement
After login, some sessions show a blank screen instead of the normal app/home surface.

## 2) Why this log exists
This issue has recurred and prior debugging loops became noisy and hard to reason about. This document is the single running ledger for:
1. code changes that could affect the issue,
2. fixes attempted (and outcomes),
3. current hypotheses and next experiments.

---

## 3) Suspect area map (current)
Primary suspect zone: **new game-level routing/bootstrap path** introduced during Island Run migration.

High-risk files:
- `public/level-worlds.html`
- `src/App.tsx` (bootstrap params + modal opening logic)
- `src/features/gamification/level-worlds/LevelWorldsHub.tsx`
- `src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx`
- runtime-state hydration services under `src/features/gamification/level-worlds/services/`

---

## 4) Change ledger (this chat stream)
> Keep this list append-only; do not rewrite history entries.

| Date | Slice/Change | Intent | Result | Notes |
|---|---|---|---|---|
| 2026-02-27 | Direct `/level-worlds.html` redirect into app bootstrap (`openIslandRun=1`) | Replace legacy static 1/7 board entry | ⚠️ Potential side effects | Increased bootstrap coupling to URL params |
| 2026-02-27 | One-time bootstrap cleanup in `App.tsx` | Avoid repeated modal loops | ⚠️ Inconclusive | Loop reduced, but blank-screen issue still reported |
| 2026-02-27 | Source-gated bootstrap (`openIslandRunSource=level-worlds`) | Limit accidental activation | ⚠️ Inconclusive | Reported issue persisted in some login paths |
| 2026-02-27 | First-paint bootstrap param cleanup | Remove stale params before auth transitions | ⚠️ Inconclusive | Better safety posture; needs explicit repro verification |
| 2026-02-27 | Runtime hydration telemetry + dedupe + fallback messaging | Observe hydration/fallback behavior | ✅ Instrumentation improved | May help diagnosis, not necessarily root-cause fix |
| 2026-02-28 | Add `RecoverableErrorBoundary` around `LevelWorldsHub` entry modal in `App.tsx` | Prevent full-app blank screen if Level Worlds/Island Run subtree throws during post-login mount | ✅ Mitigation added (pending prod repro) | Modal now auto-closes on render failure and logs a structured console error |
| 2026-03-01 | Move `openIslandRun` effects above first top-level auth return in `App.tsx` | Fix hook-order crash after login | ✅ Fixed in code (pending prod verification) | Root cause: hooks were declared after `if (shouldRequireAuthentication && isMobileExperience) return ...`, causing React #310 when auth state flipped |
| 2026-03-01 | Add `islandRunEntryDebug=1` structured startup instrumentation in `App.tsx` | Collect reproducible login-path evidence before additional routing changes | ✅ Added (awaiting repro captures) | Logs first-paint URL flags, bootstrap cleanup, auto-open checks, and `showLevelWorldsFromEntry` transitions via `[IslandRunEntryDebug]` console events |
| 2026-03-01 | Extend `islandRunEntryDebug=1` instrumentation to `LevelWorldsHub` + `IslandRunBoardPrototype` | Capture concrete evidence for whether Level Worlds/Island Run mount, plus hydration source/error context | ✅ Added (awaiting repro captures) | Adds mount/unmount and hydration outcome snapshots so repro logs can satisfy protocol step #5 without speculative inference |
| 2026-03-01 | Add debug event buffering + runtime-state query/persist stage logs | Make repro evidence exportable and correlate UI mount sequence with Supabase table read/write outcomes | ✅ Added (awaiting repro captures) | `window.__islandRunEntryDebugDump()` now returns buffered events; includes query/persist start/success/error/no-row events under `islandRunEntryDebug=1` |
| 2026-03-01 | Add one-call evidence exporter (`window.__islandRunEntryDebugEvidence()`) | Reduce manual copy errors by bundling event timeline + relevant network resource timing in one payload | ✅ Added (awaiting repro captures) | Evidence payload includes location, buffered events, and filtered Supabase/runtime-state resource entries when debug flag is enabled |
| 2026-03-01 | Add global error/rejection capture into debug evidence stream | Ensure blank-screen repro exports include top-level runtime failures, not only sequencing/network signals | ✅ Added (awaiting repro captures) | `window_error` + `window_unhandled_rejection` events now append to debug buffer when `islandRunEntryDebug=1` is enabled |
| 2026-03-01 | Add lifecycle breadcrumbs + manual marker helper in debug stream | Improve reproducibility by marking user-driven checkpoints and visibility/page transitions during login repro | ✅ Added (awaiting repro captures) | Adds `document_visibility_change`/`window_pageshow`/`window_pagehide` and `window.__islandRunEntryDebugMark(...)`; helper/listener install now explicitly debug-gated |
| 2026-03-01 | Add guided repro run/checkpoint helper APIs | Standardize evidence capture semantics across engineers and reduce free-form marker drift | ✅ Added (awaiting repro captures) | Adds `window.__islandRunEntryDebugStartRun(...)` and `window.__islandRunEntryDebugMarkCheckpoint(...)` with canonical checkpoint labels for login-flow incidents |

Legend: ✅ verified good, ⚠️ attempted/inconclusive, ❌ regressed.

---

## 5) Current hypotheses (ranked)
1. **[Confirmed] Hook-order mismatch in `App.tsx` around auth gate return and late `openIslandRun` effects**
   - Fixed by moving those effects above the first top-level early return.
2. **Modal-first render path collision**
   - `showLevelWorldsFromEntry` modal path may conflict with other startup overlays/session initialization.
3. **Hydration + entry sequencing race**
   - Level Worlds/Island Run mounts before required app/session state settles, leading to a blank/blocked render state.
4. **Non-visual runtime failure hidden by broad fallbacks**
   - Error path may be swallowed, producing apparent blank screen without obvious fatal logs.
5. **Uncaught render error inside Level Worlds subtree can blank the whole app**
   - Since `LevelWorldsHub` can mount during bootstrap entry, an unhandled render error in Island Run path can take down the root tree.

---

## 6) Repro protocol (must follow before new fix)
1. Record exact URL at login start and after auth redirect.
2. Record whether `openIslandRun` and `openIslandRunSource` exist at first paint.
3. Capture console errors/warnings and stack traces (and export `window.__islandRunEntryDebugEvidence()` output including `window_error` / `window_unhandled_rejection` and lifecycle events; start each repro via `window.__islandRunEntryDebugStartRun(...)` and place canonical checkpoints with `window.__islandRunEntryDebugMarkCheckpoint(...)`).
4. Capture whether `showLevelWorldsFromEntry` becomes true.
5. Capture whether `LevelWorldsHub` or `IslandRunBoardPrototype` mounts.
6. Only then propose a code change.

---

## 7) Experiment queue
- [x] Add temporary guarded debug logging around startup bootstrap + auth redirect state (dev-only).
- [x] Verify whether blank screen reproduces when `LevelWorldsHub` subtree is isolated behind an error boundary; keep app usable if subtree throws.
- [x] Validate hook-order hypothesis from prod console stack (`React #310`) against `App.tsx` hook placement.
- [ ] Validate login flow with and without `/level-worlds.html` entry source using `?islandRunEntryDebug=1`, and attach console/network captures plus `window.__islandRunEntryDebugEvidence()` output (including mount + runtime query/persist events and network timing entries).
- [ ] Verify whether blank screen reproduces when all `openIslandRun*` handling is hard-disabled.
- [ ] If yes, pivot focus from routing to post-login app init overlays.

---

## 8) Decision rule
No further routing/hydration code changes should be merged for this incident unless this log is updated with:
- reproducible steps,
- observed evidence,
- hypothesis-to-change mapping,
- post-change verification result.


## 9) Evidence captured (prod console)
- `Uncaught Error: Minified React error #310` on login transition, stack points to `useEffect` call path.
- React #310 corresponds to hook order mismatch (`Rendered more hooks than during the previous render`).
- This matched `App.tsx` structure where new `openIslandRun` effects were placed after a top-level auth-gate early return, so unauthenticated render skipped those hooks but authenticated render executed them.

