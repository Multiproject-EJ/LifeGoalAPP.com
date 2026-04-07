⚠️ DEPRECATED AS SOURCE OF TRUTH

This document is no longer the authoritative gameplay contract.

The canonical source of truth is now:
docs/gameplay/CANONICAL_GAMEPLAY_CONTRACT.md

This file may contain historical context or partial specifications but should not be used as the primary reference for new development.

---

# MINIGAME, BOSS, ECONOMY & PLAYER LEVEL — CANONICAL DESIGN

> **Status:** Canonical. Authored 2026-03-03. Revised 2026-03-03 (post Q&A clarification session).
> **Supersedes:** Any earlier references to mini-game count, boss variety, heart economy, player level, or Stop 1 design in other docs.
> **This file wins** if any other doc under `docs/` conflicts on the topics covered here.
> Referenced from `docs/07_MAIN_GAME_PROGRESS.md` (single source of truth) and `docs/00_MAIN_GAME_120_ISLANDS_INDEX.md`.

---

## 0. Key Design Principles (locked)

Before any rules: these principles govern every design decision below.

1. **Hearts = dice rolls.** Hearts are not mini-game tickets. 1 heart converts to dice rolls (conversion rate scales with player level). Hearts are the _primary play energy_ for rolling on the board.
2. **Mini-game tickets (island currency) = entry to the mini-game stop (Stop 2).** Tickets are earned by landing on specific tiles on the 17-tile ring. Tickets are temporary — lost on island travel. Hearts and tickets are completely separate resources.
3. **Stop 1 is a meaningful micro-action, not a passive confirm.** It always asks the player to do one small real-world or intentional action before the island "opens". The action type varies per island (seeded, unpredictable). This is the hook that makes the game feel alive and tied to real life.
4. **Stops should feel surprising.** The player should never know exactly what they'll be asked to do. Variety > repetition.
5. **Player level is slow, meaningful progression.** Levelling up gives real, visible benefits. The pace should feel earned — not too fast, not grindy.
6. **Mini-games have internal reward ladders.** Each play session has progression within it (sub-levels, score tiers, combo chains). The more you play within a session, the better the rewards — as long as you have tickets to keep going.

---

## 1. Mini-Game Roster (7 Regular + 3 Boss Games)

### 1a. The 7 Regular Mini-Games

Each regular mini-game is triggered from **Stop 2 (Mini-Game Stop)** on any island.
Only **one mini-game is globally active** at a time — all players on all islands play the same game during that rotation period.
The global active mini-game rotates on a schedule (operator-controlled; suggest 7–10 day rotation).

The player enters by spending island mini-game currency (tickets). Each ticket = one "go" / attempt within the game.
The more tickets spent in a session, the deeper into sub-levels they can go → better rewards.

| # | ID | Name | Core mechanic | Internal reward ladder |
|---|---|---|---|---|
| 1 | `shooter_blitz` | Shooter Blitz | Space shooter — tap to shoot incoming targets. Already built. | Sub-levels: waves. Each wave = harder + bigger reward. |
| 2 | `flick_bowl` | Flick Bowl | Swipe to flick a ball, knock down pins. 3 throws per ticket spent. | Sub-levels: lane difficulty. Strikes = bonus multiplier. |
| 3 | `tap_garden` | Tap Garden | Tap blooming flowers before they wilt. Speed increases. | Sub-levels: rounds. Combo chain multiplier — keep tapping without miss for bigger payouts. |
| 4 | `word_spark` | Word Spark | Tap letters to form a 3–5 letter word from a scrambled set. 3 tries per ticket. | Sub-levels: word length. Longer word = bigger reward. |
| 5 | `memory_tiles` | Memory Tiles | Flip and match pairs on a 4×3 grid. 45s time limit. | Sub-levels: grid size grows (4×3 → 4×4 → 5×4). Faster clears = bonus coins. |
| 6 | `drop_stack` | Drop Stack | Tetris-style — drop falling blocks to fill rows. One-handed (tap to place). | Sub-levels: speed increases per row cleared. Row clear combos give diamonds. |
| 7 | `color_rush` | Color Rush | Tap falling color orbs matching the highlighted target color. Miss = lose a life (3 lives). | Sub-levels: speed ramps. Survival streaks award hearts. |

> **Note on Drop Stack:** replaces Balance Run from the initial draft. Balance Run requires device tilt which is unreliable on PWA. Drop Stack is universally one-handed, works on any device, and has a proven internal reward ladder (Monopoly GO style Tetris/block games are exactly the reference).

**Design rules for all 7:**
- Duration per ticket: 20–60 seconds.
- One-handed, tap/drag only. No precision tiny targets. No tilt-required mechanics.
- Entry cost: island mini-game tickets (temporary per-island currency).
- Player can keep playing as long as they have tickets — each additional ticket spends to advance to the next sub-level.
- Reward output per session: `IslandRunMinigameReward` (coins, dice, hearts, spinTokens, diamonds, xp). Rewards scale with sub-level reached.
- Each mini-game must implement `IslandRunMinigameProps` interface (defined in `islandRunMinigameTypes.ts`).

### 1b. Mini-Game Island Schedule (featured game for milestone boss checks)

The player always plays the **globally active** mini-game at Stop 2.
But each island has a **featured** mini-game that is used for milestone boss difficulty checks (see Section 2).

| Islands | Featured Mini-Game |
|---|---|
| 1–17 | Shooter Blitz |
| 18–34 | Flick Bowl |
| 35–51 | Tap Garden |
| 52–68 | Word Spark |
| 69–85 | Memory Tiles |
| 86–102 | Drop Stack |
| 103–120 | Color Rush |

### 1c. Ticket (Island Mini-Game Currency) Rules

- Tickets are earned by landing on **ticket-tile** types on the 17-tile ring. Specific tile types award tickets (1–3 per landing, seeded per island).
- Completing LifeGoal actions (habits, journals, check-ins, goals) **also awards tickets** while on the active island — even outside the game app.
- Tickets have **no cap** within an island session.
- **All unspent tickets are lost when the player travels to a new island.** No carry-forward.
- Tickets are stored in `island_mini_game_currency` (already in the data model).

---

## 2. Boss System (Stop 5)

### 2a. Boss Type Distribution

- **~75% of islands → Milestone Boss** (player must reach a required sub-level in the featured mini-game)
- **~25% of islands → Fight Boss** (dedicated boss-game — ShooterBlitz or Flappy Phoenix)
- **Special islands (20 of 120) + Oracle-eligible islands** → some bosses are Oracle encounters (see 2b)

Boss type is **fixed per island** and **deterministic** (seeded by island number). Never changes between cycles.

**Fight Boss island list (30 islands, ~25% of 120):**
Islands 5, 10, 18, 25, 30, 36, 42, 48, 54, 60, 65, 72, 78, 84, 90, 95, 96, 102, 108, 110, 114, 118, 120
and 7 more to fill to 30 — exact list to be finalised in `docs/00_MAIN_GAME_120_ISLANDS_INDEX.md` island detail sheet.

Of the Fight Boss islands, approximately half use ShooterBlitz and half use Flappy Phoenix (alternating, seeded by island number).

**Oracle Boss islands (~15 of the 75 milestone boss islands, i.e. ~12% of all islands):**
Oracle is a sub-variant of Milestone Boss — reserved for islands where the milestone boss is the Oracle's challenge instead of a sub-level check.
Fallback rule: if player has not completed onboarding, Oracle islands use ShooterBlitz instead.

### 2b. The 3 Boss Games

#### Boss Game 1: ShooterBlitz (Fight Boss)
- Already built (`ShooterBlitz` component).
- Player must survive waves and reach a score threshold before timer runs out.
- Difficulty scales with island number (wave count, enemy speed, score threshold).
- **Lives = Hearts**: each failed attempt costs 1 heart. Instant retry while hearts > 0.
- Reward on win: hearts + coins + spinTokens (scaled by island tier).
- Fight cost: 1 heart per attempt. Win reward always returns more hearts than spent (net positive for persistent players).

#### Boss Game 2: Flappy Phoenix (Fight Boss)
- Flappy-bird style. Tap to keep the phoenix flying between increasingly narrow obstacle gaps.
- Obstacles speed up with island number. Gap width narrows at higher islands.
- **Lives = Hearts**: each crash costs 1 heart. Instant retry while hearts > 0.
- Win condition: survive for 30 seconds (or reach a distance threshold, whichever is reached first).
- Reward on win: hearts + coins + diamonds (scaled by island tier).
- Not yet built — devplan: `docs/minigames/BOSS_FLAPPY_PHOENIX_DEVPLAN.md` (to be created in M20A).

#### Boss Game 3: The Oracle (Milestone Boss — Wisdom + Habit Gate)
- The Oracle is a Zen-style character who presents a **wisdom challenge** — the player must answer correctly to pass.
- **Challenge types** (rotate per island, seeded):
  - Riddle (classic lateral thinking)
  - Philosophical question ("what would you do if...?" )
  - "Finish the ancient proverb" (select the correct ending from 3)
  - Life reflection ("which of these is the wisest response to setback?")
  - Mini vision board moment: "The Oracle asks: which of these images best represents your intention for this island?" (3 image options — no wrong answer, just forces a moment of reflection — always passes)
- **3 answer options (A/B/C)**: one is correct (or for vision board type: all pass, but the selected image is stored as the island's "intention token").
- **AI-assisted prompts**: Oracle challenges can be generated via an AI edge function. Static fallback pool of 60+ challenges required for offline/cost-control. Cache: same challenge per island per UTC day for all players.
- **Habit gate (on ~50% of Oracle encounters):** After answering correctly, the Oracle asks: *"Before I let you pass — what did you do for yourself today?"* Player must confirm at least 1 habit was logged today. If yes → pass. If no → Oracle says *"Return when you have taken one step for yourself."* (Player is not blocked from retrying immediately after completing a habit.)
- **Struggling habit gate (on ~30% of Oracle encounters):** The Oracle identifies the habit with the lowest 7-day completion rate and asks specifically about that habit: *"The Oracle sees your struggle with [habit]. Complete it today to pass."*
- **Fail path**: wrong answer or unmet habit gate → lose 1 heart → retry immediately.
- **Reward on pass**: hearts + coins + xp + 10% chance of cosmetic unlock (island theme element or avatar item).
- **Onboarding requirement**: Oracle requires `onboarding_complete = true` AND at least 1 habit + 1 goal in the app. If not met → falls back to ShooterBlitz with tooltip: *"Complete your onboarding to unlock the Oracle."*
- Not yet built — devplan: `docs/minigames/BOSS_ORACLE_DEVPLAN.md` (to be created in M20B).

### 2c. Boss Scaling by Island Number

| Island range | Milestone boss sub-level required | Fight boss difficulty | Base daily hearts gift |
|---|---|---|---|
| 1–20 | Sub-level 3 | Easy | 2 hearts/day |
| 21–40 | Sub-level 4 | Medium | 3 hearts/day |
| 41–60 | Sub-level 5 | Medium-Hard | 4 hearts/day |
| 61–80 | Sub-level 6 | Hard | 5 hearts/day |
| 81–100 | Sub-level 7 | Hard | 6 hearts/day |
| 101–120 | Sub-level 8 | Very Hard | 7 hearts/day |

---

## 3. Stop Objective Design (Stops 1–4)

**Core principle:** Stops should feel alive, slightly surprising, and tied to real-world action. The player should never know exactly what a stop will ask. Variety and unpredictability keep it fresh.

### Stop 1 — Island Gate (varied micro-action, seeded per island)

Stop 1 is the **gate before the player can roll dice on a new island**.

This is NOT a passive "tap Confirm to read a briefing". It is always a **meaningful micro-action** that is small, takes 5–30 seconds, and connects the player to their real life or to the island experience.

**MVP v1 Stop 1 types (seeded per island, deterministic):**

| Type ID | Name | What the player does | Notes |
|---|---|---|---|
| `set_egg` | Hatch an Egg | Tap to set the island egg in the hatchery. | Only shown if egg slot is empty. Falls back to `set_intention` if egg already set. |
| `set_intention` | Set Today's Intention | Enter one sentence of intention for today (or confirm today's if already set in the Today tab). | Integrates with the Today tab intention feature. If intention already set today → auto-passes after player reads it. |
| `spin_arrival` | Spin the Arrival Wheel | Spin a small arrival-reward wheel (3 outcomes: small coin bonus, extra ticket, nothing). | Pure delight — no fail state. Always passes after spin resolves. |
| `quick_journal` | Quick Arrival Note | Type 1–3 sentences: "How are you feeling right now?" | Very short. No minimum length. Tap Submit → passes. |
| `vision_pick` | Vision Board Moment | 3 images shown. Player taps the one that best represents their energy today. | No wrong answer. Always passes. Stores selection as "island intention token". |
| `gratitude_flash` | Gratitude Flash | Name one thing you're grateful for right now (one sentence, or tap from 3 AI-suggested prompts). | No fail state. Always passes. |
| `mini_webtoon` | Island Story Panel | A 2–3 panel mini comic / story panel introduces the island's theme. Tap through to pass. | Visual delight. No action required beyond tapping Next. Asset-heavy — add as art is available. |

**Rules:**
- Stop 1 type is fixed per island (seeded by island number) and never changes between cycles.
- If the required action is already done today (e.g. intention set in Today tab), Stop 1 auto-passes with a confirmation screen: *"✓ Your intention is already set — the island is open."*
- Stop 1 is always completable — there is no fail state for Stop 1. It should never block the player permanently.
- **Future expansion:** This list will grow. New Stop 1 types can be added without changing the seeding logic — just extend the type pool and the island number → type mapping.

### Stop 2 — Mini-Game Stop

- Entry point to the currently globally active mini-game.
- Cost per play: 1 island mini-game ticket.
- Player can keep playing as long as they have tickets (each ticket = one more attempt / sub-level entry).
- Cleared when: player completes at least one round (any score). Stop 2 completion does not require reaching a specific sub-level — just playing once.
- The mini-game stop **stays open** after completion — player can keep spending tickets for rewards even after Stop 2 is cleared.

### Stop 3 — Utility Stop (seeded per island)

The utility stop asks for one small real-life action. Types rotate (seeded, so each island always has the same type):

| Type | What player does | Notes |
|---|---|---|
| Journal entry | Write any journal entry today (any length) | Checks if journal entry logged today |
| Mood check-in | Log today's mood (any value, 1 tap) | Checks mood log for today |
| Intention confirm | Confirm today's intention (or set one if not done) | Integrates with Today tab |
| Gratitude note | Name one thing you're grateful for | No verification — honour system |
| Life Wheel update | Update any one spoke | Checks if Life Wheel updated today |
| Rest declaration | Tap "I rested today" | Honour system — no verification |
| Habit check-in | Tap to review your habit list (not complete, just view) | Opens habit list; tap confirms review |

All types: one simple action, player taps once to confirm after doing it.

### Stop 4 — Dynamic Stop (personalised, seeded per island + player data)

The dynamic stop asks for one **real-life completion** — slightly more demanding than Stop 3.

| Type | What is verified | Notes |
|---|---|---|
| Complete any habit | Any habit logged today | 35% frequency |
| Complete a specific struggling habit | The habit with lowest 7-day rate | 20% frequency; personalised |
| Check in on a goal | Open and view any active goal | 20% frequency |
| Log a workout / activity | Any activity entry today | 15% frequency |
| Daily reflection | Complete the daily reflection | 10% frequency |

**Anti-abuse rules:**
- Completions checked against habit log timestamp for **today (UTC day)**.
- First-completion-wins: if completed, then undone, then redone — first completion timestamp is used. It counts.
- `habit_completion_snapshot_at` is recorded server-side when the player first passes Stop 4. Undoing the habit afterwards does not revoke the pass.
- Daily cap for habit-awarded hearts enforced server-side (see Section 4).

---

## 4. Heart Economy — Full Specification

Hearts are the **primary play energy**. 1 heart converts to a set number of dice rolls (conversion rate scales with player level). Hearts are **global, persistent, never reset across sessions or islands**.

### 4a. Hearts vs. Dice vs. Tickets — Clarification

| Resource | What it is | How earned | How spent | Lost on island travel? |
|---|---|---|---|---|
| **Hearts ❤️** | Play energy | Many sources (see 4b) | Converted to dice rolls (1 heart = N dice); also spent as lives in fight bosses | ❌ Never lost |
| **Dice 🎲** | Roll tokens | Converted from hearts; some rewards | Roll on the 17-tile board (1 dice = 1 roll) | ❌ Never lost (they are a global pool) |
| **Tickets 🎟️** | Mini-game entry tokens | Earned by landing on ticket tiles on the board; earned by completing LifeGoal app actions | Enter the mini-game stop (Stop 2) — 1 ticket per round | ✅ Lost on island travel |
| **Coins 🪙** | General currency | Tiles, stops, bosses, eggs | Shop purchases | ❌ Never lost |
| **Diamonds 💎** | Premium currency | Rare tiles, boss victories, special rewards | Shop (premium items) | ❌ Never lost |

### 4b. Heart Sources

| Source | Amount | Rules |
|---|---|---|
| Passive renewal | 1 heart / 20 min (Level 1) | Computed on app open; soft cap = **player level heart cap** (see 4c). Not background — catches up on open. |
| Daily treat (PWA notification) | Scales with island range (see 2c) | Once per UTC day. Delivered via push at ~8am local time. |
| Real-life habit completion | 1 heart per habit logged, up to daily cap | Anti-abuse rules apply (see 4d). Daily cap scales with player level. |
| Board tile rewards | 1–2 hearts | Chest tile or event tile landing. No cap. |
| Boss win reward | 2–4 hearts | Scales by island tier (Section 2c). No cap. |
| Egg hatch reward | 1–2 hearts | Depends on egg tier (Common 1, Rare 1–2, Mythic 2). |
| Spin of the Day | 1–3 hearts | One spin per UTC day. |
| Stop rewards | 1–2 hearts occasionally | Some stops award hearts on completion. |
| Micro-transaction (Stripe) | Pack purchase | Instant. Pricing TBD. Bypasses all caps. |

### 4c. Heart Cap System (Passive Renewal Hard Cap)

The heart cap is the **maximum number of hearts that passive renewal will fill up to**. It is **not** a global heart maximum — the player can hold more hearts than the cap (e.g. from boss wins or purchases). But passive renewal stops generating new hearts once the current heart count reaches the cap.

**Example at Level 1:** Cap = 5. If player has 0 hearts → 1 heart every 20 min until they reach 5. Once at 5+, renewal pauses. If they spend 2 hearts rolling (now at 3), renewal resumes and generates 1 more heart every 20 min until they're back at 5.

| Player Level | Heart renewal cap | Renewal rate |
|---|---|---|
| 1–3 | 5 hearts | 1 / 20 min |
| 4–6 | 6 hearts | 1 / 20 min |
| 7–10 | 7 hearts | 1 / 18 min |
| 11–15 | 8 hearts | 1 / 18 min |
| 16–20 | 10 hearts | 1 / 15 min |
| 21–30 | 12 hearts | 1 / 15 min |
| 31–40 | 15 hearts | 1 / 12 min |
| 41–50 | 18 hearts | 1 / 12 min |
| 51+ | 20 hearts | 1 / 10 min |

**Offline accumulation cap:** Even if the player is offline for many hours, passive renewal only accumulates up to **6 hours worth** of hearts at their current rate (or the heart cap, whichever is lower). This prevents massive offline heart stockpiling.

**Implementation:** On app open, compute `elapsed_ms` since `last_seen_at`. Cap at 6h. Compute `hearts_earned = floor(elapsed_ms / renewal_interval_ms)`. Add to hearts, but do not exceed the renewal cap (if current hearts < cap). Write `last_seen_at = now()` and persist.

### 4d. Habit → Heart Anti-Abuse Rules

1. **First-completion-wins:** First time a habit is marked complete today (UTC) → heart fires immediately + `heart_award_snapshot_at` recorded.
2. **Undo does not revoke:** Marking a habit incomplete after it was already used to award a heart does NOT reverse the heart award.
3. **Re-complete does not re-award:** Marked incomplete + re-completed = no second award. De-duplicated by `habit_id + utc_day`.
4. **Daily cap enforced server-side:** Validated against Supabase. Client cannot claim beyond cap.
5. **Cap resets at UTC midnight.**

### 4e. Heart → Dice Conversion Rate (scales with island number)

| Island range | 1 heart = N dice rolls |
|---|---|
| 1–20 | 20 dice |
| 21–40 | 22 dice |
| 41–60 | 25 dice |
| 61–80 | 28 dice |
| 81–100 | 32 dice |
| 101–120 | 36 dice |
|
This means players at higher islands get more rolls per heart — rewarding long-term engagement.

---

## 5. Player Level System

The player level is **separate from island number**. It reflects total long-term engagement across all activities — game and real-life habit completion combined.

### 5a. What Player Level Unlocks (Level-Up Rewards)

Each level-up is a moment of celebration. Level-up rewards are assigned per level and visible to the player before they level up ("next level: +1 heart cap, unlock Rare eggs").

| Level reached | Reward |
|---|---|
| 2 | +1 to heart renewal cap (now 6) |
| 3 | Unlock: shop Tier 2 pricing tier |
| 4 | +1 to heart renewal cap (now 7) |
| 5 | Unlock: Rare eggs available at hatchery stop on any island |
| 6 | Renewal rate increases to 1 / 18 min |
| 7 | +1 to heart renewal cap (now 8) |
| 8 | Unlock: daily habit heart cap +1 (now 4/day) |
| 9 | Cosmetic: player level badge unlocked ("Island Wanderer") |
| 10 | +2 to heart renewal cap (now 10); Renewal rate stays 1/18 min |
| 11 | Unlock: shop Tier 3 |
| 12 | Unlock: Mythic eggs available at hatchery stop (special islands only) |
| 13 | Daily habit heart cap +1 (now 5/day) |
| 14 | Cosmetic: player frame upgrade |
| 15 | Renewal rate 1/15 min; +2 heart cap (now 12) |
| 16 | Unlock: island upgrade system (completed islands can be upgraded with coins) |
| 17 | Daily habit heart cap +1 (now 6/day) |
| 18 | Cosmetic: island board theme unlock ("Volcanic") |
| 19 | +3 heart cap (now 15) |
| 20 | Milestone reward: 500 bonus coins + cosmetic badge ("Island Veteran") + renewal rate 1/12 min |
| 25 | +3 heart cap (now 18); daily habit heart cap 7/day |
| 30 | Milestone reward: 1 diamond + renewal rate 1/10 min; +2 heart cap (now 20) |
| 35 | Cosmetic: island board theme unlock ("Arctic") |
| 40 | Milestone reward: 2 diamonds + daily habit heart cap 8/day |
| 50 | Milestone reward: 5 diamonds + cosmetic badge ("Island Master") + max renewal cap |

> After Level 50: every 5 levels grants 1 diamond + cosmetic badge upgrade. Economy values plateau (already maxed by Level 50). Prestige is the main reward.

### 5b. Player Level Visible in HUD

- The player level is shown as a **small circle badge** in the Island Run HUD (always visible, not inside the dev panel).
- Format: `Lv.7` (compact). Tapping it opens the player profile panel.
- The profile panel shows: current level, XP bar (current/needed to next level), next level reward preview, total islands completed, total bosses defeated, total hearts earned lifetime.

### 5c. XP Sources

| Activity | XP awarded |
|---|---|
| Complete any habit (LifeGoal app) | 10 XP (max 50 XP/day from habits) |
| Log a journal entry | 15 XP |
| Complete a Life Wheel update | 20 XP |
| Win a mini-game round (any sub-level) | 25 XP |
| Clear a boss (Stop 5) | 50 XP |
| Complete all 5 stops on an island | 75 XP |
| Full island clear (all stops + boss) before timer expires | +100 XP bonus |
| Egg hatched (Common) | 10 XP |
| Egg hatched (Rare) | 20 XP |
| Egg hatched (Mythic) | 30 XP |
| Daily login (any session) | 5 XP |
| Island 120 first-cycle completion | 500 XP one-time bonus |

### 5d. Level Thresholds (first 30 levels)

XP is **total cumulative** — never resets.

| Level | Total XP needed | XP gap to next level |
|---|---|---|
| 1 | 0 | 300 |
| 2 | 300 | 400 |
| 3 | 700 | 500 |
| 4 | 1,200 | 600 |
| 5 | 1,800 | 750 |
| 6 | 2,550 | 900 |
| 7 | 3,450 | 1,050 |
| 8 | 4,500 | 1,200 |
| 9 | 5,700 | 1,400 |
| 10 | 7,100 | 1,600 |
| 11 | 8,700 | 1,800 |
| 12 | 10,500 | 2,000 |
| 13 | 12,500 | 2,250 |
| 14 | 14,750 | 2,500 |
| 15 | 17,250 | 2,750 |
| 16 | 20,000 | 3,000 |
| 17 | 23,000 | 3,300 |
| 18 | 26,300 | 3,600 |
| 19 | 29,900 | 4,000 |
| 20 | 33,900 | 4,500 |
| 21 | 38,400 | 5,000 |
| 22 | 43,400 | 5,500 |
| 23 | 48,900 | 6,000 |
| 24 | 54,900 | 6,500 |
| 25 | 61,400 | 7,000 |
| 26 | 68,400 | 7,500 |
| 27 | 75,900 | 8,000 |
| 28 | 83,900 | 8,500 |
| 29 | 92,400 | 9,000 |
| 30 | 101,400 | 10,000 |

> After Level 30: each level requires ~10% more XP than the previous. No hard cap.

**Pace calibration:** A player completing 5 habits/day + 1 boss clear/day + 1 mini-game win/day earns roughly:
- 50 XP (habits) + 50 XP (boss) + 25 XP (mini-game) + 5 XP (login) = ~130 XP/day.
- Level 5 requires 1,800 XP total → ~14 days of active play.
- Level 10 requires 7,100 XP total → ~55 days of active play.
This is intentionally slow. Level-ups feel earned.

### 5e. Data Model Requirements

```sql
-- New columns on player profile or a new table:
player_xp         INTEGER DEFAULT 0        -- total cumulative XP ever earned
player_level      INTEGER DEFAULT 1        -- derived from player_xp; cached for performance
xp_ledger         JSONB DEFAULT '[]'::jsonb -- append-only: [{source, amount, awarded_at, meta}]
last_seen_at      TIMESTAMPTZ              -- for passive heart renewal computation (already exists as partial)
```

Migration: `0171_island_run_player_level_xp.sql` — to be created in milestone M19A.

---

## 6. Cycle Loop (After Island 120)

- On island 120 completion: `cycle_index` increments (0 → 1 → 2 …).
- `island_number` resets to 1 and the player begins the loop again.
- **Difficulty does not increase** on cycle 2+.
- **What changes on cycle 2+:**
  - Left-behind eggs from cycle 1 are now collectible (second-pass advantage — already in canonical design).
  - Shop gains a "Cycle Veteran" cosmetic badge.
  - Boss cosmetic variant: "Ancient [BossName]" label.
  - Player level and all currencies carry forward — no reset.
- `cycle_index` is used only as an analytics/unlock counter. It does NOT reset completion states.
- Island completion states (not completed → partial → boss defeated → completed) are **permanent across all cycles**.

---

## 7. Build Slice Priority Queue

All milestones listed. Priority order for MVP.

| Priority | Slice | What | Key files |
|---|---|---|---|
| 0 | **M16 (Collectible Bar)** | Collectible Progress Bar — full shard system + pill HUD. See `docs/13_COLLECTIBLE_PROGRESS_BAR.md` for M16A–M16I slice breakdown | Multiple files — see doc |
| 1 | **M11D** | `completedStops` Supabase persistence (gap from M11C) | `islandRunGameStateStore.ts`, migration |
| 2 | **M16** | Per-tile resolution — fully typed tile payloads wired into `resolveTileLanding()` | `islandBoardTileMap.ts`, `IslandRunBoardPrototype.tsx` |
| 3 | **M17** | 120-island cap + cycle loop — modulo-120, `cycle_index` increment | `islandRunGameStateStore.ts`, `IslandRunBoardPrototype.tsx`, migration |
| 4 | **M18** | Stop 1 objective framework — typed `Stop1ObjectiveType` union, seeded per island, MVP types: set_egg / set_intention / spin_arrival / quick_journal / vision_pick / gratitude_flash | `islandRunStops.ts`, `IslandRunBoardPrototype.tsx` |
| 5 | **M18B** | Stop 3 + Stop 4 objective framework — Utility + Dynamic objective types wired | `islandRunStops.ts`, `IslandRunBoardPrototype.tsx` |
| 6 | **M19A** | Player level + XP system — Supabase columns, `islandRunPlayerLevel.ts`, XP award hooks, Lv. badge in HUD | new `islandRunPlayerLevel.ts`, `IslandRunBoardPrototype.tsx`, migration 0171 |
| 7 | **M19B** | Passive heart renewal — compute on app open, heart cap enforcement, `last_seen_at` | `islandRunRuntimeStateBackend.ts`, `IslandRunBoardPrototype.tsx` |
| 8 | **M19C** | Habit → heart awards + anti-abuse — first-completion-wins, server-side daily cap | `islandRunDailyRewards.ts`, habits API, Supabase |
| 9 | **M19D** | Ticket (island mini-game currency) wired to board tiles — specific tile types award tickets on landing | `islandBoardTileMap.ts`, `resolveTileLanding()`, `IslandRunBoardPrototype.tsx` |
| 10 | **M20A** | Flappy Phoenix boss game component + framework wiring | new `FlappyPhoenix.tsx`, `islandRunMinigameRegistry.ts`, `docs/minigames/BOSS_FLAPPY_PHOENIX_DEVPLAN.md` |
| 11 | **M20B** | Oracle boss game — static riddle pool (60+), habit verification gate, 3-option UI, fallback to ShooterBlitz | new `OracleBoss.tsx`, `islandRunMinigameRegistry.ts`, `docs/minigames/BOSS_ORACLE_DEVPLAN.md` |
| 12 | **M21A** | Flick Bowl mini-game | new `FlickBowl.tsx` |
| 13 | **M21B** | Tap Garden mini-game | new `TapGarden.tsx` |
| 14 | **M21C** | Word Spark mini-game | new `WordSpark.tsx` |
| 15 | **M21D** | Memory Tiles mini-game | new `MemoryTiles.tsx` |
| 16 | **M21E** | Drop Stack mini-game | new `DropStack.tsx` |
| 17 | **M21F** | Color Rush mini-game | new `ColorRush.tsx` |
| 18 | **M22A** | Global mini-game calendar — operator-controlled active game rotation, Supabase config table | new `islandRunMinigameCalendar.ts`, Supabase config table |

---

## 8. Open Questions / Future Design

These are noted but not canonical yet. Do not implement until clarified:

- **Stop 1: mini webtoon panels** — asset-dependent. Design and art required. Add to Stop 1 type pool when art is ready.
- **Vision board in Stop 1** — requires a set of curated images per island theme. Needs a content creation pass.
- **Oracle AI edge function** — which AI provider, cost model, caching strategy. Needs product decision.
- **Micro-transaction heart packs** — Stripe integration, pricing tiers, refund policy. Needs business decision.
- **Island upgrades** (buildings, decorations) — scoped to Level 16+ unlock. Full design TBD.
- **Async multiplayer** (targeting other players' island snapshots) — future layer, not in scope for MVP.
- **Fight Boss island exact list** — 30 islands to be enumerated in `docs/00_MAIN_GAME_120_ISLANDS_INDEX.md` island detail sheet.
- **Oracle island exact list** — ~15 islands to be enumerated in same sheet.