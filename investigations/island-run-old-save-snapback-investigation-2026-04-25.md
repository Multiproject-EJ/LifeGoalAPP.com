# Island Run Old-Save Snap-Back Investigation (No Implementation)

Date: 2026-04-25  
Scope: Investigate stale/corrupted save-state compatibility risks that can still trigger token snap-back on existing progress.  
Constraint: **Investigation only — no gameplay-rule changes, no progress reset strategy.**

---

## Observed pattern (as reported)

- Ticket gates now work.
- Token snap-back reappears on some existing progress.
- Full progress reset and fresh Island 1 start removes the issue.

Interpretation: this strongly points to **old-save compatibility/state-repair gap**, not a pure new-session gameplay logic bug.

---

## 1) Persisted fields most likely to drive old-save snap-back

### Highest-risk persisted fields

1. **`tokenIndex`**
   - Persisted in local+remote game-state record.
   - Sanitized only as `>= 0` integer, with no board-topology clamp on hydrate/parse.
   - If old data carries out-of-profile or otherwise stale token indices, render/animation paths can diverge.

2. **`runtimeVersion`**
   - Used as authoritative conflict gate in both hydration and reconcile paths.
   - If local stale/corrupt state has equal/higher runtimeVersion than remote, remote correction may be ignored.

3. **`currentIslandNumber` + `cycleIndex` + `islandStartedAtMs` / timer fields**
   - Hydration mirrors these into local React state and can trigger additional island/timer side effects.
   - Old-save drift here can create inconsistent world context around movement state.

4. **`diceRegenState`** (lower direct risk for snap-back but part of hydration/reconcile churn)
   - Frequent regen commits can bump runtimeVersion and increase odds of stale-vs-fresh version contention if old data is malformed.

### Lower/no risk fields for this specific bug

- `pendingHopSequence`, `isAnimatingRollRef`, and other roll-animation refs are **not persisted**; they are transient component/runtime state.

---

## 2) Are critical fields stored in conflicting places?

Yes — not multiple durable schemas, but multiple active mirrors:

1. **Durable canonical record** (localStorage + Supabase row)
2. **In-memory canonical store snapshot** (`islandRunStateStore`)
3. **Legacy compatibility runtime mirror in board component** (`runtimeState` + `runtimeStateRef`)

This is migration-safe by design, but old saves can expose drift when a stale mirror wins by version gate.

---

## 3) Hydration/reconcile behavior vs old-save edge cases

### What is already good

- Reconcile skips while roll animation is active.
- Reconcile only applies incoming table state when `incomingRuntimeVersion > currentRuntimeVersion`.
- Initial hydrate avoids overwriting local when remote is not strictly newer.
- Regression guard exists for runtime-version rollback in local mirror sync.

### Old-save compatibility weakness

- Initial hydration prefers local when remote is equal/older by runtimeVersion, even if local content is stale/corrupt in movement-critical fields.
- If old local record has a bad `tokenIndex` but non-lower runtimeVersion, remote may never repair it.
- `tokenIndex` normalization currently floors and min-clamps but does not topology-clamp.

This matches the symptom: fresh progress (clean records) works; old records can still regress.

---

## 4) Is there an explicit load-time migration/repair for old bad movement state?

Not currently, beyond generic sanitization.

Current sanitization is broad (types, ranges for many fields), but there is no dedicated “movement/state integrity repair” pass that:

- validates `tokenIndex` against active board topology,
- checks island/cycle/timer coherence as a movement context set,
- resolves local-vs-remote equal-version content mismatch for critical movement fields.

---

## 5) Should we add a safe hydrate-time repair pass?

Short answer: **Yes, likely needed for old saves.**

### Smallest safe repair strategy (recommended)

Add a **read-only classify + minimal repair-on-hydrate** pass for movement-critical compatibility only:

1. **Transient clear (non-persistent):**
   - On hydrate start/end, force-clear any residual UI transients (`pendingHopSequence` / animation-complete resolvers / roll overlay flags) in component state only.

2. **Movement canonicalization (persistent, minimal):**
   - Topology-clamp `tokenIndex` to valid range for active profile.
   - Preserve currencies/progress; do not rewrite unrelated fields.
   - If clamp/repair changes value, commit once via canonical action/store path with a dedicated trigger source tag.

3. **Version-safe tie-break rule for critical fields:**
   - Keep existing runtimeVersion policy generally.
   - Add **narrow exception only for integrity-invalid local movement values** (e.g., impossible tokenIndex) so remote/derived repair can apply even when version is equal.

4. **No progress reset / no gameplay-rule change:**
   - Never modify stop completion, currencies, tickets, or island ownership as part of this repair.

---

## 6) Diagnostics recommendation for old bad state detection

Add structured diagnostics (before implementing repair):

1. **Hydration integrity telemetry event** when movement fields fail validation:
   - local runtimeVersion, remote runtimeVersion
   - local tokenIndex, repaired tokenIndex
   - island/cycle fields
   - source chosen (local/table/fallback)

2. **Snap-back detector breadcrumb**:
   - emit when visual token position regresses after hop completion within same/next tick.

3. **Old-save compatibility marker**:
   - persist one small marker after first successful repair to avoid repeated noise and allow cohort tracking.

---

## 7) Likely stale-state root causes (ranked)

1. **Local stale record retained due strict runtimeVersion precedence** (most likely).
2. **Invalid/out-of-profile tokenIndex in old records not topology-clamped on hydrate**.
3. **Store snapshot vs runtime mirror drift during migration-era hydrate/reconcile race windows** where old data can still win selection.

---

## 8) Do old saves need repair?

**Likely yes** for a subset of users with legacy/corrupted movement fields.

Reasoning:
- Bug disappears on reset (new clean save),
- survives on existing progress for some users,
- current load path lacks targeted movement integrity repair.

---

## 9) Tests needed (for future implementation PR)

### Unit
1. Parse/hydrate old record with invalid tokenIndex (negative/high/NaN-like payload after coercion path) → repaired to valid topology range.
2. Equal-runtimeVersion local-vs-remote where local tokenIndex invalid and remote valid → repair/selection must produce valid token.
3. Repair must not alter currencies/progression fields.

### Integration
4. Existing-save hydration scenario with stale local + valid remote and equal version → no snap-back after first roll.
5. Focus/visibility reconcile after repair should remain stable (no repeated rewrites).

### Regression
6. Fresh-save path unchanged.
7. Ticket gates unchanged.
8. No auto-progress reset side effects.

---

## 10) Bottom line

- Current code appears substantially improved for fresh sessions.
- Existing saves can still carry movement-critical stale state that is not explicitly repaired.
- The safest next slice is a **minimal hydrate-time movement integrity repair** (tokenIndex/topology + transient clear + diagnostics), with strict guardrails to avoid touching gameplay economy/progression.
