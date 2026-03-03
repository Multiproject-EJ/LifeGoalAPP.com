# COLLECTIBLE PROGRESS BAR — CANONICAL DESIGN

> **Status:** Canonical. Authored 2026-03-03.
> **This file wins** if any other doc under `docs/` conflicts on the topics covered here.
> Supersedes any earlier stub references to the progress bar.

---

## 1. Overview

The Collectible Progress Bar is a persistent HUD element that gives the player a **grind loop on every island**. It works like a milestone stamp-card: the player collects a themed sub-currency (shards) by landing on `egg_shard` tiles while rolling the 17-tile board, and spends those shards to unlock a cascade of rewards. Because the reward thresholds grow progressively harder (and the best rewards require more loops than casual play can reach), the bar is also the **primary monetisation lever** — players who run out of dice/hearts can use micro-transactions to keep grinding toward the higher-reward tiers.

---

## 2. Collectible Sub-Currency

### 2a. One collectible type per mini-game era

The sub-currency icon and name changes based on which mini-game era the current island belongs to (see `docs/12_MINIGAME_BOSS_ECONOMY_PLAYER_LEVEL_DESIGN.md` Section 1b for the era schedule).

| Mini-game era | Islands | Collectible name | Icon |
|---|---|---|---|
| Shooter Blitz | 1–17 | Energy Cell | ⚡ |
| Flick Bowl | 18–34 | Bowl Token | 🎳 |
| Tap Garden | 35–51 | Petal | 🌸 |
| Word Spark | 52–68 | Spark Shard | 💡 |
| Memory Tiles | 69–85 | Memory Gem | 🔷 |
| Balance Run | 86–102 | Flux Orb | 🌀 |
| Color Rush | 103–120 | Prism Shard | 🌈 |

**Special / rare islands** use a unique collectible regardless of era:

| Island type | Collectible name | Icon |
|---|---|---|
| Special island (one of the 20) | Star Fragment | 🌟 |

> Special islands are: 5, 12, 18, 24, 30, 36, 42, 48, 54, 60, 66, 72, 78, 84, 90, 96, 102, 108, 114, 120.
> On a special island, **Star Fragments** replace the era collectible for the entire island session.

### 2b. How shards are earned

- Landing on an `egg_shard` tile awards **1–3 shards** (randomised, seeded by island number + tile index + roll count).
- The shard award is shown as a pop-up "+2 ⚡" animation above the tile on landing.
- Shards are **temporary** — they are zeroed on island travel (same rule as `island_mini_game_currency` in the canonical data model).
- Shards do **not** carry over to the next island, even as dormant. They are truly island-scoped.

---

## 3. Reward Tiers (Repeating Milestone Chain)

### 3a. The chain model

The bar uses a **repeating escalating milestone chain**:

1. The bar starts at 0 at the beginning of each island.
2. The player grinds to hit tier thresholds in sequence: T1 → T2 → T3 → T4 → T5 → T6 → (repeat from T4+).
3. When a threshold is hit, a **claim button** appears. The reward is **not auto-awarded** — the player must tap to claim.
4. After claiming, the bar resets to 0 and the **next tier becomes active** (harder threshold, better reward).
5. This chain repeats indefinitely within the island session — there is no hard cap on how many times a player can claim, but the thresholds grow progressively so the later tiers are out of reach for casual play without spending.

### 3b. Tier thresholds and reward sizes

| Tier | Shards required | Reward size | Typical reward examples |
|---|---|---|---|
| T1 | 20 | Tiny | 10–30 coins, or 1 dice |
| T2 | 60 | Small | 50–100 coins, or 2–3 dice, or 1 mini-game ticket |
| T3 | 120 | Small-Medium | 150–300 coins, or 1 heart, or 3–5 dice |
| T4 | 220 | Medium | 1 diamond, or 2 hearts, or 5–10 dice, or 2 mini-game tickets |
| T5 | 350 | Medium-Large | 2–3 diamonds, or 3 hearts, or 10–15 dice, or 3–5 mini-game tickets |
| T6 | 500 | Large | 5 diamonds, or 5 hearts, or 20 dice, or 8–10 mini-game tickets |
| T7+ | +150 per tier above T6 | Very Large (repeating) | Scales with tier: +1 diamond / +1 heart / +5 dice per extra tier |

> **Monetisation note:** T1–T3 are reachable in normal casual play (2–4 loops of the board). T4 requires focused play (~6–8 loops). T5–T6 require more loops than the average island timer + starting dice pool allows — this is intentional. Players who want T5+ rewards within one island session will need to purchase hearts/dice via micro-transaction to keep rolling. The rewards at T5+ are priced to be worth the spend.

### 3c. Reward contents are randomised (blind-box style)

Within each tier's reward size, the **specific reward** is chosen blind-box style at claim time:

- The player sees the tier icon + approximate size (e.g. "Medium reward 🎁") but not the exact contents until they tap Claim.
- Reward pools per tier are seeded by `island_number + tier_index + claim_count` so outcomes are deterministic (reproducible for support) but feel random to the player.
- App-wide currencies (coins, diamonds, hearts) and island-scoped currencies (dice, mini-game tickets) can both appear in reward pools.

---

## 4. UI Specification

### 4a. Progress bar component — visual design

The bar is a **pill/capsule shaped component** inspired by Monopoly GO's island progress bar.

Layout (left to right inside the pill):
```
[ collectible icon ]  [ ████░░░░░░  X / threshold ]  [ reward tier icon 🎁 ]
```

- **Left:** collectible icon (emoji or SVG — matches current era/island type)
- **Center:** fill bar + fraction label (`X / threshold`, e.g. `"245 / 350"`)
- **Right:** reward tier icon indicating the current active tier (small/medium/large gift icon, or the era icon for the upcoming reward type)
- **Below the pill:** island countdown timer (e.g. `"22h 4m"`) — same timer as the existing HUD timer but repositioned to sit directly under the progress bar pill when the board is visible

### 4b. Where the bar appears

1. **Home Island overlay (existing position):** The bar is already stubbed in the UI. This PR adds the dynamic data (live shard count, threshold, tier, timer) to it.
2. **Board view (new position):** When the player is actively on the island board, the progress bar pill is **always visible at the top of the board screen** (Option A — above the 17-tile ring, below the main HUD chips). It does not disappear during stop modals — it remains visible but non-interactive while a modal is open.

### 4c. Claim interaction

- When `shards >= threshold`, the pill **pulses** (CSS animation) and the right-side icon changes to a glowing "CLAIM" state.
- Tapping the pill (or a dedicated Claim button) triggers the reward reveal modal (blind-box animation → reward contents shown).
- After claiming, the bar animates back to 0 and shows the next tier's threshold.

---

## 5. Data Model additions required

The following fields must be added to the Supabase `island_run_runtime_state` table (migration to be created in **M16A**):

| Field | Type | Description |
|---|---|---|
| `island_shards` | `integer` | Current shard count for the active island (zeroed on travel) |
| `shard_tier_index` | `integer` | Which tier is currently active (0 = T1, 1 = T2, etc.) |
| `shard_claim_count` | `integer` | How many times the player has claimed a reward on this island (used for reward seeding) |

These fields are zeroed in `performIslandTravel()` alongside `island_mini_game_currency`.

The `IslandRunRuntimeState` interface, `IslandRunGameStateRecord`, and `persistIslandRunRuntimeStatePatch` patch type must all be extended with these three fields.

---

## 6. Build Slices

| Slice ID | What | Key files |
|---|---|---|
| **M16A** | Data model — add `island_shards`, `shard_tier_index`, `shard_claim_count` to Supabase + state types | `islandRunGameStateStore.ts`, `islandRunRuntimeState.ts`, `islandRunRuntimeStateBackend.ts`, migration `0171_island_run_shard_fields.sql` |
| **M16B** | Tile landing — award 1–3 shards on `egg_shard` tile landing; persist shard delta; show "+N ⚡" pop-up animation | `IslandRunBoardPrototype.tsx`, `islandBoardTileMap.ts` |
| **M16C** | Progress bar component — `IslandShardProgressBar.tsx` pill component with fill, fraction, era icon, tier icon, claim pulse | new `IslandShardProgressBar.tsx`, `LevelWorlds.css` |
| **M16D** | Board integration — mount `IslandShardProgressBar` at top of board view (always visible, Option A position) | `IslandRunBoardPrototype.tsx` |
| **M16E** | Home Island integration — wire live shard/tier data into existing Home Island progress bar stub | `IslandRunBoardPrototype.tsx` |
| **M16F** | Claim flow — reward tier resolution, blind-box reveal modal, bar reset + tier increment, persist | `IslandRunBoardPrototype.tsx`, new `islandShardRewards.ts` |
| **M16G** | Timer relocation — move island countdown to sit directly below the progress bar pill in board view | `IslandRunBoardPrototype.tsx`, `LevelWorlds.css` |
| **M16H** | Audio/haptics — shard earn pop sound, tier threshold reached chime, claim haptic | `islandRunAudio.ts`, `IslandRunBoardPrototype.tsx` |
| **M16I** | QA + telemetry — telemetry events for shard_earn, tier_reached, reward_claimed; QA checklist section | `IslandRunBoardPrototype.tsx`, `docs/11_ISLAND_RUN_PROGRESSION_MARKER_QA_CHECKLIST.md` |

---

## 7. Open Design Questions (to resolve before M16F)

These questions are noted but do not block M16A–M16E:

1. **Reward pool tables** — exact coin/diamond/heart/dice/ticket amounts per tier need to be specified in a reward config file (not hardcoded). To be designed in M16F devplan.
2. **Special island multiplier** — do Star Fragment shards award the same 1–3 per tile, or is the rate higher on special islands? (Suggested: 2–5 on special islands.)
3. **Cycle 2+ behaviour** — on revisit cycles, does the shard bar carry any bonus (e.g. +20% shard rate for islands where you previously completed T6)? Not designed yet.
4. **Fight Boss islands** — on fight-boss islands, should the T6 reward always include a guaranteed heart (since boss fights cost hearts)? To be decided.
