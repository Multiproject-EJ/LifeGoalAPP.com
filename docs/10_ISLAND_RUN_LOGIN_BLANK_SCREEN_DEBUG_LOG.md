# Island Run login blank-screen debug log

Status: **Open**
Owner: Island Run migration track (M7O+)
Last updated: 2026-02-27

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

Legend: ✅ verified good, ⚠️ attempted/inconclusive, ❌ regressed.

---

## 5) Current hypotheses (ranked)
1. **Bootstrap URL param + auth redirect interaction**
   - `openIslandRun*` params may still influence render timing around login transition in unexpected route states.
2. **Modal-first render path collision**
   - `showLevelWorldsFromEntry` modal path may conflict with other startup overlays/session initialization.
3. **Hydration + entry sequencing race**
   - Level Worlds/Island Run mounts before required app/session state settles, leading to a blank/blocked render state.
4. **Non-visual runtime failure hidden by broad fallbacks**
   - Error path may be swallowed, producing apparent blank screen without obvious fatal logs.

---

## 6) Repro protocol (must follow before new fix)
1. Record exact URL at login start and after auth redirect.
2. Record whether `openIslandRun` and `openIslandRunSource` exist at first paint.
3. Capture console errors/warnings and stack traces.
4. Capture whether `showLevelWorldsFromEntry` becomes true.
5. Capture whether `LevelWorldsHub` or `IslandRunBoardPrototype` mounts.
6. Only then propose a code change.

---

## 7) Experiment queue
- [ ] Add temporary guarded debug logging around startup bootstrap + auth redirect state (dev-only).
- [ ] Validate login flow with and without `/level-worlds.html` entry source.
- [ ] Verify whether blank screen reproduces when all `openIslandRun*` handling is hard-disabled.
- [ ] If yes, pivot focus from routing to post-login app init overlays.

---

## 8) Decision rule
No further routing/hydration code changes should be merged for this incident unless this log is updated with:
- reproducible steps,
- observed evidence,
- hypothesis-to-change mapping,
- post-change verification result.
