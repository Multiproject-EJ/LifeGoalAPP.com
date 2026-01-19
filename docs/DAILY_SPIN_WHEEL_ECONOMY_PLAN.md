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

## Step-by-step Plan with Prerequisite Checks

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
- [ ] Add Zen Token balance to profile.
- [ ] Add transaction log (mirror points).
- [ ] Restrict Zen Garden shop currency.

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
- Before starting any step, verify the prerequisites and record evidence.

## Deliverables
- Updated documentation and diagrams.
- Schema + service changes for new currency.
- Updated UI for score, shop, achievements, and Zen Garden.
- Basic tests for currency updates and purchase flows.

## Docs Structure Recommendation
- **Single master plan** (this file) + **feature-specific docs** for each subsystem.
- Master plan shows *sequence and dependencies*; feature docs show *detail + technical spec*.
