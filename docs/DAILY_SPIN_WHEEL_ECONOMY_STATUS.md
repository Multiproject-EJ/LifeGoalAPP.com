# Daily Spin Wheel + Economy Status

## Step 1 — Validate Existing Systems (Prereqs)
**Status:** Done
- ✅ Daily spin components and services exist (DailySpinWheel + NewDailySpinWheel).
- ✅ Points are awarded in demo + Supabase flows (gamification service, spin rewards).
- ✅ Score tab now displays XP + Points on mobile-first UI.

## Step 2 — Economy Matrix (Source of Truth)
**Status:** In Progress
- ✅ Added `src/constants/economy.ts` with currency matrix + XP → Points conversion.
- ✅ XP award flow now uses the conversion ratio when adding points.
- ⏳ Apply the matrix to remaining earn/spend flows (spin rewards, store spend, achievements) for consistency.

## Step 3 — Fix Daily Spin Wheel (Mobile-first)
**Status:** Not Started
- Requires Step 2 completion for full currency sync.

## Step 4 — Vision Board Claim Animation
**Status:** Not Started

## Step 5 — Score Tab (Mobile-first Ledger)
**Status:** In Progress
- ✅ Mobile-first Score tab now surfaces XP, Points, and streak summary.
- ⏳ Add transaction history chips and Zen Token balance once Step 6 is ready.

## Step 6 — Zen Tokens + Zen Garden
**Status:** Not Started

## Step 7 — 4x3 Grid Layout
**Status:** Not Started

## Step 8 — Trophies/Plaques/Medals
**Status:** Not Started

## Step 9 — QA + Telemetry
**Status:** Not Started
