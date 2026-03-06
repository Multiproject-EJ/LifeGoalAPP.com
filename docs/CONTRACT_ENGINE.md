# Contract Engine 2.0 — Technical Reference

## Overview

Commitment Contracts are powerful psychological accountability tools in LifeGoalApp. A user stakes gold or tokens on a behaviour goal (habit completion, identity statement, avoidance, etc.) and either wins or forfeits based on whether they meet their contract terms within the evaluation window.

Contract Engine 2.0 expands the original single "classic" contract type into **11 specialised types**, adds a **reputation system**, **visual tier glow effects**, **integrity enforcement**, and **Zen Garden integration**.

---

## Contract Types (11 Types)

### 📜 Classic

- **Description:** The original commitment contract. Stake on completing a habit or goal within a cadence window. Zero psychology overhead — pure accountability through skin-in-the-game.
- **Required fields:** target, cadence, target count, stake type, stake amount
- **Evaluation rules:** Success if `currentProgress >= targetCount` by end of window. Miss otherwise.
- **Special behaviours:** None beyond base contract logic.
- **Tier assignment:** Common (low stake) → Rare (medium) → Epic (high). Never Legendary or Sacred.

---

### 🪞 Identity

- **Description:** The user commits to an *identity statement* rather than a bare behaviour target. E.g. "I am someone who exercises every morning." Minimum 30-day duration, rolling consistency scoring.
- **Required fields:** target (habit/goal anchor), identity statement (string, max 200 chars), cadence (daily recommended), end date ≥ 30 days out
- **Evaluation rules:** Each window evaluates as Classic. Repeated success reinforces the identity statement narrative in the UI.
- **Special behaviours:** `identityStatement` is displayed throughout the contract lifecycle. 30-day minimum is enforced in the wizard.
- **Tier assignment:** Common → Rare (medium stake) → Epic (high stake).

---

### 📈 Escalation

- **Description:** Every consecutive miss increases the stake by 50% of the base amount, up to a maximum of 3× the original. A success resets escalation back to level 0.
- **Required fields:** Standard fields. Stake is the *base* amount — actual stake grows with misses.
- **Evaluation rules:** On miss: `escalationLevel = min(escalationLevel + 1, MAX_ESCALATION_LEVEL)`. Effective stake = `baseStakeAmount × escalationMultiplier`. On success: `escalationLevel = 0`, multiplier resets to `1.0`.
- **Special behaviours:** `escalationLevel` and `escalationMultiplier` fields track current state. Cap at level 4 (3× multiplier).
- **Tier assignment:** Common (base) → up to Legendary when at max escalation.

---

### ⚡ Redemption

- **Description:** Instead of instantly forfeiting the stake on a miss, the user receives a *redemption quest* — a small penalty task. Completing the quest within the grace period prevents forfeit.
- **Required fields:** Standard fields. `redemptionQuestTitle` names the quest task.
- **Evaluation rules:** On miss: `redemptionQuestId` is generated, status moves to evaluation hold. On quest completion: miss is pardoned. On quest failure: normal forfeit applies.
- **Special behaviours:** Quest state tracked via `redemptionQuestId`, `redemptionQuestCompleted`.
- **Tier assignment:** Common → Rare (medium stake) → Epic.

---

### ⭐ Reputation

- **Description:** Every evaluation outcome (success or miss) updates the user's persistent `ReputationScore` — specifically the `reliabilityRating`. This contract type makes reputation tracking explicit.
- **Required fields:** Standard fields.
- **Evaluation rules:** Success/miss both write to `user_reputation_scores`. `reliabilityRating = contractsCompleted / contractsStarted`.
- **Special behaviours:** All contract types update reputation implicitly; Reputation type makes this the primary narrative.
- **Tier assignment:** Common → Epic based on stake.

---

### 🚫 Reverse

- **Description:** The user commits to *not* doing something. Log violations instead of completions. The evaluation counts logged violations against an allowed-violations threshold.
- **Required fields:** target (habit to avoid), cadence, allowed violations per window (stored as `targetCount`), stake.
- **Evaluation rules:** Success if `currentProgress <= targetCount` (progress = violations logged). Miss if violations exceed threshold.
- **Special behaviours:** Progress increment means "I slipped" rather than "I completed." UI labels reflect this.
- **Tier assignment:** Common → Epic.

---

### 🏔️ Multi-Stage

- **Description:** A large goal is broken into a sequence of milestone stages (up to 5). Each stage has its own `targetCount`. Completing a stage advances `currentStageIndex`. Partial rewards on stage completion; full reward on final stage.
- **Required fields:** Standard fields. `stages: ContractStage[]` (1–5 stages, each with `title`, `description`, `targetCount`, `sealEmoji`).
- **Evaluation rules:** Each evaluation window checks progress against the *current stage's* `targetCount`. Stage completion advances index. Contract completes when all stages are done.
- **Special behaviours:** `currentStageIndex` field tracks progression. Partial XP awarded on each stage completion.
- **Tier assignment:** Rare (multi-stage overhead) → Legendary.

---

### 💌 Future Self

- **Description:** The user writes a sealed message to their future self at contract creation. The message is revealed on success and *permanently lost* on failure — creating powerful emotional stakes.
- **Required fields:** Standard fields. `futureMessage: string` (the sealed letter text).
- **Evaluation rules:** Classic evaluation. On success: `futureMessageUnlockedAt` is set, message becomes readable. On failure: message is cleared from the record.
- **Special behaviours:** Message is hidden in UI until `futureMessageUnlockedAt` is non-null. `FutureMessageReveal` component handles sealed/unsealed state.
- **Tier assignment:** Rare → Epic based on stake.

---

### ⚔️ Narrative

- **Description:** RPG-themed contract. The user picks an archetype (Warrior, Monk, Scholar, Explorer) and earns rank progression (0–5) by completing windows. At rank 3, a Zen Garden item is unlocked.
- **Required fields:** Standard fields. `narrativeTheme: 'warrior' | 'monk' | 'scholar' | 'explorer'`.
- **Evaluation rules:** Each success increments `narrativeRank` (capped at 5). Misses do not reduce rank.
- **Special behaviours:** At `narrativeRank >= 3`, `checkContractZenGardenRewards()` grants the theme-specific Zen item.
- **Tier assignment:** Rare → Legendary.

---

### 🔱 Sacred

- **Description:** The rarest and most powerful contract type. Limited to 2 per calendar year. Stakes are multiplied 3× in both directions — winning pays 3× the normal XP bonus; losing forfeits 3× the stake. Completing one earns the Diamond achievement *contract_sacred_keeper*.
- **Required fields:** Standard fields. `isSacred: true`. User must explicitly confirm they understand the 2/year limit.
- **Evaluation rules:** Classic evaluation with 3× multiplier applied to both reward and forfeit. `sacredPenaltyMultiplier = 3.0`.
- **Special behaviours:** `sacred_contracts_used_this_year` incremented on creation; enforced via `checkSacredContractLimit()`. Completing grants Diamond achievement.
- **Tier assignment:** Always **Sacred** tier.

---

### 🔗 Cascading

- **Description:** Completing this contract automatically *unlocks* the next contract in a predefined chain. Enables sequential goal journeys with locked future contracts.
- **Required fields:** Standard fields. `unlocksContractId`: ID of the next contract to unlock on success.
- **Evaluation rules:** Classic evaluation. On success: the contract referenced by `unlocksContractId` transitions from `locked` → `active`.
- **Special behaviours:** Linked contract must exist and be in `locked` status. `unlockedByContractId` is set on the linked contract for back-reference.
- **Tier assignment:** Common → Epic.

---

## Contract Tiers

The tier system provides visual differentiation and XP multipliers. Tier is derived from the contract type and stake amount via `deriveContractTier()`.

| Tier | Border Glow | XP Multiplier | Notes |
|------|-------------|---------------|-------|
| Common | None | 1× | Default for low-stake classic/basic contracts |
| Rare | Blue glow | 1.25× | Medium stake, or multi-stage/future-self types |
| Epic | Purple glow | 1.5× | High stake or escalation/redemption/identity types |
| Legendary | Gold glow | 2× | Maximum stake or narrative contracts |
| Sacred | Rainbow/prismatic glow | 3× | Reserved exclusively for Sacred contract type |

Visual glow effects are rendered by `.contract-status-card--tier-*` modifier classes in `ContractStatusCard.css`.

---

## Reputation System

### `ReputationScore` Fields

| Field | Type | Description |
|-------|------|-------------|
| `userId` | string | User identifier |
| `contractsStarted` | number | Total contracts ever activated |
| `contractsCompleted` | number | Total successfully completed |
| `contractsFailed` | number | Total forfeited/failed |
| `contractsCancelled` | number | Total cancelled |
| `reliabilityRating` | number | 0.0–1.0 ratio (completed / started) |
| `reliabilityTier` | ReputationTier | Derived from rating |
| `sacredContractsKept` | number | Sacred contracts successfully completed |
| `sacredContractsBroken` | number | Sacred contracts failed |
| `sacredContractsUsedThisYear` | number | Used for yearly limit enforcement |
| `sacredYear` | number | Year for which the yearly count applies |
| `longestContractStreak` | number | Max consecutive successful windows |
| `totalStakeEarned` | number | Cumulative stake won back |
| `totalStakeForfeited` | number | Cumulative stake lost |

### ReputationTier Levels

| Tier | Rating Threshold | Description |
|------|-----------------|-------------|
| Untested | 0.00 | No contracts started yet |
| Apprentice | 0.01–0.49 | Getting started |
| Dependable | 0.50–0.64 | Shows up more than half the time |
| Reliable | 0.65–0.79 | Consistently follows through |
| Steadfast | 0.80–0.89 | Rarely misses |
| Unbreakable | 0.90–1.00 | Near-perfect track record |

### Rating Calculation

```
reliabilityRating = contractsCompleted / max(contractsStarted, 1)
```

Calculated in `calculateReliabilityRating()` in `contractIntegrity.ts`.

### Reputation Updates

`fetchReputationScore()` reads from `user_reputation_scores`. Updates happen inside `evaluateContract()` on each evaluation outcome.

---

## Integrity & Anti-Cheating

### 48-Hour Cooldown

Prevents re-creating the same contract type targeting the same habit/goal immediately after cancelling.

- **Enforced by:** `checkSameContractCooldown(existingContracts, newType, newTargetId)`
- **Duration:** `SAME_CONTRACT_COOLDOWN_MS = 48 * 60 * 60 * 1000`
- **Behaviour:** Returns `{ allowed: false, availableAt: <ISO string> }` during cooldown.

### Sacred Contract Yearly Limit

- **Enforced by:** `checkSacredContractLimit(reputationScore)`
- **Limit:** `SACRED_CONTRACTS_PER_YEAR = 2`
- **Behaviour:** Returns blocked result if `sacredContractsUsedThisYear >= 2` for the current year.

### Escalation Cap

- **Max level:** `MAX_ESCALATION_LEVEL = 4` (multiplier reaches `3.0× = MAX_ESCALATION_MULTIPLIER`)
- **Enforced by:** `escalationLevelToMultiplier(level)` clamps at level 4.

### Cascading Reset Protection

When a cascading contract is cancelled, the linked downstream contract (if `locked`) is *not* automatically cancelled — it remains locked until manually handled.

### Progress Cross-Verification

`evaluateContract()` fetches live habit logs or goal progress before finalising an evaluation, preventing stale cached progress from inflating success counts.

---

## Contract Achievements

| ID | Name | Tier | XP | Trigger |
|----|------|------|----|---------|
| `contract_first_kept` | First Contract Kept | Bronze 🥉 | 50 | First contract successfully completed |
| `contract_5_streak` | 5 Contract Windows in a Row | Silver 🥈 | 150 | 5 consecutive successful evaluation windows |
| `contract_10_streak` | 10 Contract Windows Streak | Gold 🥇 | 300 | 10 consecutive successful evaluation windows |
| `contract_perfect_month` | Perfect Contract Month | Gold 🥇 | 400 | All windows in a calendar month completed |
| `contract_sacred_keeper` | Sacred Contract Keeper | Diamond 💎 | 1000 | Sacred contract successfully completed |

---

## Database Schema

### `commitment_contracts` — New Columns (v2)

| Column | Type | Default | Description |
|--------|------|---------|-------------|
| `contract_type` | TEXT | `'classic'` | One of 11 contract type values |
| `contract_tier` | TEXT | `'common'` | Visual/XP tier |
| `identity_statement` | TEXT | NULL | Identity contract statement |
| `escalation_level` | INTEGER | 0 | Current escalation depth (0–4) |
| `escalation_multiplier` | NUMERIC(4,2) | 1.0 | Effective stake multiplier |
| `base_stake_amount` | INTEGER | NULL | Original stake before escalation |
| `redemption_quest_id` | TEXT | NULL | Active quest ID |
| `redemption_quest_title` | TEXT | NULL | Quest task description |
| `redemption_quest_completed` | BOOLEAN | false | Quest completion flag |
| `future_message` | TEXT | NULL | Sealed letter content |
| `future_message_unlocked_at` | TIMESTAMPTZ | NULL | When message was revealed |
| `narrative_theme` | TEXT | NULL | Archetype: warrior/monk/scholar/explorer |
| `narrative_rank` | INTEGER | 0 | Current RPG rank (0–5) |
| `is_sacred` | BOOLEAN | false | Sacred contract flag |
| `sacred_penalty_multiplier` | NUMERIC(4,2) | 1.0 | Penalty multiplier (3.0 for sacred) |
| `stages` | JSONB | NULL | Array of ContractStage objects |
| `current_stage_index` | INTEGER | 0 | Active stage pointer |
| `unlocks_contract_id` | TEXT | NULL | Next contract to unlock (cascading) |
| `unlocked_by_contract_id` | TEXT | NULL | Previous contract in chain |
| `reliability_score_impact` | NUMERIC(4,2) | 1.0 | Multiplier applied to reputation update |

### `user_reputation_scores` Table

| Column | Type | Description |
|--------|------|-------------|
| `user_id` | UUID (PK) | References `auth.users(id)` |
| `contracts_started` | INTEGER | Total activations |
| `contracts_completed` | INTEGER | Total successes |
| `contracts_failed` | INTEGER | Total failures |
| `contracts_cancelled` | INTEGER | Total cancellations |
| `reliability_rating` | NUMERIC(5,4) | 0.0–1.0 score |
| `reliability_tier` | TEXT | Tier label |
| `sacred_contracts_kept` | INTEGER | Sacred successes |
| `sacred_contracts_broken` | INTEGER | Sacred failures |
| `sacred_contracts_used_this_year` | INTEGER | Current year usage |
| `sacred_year` | INTEGER | Year for yearly counter |
| `longest_contract_streak` | INTEGER | Best consecutive-window streak |
| `total_stake_earned` | INTEGER | Lifetime won stake |
| `total_stake_forfeited` | INTEGER | Lifetime lost stake |
| `created_at` | TIMESTAMPTZ | Row creation time |
| `updated_at` | TIMESTAMPTZ | Last update time |

### RLS Policies

- Users can **SELECT** their own row.
- Users can **INSERT** their own row.
- Users can **UPDATE** their own row.
- Service role has full access.

---

## Service API Reference

### `commitmentContracts.ts`

#### `createContract(userId, input)`
Creates a contract record in `draft` status. Validates integrity constraints (cooldown, sacred limit) before writing.

**Parameters:** `userId: string`, `input: ContractInput`  
**Returns:** `ServiceResponse<CommitmentContract>`

#### `activateContract(userId, contractId)`
Moves a contract from `draft` → `active`, sets `startAt` and the first `currentWindowStart`. Deducts stake from the user's balance.

**Returns:** `ServiceResponse<CommitmentContract>`

#### `evaluateContract(userId, contractId)`
Evaluates the current window: fetches live progress, determines success/miss, updates stats, handles type-specific logic (escalation, sacred multiplier, cascading unlock, future-message reveal), and writes a `ContractEvaluation` record. Also triggers achievement checks and Zen Garden rewards.

**Returns:** `ServiceResponse<ContractEvaluation>`

#### `fetchActiveContracts(userId)`
Returns all contracts in `active` or `paused` status, up to `MAX_ACTIVE_CONTRACTS`.

**Returns:** `ServiceResponse<CommitmentContract[]>`

#### `fetchReputationScore(userId)`
Reads `user_reputation_scores` (or demo storage). Returns default Untested score if not found.

**Returns:** `ServiceResponse<ReputationScore>`

#### `generateRedemptionQuest(userId, contractId)`
Creates a redemption quest for a failed Redemption-type contract. Sets `redemptionQuestId` on the contract.

**Returns:** `ServiceResponse<{ questId: string; title: string }>`

#### `completeRedemptionQuest(userId, contractId)`
Marks a redemption quest complete, pardoning the miss and continuing the contract.

**Returns:** `ServiceResponse<CommitmentContract>`

#### `failRedemptionQuest(userId, contractId)`
Marks a redemption quest failed, triggering normal stake forfeit.

**Returns:** `ServiceResponse<CommitmentContract>`

#### `deriveContractTier(contractType, stakeAmount)`
Pure function. Returns the appropriate `ContractTier` based on contract type and stake amount thresholds.

**Returns:** `ContractTier`

---

### `contractIntegrity.ts`

#### `checkSameContractCooldown(existingContracts, newType, newTargetId)`
Returns `{ allowed: boolean; reason?: string; availableAt?: string }`.

#### `checkSacredContractLimit(reputationScore)`
Returns `{ allowed: boolean; reason?: string }`.

#### `escalationLevelToMultiplier(level)`
Maps escalation level 0–4 to multiplier 1.0–3.0.

#### `calculateReliabilityRating(started, completed)`
Returns `number` (0.0–1.0). Safe for zero denominator.

**Constants exported:**
- `SAME_CONTRACT_COOLDOWN_MS = 172800000` (48 h)
- `MAX_ESCALATION_LEVEL = 4`
- `MAX_ESCALATION_MULTIPLIER = 3.0`
- `SACRED_CONTRACTS_PER_YEAR = 2`

---

### `contractZenGardenRewards.ts`

#### `checkContractZenGardenRewards(userId, contract, result)`
Checks whether the given evaluation result triggers a Zen Garden item grant. If triggered, calls `grantEarnedZenItem()` to materialise the item in the user's inventory and fires a telemetry event.

**Returns:** `Promise<ZenGardenContractReward | null>`

---

## Zen Garden Integration

Contract milestones unlock special **earned** Zen Garden items (cost 0, cannot be purchased):

| Trigger | Item ID | Item Name | Emoji |
|---------|---------|-----------|-------|
| First contract completed | `zen_contract_scroll` | Contract Scroll | 📜 |
| Sacred contract kept | `zen_sacred_stone` | Sacred Oath Stone | 🔱 |
| Narrative Warrior rank 3 | `zen_warrior_blade` | Warrior's Blade | ⚔️ |
| Narrative Monk rank 3 | `zen_monk_bell` | Monk's Bell | 🧘 |
| Narrative Scholar rank 3 | `zen_scholar_tome` | Scholar's Tome | 📚 |
| Narrative Explorer rank 3 | `zen_explorer_compass` | Explorer's Compass | 🧭 |

Earned items are stored via `grantEarnedZenItem(userId, itemId, itemName)` in `src/services/zenGarden.ts`. They appear in the Zen Garden **Contract Rewards** section with a gold "Earned" badge instead of a purchase button.

---

## UI Components

| Component | File | Description |
|-----------|------|-------------|
| `ContractWizard` | `ContractWizard.tsx` | Multi-step wizard. Step 0: type picker grid (11 types). Steps 1–4: adaptive fields based on type. |
| `ContractStatusCard` | `ContractStatusCard.tsx` | Active contract card with tier glow, escalation ladder, progress bar. |
| `ContractResultModal` | `ContractResultModal.tsx` | Post-evaluation modal: success celebration, future message reveal, redemption quest prompt. |
| `ContractHistoryCard` | `ContractHistoryCard.tsx` | Completed/expired contract summary with stats grid and economy totals. |
| `ReputationCard` | `ReputationCard.tsx` | Displays the user's reputation shield, tier label, and reliability bar. |
| `ContractsTab` | `ContractsTab.tsx` | Top-level contracts tab: multi-contract display, reputation integration, wizard launch. |
| `IdentityStatementInput` | `IdentityStatementInput.tsx` | Guided identity statement textarea with character counter. |
| `MultiStageEditor` | `MultiStageEditor.tsx` | Stage list editor with seal emoji picker, add/remove controls. |
| `FutureMessageReveal` | `FutureMessageReveal.tsx` | Sealed/revealed envelope display with fade-in animation on reveal. |
| `NarrativeThemePicker` | `NarrativeThemePicker.tsx` | 4-theme card grid for narrative archetype selection. |

---

## Configuration Constants

| Constant | Value | Location |
|----------|-------|----------|
| `MAX_ACTIVE_CONTRACTS` | 3 | `commitmentContracts.ts` |
| `MAX_ESCALATION_LEVEL` | 4 | `contractIntegrity.ts` |
| `MAX_ESCALATION_MULTIPLIER` | 3.0 | `contractIntegrity.ts` |
| `SACRED_CONTRACTS_PER_YEAR` | 2 | `contractIntegrity.ts` |
| `SAME_CONTRACT_COOLDOWN_MS` | 172,800,000 (48 h) | `contractIntegrity.ts` |

---

## Known Limitations / Future Work

- **FocusSession target type:** Branch exists with TODO, waiting for focus session service to stabilise before wiring contract evaluation.
- **Zen Garden items:** `grantEarnedZenItem()` writes to localStorage (demo) but the Supabase-backed inventory path needs a migration for a dedicated `earned_items` column or junction table.
- **Push notifications for contract windows:** Contract window open/close events are not yet wired to push notification scheduling.
- **Server-side cron sweep:** `0144_contract_due_sweep_schedule.sql` needs updating for new contract type evaluation logic (escalation, redemption quest hold, cascading unlock).
- **MultiStageEditor:** Currently basic inline inputs; no drag-to-reorder (drag handle is visual-only placeholder).
- **FutureMessageReveal:** Inline fade-in animation; no dedicated "unsealing" ceremony with envelope open effect.
- **CascadingChainViz:** No visual chain flow diagram; linked contracts are shown as text references only.
