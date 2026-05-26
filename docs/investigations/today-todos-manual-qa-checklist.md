# Today Todos — Manual QA Checklist (Slice 8)

Date: 2026-05-26  
Scope: lightweight QA/debug aid before real-device testing.  
Out of scope: feature additions, Supabase/schema changes, visual redesign, Island Run/gameplay/economy changes.

## Setup

1. Start the app in a normal authenticated user session.
2. Open the Today view where the Today Todos module is rendered.
3. Confirm network state can be toggled (online/offline) via browser dev tools for failure-path checks.

---

## Manual test cases

### 1) Add todo

**Steps**
1. Click/tap `+ Add Todo`.
2. Enter a title and optional notes.
3. Save.

**Expected**
- New todo appears in the Active list for the currently selected date.
- Modal closes.
- Input fields reset for the next add.

---

### 2) Expand/collapse behavior

**Steps**
1. Add or locate a todo with notes.
2. Toggle expand/collapse using both:
   - row click/tap target
   - chevron/explicit expand control (if shown)

**Expected**
- Expanded state toggles reliably.
- Notes/details area only appears in expanded state.
- Collapse hides details again.

---

### 3) Checkbox hidden until expanded

**Steps**
1. Observe a collapsed active todo row.
2. Expand the row.

**Expected**
- Completion checkbox/action is not visible in collapsed state.
- Completion checkbox/action becomes visible only when expanded.

---

### 4) Swipe right complete

**Steps**
1. On touch device/emulator, swipe right on an active todo.
2. Repeat with a short swipe and with a clear long swipe.

**Expected**
- Only deliberate/right-threshold swipe marks todo complete.
- Todo transitions into Completed grouping.
- No accidental completion on tiny/ambiguous gestures.

---

### 5) Completed grouping

**Steps**
1. Complete at least 2 todos.
2. Verify Active vs Completed sections.
3. Mark one completed item back to active (if control exists).

**Expected**
- Completed todos render in the Completed section/group.
- Active section excludes completed items.
- Re-activating moves item back to Active section.

---

### 6) Date scoping / no carryover

**Steps**
1. On Date A, add 1–2 todos.
2. Switch to Date B.
3. Add a different todo on Date B.
4. Return to Date A.

**Expected**
- Date A only shows Date A todos.
- Date B only shows Date B todos.
- No implicit carryover/bleed across dates.

---

### 7) Focus timer buttons

**Steps**
1. Expand an active todo.
2. Use each focus timer button (e.g., 10/25 min) where present.

**Expected**
- Timer actions trigger without JS/runtime errors.
- Expected timer start UX occurs (or no-op fallback if feature-gated) without breaking todo UI.

---

### 8) AI next-step button

**Steps**
1. Expand a todo with and without notes.
2. Click/tap `Help me figure out next step`.

**Expected**
- AI prompt/open action fires.
- Prompt context includes todo title and notes (notes may be blank).
- No crash if notes are empty.

---

### 9) Offline / load/save failure behavior

**Steps**
1. Go offline.
2. Reload/refresh todo list.
3. Attempt to add a todo while offline.
4. Attempt to complete/uncomplete a todo while offline.
5. Restore network and retry.

**Expected**
- Load failure shows a non-blocking error message.
- Save failure shows actionable feedback (e.g., could not save, retry).
- UI remains usable; no permanent spinner lockups.
- On reconnect + retry, operations succeed and list refreshes.

---

## Quick debug notes

- If a case fails, capture:
  - selected date
  - online/offline state
  - exact gesture/button path
  - browser/device + approximate viewport
  - console/network error snippets
- Prioritize reproducible, minimal steps and whether issue is deterministic or flaky.

## Defensive inspection outcome (Slice 8)

A quick read-through of current Today Todos service/UI paths found no obvious low-risk defensive patch that could be made without potentially altering behavior during this slice. This is intentionally docs-only to stay inside the requested scope.
