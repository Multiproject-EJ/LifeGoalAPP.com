# Gameplay QA Workflow (Anti-Bloat)

**Written:** 2026-04-22  
**Scope:** All gameplay migration plans under `docs/gameplay/*`

---

## 1) Why this exists

QA in this project means **release-safety validation**, not endless exploratory retesting.
This workflow keeps QA finite, risk-driven, and auditable across every phase.

---

## 2) Core rules (apply to every phase)

1. **Risk-first, not surface-first**
   - Test only behavior that can break rollout safety, progression, or currency integrity.
2. **Contract tests before manual sweeps**
   - Add deterministic service-level tests for routing/gating/award invariants first.
3. **Manual QA is capped**
   - Use small, predefined matrices (specific islands/scenarios), not open-ended sessions.
4. **One gate, one decision**
   - Every QA checklist item must tie to a release action (e.g., flag on/off).
5. **Temporary QA artifacts expire**
   - Once stable post-rollout, archive/remove temporary QA notes to avoid docs/test bloat.

---

## 3) Standard per-phase QA template

For each migration phase, define:

- **Automated contract checks**
  - What invariants are asserted.
- **Manual matrix (bounded)**
  - Exact scenarios + expected outcomes.
- **Exit criteria**
  - Concrete pass/fail gates.
- **Rollback criteria**
  - What conditions force flag rollback.

---

## 4) “Done” definition for a phase

A phase is “QA complete” only when all are true:

1. Required automated suite passes in the island-run harness.
2. Manual matrix rows are executed and logged.
3. Exit criteria are marked complete in the phase tracking doc.
4. Next flag decision is explicit (`enable`, `delay`, or `rollback`).

---

## 5) Bloat-prevention checklist

Before adding a new QA test/doc entry, ask:

- Does this protect a rollout-critical regression?
- Is there already an existing test that covers the same invariant?
- Is this item tied to a release decision?
- Can this be removed/archived after rollout stabilization?

If any answer is **no**, do not add it.
