> [!WARNING]
> This document is no longer the primary authoritative gameplay source of truth.
>
> The canonical gameplay contract is now:
> `docs/gameplay/CANONICAL_GAMEPLAY_CONTRACT.md`
>
> This file may still contain useful supporting detail, implementation notes, or historical context, but it must not override the canonical gameplay contract.

# COLLECTIBLE PROGRESS BAR & SHARD ECONOMY — CANONICAL DESIGN

> **Status:** Canonical. Updated 2026-03-03.
> **This file wins** if any other doc under `docs/` conflicts on the topics covered here.
> Supersedes any earlier stub references to the progress bar or shard system.

---

## 1. Overview

The Collectible Progress Bar is a persistent HUD element that gives the player a **grind loop on every island**. It works like a milestone stamp-card: the player collects a themed sub-currency (**shards**) by playing the board and completing actions, and spends those shards to unlock a cascade of rewards, gate premium eggs in the hatchery, buy items for their Home Island pets, and access special tiers in the Player Shop.

Shards are **global and persistent** — they never reset on island travel. They are a lifetime-accumulating resource. This makes them a meaningful long-term progression currency that rewards consistent players.

---

## 2. Shard Sub-Currency

### 2a. One collectible type per mini-game era

The shard icon and name changes based on which mini-game era the current island belongs to (see `docs/12_MINIGAME_BOSS_ECONOMY_PLAYER_LEVEL_DESIGN.md` Section 1b for the era schedule). The type of shard earned on a given island reflects the current era.

| Mini-game era | Islands | Shard name | Icon |
|---|---|---|---|
| Shooter Blitz | 1–17 | Energy Cell | ⚡ |
| Flick Bowl | 18–34 | Bowl Token | 🎳 |
| Tap Garden | 35–51 | Petal | 🌸 |
| Word Spark | 52–68 | Spark Shard | 💡 |
| Memory Tiles | 69–85 | Memory Gem | 🔷 |
| Balance Run | 86–102 | Flux Orb | 🌀 |
| Color Rush | 103–120 | Prism Shard | 🌈 |

**Special / rare islands** use a unique collectible regardless of era:

| Island type | Shard name | Icon |
|---|---|---|
| Special island (one of the 20) | Star Fragment | 🌟 |

> Special islands are: 5, 12, 18, 24, 30, 36, 42, 48, 54, 60, 66, 72, 78, 84, 90, 96, 102, 108, 114, 120.
> On a special island, **Star Fragments** replace the era shard for the entire island session.

For simplicity in the data model, all shard types are stored as a single integer field `island_shards` (global, never zeroed). The era type is derived at display time from the current island number. The Player Shop and egg gating reference the same `island_shards` pool.

### 2b. How shards are earned

Shards are earned from multiple sources, scaled by island progress (higher islands = more shards per source):

| Source | Amount | Notes |
|---|---|---|
| `egg_shard` tile landing | 1–3 shards | Randomised, seeded by island + tile + roll count. Pop-up "+2 ⚡" animation on landing. |
| Stop completion (Stops 2–4) | 1–2 shards | Bonus for completing a utility, dynamic, or mini-game stop. Not Stop 1 or Boss. |
| Boss win (Stop 5) | 3–8 shards | Scales with island tier (see Section 5 below). Special island boss = 2× multiplier. |
| Daily habit completion (LifeGoal app) | 1 shard per habit | Up to 3 shards/day via this route. Encourages habit loop engagement. |
| Encounter tile win | 1–2 shards | Bonus reward on top of regular encounter reward. |

> **Anti-abuse:** shard awards from habit completion are capped at 3/day (UTC). The cap is enforced server-side in Supabase via the existing habit completion log.

### 2c. Shard persistence

- `island_shards` is a **global lifetime integer** — it only ever goes up (spending deducts).
- It is stored in `island_run_runtime_state` in Supabase.
- It is **never zeroed** on island travel.
- `shard_tier_index` tracks which reward tier the player is currently on in the milestone chain (see Section 3).
- `shard_claim_count` is a **lifetime count** of how many rewards have been claimed from the bar (used for analytics and unlock tracking — e.g. unlocking a new pet slot after 10 lifetime claims).

---

## 3. Collectible Progress Bar (Milestone Chain)

### 3a. The chain model

The bar is always visible at the top of the board HUD and on the Home Island overlay.

1. The bar shows progress toward the **current active tier threshold**.
2. The player earns shards from board play, stops, boss wins, habits, and encounters.
3. When a threshold is hit, a **Claim** button appears. The reward is **not auto-awarded** — the player taps to claim (blind-box reveal).
4. After claiming, `shard_tier_index` increments. The bar threshold advances to the next tier.
5. The chain repeats indefinitely. Higher tiers have larger thresholds and better rewards.
6. **Shards do not reset** — already-earned shards carry forward. The bar always shows progress from the current tier's baseline.

### 3b. Tier thresholds and reward sizes

| Tier | Cumulative shards | Reward size | Typical reward examples |
|---|---|---|---|
| T1 | 20 | Tiny | 10–30 coins, or 1 dice |
| T2 | 60 | Small | 50–100 coins, or 2–3 dice, or 1 mini-game ticket |
| T3 | 120 | Small-Medium | 150–300 coins, or 1 heart, or 3–5 dice |
| T4 | 220 | Medium | 1 diamond, or 2 hearts, or 5–10 dice, or 2 mini-game tickets |
| T5 | 350 | Medium-Large | 2–3 diamonds, or 3 hearts, or 10–15 dice, or 3–5 mini-game tickets |
| T6 | 500 | Large | 5 diamonds, or 5 hearts, or 20 dice, or 8–10 mini-game tickets |
| T7+ | +150 per tier above T6 | Very Large (repeating) | Scales: +1 diamond / +1 heart / +5 dice per extra tier |

> **Monetisation note:** T1–T3 are reachable in normal casual play (2–4 board loops). T4 requires focused play (~6–8 loops). T5–T6 require more loops than the average island timer + starting dice pool allows. Players who want T5+ rewards within one island session will need to purchase hearts/dice to keep rolling. The rewards at T5+ are priced to be worth the spend.

### 3c. Reward contents — dynamic, progress-synced, addictive design

Within each tier's reward size, the **specific reward** is chosen dynamically at claim time. The reward pool is NOT static — it is weighted by the player's current game state to maximise engagement:

**Reward selection algorithm (priority order):**

1. **Deficit detection (highest priority):** If the player is low on a critical resource (hearts < 3, dice < 5, coins < 200), weight that resource's reward pool ×3. This makes the game feel generous and responsive.

2. **Upcoming boss boost:** If the player is within 2 stops of the boss (tile index ≥ 14 or stepsCompleted ≥ 3), increase probability of heart rewards. Players feel the game is "helping" them reach the boss.

3. **Streak reward:** If the player has claimed 3+ consecutive tiers in the same island session, add a small bonus (e.g. +1 extra dice on top of any reward). Rewards streaky sessions.

4. **Era bonus:** Once per era (every 17 islands), T4+ rewards may include an era-exclusive cosmetic or pet item (see Section 4). This is a rare event (≈15% chance at T4, ≈35% at T5, ≈55% at T6).

5. **Baseline pool:** If no special condition applies, draw from the standard tier pool with uniform weighting.

**Reward reveal UX:**
- Player sees tier icon + size label ("🎁 Medium reward") before claiming.
- On tap: animated box-open → contents revealed one by one with pop-up currency animations.
- If reward includes a pet item or cosmetic: special "rare find" animation with distinct sound.

---

## 4. Shard Spending — The Player Shop & Hatchery

Shards are the primary non-premium currency for gating *special* items. They are spent (deducted from `island_shards`) at point of purchase.

### 4a. Hatchery — Egg Gating by Shard Cost

Normal (Common) eggs are always free to set. Rare and Mythic eggs require shard spending:

| Egg tier | Shard cost | Notes |
|---|---|---|
| Common | 0 shards | Always free. Available from the start. |
| Rare | 150 shards | Unlocked at any island. Requires accumulated shard balance ≥ 150. |
| Mythic | 500 shards | High-cost premium egg. Requires accumulated balance ≥ 500. Rare reward. |

> **Special island bonus:** On a special island, Rare egg cost is reduced by 50% (75 shards) and Mythic by 25% (375 shards) — a limited-time incentive to play special islands hard.

Setting a Rare or Mythic egg deducts the shard cost immediately from `island_shards`. If the player does not have enough shards, the "Set egg" button shows the cost and is disabled with a "Need X more shards" message.

### 4b. Player Shop — Shard-Gated Items

The Player Shop (accessible via the persistent 🛍️ HUD button, always available; with a separate 🐾 Pets tab once the first pet is unlocked) has a shard-spend section alongside the coin/diamond section.

**Shard items in the Player Shop:**

| Category | Item | Shard cost | Notes |
|---|---|---|---|
| Pet food | Basic treat (all pets) | 20 shards | Boosts pet happiness +1. |
| Pet food | Premium treat | 60 shards | Boosts pet happiness +2 + small XP grant. |
| Pet accessory | Ribbon / Hat / Cape | 80–150 shards | Cosmetic only. Equippable in the Pet panel. |
| Pet upgrade | Pet level boost | 200 shards | Grants +1 pet level (see Section 5). |
| Board cosmetic | Token skin (era-themed) | 250 shards | Replaces the board token sprite for the current era. |
| Board cosmetic | Board border skin | 400 shards | Decorative ring around the 17-tile board. |
| Boost | Extra dice roll (×5) | 30 shards | 5 bonus dice added to pool immediately. |
| Boost | Heart top-up (×3) | 50 shards | 3 hearts added immediately. |

> Shard-spend items in the shop do **not** require boss completion to unlock (unlike the coin/diamond tiers). They are always accessible once the player has enough shards.

### 4c. Shop layout (canonical)

The Player Shop has three tabs:
1. **Coins tab** — items priced in coins (always available)
2. **Premium tab** — items priced in diamonds; Tier 2+ unlocked after boss defeat
3. **Shards tab** — items priced in shards; always visible; shows current shard balance at top

The shop is always accessible via the persistent 🛍️ HUD button. It is **not** one of the 5 island stops.

**The "Extra Stop" after boss defeat:**
After the boss (Stop 5) is defeated, a special **post-boss bonus stop** becomes temporarily available — this is shown as a glowing ✨ button in the HUD (not on the board ring). It is a one-time bonus per island: the player can claim a post-boss reward (coins, dice, hearts) and the shop's Premium tab unlocks for that island. This is not a "sixth stop" in the data model — it is a flag `bossBonusClaimable: boolean` and is consumed once per island.

---

## 5. Companion / Cosmetic Follow-ups (Deferred)

Home Island pet mechanics are **not part of the current canonical Island Run loop**. If companions or cosmetic followers are revisited later, they should be specified as a separate follow-up system and must not change the core collectible bar rules in this document.

For the current production path, shard progression remains focused on:
- collectible milestone claims
- island-run reward pacing
- shop shard pricing

No Home Island pet slots, feeding loop, or shard-powered pet upkeep should be assumed from this spec.

---

## 6. Shard Scaling by Island Progress

To keep shards meaningful throughout all 120 islands, the earn rate scales with island number:

| Island range | Shard multiplier | Notes |
|---|---|---|
| 1–20 | ×1.0 | Baseline |
| 21–40 | ×1.2 | Slight boost |
| 41–60 | ×1.5 | Mid-game boost |
| 61–80 | ×1.8 | Late-game |
| 81–100 | ×2.0 | Pre-endgame |
| 101–120 | ×2.5 | Endgame — shards flow freely |

The multiplier applies to all shard sources (tile, stop, boss, habit). It is floored to 1 minimum. The multiplier does **not** affect the shard cost of eggs or shop items — those are fixed. This means later-game players accumulate shards faster and can buy premium items more freely, which is intentional (late-game reward loop).

---

## 7. Data Model Fields

| Field | Type | Persisted in | Notes |
|---|---|---|---|
| `island_shards` | `number` (integer) | `island_run_runtime_state` (Supabase + localStorage) | Global lifetime shard balance. Never zeroed. |
| `shard_tier_index` | `number` (integer) | `island_run_runtime_state` | Current active tier in the milestone chain. Increments on each claim. Lifetime. |
| `shard_claim_count` | `number` (integer) | `island_run_runtime_state` | Lifetime count of milestone claims. Used for pet slot unlock gates. |

These three fields are added in **M16A** (migration `0171_island_run_shard_fields.sql`).

---

## 8. Build Slices (M16A → M16I)

| Slice | What gets built |
|---|---|
| M16A | Data model: `island_shards`, `shard_tier_index`, `shard_claim_count` fields in Supabase + all type interfaces. `performIslandTravel()` does NOT zero shards. |
| M16B | Shard earn on `egg_shard` tile landing: pop-up animation, shard increment, persist. |
| M16C | Shard earn from stop completion (Stops 2–4) and boss win (Stop 5). |
| M16D | Collectible Progress Bar pill HUD component: tier progress bar, current tier label, shard count display. Always visible at top of board. |
| M16E | Claim button + blind-box reward reveal: dynamic reward pool logic (deficit detection, boss proximity, streak, era bonus). |
| M16F | Egg hatchery shard gating: Rare egg = 150 shards, Mythic = 500 shards. Cost display + disabled state when insufficient shards. |
| M16G | Player Shop Shards tab: shard balance display, boost items (dice, hearts), pet food. |
| M16H | Home Island Pets panel: pet slot display, feed action (shard spend), happiness decay + star display, pet level. |
| M16I | Pet slot unlock gates via `shard_claim_count`; Slot 2 at ≥10 claims, Slot 3 at ≥30 claims. Post-boss bonus stop flag (`bossBonusClaimable`). 
