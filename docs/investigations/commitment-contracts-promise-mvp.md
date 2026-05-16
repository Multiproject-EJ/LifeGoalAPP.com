# Commitment Contracts → "Promise System" MVP Investigation

**Date:** 2026-05-15  
**Status:** Investigation complete, no code changed  
**Scope:** Safe MVP simplification of the Commitment Contracts feature into a polished "Promise System"

---

## 1. File Inventory

### Core service layer

| File | Role |
|---|---|
| `src/services/commitmentContracts.ts` (77 KB) | Master service — CRUD, evaluation, recovery, reputation, achievements, cascading unlock, redemption quest, sweep health |
| `src/lib/contractIntegrity.ts` | Pure utility — cooldown checks, sacred limit, escalation cap, cascading pause, progress verification, reliability calc |
| `src/lib/contractRewardMultipliers.ts` | Pure utility — streak tier table and multiplier helpers |
| `src/lib/contractForecast.ts` | Pure utility — pace forecast (on_pace / at_risk / target_met) |
| `src/lib/contractHistoryAnalytics.ts` | Pure utility — summarizeContractHistory (win/loss stats, streaks, trend) |
| `src/services/contractRewards.ts` | Links a Reward catalog item to a contract (localStorage-only) and redeems it on success |
| `src/services/contractZenGardenRewards.ts` | Awards Zen Garden items on contract milestones (first kept, sacred kept, narrative rank 3) |

### UI components

| File | Role |
|---|---|
| `src/features/gamification/ContractsTab.tsx` (25 KB) | Full management tab — creates, lists, evaluates, handles all recovery actions, cascading chain viz, reputation card |
| `src/features/gamification/ContractWizard.tsx` | 5-step creation wizard — guided or browse-all mode, all 11 contract types fully reachable |
| `src/features/gamification/ContractStatusCard.tsx` | Per-contract card — progress bar, escalation ladder, pace forecast, witness ping, action buttons |
| `src/features/gamification/ContractHistoryCard.tsx` | Win/loss history, streak, reward tier, trend — only rendered for `activeContracts[0]` |
| `src/features/gamification/ContractResultModal.tsx` | Post-evaluation modal — success celebration / miss recovery (reset, reduce stake, gentle ramp, pause, cancel) |
| `src/features/gamification/ReputationCard.tsx` | Displays user's reliability tier and key stats; shown below active contracts in ContractsTab |
| `src/features/gamification/IdentityStatementInput.tsx` | Text input for identity statement (used in wizard step 2 for `identity` type) |
| `src/features/gamification/NarrativeThemePicker.tsx` | Theme picker for `narrative` type (warrior/monk/scholar/explorer) |
| `src/features/gamification/MultiStageEditor.tsx` | Stage milestone editor for `multi_stage` type |
| `src/features/gamification/FutureMessageReveal.tsx` | Sealed message component — shown in ContractResultModal on success |

### Types

| File | Relevant types |
|---|---|
| `src/types/gamification.ts` | `CommitmentContract`, `ContractType` (11 values), `ContractStatus`, `ContractTier`, `ContractStage`, `ContractTrackingMode`, `ContractCadence`, `ContractStakeType`, `ContractTargetType`, `ReputationScore`, `ReputationTier` |

### Today screen integration

| File | Role |
|---|---|
| `src/features/habits/DailyHabitTracker.tsx` (lines 147–155, 955–958, 4795–4845, 7809–8240) | Collapsible "Active contracts" section — loads contracts, syncs progress on load, supports mark progress / pause / resume / cancel / witness ping |

### Backend/persistence

| Surface | Details |
|---|---|
| Supabase tables | `commitment_contracts`, `commitment_contract_evaluations`, `user_reputation_scores` |
| Supabase RPCs | `evaluate_due_commitment_contracts` (server-side due-window sweep), `get_commitment_contract_sweep_health` |
| localStorage fallback | `lifegoal_contracts_{userId}`, `lifegoal_contract_evaluations_{userId}`, `lifegoal_reputation_{userId}`, `lifegoal_contract_reward_links_{userId}` |

### Tests

There are **no dedicated test files for Commitment Contracts**. The `src/services/__tests__/` and `src/features/gamification/` directories contain zero `.test.ts` files for `commitmentContracts`, `contractIntegrity`, `contractForecast`, `contractHistoryAnalytics`, or `contractRewardMultipliers`. All `islandRunContractV2*` tests relate to the Island Run internal system and are entirely separate.

### Existing documentation

- `docs/CONTRACT_ENGINE.md` — design reference for all 11 types
- `docs/CONTRACT_REWARD_INTEGRATION_PROPOSAL.md` — reward linking proposal

---

## 2. Exposed Contract Types in the UI

The `ContractWizard` exposes **all 11 types** with no gating:

- **Guided mode**: Any type can surface as a recommendation based on the 4-question guided form (intent × strictness × complexity × meaning). Incomplete types (`escalation`, `cascading`, `multi_stage`, `redemption`, `narrative`) are reachable via normal guided answers.
- **Browse-all mode**: All 11 types are displayed in 4 groups — Foundations, Behavior Control, Narrative & Meaning, Complex Progression — with no disabled/unavailable state.

`FocusSession` appears as a selectable target option (`id: 'focus-session-manual'`, `title: 'Focus sessions'`) in step 1, injected unconditionally at the top of the target list.

---

## 3. Confirmed Gap Inventory

### Gap 1 — FocusSession verified progress returns `null` (manual-only)

**Location:** `src/services/commitmentContracts.ts:441–448`

```ts
if (contract.targetType === 'FocusSession') {
  // TODO: Wire FocusSession progress once a focus session service is available.
  return null;
}
```

The wizard adds a hardcoded `FocusSession` option (`focus-session-manual`) despite the TODO. If a user creates a focus-session contract, `syncContractProgressWithTarget` always returns `null`, so the contract's `currentProgress` is never updated from actual focus session data — it remains user-driven by manual "Mark Progress" taps only.

**Risk if surfaced:** Users may think focus sessions auto-count; they silently do not.

---

### Gap 2 — `narrativeRank` is never incremented

**Location:** `src/services/commitmentContracts.ts` — `evaluateContract` function (lines 1546–1595)

The `evaluateContract` function advances `escalationLevel`, `escalationMultiplier`, `futureMessageUnlockedAt`, `successCount`, `missCount`, and `currentStageIndex`-adjacent logic — but there is **no code that increments `narrativeRank`**.

The Zen Garden reward at `src/services/contractZenGardenRewards.ts:99` checks `narrativeRank >= 3`, which will never be true because rank starts at 0 and nothing writes it. The NarrativeThemePicker UI is rendered in the wizard, themes are stored, but rank progression is a full no-op.

**Risk if surfaced:** Narrative contract users see a theme but no rank advancement, no archetype story, and never earn the Zen reward.

---

### Gap 3 — `currentStageIndex` is never advanced

**Location:** `src/services/commitmentContracts.ts` — `evaluateContract` function

`currentStageIndex` is stored on the contract (default `0`) and is mapped to/from the database row in `contractFromRow`/`contractToRow`, but `evaluateContract` never reads or modifies it. The `MultiStageEditor` lets users define up to N stages, and those are persisted in `stages: ContractStage[] | null`, but no logic advances through them or checks stage completion.

**Risk if surfaced:** Multi-stage contract users see stages in setup but nothing happens after each window succeeds; the contract never progresses.

---

### Gap 4 — Redemption quest service exists but is never triggered after a miss

**Services that exist:** `generateRedemptionQuest`, `completeRedemptionQuest`, `failRedemptionQuest` — all in `commitmentContracts.ts` (lines 2284–2426).

**What's missing:**
- `evaluateContract` does **not** call `generateRedemptionQuest` on miss for `contractType === 'redemption'`.
- `ContractResultModal` (miss path, lines 152–234) shows no redemption quest button or flow.
- `ContractStatusCard` has no redemption quest CTA.

The wizard step 2 renders a `redemptionQuestTitle` input for this type, and the title is stored. But after creation, redemption contracts behave identically to classic contracts — no quest is ever generated, no alternative recovery path exists.

**Risk if surfaced:** Users who select Redemption type expect a miss-recovery quest but receive a plain miss with stake forfeit.

---

### Gap 5 — `PERFECT_MONTH` achievement key exists but is never triggered

**Location:** `src/services/commitmentContracts.ts:2157`

```ts
export const CONTRACT_ACHIEVEMENT_KEYS = {
  FIRST_KEPT: 'contract_first_kept',
  STREAK_5: 'contract_5_streak',
  STREAK_10: 'contract_10_streak',
  PERFECT_MONTH: 'contract_perfect_month',   // ← never checked
  SACRED_KEEPER: 'contract_sacred_keeper',
} as const;
```

`checkContractAchievements` (lines 2160–2211) handles `FIRST_KEPT`, `STREAK_5`, `STREAK_10`, and `SACRED_KEEPER`, but contains no check for `PERFECT_MONTH`.

**Risk:** Minor — the key is just unused. No user-visible breakage.

---

### Gap 6 — `ContractHistoryCard` only renders for `activeContracts[0]`

**Location:** `src/features/gamification/ContractsTab.tsx:643–648`

```tsx
{activeContracts[0] && (
  <ContractHistoryCard
    contract={activeContracts[0]}
    evaluations={historyEvaluations}
  />
)}
```

When a user has 2 or 3 active contracts (max 3 is enforced), history is only shown for the first. Furthermore, `historyEvaluations` is populated by fetching evaluations for `primaryContract` (always `displayContracts[0]`), so even if this was rendered for all contracts, the data would be wrong for contracts 2 and 3.

**Risk:** Moderate UX confusion — multi-contract users see no history for their secondary contracts.

---

### Gap 7 — `longest_contract_streak` is never updated

**Location:** `src/services/commitmentContracts.ts` — `updateReputationAfterEvaluation` (lines 2093–2145)

`updateReputationAfterEvaluation` computes `contractsCompleted`, `contractsFailed`, `reliabilityRating`, `sacredContractsKept/Broken`, `totalStakeEarned/Forfeited` — but spreads `longestContractStreak` from the existing record without ever recalculating it. The field is read back from Supabase correctly but is never written with a new value.

`ReputationCard` displays it as "Longest Streak" (line 92), so users see `0` or whatever the initial value was forever.

**Risk:** Minor UX — the stat is always 0/stale.

---

### Gap 8 — Witness accountability is clipboard-only

**Location:** `src/services/commitmentContracts.ts:1259–1281` (`recordWitnessPing`), `src/features/gamification/ContractsTab.tsx:487–518` (`handleWitnessPing`)

"Witness mode" stores a `witnessLabel` string and enables a "Ping witness" button. The ping uses `navigator.share()` with a fallback to clipboard copy of a pre-written reminder message, then fires a telemetry event. There is no:
- Real witness account or email invitation
- Witness confirmation UI
- Two-sided acknowledgment
- Witness viewing a contract's progress

**Risk:** Low — behavior is not broken, just shallower than the label implies. Worth documenting clearly in UI copy.

---

## 4. Staged Implementation Plan

### Constraints (must not change)
- Stake math, bonus formula, window evaluation logic
- Supabase schema (no migrations in this plan)
- Island Run ContractV2 system — completely separate, do not touch
- localStorage key structure
- Existing telemetry event names

---

### Stage A — UX Gating (Lowest Risk, No Logic Changes)

**Goal:** Hide non-functional contract types and targets from the wizard. No service logic touched.

**Changes:**

**A1 — Hide FocusSession target option**  
File: `src/features/gamification/ContractWizard.tsx`  
Change: Remove the hardcoded `FocusSession` target push (line 179–183), or add `disabled` prop to its button with "Coming soon" tooltip.  
Risk: None — no existing contracts break; this only affects creation.

**A2 — Gate advanced/incomplete contract types in wizard**  
File: `src/features/gamification/ContractWizard.tsx` — `CONTRACT_TYPES` array  
Change: Add `available: false` flag to `escalation`, `redemption`, `multi_stage`, `cascading`, `narrative`.  
Render these with a "Coming soon" badge and `disabled` click handling in browse-all mode.  
In guided mode, strip them from `guidedRecommendations`.  
Risk: None — data model unchanged; existing contracts of these types continue working.

**A3 — Rename wizard title from "Contracts" to "Promises"**  
Files: `src/features/gamification/ContractsTab.tsx`, `src/features/gamification/ContractWizard.tsx`, `src/features/habits/DailyHabitTracker.tsx`  
Change: Surface-level copy rename only (labels, headings, button text). Internal type names (`contractType`, `'classic'` etc.) remain unchanged.  
Risk: Very low — cosmetic only.

**A4 — Add "Modifiers" section to wizard step 3**  
Files: `src/features/gamification/ContractWizard.tsx`  
Change: Move `identityStatement`, `futureMessage`, and `witnessLabel` out of type-specific steps and into a collapsible "Optional modifiers" section available to all three MVP types (classic, reverse, sacred). This preserves the data path but makes them flavor additions rather than type-defining features.  
Risk: Low — stored fields unchanged; only wizard presentation changes.

**Test for Stage A:** `npm run build` + manual QA in wizard. No automated tests needed for pure UI gating.

---

### Stage B — Fix Dead Visible Features (Medium Risk, Logic Changes)

**Goal:** Make the features that ARE visible actually work correctly.

**B1 — Increment `narrativeRank` in `evaluateContract`**  
File: `src/services/commitmentContracts.ts` — `evaluateContract`  
Change: After computing `result === 'success'` for a `narrative` contract, increment `narrativeRank` by 1 (capped at a reasonable max, e.g. 10).  
Risk: Low — additive only, no existing contract states broken. Write a unit test.

**B2 — Advance `currentStageIndex` in `evaluateContract`**  
File: `src/services/commitmentContracts.ts` — `evaluateContract`  
Change: For `multi_stage` contracts, on success increment `currentStageIndex` up to `(contract.stages?.length ?? 1) - 1`. When last stage is completed, mark contract `completed`.  
Risk: Medium — must handle null `stages` gracefully; add unit test before shipping.  
Recommendation: Only implement after Stage A gates multi_stage as unavailable in the wizard (so no new multi_stage contracts can be created until this is ready).

**B3 — Trigger redemption quest on miss for `redemption` contracts**  
Files: `src/services/commitmentContracts.ts` — `evaluateContract`, `ContractResultModal.tsx`, `ContractStatusCard.tsx`  
Change:
1. In `evaluateContract`: when `contractType === 'redemption'` and `result === 'miss'`, call `generateRedemptionQuest` instead of forfeiting immediately; set evaluation in a `pending_redemption` hold state.
2. In `ContractResultModal` miss path: show "Start Redemption Quest" and "Skip / Forfeit" buttons when `redemptionQuestId` is active.
3. In `ContractStatusCard`: show quest progress when `redemptionQuestId !== null`.  
Risk: High — evaluation logic and modal both change. This is the most complex Stage B change. Requires unit tests for the miss path.

**B4 — Fix `ContractHistoryCard` for multi-contract**  
File: `src/features/gamification/ContractsTab.tsx`  
Change: Render a `ContractHistoryCard` for each active contract (not just `activeContracts[0]`), and fetch evaluations per-contract rather than only for `primaryContract`.  
Risk: Low — additive, no state changes.

**B5 — Update `longest_contract_streak` in reputation**  
File: `src/services/commitmentContracts.ts` — `updateReputationAfterEvaluation`  
Change: After computing `newCompleted`, fetch evaluations and compute the current streak; update `longestContractStreak = Math.max(base.longestContractStreak, currentStreak)`.  
Risk: Low — purely additive reputation update. Silently fails if evaluation fetch fails (existing pattern).

**Test for Stage B:** Unit tests for each logic change (service layer functions are pure enough to test without mocks for most paths). Run `npm run build` after.

---

### Stage C — Polish Promise Card and Result Ceremony

**Goal:** Make the three MVP types feel intentional and emotionally complete.

**C1 — Promise Card redesign**  
Files: `ContractStatusCard.tsx`, `ContractStatusCard.css`  
Change: Rename "contract" → "promise" in labels. Add type-specific visual treatment:
- Classic: clean minimal card
- Reverse: amber/warning accent
- Sacred: gold border + 🔱 badge (already partial — `contract.isSacred` gating exists)

**C2 — Result ceremony for Sacred Promise**  
File: `ContractResultModal.tsx`  
Change: Add a dedicated success ceremony block for `isSacred === true` (animated reveal, distinct messaging separate from generic "Contract Kept!").

**C3 — Future self message ceremony**  
File: `ContractResultModal.tsx` — `FutureMessageReveal` component  
Change: Currently rendered as-is. Add a staged reveal animation (e.g. envelope opening) to make it feel earned.

**C4 — Witness mode copy clarification**  
Files: `ContractStatusCard.tsx`, `ContractWizard.tsx`  
Change: Update copy from "Witness mode" to "Accountability buddy" with a note: "This creates a message you can share — no account required for your buddy." Removes misleading implication of two-sided enforcement.

**Test for Stage C:** Visual QA only; no logic changed.

---

### Stage D — Advanced Contracts (After Full Implementation)

These should only be re-exposed in the wizard after their logic is complete and tested:

| Type | Prerequisite before re-exposing |
|---|---|
| `narrative` | Stage B1 (narrativeRank increments) + rank display in StatusCard |
| `multi_stage` | Stage B2 (currentStageIndex advances) + stage progress UI in StatusCard |
| `redemption` | Stage B3 (quest trigger on miss) + full quest flow in StatusCard and ResultModal |
| `escalation` | Escalation display in StatusCard already works ✅ — safe to re-expose immediately if desired |
| `cascading` | `unlockCascadingContract` logic exists ✅, chain viz exists ✅ — safe to re-expose; just needs end-to-end QA |
| `FocusSession` target | Needs a real focus session service that returns a log count for a date range |

`reputation` is **not a contract type** from the user perspective — it is already a global score and should be left as-is (always visible in ContractsTab below active promises).

---

## 5. PR Slice Recommendations

| PR | Stage | Files touched | Risk | Test |
|---|---|---|---|---|
| PR-A1 | A | `ContractWizard.tsx` | Trivial | Build only |
| PR-A2 | A | `ContractWizard.tsx` | Low | Build only |
| PR-A3 | A | `ContractsTab.tsx`, `ContractWizard.tsx`, `DailyHabitTracker.tsx` | Low (cosmetic) | Build + visual QA |
| PR-A4 | A | `ContractWizard.tsx` | Low | Build + manual QA |
| PR-B4 | B | `ContractsTab.tsx` | Low | Build |
| PR-B5 | B | `commitmentContracts.ts` | Low | Unit test + build |
| PR-B1 | B | `commitmentContracts.ts` | Low | Unit test + build |
| PR-B2 | B | `commitmentContracts.ts` | Medium | Unit tests required |
| PR-B3 | B | `commitmentContracts.ts`, `ContractResultModal.tsx`, `ContractStatusCard.tsx` | High | Unit tests + integration QA |
| PR-C1–C4 | C | `ContractStatusCard.*`, `ContractResultModal.*`, `ContractWizard.tsx` | Low | Visual QA |
| PR-D1 | D | `ContractWizard.tsx` | Low | QA for each newly exposed type |

---

## 6. What Must NOT Change

- `commitment_contracts` and `commitment_contract_evaluations` Supabase table schema
- `evaluateContract` stake math formula (bonus = `max(1, floor(stake × 0.1 × multiplier × sacred))`, forfeit = `stake × escalation × sacred`)
- `user_reputation_scores` Supabase schema
- All `islandRunContractV2*` files — completely separate Island Run internal system
- localStorage key names (would invalidate existing user data)
- Telemetry event names (would break analytics dashboards)
- `MAX_ACTIVE_CONTRACTS = 3`

---

## 7. Summary of Gaps vs. MVP Types

| Gap | Affects MVP types? | Stage to fix |
|---|---|---|
| FocusSession not wired | No (FocusSession hidden in Stage A) | A (hide), D (implement) |
| narrativeRank never increments | No (narrative hidden in Stage A) | B1 before D |
| currentStageIndex never advances | No (multi_stage hidden in Stage A) | B2 before D |
| Redemption quest never triggered | No (redemption hidden in Stage A) | B3 before D |
| PERFECT_MONTH never checked | No (minor, not user-visible) | Backlog |
| History card only for contracts[0] | Yes (applies to all types) | B4 |
| longest_contract_streak never updated | Yes (shown in ReputationCard) | B5 |
| Witness is clipboard-only | Yes (classic/reverse/sacred can all use witness) | C4 (copy clarification only) |

All 8 confirmed gaps are safely isolated: the 5 type-specific gaps become inert once those types are hidden in Stage A. The 3 cross-cutting gaps (B4, B5, C4) are low-risk fixes.
