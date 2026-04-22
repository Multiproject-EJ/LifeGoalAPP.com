# Island Run Stop Path Mapping Guide (AI-Ready)

## Purpose
This document is a **living map** for isolating and fixing stop-opening inconsistencies in Island Run (Contract V2), especially around:
- active/locked/ticket-required state disagreement,
- stop click behavior vs. displayed stop status,
- migration edge-cases (legacy `completedStops` vs. V2 `stopStatesByIndex`).

Use this as the canonical scaffold for iterative AI-assisted audits. The goal is to contain problems, patch safely, and move forward without regressions.

---

## 1) System Boundaries

### In scope
- Orbit stop visual state (HUD stop buttons)
- Stop resolver state (`resolveIslandRunContractV2Stops`)
- Stop click dispatcher (`handleStopOpenRequest`)
- Ticket requirement and payment paths
- Legacy-to-V2 state bridging (`completedStops` + `stopStatesByIndex`)

### Out of scope
- Dice roll movement logic
- Encounter gameplay internals
- Reward-bar progression math
- Non-stop economy systems (unless directly blocking stop entry)

---

## 2) Current Canonical State Sources

### Primary V2 state
- `runtimeState.stopStatesByIndex`
- `runtimeState.stopTicketsPaidByIsland`
- current `islandNumber`

### Legacy compatibility source
- local `completedStops` list (merged into V2 for resolver compatibility)

### Derived state
- `mergedStopStatesByIndex`
- `contractV2Stops` (from resolver)
- `stopStateMap` (visual mapping)
- `doesStopRequireTicketPayment(...)`

---

## 3) Path Map (Read/Write Flow)

### A. Render path (what user sees)
1. Build `mergedStopStatesByIndex` from `runtimeState.stopStatesByIndex` + legacy `completedStops`.
2. Resolve `contractV2Stops = resolveIslandRunContractV2Stops(...)`.
3. Build `stopStateMap` for visual labels/icons.
4. Render orbit stop UI and labels/ticket badges.

### B. Interaction path (what tap does)
1. User taps orbit stop button.
2. `handleStopOpenRequest(stopId)` runs.
3. If resolver says `locked` -> show explanation (no open).
4. Else if `doesStopRequireTicketPayment(stopId)` -> open ticket prompt.
5. Else open/focus stop modal.

### C. Ticket payment path
1. Ticket modal computes cost from stop index + island number.
2. `handlePayStopTicket(stopId)` calls `payStopTicket(...)`.
3. On success: persist state patch and open the stop.
4. On failure: show reason (insufficient essence / previous stop not complete / already paid).

---

## 4) Known Inconsistency Patterns to Track

| ID | Pattern | Symptom | Likely Cause | Containment Status |
|---|---|---|---|---|
| P-01 | Visual active but tap seems dead | User taps active landmark and gets no modal/prompt | Resolver/display vs click gate mismatch | Partially contained |
| P-02 | Ticket-required not obvious | User doesn’t realize a ticket is needed | Visual maps `ticket_required` to active for parity | Open (UX tradeoff) |
| P-03 | Migrated account mismatch | Legacy completed stop recognized visually but gating differs | Legacy/V2 source divergence | Partially contained |
| P-04 | Locked stop ambiguity | Tap appears broken for sequence-locked stop | No explicit feedback on locked tap | Contained (feedback message path added) |

> Keep this table updated whenever a new symptom is discovered.

---

## 5) AI Audit Loop (Repeatable)

### Step 1 — Snapshot
Ask AI to produce:
- current state graph for stop opening,
- exact source-of-truth chain for status + gating,
- all conversion points between raw runtime state and derived UI state.

### Step 2 — Divergence scan
Prompt AI to compare these pairs:
- resolver status vs. visual status,
- resolver status vs. click path decision,
- runtime raw stop completion vs. merged stop completion,
- ticket ledger vs. ticket-required status.

### Step 3 — Repro matrix
Generate and execute scenario matrix (minimum):
- fresh account (island 1),
- migrated account with legacy completed stop 1,
- ticket unpaid and affordable,
- ticket unpaid and not affordable,
- ticket paid but stale UI snapshot,
- locked stop tapped.

### Step 4 — Guardrail patching
For each divergence:
- choose one canonical decision source,
- route all related branches through that source,
- add user feedback instead of silent no-op,
- add tests before and after patch where possible.

### Step 5 — Regression lock
Update tests + this doc’s pattern table and containment checklist.

---

## 6) Containment Checklist (Do Not Skip)

- [ ] No stop tap path silently no-ops without feedback.
- [ ] Resolver and click path use the same semantic status decision.
- [ ] Legacy migration path cannot visually unlock a stop that click path treats differently.
- [ ] Ticket-required state is surfaced either visually, via prompt, or explicit message.
- [ ] Locked taps always return deterministic feedback.
- [ ] Stop payment success path persists + opens stop in same user flow.
- [ ] Unit tests cover ticket_required + locked + migrated legacy bridging.

---

## 7) Suggested AI Prompts (Copy/Paste)

### Prompt: divergence mapper
"Map every code path that decides whether an Island Run stop is `active`, `locked`, or `ticket_required`. Show where each path reads state from, and flag any path that does not share the same canonical decision source."

### Prompt: containment verifier
"Given the stop click handler and resolver output, prove whether any user tap can result in a silent no-op. If yes, list exact branch conditions and file/line references."

### Prompt: migration risk scan
"Enumerate all places where legacy `completedStops` can disagree with `runtimeState.stopStatesByIndex`, and propose a monotonic merge strategy to prevent regressions."

### Prompt: patch planner
"Create a low-risk patch plan to unify stop-open gating decisions and add user feedback for all blocked states. Include tests and rollback strategy."

---

## 8) Bridge/Fix Backlog Template

Use this table to progressively close the problem-space.

| Bridge ID | Problem Slice | Proposed Fix | Owner | Risk | Test Added | Status |
|---|---|---|---|---|---|---|
| B-001 | Resolver/click mismatch | Route click gating via resolver semantics |  | Low |  | Done |
| B-002 | Silent locked taps | Add explicit user feedback |  | Low |  | Done |
| B-003 | Ticket UX discoverability | Add stronger ticket-required affordance |  | Medium |  | Planned |
| B-004 | Migration observability | Add structured telemetry for status divergence |  | Medium |  | Planned |

---

## 9) Exit Criteria (Problem Considered Contained)

The issue can be considered contained when:
1. All matrix scenarios pass consistently across fresh + migrated accounts.
2. No user-reported “tap does nothing” cases reproduce.
3. Resolver, render, and click paths share a single semantic authority for stop status.
4. Remaining tradeoffs are explicit UX choices (not accidental inconsistencies).

---

## 10) Maintenance Notes

- Treat this as a living document; append date-stamped updates.
- Record every new inconsistency pattern before patching.
- Prefer small, monotonic bridge-fixes over broad rewrites.
