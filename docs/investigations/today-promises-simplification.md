# Today Promises Simplification — Investigation

**Date:** 2026-05-16  
**Scope:** Investigation only. No behavior changes implemented.

---

## 1. Rendering trace

Today’s Promise section lives in `DailyHabitTracker`:

- `loadActiveContracts()` calls `fetchActiveContracts(userId)`, then runs `syncContractProgressWithTarget(userId, contract.id)` for each active contract before storing the list in local state (`src/features/habits/DailyHabitTracker.tsx:4784-4814`).
- `fetchActiveContracts()` returns only contracts with status `'active'` or `'paused'` (`src/services/commitmentContracts.ts:2432-2442`).
- The Today section then applies `isPromiseActionableToday(contract)`, which keeps only active/paused promises whose `endAt` has not passed (`src/features/habits/DailyHabitTracker.tsx:7812`, `src/features/gamification/promisePresentation.ts:21-42`).
- The cards render in the Promises expandable section at `src/features/habits/DailyHabitTracker.tsx:8221-8359`.

---

## 2. Every action currently shown

### Today section (`DailyHabitTracker`)

| Action | Current Today behavior | Trace |
|---|---|---|
| Mark progress / check in | **Yes.** Primary button for every non-paused promise. Label is always `Mark progress`. | `src/features/habits/DailyHabitTracker.tsx:8300-8313` |
| Log slip | **No dedicated action.** Reverse promises still get `Mark progress`, even though the full Promise screen uses `Log Slip`. | `src/features/habits/DailyHabitTracker.tsx:8300-8313`, `src/features/gamification/ContractStatusCard.tsx:110-115` |
| Log miss | **No dedicated action.** Outcome-only promises also get `Mark progress`. That action is invalid for outcome-only promises and the service rejects it. | `src/features/habits/DailyHabitTracker.tsx:8300-8313`, `src/services/commitmentContracts.ts:1305-1316` |
| Pause | **Yes.** Shown for active promises only. | `src/features/habits/DailyHabitTracker.tsx:8314-8323` |
| Resume | **Yes.** Reuses the primary button when status is paused. | `src/features/habits/DailyHabitTracker.tsx:8305-8313` |
| Cancel | **Yes.** Always shown on every Today card. | `src/features/habits/DailyHabitTracker.tsx:8324-8331` |
| Refresh | **Yes.** Section-level header button, not per-card. | `src/features/habits/DailyHabitTracker.tsx:8236-8243` |
| Copy/share reminder | **Copy only.** Witness-mode promises get `Copy reminder`; Today does not offer share. | `src/features/habits/DailyHabitTracker.tsx:8332-8340` |
| View | **Yes.** `View →` routes to the Promises tab, but does not deep-link to a specific promise. | `src/features/habits/DailyHabitTracker.tsx:8343-8350`, `src/App.tsx:3327-3330` |

### Full Promise screen (`ContractsTab` / `ContractStatusCard`)

The full Promise screen already has the richer action model:

- reverse promise primary action = `Log Slip`
- outcome-only primary action = `Log Miss`
- outcome-only secondary action = `Finalize Promise Kept`
- pause / resume / cancel / share reminder all live there now  
  (`src/features/gamification/ContractStatusCard.tsx:95-115`, `src/features/gamification/ContractStatusCard.tsx:249-294`)

**Key mismatch:** Today is using one generic management card for all promise types, while the full Promise screen already understands the promise variants.

---

## 3. Cancel handler trace

### Which contract id does Today pass?

Today passes the mapped card’s `contract.id` directly:

- `onClick={() => void handleContractAction(contract.id, cancelContract, ...)}`
- `handleContractAction` forwards that same `contractId` into the service call  
  (`src/features/habits/DailyHabitTracker.tsx:4816-4838`, `src/features/habits/DailyHabitTracker.tsx:8324-8328`)

`contractActionId` is only used as a loading flag; it is **not** the source of truth for which contract gets cancelled (`src/features/habits/DailyHabitTracker.tsx:4822`, `src/features/habits/DailyHabitTracker.tsx:8256`).

### Does the service cancel one contract or multiple?

`cancelContract(userId, contractId)`:

1. fetches the full contract list
2. finds a single `contractIndex` via `findIndex((c) => c.id === contractId)`
3. replaces only that one array entry with `status: 'cancelled'`
4. saves the updated array back  
   (`src/services/commitmentContracts.ts:841-890`)

There is **no obvious multi-cancel write bug** in this path.

### Could refresh make multiple promises look cancelled?

After a successful action, Today calls `loadActiveContracts()` again (`src/features/habits/DailyHabitTracker.tsx:4831`).

That refresh can make a card disappear because:

- `fetchActiveContracts()` excludes cancelled promises entirely (`src/services/commitmentContracts.ts:2439-2441`)
- `isPromiseActionableToday()` also hides active/paused promises once `endAt` has passed (`src/features/gamification/promisePresentation.ts:29-41`)

So the likely UX failure is **disappearing cards after refresh**, not one cancel mutating multiple records.

### Is there a shared selected-contract bug in Today?

Not in the Today code path. The Today list does not use shared selection state for cancel. It uses the per-card `contract.id` directly.

### Related safety findings

There are still cancel UX issues:

- Today always shows `Cancel`, even though the service rejects cancelling an active promise outside cooling-off (`src/services/commitmentContracts.ts:858-869`).
- The full Promise screen already protects this better by disabling `Cancel` after cooling-off (`src/features/gamification/ContractStatusCard.tsx:95`, `src/features/gamification/ContractStatusCard.tsx:278-293`).
- Paused promises can still be cancelled in the service because the cooling-off guard only blocks `status === 'active'` outside the window (`src/services/commitmentContracts.ts:864-869`).

That is a semantic inconsistency, but still not a multi-cancel bug.

---

## 4. Today filtering verification

### What currently shows

Today starts from contracts with status:

- `active`
- `paused`  
  (`src/services/commitmentContracts.ts:2439-2441`)

Then Today further requires the promise to still be actionable:

- active + not ended
- paused + not ended  
  (`src/features/gamification/promisePresentation.ts:29-41`)

### What currently does not show

- `completed` promises: excluded by `fetchActiveContracts()`
- `cancelled` promises: excluded by `fetchActiveContracts()`
- ended active/paused promises: excluded by `isPromiseActionableToday()`

### Important nuance on “broken” and “archived”

- There is **no `broken` contract status** in the data model. Contract status is `locked | draft | active | paused | completed | cancelled` (`src/types/gamification.ts:555-555`).
- A “broken” promise is represented by a miss evaluation, not a separate status. If the promise continues after the miss, it can still remain active and therefore still appear in Today.
- There is **no true archive status** for promises today. The full Promise screen has a UI-only “Hide from archive” control for past promises, backed by `hiddenPastPromiseIds` in component state (`src/features/gamification/ContractsTab.tsx:131-140`, `src/features/gamification/ContractsTab.tsx:689-695`, `src/features/gamification/ContractsTab.tsx:773-845`).

**Conclusion:** Today already excludes completed/cancelled/non-actionable promises, but “broken” and “archived” are not first-class promise states yet.

---

## 5. Recommended simplified Today UI

Today should stop acting like a promise management screen.

### Recommended Today card rules

For each actionable promise:

- **Classic / progress promise:** show one primary action: **Check in**
- **Reverse promise:** show one primary action: **Log slip**
- **Outcome-only promise:** show **View details** only
- **Always show View details**
- Keep the card visual: title, promise type, progress/slip state, timeline if relevant, stake, and a single primary CTA

### Remove from Today

- Remove **Cancel**
- Remove **Pause**
- Remove **Resume**
- Remove **Refresh** unless a real stale-data problem remains after simplification
- Remove **Copy reminder** from the main Today card surface

### Keep management in full Promise details

The full Promise screen is the correct place for:

- Pause
- Resume
- End/Cancel
- Share/copy reminder
- archive/hide past items

This also matches the existing richer per-promise logic already implemented in `ContractStatusCard`.

---

## 6. Should cancel exist at all?

### Recommended product model

- **Active promise:** do **not** show Cancel in Today. In the full Promise screen, rename the destructive action to **End Promise**.
- **Within cancel-protection / cooling-off:** show clear confirmation copy that ending now has no penalty.
- **After cancel-protection:** do not use casual “Cancel” wording. Explain the consequence or offer non-destructive alternatives.
- **Past promise:** do not offer Cancel. Only allow archive/hide behavior.

### Why

Right now “Cancel” is overloaded:

- Today exposes it too casually.
- full-screen rules and Today rules are inconsistent.
- the service model treats paused promises differently from active promises.

The safer model is:

1. Today = action surface
2. Full Promise screen = management surface
3. destructive actions require explicit confirmation

---

## 7. Investigation conclusion on the reported cancel bug

### Confirmed?

**Not confirmed in code.**

I did **not** find an obvious bug where Today cancel writes to multiple contracts.

### Most likely explanation of the manual-test report

The current Today UX can easily create the impression that multiple promises were cancelled because:

- cancelling one promise immediately removes it from Today after refresh
- the list is reloaded wholesale after every action
- Today mixes action and management controls
- all cards route to the same generic Promises tab instead of specific details
- ended/non-actionable promises can also disappear from Today during refresh filtering

### Tiny obvious bug?

No obvious one-line multi-cancel bug stood out.  
The main immediate problem is **unsafe / confusing Today UX**, not confirmed multi-record cancellation logic.

---

## 8. Recommended safe PR slices

### A) Remove destructive buttons from Today

- remove Cancel / Pause / Resume / Refresh from Today
- rename Today primary action by promise type (`Check in`, `Log slip`, `View details`)
- keep `View details` on every card

**Risk:** Low. Mostly UI wiring in `DailyHabitTracker`.

### B) Fix cancel-one-only bug if confirmed

- only do this if a reproducible bug is found
- add a focused regression test around cancelling one contract from Today or full details
- if needed, tighten cancel confirmation and success feedback so one-card removal is explicit

**Risk:** Low-Medium, depending on repro path.  
**Current investigation result:** not yet confirmed.

### C) Add compact visual Today promise cards

- reduce copy density
- show promise type, simple progress/slip/timeline state, stake, and one CTA
- make reverse / outcome-only cards visually distinct

**Risk:** Low. Presentation-only if action wiring is kept intact.

### D) Move management actions to full Promise details / archive

- keep pause, end promise, reminder sharing, and archive/hide in the full Promise area
- consider adding a true promise detail panel or deep-link target from Today
- add confirmation for destructive ending

**Risk:** Medium. Some UX/state wiring, but still no stake math or schema changes.

---

## 9. Recommended next move

Start with **Slice A**.

That delivers the biggest safety win immediately:

- fewer destructive actions in Today
- less “management screen” feel
- fewer opportunities for the current cancel confusion to recur
- no changes to evaluation logic, stake math, schema, localStorage keys, telemetry, or Island Run ContractV2
