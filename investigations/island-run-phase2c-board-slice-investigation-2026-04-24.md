# Island Run Phase 2C Investigation (Board Only) — 2026-04-24

Scope: `src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx` only.

Goal: identify the safest first board slice to migrate from legacy `runtimeState` / `setRuntimeState` / `persistIslandRunRuntimeStatePatch` to canonical store/actions.

No production behavior changes in this step.

---

## 1) Raw usage inventory (board file)

Pattern counts in `IslandRunBoardPrototype.tsx`:

- `runtimeState` references: **249**
- `setRuntimeState(...)` calls: **53**
- `persistIslandRunRuntimeStatePatch(...)` calls: **13**
- `readIslandRunRuntimeState(...)` calls: **2**

`persistIslandRunRuntimeStatePatch` callsites (line numbers):
- 1608, 1840, 2497, 2514, 2658, 2687, 2987, 3920, 4934, 4977, 6282, 6975, 9815

---

## 2) Grouped by gameplay area

## A) Dice/token movement

Representative usage:
- Dice regen path writes `dicePool` + `diceRegenState` through local mirror + patch: line ~1608.
- Extensive token/dice reads from `runtimeState` during reconciliation/hydration.

Risk level: **High**
- Crosses roll timing, regen timing, hydration ordering, and animation synchronization.

Conflicting-rule check:
- No explicit contradictory gameplay constants found in this slice.
- But authority overlap is high (store + runtime mirror + patch), so regression risk is high.

Rewiring-only safe now? **No (not first slice).**

Recommended canonical replacement:
- dedicated action path for regen commit (or existing runtime-regen service + store action wrapper only).
- keep visual animation state local, not gameplay state.

---

## B) Reward bar

Representative usage:
- reward bar values are heavily read from `runtimeState` for UI and diagnostics.
- reward updates already partly routed through action services, but board still reads mixed authority.

Risk level: **High**
- Affects event progression, claims, multiplier behavior.

Conflicting-rule check:
- No direct contradictory reward formula constants detected here.
- Primary risk is stale-read/mixed-authority drift.

Rewiring-only safe now? **Medium-Low** (later slice after smaller wins).

Recommended canonical replacement:
- complete reward-bar read path migration to store snapshot.
- keep claim/update writes in `applyRewardBarState` / tile/roll actions.

---

## C) Stops/building progression

Representative usage:
- `runtimeState.stopStatesByIndex`, `stopBuildStateByIndex`, tickets, active stop reads.
- multiple set/update pathways across stop flow.

Risk level: **Very High**
- Core progression gating; any mistake can block/skip island flow.

Conflicting-rule check:
- No obvious contradictory constants in this file, but this area has highest semantic coupling.

Rewiring-only safe now? **No** (late phase).

Recommended canonical replacement:
- migrate stop/build writes to existing stop/build actions first, then read unification.

---

## D) Wallet/currencies

Representative usage:
- direct patch writes for `diamonds` (~2658), `islandShards` (~2987), shard claim tier/count (~9815), market ownership map (~2687).
- some wallet operations already use canonical actions in other places.

Risk level: **Medium-High**
- Better than stop-gating risk, but still tied to rewards/progression.

Conflicting-rule check:
- **Potential conflict vector:** local state + patch writes coexist with canonical wallet actions elsewhere.

Rewiring-only safe now? **Medium** (possible, but not smallest slice).

Recommended canonical replacement:
- wallet-specific action helpers per currency (`diamonds`, `islandShards`, shard claim counters).

---

## E) Minigames/events/companions

Representative usage:
- perfect companion persistence (~4934), companion bonus visit marker (~4977), first-run onboarding marker (~6282), story seen marker (~6975).

Risk level: **Medium**
- Mix of gameplay-adjacent and metadata/persistence markers.

Conflicting-rule check:
- No explicit tuning conflicts found.

Rewiring-only safe now? **Yes for metadata markers**, **No for deeply coupled progression markers**.

Recommended canonical replacement:
- dedicated metadata action(s) for booleans/markers (story seen, onboarding display loop, audio enabled, companion visit key).

---

## F) Hydration/persistence plumbing

Representative usage:
- explicit hydration sync from local/remote, runtime version guard rails, anti-regression comments.

Risk level: **High**
- Breakage here can cause state rollback or write amplification.

Conflicting-rule check:
- No direct contradictory gameplay constants detected.
- Heavy legacy compatibility logic remains active by design.

Rewiring-only safe now? **No** for broad changes.

Recommended canonical replacement:
- keep compatibility until narrower slices complete; avoid bulk rewrite.

---

## G) UI-only animation/local state

Representative usage:
- modals, visual toggles, camera, timing visuals, display feedback strings.

Risk level: **Low**

Conflicting-rule check:
- none.

Rewiring-only safe now? **Already safe** (should remain local).

Recommended canonical replacement:
- none; keep local.

---

## 3) Conflict findings (stop rule)

No hard gameplay-rule contradiction requiring product decision was found in this investigation pass.

However, there is a clear **authority conflict pattern**:
- same conceptual fields can still be touched by both canonical actions and legacy runtime patch/mirror paths.

This is architectural conflict risk (implementation-path conflict), not a business-rule conflict.

---

## 4) Safest first board slice recommendation

Recommended first board slice: **metadata-only marker migration** (smallest blast radius), specifically:
- onboarding display loop marker (~2497)
- audio enabled marker (~2514)
- story prologue seen marker (~6975)
- companion visit key marker (~4977)

Why this is safest:
- mostly non-economy, non-progression-gating fields,
- easier to verify behavior parity,
- removes direct patch writes without touching core movement/reward/stop semantics.

After this, proceed to wallet micro-slices before touching dice/token or stops/build progression.

