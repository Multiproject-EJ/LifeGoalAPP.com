# Daily Spin Wheel + Economy + 4x3 Shop Plan (Mobile-first)

## Goals
- Document how the Daily Spin Wheel connects to the gamification economy (XP, points, streaks, lives).
- Define how the Score tab aggregates currencies and progression.
- Add a 4x3 grid layout for shop/achievements/Zen Garden collections.
- Introduce a second, meditation-only currency for Zen Garden purchases.
- Provide a step-by-step build sequence that checks prerequisites and records completion status.

## Current Baseline (from repo docs)
- **Daily Spin Wheel** is described as a Phase 2 feature with reward types, rarity, and implementation details.
- **Points** are the spendable currency derived from XP (1 point per 10 XP) and are planned to power a store.
- **Power-ups store** exists in docs with permanent/temporary upgrades.

## Implementation Style (Mobile-first)
- Start with **mobile UI layout** and constraints (thumb reach, bottom nav, single-column cards).
- Ensure **all interactions** (spin, claim, purchase) are **optimized for mobile** first.
- Only after mobile is correct, scale up to tablet/desktop breakpoints.

## AI Vibecoding Ready Execution Plan
Designed for AI vibecoding sessions that need repo-aware context, granular tasks, and session-to-session continuity.

### Pre-flight Repo Scan (Every Session)
**Objective:** Rebuild context so the AI can integrate changes safely.

**Mandatory scan steps:**
1. Confirm current branch + clean working tree.
2. Read **this plan**, the **status doc**, and the **QA checklist**.
3. Scan for relevant files with `rg`:
   - `rg -n "spin wheel|daily spin|spin" docs src`
   - `rg -n "economy|points|zen tokens" src docs`
4. Identify feature entry points (likely candidates):
   - UI: `src/features/spin-wheel/*`
   - Hooks/services: `src/services/dailySpin.ts`, `src/hooks/useDailySpinStatus.ts`
   - Economy rules: `src/constants/economy.ts`
5. Record scan results in the session log (see template below).

**If scan reveals conflicts (duplicate docs, out-of-date specs):**
- Mark the conflict in the session log.
- Propose which doc becomes the source of truth before implementation begins.

### Granular Build Plan (Per Session)
Every session must execute **one or more** atomic tasks that can be completed and verified in <60 minutes.

**Atomic task template:**
1. **Intent:** One sentence (e.g., “Add mystery-slot reveal UI state.”)
2. **Scope:** Files to touch.
3. **Implementation steps:** 3–7 bullets, each verifiable.
4. **Validation:** How to confirm (unit test, manual UI, or console checks).
5. **Risk notes:** Any dependency or follow-up required.

### Session Output Requirements
At the end of each session, update:
- `docs/DAILY_SPIN_WHEEL_ECONOMY_STATUS.md` (status + evidence).
- The **Session Log** section below (one new entry, append-only).

### Session Log (Append Only)
**Template:**
```
#### YYYY-MM-DD — <session title>
- Intent:
- Repo scan summary:
- Files touched:
- Key decisions:
- Status changes:
- Validation done:
- Follow-ups:
```

#### 2025-09-29 — Expand plan for AI vibecoding sessions
- Intent: Add repo-scan workflow, session logging, and a daily delight Step 0.
- Repo scan summary: Not executed (documentation-only update).
- Files touched: `docs/DAILY_SPIN_WHEEL_ECONOMY_PLAN.md`, `docs/DAILY_SPIN_WHEEL_ECONOMY_STATUS.md`.
- Key decisions: Added AI vibecoding pre-flight scan + atomic task template; added Step 0 checklist.
- Status changes: Step 0 added as Not Started.
- Validation done: Docs-only update.
- Follow-ups: Execute repo scan at the start of next implementation session.

## System Brain (Economy Matrix)
A single, explicit source of truth for how points are earned/spent.

**Matrix Rules:**
- **Earning sources**: habits, goals, meditation/breathing, spin wheel, achievements.
- **Currencies**:
  - XP (progression)
  - Points (general currency)
  - Zen Tokens (meditation-only currency)
- **Spending sinks**:
  - Points: shop upgrades, cosmetics, trophies/plaques
  - Zen Tokens: Zen Garden only

> This matrix should live in code (types + constants) and be visible in docs.

**Code source of truth:** `src/constants/economy.ts` (mirrors the matrix below).

## Step-by-step Plan with Prerequisite Checks

### Step 0 — Daily Delight Strategy (Spin Wheel Refresh)
**Objective:** Make the spin wheel feel creative and entertaining every day.

**Checklist:**
- [ ] Add daily **theme variants** (visual + audio mood).
- [ ] Introduce **mystery slot** reveal (hidden reward until landing).
- [ ] Add **bonus wheel** for streak milestones (3, 7, 14+).
- [ ] Add **interactive stop** (tap-to-stop for bonus multiplier).
- [ ] Add **daily modifier** (double-or-nothing, lucky number, etc.).
- [ ] Add **micro-story/fortune** line tied to the reward.

**Prerequisite check rule:**
- Any visual or UX changes must keep the mobile-first constraints and not block core spin flow.

### Step 1 — Validate Existing Systems (Prereqs)
**Objective:** Ensure the current gamification and spin wheel systems are actually present and working.

**Checklist:**
- [ ] Verify daily spin services/components exist and can render on mobile.
- [ ] Verify points are awarded and persisted in demo + Supabase mode.
- [ ] Verify Score tab exists and displays XP + Points.

**Prerequisite check rule:**
- If any item above is missing or broken, mark this step as **“Blocked”** and log missing pieces.

### Step 2 — Economy Matrix (Source of Truth)
**Objective:** Define and codify how all currencies are earned/spent.

**Checklist:**
- [ ] Add a central currency rules file (e.g., `src/constants/economy.ts`).
- [ ] Ensure all earn/spend flows read from this source.
- [ ] Update docs with the same matrix for transparency.

**Prerequisite check rule:**
- If Step 1 is blocked, document what’s missing before proceeding.

### Step 3 — Fix Daily Spin Wheel (Mobile-first)
**Objective:** Spin wheel works reliably and updates balances.

**Checklist:**
- [ ] Fix spin wheel loading error (must never block mobile UI).
- [ ] Add retry state and offline-friendly fallback.
- [ ] Ensure spin reward updates Score tab immediately.

**Prerequisite check rule:**
- Must confirm Step 1 + Step 2 are complete before shipping fixes.

### Step 4 — Vision Board Claim Animation
**Objective:** When claiming rewards, animate points/checkmark to the **Game** tab icon (center mobile icon).

**Checklist:**
- [ ] Add animation path from claim button → game icon.
- [ ] Trigger animation on reward claim success.
- [ ] Mobile-first performance check (60fps target).

**Prerequisite check rule:**
- Only proceed if Score tab and currency updates are confirmed from Step 3.

### Step 5 — Score Tab (Mobile-first Ledger)
**Objective:** Score tab is the “currency hub” for XP, Points, Zen Tokens.

**Checklist:**
- [ ] Add Score summary card: XP, Points, Zen Tokens, Level, Streak.
- [ ] Add transaction history chips by source (Spin, Meditation, Habits, etc.).
- [ ] Ensure all values sync after rewards and purchases.

**Prerequisite check rule:**
- Step 2 complete; Step 3 partially complete.

### Step 6 — Zen Tokens + Zen Garden
**Objective:** Add meditation-only currency and restrict Zen Garden purchases to Zen Tokens.

**Checklist:**
- [x] Add Zen Token balance to profile.
- [x] Add transaction log (mirror points).
- [x] Restrict Zen Garden shop currency.

### Step 7 — 4x3 Grid Layout
**Objective:** Add a reusable 4x3 grid for shop/achievements/Zen Garden.

**Checklist:**
- [ ] Grid component (mobile 2 columns, tablet 3, desktop 4).
- [ ] Locked items show unlock criteria.
- [ ] Reuse across Shop + Achievements + Zen Garden.

### Step 8 — Trophies/Plaques/Medals
**Objective:** Allow Points to unlock cosmetic accolades.

**Checklist:**
- [ ] Add purchasable accolade items.
- [ ] Display in achievements/trophy case.
- [ ] Add spend → unlock flow with confirmation.

### Step 9 — QA + Telemetry
**Objective:** Validate flow and track economy usage.

**Checklist:**
- [ ] Spin wheel reward → Score tab update.
- [ ] Vision board animation works on mobile.
- [ ] Shop accepts Points only; Zen Garden accepts Zen Tokens only.
- [ ] Telemetry for earn/spend events.

## Cleanup & Consolidation
- **Keep this file as the single master plan** for sequence + dependencies.
- **Fold overlapping details** from other docs into feature-specific specs (Spin, Score, Store, Zen Garden).
- **Avoid duplication** by linking out to existing docs (e.g., gamification changelog) instead of repeating full specs.

## Tracking Status
- Each step above should be marked as **Not Started / In Progress / Blocked / Done** in a follow-up checklist doc or issue.
- QA checklist: `docs/DAILY_SPIN_WHEEL_ECONOMY_QA_CHECKLIST.md`.
- Before starting any step, verify the prerequisites and record evidence.

### Current Status Snapshot
| Step | Status | Evidence |
| --- | --- | --- |
| 1. Validate Existing Systems | Done | Daily spin components + services, points awarded, Score tab present. |
| 2. Economy Matrix | Done | `src/constants/economy.ts` already serves as source of truth. |
| 3. Fix Daily Spin Wheel | Done | Error + retry states, offline-friendly fallback, immediate score refresh. |
| 4. Vision Board Claim Animation | Done | Vision claim flight animation targets Game tab. |
| 5. Score Tab (Mobile-first Ledger) | Done | XP, Points, Zen Tokens, ledger + chips implemented. |
| 6. Zen Tokens + Zen Garden | Done | Zen Tokens now awarded for meditation sessions; Zen Garden ledger tracks earn/spend. |
| 7. 4x3 Grid Layout | Done | Shared `four-by-three-grid` utility used in store + achievements. |
| 8. Trophies/Plaques/Medals | Done | Trophy case + purchase flow now available from Achievements. |
| 9. QA + Telemetry | In Progress | Economy earn/spend telemetry events wired; QA checklist created and validation pending. |

## Deliverables
- Updated documentation and diagrams.
- Schema + service changes for new currency.
- Updated UI for score, shop, achievements, and Zen Garden.
- Basic tests for currency updates and purchase flows.

## Docs Structure Recommendation
- **Single master plan** (this file) + **feature-specific docs** for each subsystem.
- Master plan shows *sequence and dependencies*; feature docs show *detail + technical spec*.
