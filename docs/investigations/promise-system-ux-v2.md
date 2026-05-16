# Promise System UX v2 — Investigation Report

**Date:** 2026-05-16  
**Branch:** `copilot/investigate-promise-system-ux-v2`  
**Scope:** UX investigation only. No service logic, no schema, no Island Run ContractV2 touched.

---

## 1. Current Wizard — Step Map

The wizard is implemented in `src/features/gamification/ContractWizard.tsx` as a 5-step flow (`WizardStep = 0 | 1 | 2 | 3 | 4`).

| Step | Title (as rendered) | What it asks |
|------|---------------------|--------------|
| 0 | "Help me choose the right promise" | Contract type via Guided questionnaire (4 chip questions) **or** Browse-all grid of 12 types |
| 1 | "What do you want to promise yourself?" | Pick an existing Habit / Goal from a list, or quick-create one inline |
| 2 | "How often should you keep this promise?" | Cadence chip (Daily / Weekly) + target count number + optional end date + type-specific extras (identity statement, narrative theme, etc.) |
| 3 | "What are you willing to stake on this promise?" | Stake type chip (Gold / Tokens) + stake amount + **grace days** chip (0/1/2) + **tracking mode** chip + optional linked reward (with inline reward creation) + accountability buddy toggle + Sacred warning checkbox |
| 4 | "Review your promise" | Summary table + forfeiture warning + Confirm button |

### Observation: Steps 2 & 3 are form-heavy

Step 3 alone contains **seven distinct decisions** for a first-time user: stake currency, stake amount, grace days, tracking mode, reward, accountability mode, and (for Sacred) a confirmation checkbox. Plus an optional inline reward creation sub-form. This is the primary UX debt causing the "feels like a form" feedback.

---

## 2. Confusing Terminology — Current vs. Proposed Plain Language

| Current term | Where it appears | Why it confuses | Proposed plain language |
|---|---|---|---|
| **Cadence** | Step 2 label, Review summary, ContractStatusCard | "Cadence" is music/technical jargon | **"How often?"** (Daily / Weekly) |
| **Grace days** | Step 3 chip group label | "Grace" sounds religious; unclear what it protects | **"Buffer days"** — "If you slip once, your streak is protected" |
| **Tracking mode** | Step 3 chip group label | "progress" vs "outcome_only" are internal code values | **"How do you check in?"** — "I'll mark each session" / "I'll just declare pass/fail at the end" |
| **Stake type** | Step 3 chip group label | "Stake type" sounds like a betting term without context | **"What do you stake?"** — Gold or Tokens |
| **Cooling-off** | Review summary row | Appears without explanation of what it is | **"Cancel protection"** — "You can cancel penalty-free within 24 hours" |
| **Cooldown** (reward) | Inline reward creation form | "Cooldown" is a gaming term unknown to new users | **"How soon can you claim this again?"** |
| **Window** | Status cards, ContractsTab messages | "Current window", "window end" used without explanation | **"This period"** (e.g., "today", "this week") |
| **Sweep / audit log** | ContractsTab subtitle — visible to all users | Server implementation detail | Move behind ⓘ info modal (see §4) |
| **Outcome only** | Tracking mode chip | Confusing pairing with "progress" | **"No daily check-ins"** |
| **Reverse promise** | Type card | Implies doing the opposite, unclear | **"Stop-doing promise"** or **"Resistance promise"** |
| **Sacred promise** | Type card | Unclear ceremony mechanics | Keep label, add a one-liner: "Once-a-year, high-stakes oath. 3× reward if kept, 3× penalty if broken." |

---

## 3. Proposed Wizard v2 Flow — One Decision Per Screen

The goal is Duolingo-style onboarding: one clear question per screen, visual, minimal text, progress bar that shows forward momentum.

Total screens increases from 5 to ~8–10, but each screen is simpler. The back button always works.

### Screen map (all promise types, common path)

```
[S1]  What do you want to commit to?
      → Tap habit / goal from a visual tile list
      → Or: "Create a new one" (name only, no form)

[S2]  What kind of promise fits best?
      → 3 visual cards with 1-line description, icon, example sentence
        • Build a habit  (Classic)
        • Stop doing something  (Reverse)
        • A once-in-a-year oath  (Sacred)
      → "More options" expander for coming-soon types

[S3]  How often will you keep it?
      → Two large tap targets: DAILY / WEEKLY
      → Sub-question fades in:
        "How many times [daily/weekly]?"  (stepper: 1 / 2 / 3+)

[S4]  When should this promise end?
      → "It keeps going until I cancel"  (ongoing)
      → "On a specific date"  (date picker appears)
      → "After N weeks"  (stepper)

[S5]  What's at stake if you miss?
      → Balance pill shows Gold: N  /  Tokens: N
      → Stake slider or quick-pick buttons: 10% / 15% / 20% of balance
      → "Why stake anything?" ⓘ tappable hint

[S6]  How do you check in?
      → "I'll mark each session"
        Sub-label: Tap a button whenever you complete it
      → "I'll declare pass/fail at the end"
        Sub-label: Best for 'don't do X' or one-time outcomes

[S7]  Would you like a buffer day?
      (Skippable — tap 'Skip' = 0 buffer days)
      → "No buffer — strict"
      → "1 buffer day — I might slip once"
      → "2 buffer days — I want some slack"
      Sub-label: "A buffer day means one miss won't cost you your stake."

[S8]  (Optional) Add a reward for succeeding
      → "No reward"  (default, skip immediately)
      → "Pick an existing reward"
      → "Create a quick reward"  (name only field, single tap)
      Cooldown moved to reward detail screen, not here

[S9]  Review — the promise card
      → Visual promise card summary (not a table)
      → Single CTA: "Make this promise" (large)
      → Secondary: "Change something" (goes back to relevant step)
```

### Sacred path additions (after S2 selects Sacred)

```
[S2b] Sacred Promise — Are you sure?
      → Large icon + "This is a once-a-year oath."
      → "If you keep it: 3× bonus."
        "If you break it: 3× penalty + permanent reputation note."
      → "I understand" checkbox (inline to this screen)
      → Next takes you to S3 as normal
```

### Reverse path additions (after S2 selects Reverse/Stop-doing)

```
S3 label changes to: "How many slips are you allowing?"
(Minimum 1 — user picks max allowed violations per period)
```

---

## 4. Example Promise Flows — v2

### A) Daily Habit Promise

> "I will meditate every day"

- S1: Tap "Meditate" habit tile  
- S2: Tap "Build a habit" card  
- S3: Daily / 1 time  
- S4: "It keeps going"  
- S5: Stake 10 Gold  
- S6: "I'll mark each session"  
- S7: "1 buffer day"  
- S8: Skip reward  
- S9: Review → Make this promise

Plain language shown on review card:  
*"Every day you'll mark Meditate done. You have 1 buffer day per week. If you miss more, 10 Gold is forfeited."*

---

### B) Reverse Promise with Strikes

> "I will stop doom-scrolling (max 1 slip per day)"

- S1: Create new: "No doom-scrolling"  
- S2: Tap "Stop doing something" card  
- S3: Daily / max 1 slip  
- S4: "After 4 weeks" (stepper)  
- S5: Stake 15 Gold  
- S6: "I'll declare pass/fail at the end"  
- S7: "No buffer"  
- S8: Add reward: "Movie night" (name only)  
- S9: Review → Make this promise

Plain language on review card:  
*"Each day you allow yourself 1 slip. If you exceed that, the day counts as broken. After 4 weeks, if successful, you earn Movie night + your 15 Gold back."*

---

### C) One-Time Goal Promise

> "Ship the redesign by June 1"

- S1: Tap "Ship redesign v2" goal tile  
- S2: Tap "Build a habit" (Classic) — one-time goal  
- S3: Weekly / 1 completion (minimum)  
- S4: "On a specific date" → June 1  
- S5: Stake 20 Gold  
- S6: "I'll declare pass/fail at the end"  
- S7: "No buffer"  
- S8: Skip reward  
- S9: Review → Make this promise

Plain language on review card:  
*"You have until June 1. When you're done, tap 'I did it.' If June 1 passes without confirmation, 20 Gold is forfeited."*

---

### D) Sacred Promise

> "I will finish writing my book this year"

- S1: Create new: "Finish my book"  
- S2: Tap "Once-a-year oath" card  
- S2b: "I understand" checkbox  
- S3: Weekly / 1 completion  
- S4: "On a specific date" → Dec 31  
- S5: Stake 50 Gold  
- S6: "I'll mark each session"  
- S7: "1 buffer day"  
- S8: Create reward: "Celebration dinner"  
- S9: Review → Make this promise

Plain language on review card:  
*"🔱 Sacred oath. Until Dec 31. 3× bonus if kept (150 Gold + Celebration dinner). 3× penalty if broken (150 Gold forfeited + reputation note). 1 buffer day per week."*

---

## 5. Footer Menu — Current Behavior & Fix Plan

### Current behavior (investigated in `src/App.tsx`)

```ts
// App.tsx line 381
const MOBILE_FOOTER_AUTO_COLLAPSE_IDS = new Set([
  'identity', 'account', 'projects', 'timer', 'journal'
]);
```

`'contracts'` is **absent** from `MOBILE_FOOTER_AUTO_COLLAPSE_IDS`. The footer is therefore never auto-collapsed when the user is on the Promises/Contracts tab.

`shouldHideFooterInJournal` only triggers when `isMobileMenuImageActive && activeWorkspaceNav === 'journal'` — entirely unrelated to Contracts.

### Proposed fix (Stage 1)

Add `'contracts'` to `MOBILE_FOOTER_AUTO_COLLAPSE_IDS`. When `mobileActiveNavId === 'contracts'` the existing `shouldAutoCollapseOnIdle` path will collapse the footer after `MOBILE_FOOTER_AUTO_COLLAPSE_DELAY_MS`, exactly as it does for `identity` and `account`.

Additionally, when `showContractWizard === true` inside `ContractsTab`, fire a prop callback `onWizardOpen` / `onWizardClose` upward to `App.tsx` so the footer is **immediately locked collapsed** for the full wizard duration (no delay). This mirrors the `shouldLockFooterCollapsedForQuestFlow` pattern already used for My Quest and Starter Quest flows.

---

## 6. Technical Text — Move Behind ⓘ Info Modal

### Current rendering (ContractsTab.tsx lines 613–617)

```tsx
<p className="score-tab__meta">
  Due-window checks run while this Promises screen is open, with server-backed sweeps
  for durability while the app is closed. Sweep runs are audit-logged for reliability monitoring.
</p>
<p className="score-tab__meta">{getSweepHealthCopy()}</p>
```

Both paragraphs are always visible. `getSweepHealthCopy()` produces messages like:  
*"Latest server sweep succeeded at 3:42 PM (142 users checked)."*

### Proposed fix (Stage 1)

Replace both `score-tab__meta` paragraphs with a small `ⓘ` button that opens a `SystemInfoModal` (a lightweight modal or popover). The modal shows:

- How evaluation windows work  
- What server sweeps do  
- The current sweep health status (the getSweepHealthCopy text)  
- A "Got it" dismiss button

The main Promises screen then shows only:  
*"Stake Gold or Tokens to stay accountable to your goals."*  
+ `ⓘ` button

---

## 7. Promise Ending, Evaluation, and Archive — Current Flow

### How evaluation works (code trace)

1. **ContractsTab mounts** → calls `loadContract()`.
2. `loadContract()` calls `evaluateDueContracts()` which sweeps all contracts with past window ends and evaluates them server-side.
3. For each active contract in the display list, if `new Date() > getWindowEnd(contract)`, `evaluateContract()` is called inline.
4. After evaluation, contract `status` transitions from `'active'` to `'completed'`, `'broken'`, or `'paused'`.
5. `ContractResultModal` is surfaced with the evaluation result.

### What the user sees

- A modal pops up after the window closes, showing success or miss.
- On **success**: bonus awarded, streak incremented, linked reward claimable.
- On **miss**: stake forfeited, miss count incremented, recovery options (reduce stake, gentle ramp, reset, pause week).
- On **cancel within 24h** (cooling-off): no penalty.

### What is NOT clear to users

1. **When does a promise "end"?** There is no in-wizard explanation that a *window* (daily = midnight, weekly = 7 days from activation) closes and is evaluated automatically. Users may not understand that closing the app is fine.

2. **Where do completed/broken promises go?** `displayContracts` filters to `status === 'active' || status === 'paused'` — so completed/broken promises disappear from the list. `ContractHistoryCard` shows evaluation statistics but there is no archive screen showing individual old promises.

3. **Are rewards/stats applied?** The ContractResultModal confirms the result, but if the user closes it quickly, the bonus line may be missed. There is no persistent "earned" feed or archive entry.

### Proposed UX (Stage 3)

- Add a **"Past Promises"** expandable section below active contracts in `ContractsTab`, showing the most recent 5 completed/broken promises (title, result, date, net gold impact).
- Add a **"How does evaluation work?"** explainer block (single collapsible, collapsed by default) that explains: window timing, auto-eval, server sweep fallback.
- In the ContractResultModal, add a brief **"What happened to my reward/gold"** confirmation line so users don't need to check their balance separately.
- For the wizard Review screen (Step 4 / S9 in v2), add a single-sentence **"This promise ends every [day/week] at midnight. If you kept it, you earn back your stake + bonus. If you missed, your stake is forfeited."**

---

## 8. Today Tab — Link to Full Promise

### Current behavior (DailyHabitTracker.tsx lines ~8215–8330)

The Promises expandable section in the Today tab shows:
- Title, progress count `(X / Y this daily)`, stake label, progress bar
- Timeline bar (if end date set)
- Action buttons: **Mark progress**, **Pause**, **Cancel**, **Copy reminder**

There is **no "Open full promise" button** that navigates the user to the Contracts/Accountability tab.

### Proposed fix (Stage 1)

Add a small **"View →"** link/button on each promise card in the Today tab that calls an `onNavigateToPromise` (or equivalent) callback, which sets `mobileActiveNavId` to `'contracts'` in `App.tsx`. This mirrors the pattern used by other Today tab actions (e.g., `onOpenStarterQuest`, `openTodayHome`).

The callback would need to be threaded from `App.tsx` → `DailyHabitTracker` props → Today contracts section.

---

## 9. Active Promise Loading Performance — Root Cause

### Measured symptom
~2 seconds for the Promises tab to show active contract data.

### Code-traced waterfall in `ContractsTab.loadContract()` (ContractsTab.tsx lines 155–248)

```
1. evaluateDueContracts()           — server call (RPC or row scan)
2. fetchContractSweepHealth()       — separate server call
3. fetchContracts(userId)           — SELECT * FROM commitment_contracts WHERE user_id = ?
4. For EACH active/paused contract:
   a. syncContractProgressWithTarget(userId, contract.id)  — UPDATE + SELECT per contract
   b. If window expired:
      i.  evaluateContract(userId, contract.id)            — RPC + UPDATE
      ii. fetchContracts(userId)                           — full re-fetch (!)
      iii.fetchLinkedRewardForContract(userId, id)         — SELECT
5. For EACH contract in hydratedContracts:
   fetchEvaluationsForContract(contract.id)               — SELECT per contract
```

This is a **serial waterfall + N+1 pattern**. With 2 active contracts it issues:  
3 baseline + 2×(1 sync) + 2×(1 eval) + 2×(1 fetch) + 2×(1 evaluations) = **~11 round-trips in sequence**.

Each Supabase round-trip on a mobile network takes ~150–300ms; 11 × 200ms ≈ **~2.2 seconds** — matching the observed symptom.

### Root causes

1. `syncContractProgressWithTarget` is called for **every** active contract on mount, even when progress hasn't changed.
2. `fetchContracts(userId)` is re-fetched **inside the per-contract loop** whenever `evaluateContract` runs, instead of being refreshed once at the end.
3. `evaluateDueContracts()` runs synchronously before anything is shown — users see a loading state for the entire duration.
4. `fetchEvaluationsForContract` is called per-contract serially instead of in parallel.

### Proposed fix (Stage 5)

- **Parallelise** `fetchEvaluationsForContract` calls using `Promise.all()` (safe, they are independent reads).
- **Batch** `syncContractProgressWithTarget` — move to `Promise.all()` instead of a `for` loop.
- **Defer** `evaluateDueContracts()` and `fetchContractSweepHealth()` — run them **after** the initial contract list is displayed (optimistic load). Surface the "resolved N overdue windows" message as a non-blocking toast.
- **Cache** the `fetchContracts` result after initial load; only re-fetch at the end of the loop, not inside it.
- **Stale-while-revalidate** pattern: render last-known contract state from a local cache (sessionStorage or React state persisted to a ref) immediately, then refresh in background.

These changes are non-breaking to `evaluateContract` behavior and require no schema changes.

---

## 10. Debrief Journal — Post-Success / Post-Miss

### Current state

`ContractResultModal` surfaces a result (success or miss) with recovery actions. There is **no text input, no journal hook, no AI coach connection** on this screen. The modal is closed via `handleContractResultClose()` which simply clears state — no data is persisted about user sentiment.

### Proposed design (Stage 4)

After the existing result + recovery section in `ContractResultModal`, add an **optional** debrief step:

```
[If success]
"What made this work? (optional)"
[ free text, max 200 chars ]
[ Skip ] [ Save reflection ]

[If miss]
"What got in the way? (optional)"
[ free text, max 200 chars ]
[ Skip ] [ Save reflection ]
```

The reflection text would be stored in a `contract_debriefs` table (new, single-row per evaluation):

```
contract_debriefs
  id              uuid
  user_id         uuid
  contract_id     uuid
  evaluation_id   uuid
  result          text ('success' | 'miss')
  reflection_text text
  created_at      timestamptz
```

No changes to `evaluateContract`, stake math, or `commitment_contracts` schema.

The AI coach can read `contract_debriefs` when generating coaching messages, enabling personalised encouragement based on patterns (e.g., "You've mentioned 'meetings' in 3 miss reflections — want to try a gentler target?").

**Hard constraint note:** The debrief input appears **after** evaluation, never before. It does not affect whether a promise is marked success or miss. Evaluation logic is untouched.

---

## 11. Recommended Staged PR Slices

### Stage 1 — Footer + Info Modal + Copy Simplification
**Files touched:** `App.tsx`, `ContractsTab.tsx`, `src/index.css` (minimal)

- [ ] Add `'contracts'` to `MOBILE_FOOTER_AUTO_COLLAPSE_IDS`
- [ ] Add `onWizardOpen` / `onWizardClose` callback props to `ContractWizard` + wire in `App.tsx` to lock footer collapsed during wizard
- [ ] Replace `score-tab__meta` sweep-health paragraphs with an `ⓘ` button + `SystemInfoModal`
- [ ] Rename visible labels: Cadence → "How often", Grace days → "Buffer days", Tracking mode → "How do you check in?", Cooling-off → "Cancel protection"
- [ ] Add "View →" button on each Today-tab promise card; wire `onNavigateToContracts` callback

**Risk:** Low. No service or schema changes.

---

### Stage 2 — Wizard v2 Shell
**Files touched:** `ContractWizard.tsx`, `ContractWizard.css`

- [ ] Refactor 5-step wizard to 9-screen flow (new `WizardScreen` type replacing `WizardStep`)
- [ ] Split Step 3 (7 decisions) into dedicated screens: S5 (stake), S6 (check-in mode), S7 (buffer day), S8 (reward)
- [ ] Move contract type selection to S2 (after target selection), reduce to 3 visual cards + "More options"
- [ ] Add horizontal progress bar (dots or thin fill bar)
- [ ] Preserve all existing form state and `handleConfirm` logic unchanged

**Risk:** Medium. Purely UI refactor; no service calls change. Must not alter `ContractInput` fields.

---

### Stage 3 — Clearer Promise Ending / Archive UX
**Files touched:** `ContractsTab.tsx`, `ContractResultModal.tsx`, new `ContractArchiveSection.tsx`

- [ ] Add "Past Promises" expandable section in `ContractsTab` showing last 5 completed/broken with result, date, net gold
- [ ] Add "What happened to my reward/gold" confirmation line in `ContractResultModal`
- [ ] Add single-sentence evaluation window explainer on wizard Review screen
- [ ] Add collapsible "How does evaluation work?" in `ContractsTab`

**Risk:** Low. Read-only for archive section; no eval logic changes.

---

### Stage 4 — Debrief Journal
**Files touched:** `ContractResultModal.tsx`, new `ContractDebrief.tsx`, new Supabase migration

- [ ] Add optional debrief text area to `ContractResultModal` (shown after result, before close)
- [ ] Create `contract_debriefs` Supabase table (migration)
- [ ] Create `saveContractDebrief(userId, evaluationId, result, text)` service function
- [ ] Wire debrief save into `ContractResultModal` → on "Save reflection" or "Skip" close
- [ ] Expose debrief data to AI coach context (read-only query)

**Risk:** Low-Medium. New table; does not touch evaluation logic. Must validate Supabase migration carefully.

---

### Stage 5 — Performance Optimization
**Files touched:** `ContractsTab.tsx`

- [ ] Parallelise `fetchEvaluationsForContract` calls using `Promise.all()`
- [ ] Parallelise `syncContractProgressWithTarget` calls using `Promise.all()`
- [ ] Defer `evaluateDueContracts()` + `fetchContractSweepHealth()` to after initial render (split into `loadContractsFast()` + `runBackgroundEvaluation()`)
- [ ] Remove redundant `fetchContracts()` re-fetch inside per-contract eval branch; replace with single post-loop refresh
- [ ] Add optimistic load: render cached contracts from ref immediately, refresh behind

**Risk:** Medium. Parallelisation is safe for reads. Evaluation order independence must be verified for multi-contract case. No schema changes.

---

## 12. Summary — Quick Reference

| Problem | Root cause | Stage |
|---|---|---|
| Footer doesn't hide on Promises tab | `'contracts'` absent from `MOBILE_FOOTER_AUTO_COLLAPSE_IDS` | 1 |
| Footer doesn't hide during wizard | No `lockFooterCollapsed` signal from ContractWizard | 1 |
| Technical sweep text always visible | Rendered inline in ContractsTab | 1 |
| Jargon: cadence, grace days, tracking mode | Label copy in ContractWizard | 1 |
| No link from Today tab to full promise | Missing `onNavigateToContracts` callback | 1 |
| Wizard feels like a form | Step 3 has 7 decisions; 5-step structure | 2 |
| Unclear when a promise ends | No in-wizard explanation of window/eval | 3 |
| Completed promises disappear | Filtered to active/paused only; no archive view | 3 |
| Active promises take ~2s to load | Serial waterfall + N+1 pattern in `loadContract()` | 5 |
| No debrief journal | ContractResultModal has no text input or persistence | 4 |
