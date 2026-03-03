# MINIGAME, BOSS, ECONOMY & PLAYER LEVEL — CANONICAL DESIGN

> **Status:** Canonical. Authored 2026-03-03.  
> **Supersedes:** Any earlier references to mini-game count, boss variety, heart economy, or player level in other docs.  
> **This file wins** if any other doc under `docs/` conflicts on the topics covered here.

---

## 1. Mini-Game Roster (7 Regular + 3 Boss Games)

### 1a. The 7 Regular Mini-Games

Each regular mini-game is triggered from **Stop 2 (Minigame stop)** on any island.  
Only **one mini-game is globally active** at a time — all players on all islands play the same game that week.  
The global active mini-game rotates on a schedule (TBD by operator; suggest weekly rotation).

| # | ID | Name | Summary |
|---|---|---|---|
| 1 | `shooter_blitz` | Shooter Blitz | Space shooter — tap/drag to aim, shoot incoming targets. Already built. |
| 2 | `flick_bowl` | Flick Bowl | Flick a ball (tap + swipe) to knock down pins. 3 throws per round. Simple one-handed. |
| 3 | `tap_garden` | Tap Garden | Tap blooming flowers before they wilt. Speed increases over time. Rewards based on combo chain. |
| 4 | `word_spark` | Word Spark | Short 3–5 letter word from a scrambled set. One-handed, tap letters in sequence. 3 tries. |
| 5 | `memory_tiles` | Memory Tiles | Flip and match pairs. 4×3 grid (12 tiles). 45s time limit. |
| 6 | `balance_run` | Balance Run | Tilt/tap to keep a ball balanced on a moving platform. Survive as long as possible (30s target). |
| 7 | `color_rush` | Color Rush | Tap falling color orbs that match the highlighted color. Miss = lose a life (3 lives). |

**Design rules for all 7:**
- Duration: 20–60 seconds per attempt.
- One-handed, tap/drag only. No precision tiny targets.
- Entry cost: island mini-game currency (tickets earned on the board).
- Reward output: `IslandRunMinigameReward` (coins, dice, hearts, spinTokens, diamonds, xp).
- Each mini-game must implement `IslandRunMinigameProps` interface (already defined in `islandRunMinigameTypes.ts`).

### 1b. Mini-Game Island Schedule (rotation)

Mini-games rotate in a fixed repeating sequence across islands.  
The player's **Stop 2** on each island always shows the currently globally active mini-game —  
but the schedule below defines which mini-game is **featured** on each island for boss milestone checks:

| Islands | Featured Mini-Game |
|---|---|
| 1–17 | Shooter Blitz |
| 18–34 | Flick Bowl |
| 35–51 | Tap Garden |
| 52–68 | Word Spark |
| 69–85 | Memory Tiles |
| 86–102 | Balance Run |
| 103–120 | Color Rush |

> The featured mini-game on a given island is used for **milestone boss** checks (see Section 2).  
> The globally active mini-game is what the player actually plays.  
> If they differ, the boss checks against the **featured** game's sub-level threshold but the player plays the **active** game.

---

## 2. Boss System (Stop 5)

### 2a. Boss Type Distribution

- **~75% of islands → Milestone Boss** (reaches sub-level in current/featured mini-game)
- **~25% of islands → Fight Boss** (dedicated boss-game; a separate, harder game experience)

Boss type is **fixed per island** and **deterministic** (seeded by island number).  
Boss type never changes between cycles.

**Fight Boss islands (approx. 25% = 30 islands distributed across 120):**  
Islands: 5, 18, 30, 42, 48, 60, 66, 72, 84, 90, 96, 108, 114, 120  
(exact list to be finalised; all 20 special islands are fight bosses or milestone bosses; island 120 is always a fight boss)

### 2b. The 3 Boss Games

#### Boss Game 1: ShooterBlitz (Fight Boss)
- Already built (`ShooterBlitz` component).
- Player must survive waves and reach a score threshold.
- Difficulty scales with island number.
- **Lives = Hearts**: each failed attempt costs 1 heart. Instant retry while hearts > 0.
- Reward on win: hearts + coins + spinTokens (scaled by island tier).

#### Boss Game 2: Flappy Phoenix (Fight Boss)
- Flappy-bird style. Tap to keep the phoenix flying between obstacles.
- Obstacles speed up with island number.
- **Lives = Hearts**: each crash costs 1 heart.
- Survive for 30 seconds (or reach a distance threshold) to win.
- Reward on win: hearts + coins + diamonds (scaled).

#### Boss Game 3: The Oracle (Milestone Boss + AI)
- The Zen Master Oracle presents a challenge — riddle, philosophical question, or reflection prompt.
- Challenge types rotate: riddles, "what would you do?" scenarios, mini philosophical puzzles, "finish the ancient proverb".
- **Requires onboarding to be complete** — Oracle is gated if the player has not completed initial onboarding (so that habits/goals exist in the app).
- AI-assisted: the Oracle can generate novel riddles/prompts using an AI call (with a static fallback pool of 50+ prompts for offline/cost-control).
- For ~50% of Oracle encounters: **Habit verification gate** — before the Oracle reveals the answer/pass, the player must confirm they completed at least one tracked habit today (verified against the habit completion log). If no habits are logged today, a prompt appears: *"The Oracle asks — what did you do for yourself today? Complete a habit first."*  
- For ~30% of Oracle encounters: **Badly-performing habit gate** — the system identifies the habit with the lowest completion rate over the last 7 days and presents it as the Oracle's challenge: *"The Oracle sees your struggle with [habit name]. Complete it today to pass."*
- The player answers the riddle/question by selecting from 3 options (A/B/C) — one is correct.
- Pass = correct answer + (if required) habit verified. Fail = lose 1 heart and retry.
- Reward on pass: hearts + coins + xp + optional cosmetic unlock.

### 2c. Boss Scaling by Island Number

| Island range | Milestone boss sub-level required | Fight boss difficulty | Daily heart reward (base) |
|---|---|---|---|
| 1–20 | Sub-level 3 | Easy | 2 hearts/day |
| 21–40 | Sub-level 4 | Medium | 3 hearts/day |
| 41–60 | Sub-level 5 | Medium-Hard | 4 hearts/day |
| 61–80 | Sub-level 6 | Hard | 5 hearts/day |
| 81–100 | Sub-level 7 | Hard | 6 hearts/day |
| 101–120 | Sub-level 8 | Very Hard | 7 hearts/day |
|
---

## 3. Stop Objective Design (Stops 1–4)

Stops should be **small, unpredictable, and not always the same type**.  
The goal is that the player never knows exactly what a stop will ask for — keeps it fresh.

### Stop 1 — Island Orientation (always the same type)
- Always a simple onboarding action: read the island's "mission briefing" and tap Confirm.
- Purpose: gates dice rolling until the player has acknowledged the island context.
- No habit verification required.

### Stop 2 — Mini-Game Stop
- Entry point for the currently active global mini-game.
- Cost: island mini-game currency (tickets).
- Cleared when: player completes one round of the mini-game (any score).

### Stop 3 — Utility Stop (varied objectives, one per island, seeded by island number)

The utility stop rotates through these objective types (deterministic, seeded):

| Objective type | What player does | Frequency |
|---|---|---|
| Journal entry | Write or record any journal entry today | 20% |
| Mood check-in | Log today's mood (any value) | 15% |
| Intention set | Type a one-sentence intention for the day | 15% |
| Photo moment | Take or upload a photo of something that made you smile | 10% |
| Gratitude note | Name one thing you're grateful for today | 15% |
| Life Wheel update | Update any one spoke of the Life Wheel | 10% |
| Rest declaration | Tap "I rested today" (no verification — honour system) | 15% |

All are **one simple action** — never "complete all your habits today".  
The player taps once to confirm after doing the action.

### Stop 4 — Dynamic Stop (habit/goal/check-in, seeded by island number)

The dynamic stop asks for **one small real-life completion**:

| Objective type | What is verified | Frequency |
|---|---|---|
| Complete 1 habit | Any habit logged today (not a specific one) | 35% |
| Complete a specific habit | The habit with the **most days missed recently** (personalised, or random if no data) | 20% |
| Check in on a goal | Open and view any active goal in the app | 20% |
| Log a workout / activity | Any activity log entry today | 15% |
| Daily reflection | Complete the daily reflection if it exists | 10% |
|
**Anti-abuse rules for verified stops:**
- Completions are checked against the habit log timestamp for **today (UTC day)**.
- If the player completes a habit, then undoes it, then redoes it within a session: the **first completion timestamp is used** — it counts.
- Backend records a `habit_completion_snapshot_at` when the player first passes a stop — undoing after passing does not revoke the stop.
- There is no way to retroactively undo a habit that has already been used to pass a stop.

---

## 4. Heart Economy — Full Specification

Hearts are the core play energy resource. They are **global, persistent, never reset**.

### 4a. Heart Sources

| Source | Amount | Rules |
|---|---|---|
| Daily treat (PWA notification) | Scales with player level (see Section 5) | Once per UTC day. Delivered at ~8am local time via push. |
| Passive renewal | 1 heart per 20 minutes (at Player Level 1) | Continuous passive regeneration. Rate scales with player level. Soft cap: does not accumulate beyond the daily renewal cap while offline (max 6 hours of offline accumulation). |
| Real-life habit completion | Up to 3 hearts per day | Awarded when habits are logged in the LifeGoal app. Daily cap enforced. Rate: 1 heart per habit logged, max 3/day at Level 1. Scales with player level. |
| Board tile rewards | 1–2 hearts occasionally | Random chest tile or event tile reward. No cap. |
| Boss win reward | 2–4 hearts | Scales by island tier. No cap. |
| Egg hatch reward | 1–2 hearts | Depends on egg tier. |
| Spin of the Day | 1–3 hearts | One spin per UTC day. |
| Micro-transaction (Stripe) | Instant purchase | Buy hearts in packs. Pricing TBD. |

### 4b. Passive Renewal Schedule (by Player Level)

| Player Level | Hearts per 20 min | Max offline accumulation |
|---|---|---|
| 1–5 | 1 heart / 20 min | 6 hours (18 hearts max) |
| 6–15 | 1 heart / 18 min | 6 hours (~20 hearts max) |
| 16–30 | 1 heart / 15 min | 6 hours (24 hearts max) |
| 31–50 | 1 heart / 12 min | 6 hours (30 hearts max) |
| 51+ | 1 heart / 10 min | 6 hours (36 hearts max) |

**Implementation note:** Passive renewal is computed on app open from the last-seen timestamp. The system does not run in the background — it catches up on open, subject to the 6-hour cap.

### 4c. Habit → Heart Anti-Abuse Rules

This is critical. Players must not be able to game the system by toggling habits.

1. **First-completion-wins rule**: When a habit is marked complete for the first time today (UTC), the heart award fires immediately and is recorded with a `heart_award_snapshot_at` timestamp.
2. **Undo does not revoke**: If the player later marks the habit incomplete, the heart award is NOT reversed. The heart is already earned.
3. **Re-complete does not re-award**: If the player marks it complete again after undoing, no second heart is awarded (de-duplicated by `habit_id + utc_day`).
4. **Daily cap enforced server-side**: The daily heart cap from habits is validated against Supabase, not just localStorage. If the client claims more hearts than the cap, the server ignores the excess.
5. **Cap resets at UTC midnight**.
6. **Cap scales with player level** (see below).

### 4d. Habit Heart Awards by Player Level

| Player Level | Max hearts/day from habits | Hearts per habit logged |
|---|---|---|
| 1–5 | 3 | 1 |
| 6–15 | 4 | 1 |
| 16–30 | 5 | 1 (or 2 on "comeback" habit — the one most recently missed) |
| 31–50 | 6 | 1–2 |
| 51+ | 8 | 1–2 |

---

## 5. Player Level System

The player level is **separate from island number**. It is a global progression measure that reflects the player's long-term engagement across all activities.

### 5a. What Player Level Does

Player level controls:
- Passive heart renewal rate (see Section 4b)
- Daily treat hearts amount
- Max hearts/day from habits
- Shop prices (higher level = more expensive items, but also bigger bundles available)
- Egg rewards (higher tier eggs become available at higher levels)
- Visual flair (player avatar border, title badge, island board theme unlocks)

### 5b. XP Sources

| Activity | XP awarded |
|---|---|
| Complete a habit (any) | 10 XP (max 50 XP/day from habits) |
| Log a journal entry | 15 XP |
| Complete a Life Wheel update | 20 XP |
| Win a mini-game round | 25 XP |
| Clear a boss (Step 5) | 50 XP |
| Complete all 5 stops on an island | 75 XP |
| Complete a full island (all stops + boss) before timer expires | 100 XP bonus |
| Egg hatched | 10–30 XP (by tier) |
| Daily login streak (each day) | 5 XP |
| Island 120 completion (end of first cycle) | 500 XP bonus |

### 5c. Level Thresholds (first 20 levels)

| Level | Total XP required | XP to next level |
|---|---|---|
| 1 | 0 | 200 |
| 2 | 200 | 300 |
| 3 | 500 | 400 |
| 4 | 900 | 500 |
| 5 | 1,400 | 600 |
| 6 | 2,000 | 750 |
| 7 | 2,750 | 900 |
| 8 | 3,650 | 1,050 |
| 9 | 4,700 | 1,200 |
| 10 | 5,900 | 1,400 |
| 11 | 7,300 | 1,600 |
| 12 | 8,900 | 1,800 |
| 13 | 10,700 | 2,000 |
| 14 | 12,700 | 2,250 |
| 15 | 14,950 | 2,500 |
| 16 | 17,450 | 2,750 |
| 17 | 20,200 | 3,000 |
| 18 | 23,200 | 3,300 |
| 19 | 26,500 | 3,600 |
| 20 | 30,100 | 4,000 |

> After Level 20: each subsequent level requires ~10% more XP than the previous.  
> There is no hard level cap — the system is designed for long-term progression.

### 5d. Data Model

Player level must be persisted in Supabase. New table or column additions needed:

```
player_xp: integer (total XP ever earned — level is derived, not stored)
player_level: integer (derived from player_xp for display; can be cached)
xp_ledger: jsonb array of { source, amount, awarded_at, meta } — append-only
```

Or as columns on an existing `profiles` or game-state table. Migration to be created in **M19A**.

### 5e. Onboarding Gate for Oracle Boss

The Oracle boss game (Boss Game 3) requires:
1. `onboarding_complete = true` in user profile metadata.
2. At least 1 habit exists in the user's habit list.
3. At least 1 goal exists in the user's goal list.

If these conditions are not met, the Oracle fight is replaced by a ShooterBlitz fight instead, with a tooltip: *"Complete your onboarding to unlock the Oracle."*

---

## 6. Cycle Loop (After Island 120)

- After island 120 is completed, `cycle_index` increments from 0 → 1.
- `island_number` resets to 1.
- **Difficulty does not increase** on cycle 2+.
- **What does change on cycle 2+:**
  - Previously left-behind eggs on islands are now collectible (second-pass advantage).
  - Shop gains a "Cycle veteran" badge/cosmetic.
  - Boss fights may have a small cosmetic difference (e.g., "Ancient" variant label).
  - Player level continues to grow — no reset.

---

## 7. Next Build Slices (from this design)

| Priority | Slice ID | What | Key files |
|---|---|---|---|
| 1 | **M16** | Per-tile resolution — extend `islandBoardTileMap.ts` to produce fully-typed tile payloads | `islandBoardTileMap.ts`, `IslandRunBoardPrototype.tsx` |
| 2 | **M17** | 120-island cap + cycle loop — modulo-120 capping, `cycle_index` increment | `islandRunGameStateStore.ts`, `IslandRunBoardPrototype.tsx`, migration |
| 3 | **M18** | Stop objective framework — typed `StopObjective` union, seeded per island, Utility + Dynamic stop verification hooks | `islandRunStops.ts`, `IslandRunBoardPrototype.tsx` |
| 4 | **M19A** | Player level + XP system — Supabase table/columns, `islandRunPlayerLevel.ts` service, XP award on key events | new `islandRunPlayerLevel.ts`, migration |
| 5 | **M19B** | Passive heart renewal — compute hearts-since-last-open on hydration; cap at 6h accumulation | `islandRunRuntimeStateBackend.ts`, `IslandRunBoardPrototype.tsx` |
| 6 | **M19C** | Habit → heart awards + anti-abuse — first-completion-wins, server-side daily cap, de-dupe by habit_id+day | `islandRunDailyRewards.ts`, habits feature API, Supabase |
| 7 | **M20A** | Flappy Phoenix boss game — new component + framework wiring | new `FlappyPhoenix.tsx`, `islandRunMinigameRegistry.ts` |
| 8 | **M20B** | Oracle boss game — static riddle pool + habit verification gate + AI prompt hook | new `OracleBoss.tsx`, `islandRunMinigameRegistry.ts`, AI service |
| 9 | **M21A** | Flick Bowl mini-game | new `FlickBowl.tsx` |
| 10 | **M21B** | Tap Garden mini-game | new `TapGarden.tsx` |
| 11 | **M21C** | Word Spark mini-game | new `WordSpark.tsx` |
| 12 | **M21D** | Memory Tiles mini-game | new `MemoryTiles.tsx` |
| 13 | **M21E** | Balance Run mini-game | new `BalanceRun.tsx` |
| 14 | **M21F** | Color Rush mini-game | new `ColorRush.tsx` |
| 15 | **M22A** | Global mini-game calendar — operator-controlled active game rotation | new `islandRunMinigameCalendar.ts`, Supabase config table |

---

## 8. Implementation Notes

### Mini-game framework (already built)
- `IslandRunMinigameProps` / `IslandRunMinigameResult` / `IslandRunMinigameReward` — in `islandRunMinigameTypes.ts` ✅
- `resolveMinigameForStop` — in `islandRunMinigameService.ts` ✅
- Registry pattern — in `islandRunMinigameRegistry.ts` ✅

### What each new mini-game must do
1. Implement `IslandRunMinigameProps` (receive `onComplete`, `islandNumber`, `ticketBudget`).
2. Call `onComplete({ completed: true/false, reward: {...} })` when done.
3. Have its own devplan doc at `docs/minigames/MINIGAME_<NAME>_DEVPLAN.md`.
4. Be registered in `islandRunMinigameRegistry.ts`.

### Oracle AI integration
- The AI call for Oracle riddles should be a thin server function (Supabase Edge Function or similar).
- Input: `{ islandNumber, playerLevel, recentHabits[] }` → Output: `{ prompt: string, options: [A,B,C], correctIndex: number }`.
- Static fallback pool of 50 riddles must always be available offline.
- Cost control: cache generated riddles per island per day (same riddle for all players on same island that day).