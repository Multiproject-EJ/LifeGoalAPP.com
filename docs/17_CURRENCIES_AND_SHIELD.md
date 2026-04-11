> [!WARNING]
> This document is no longer the primary authoritative gameplay source of truth.
>
> The canonical gameplay contract is now:
> `docs/gameplay/CANONICAL_GAMEPLAY_CONTRACT.md`
>
> This file may still contain useful supporting detail, implementation notes, or historical context, but it must not override the canonical gameplay contract.

# CURRENCIES, SHARDS & SHIELD REWARD — CANONICAL DESIGN

> **Status:** Canonical. Authored 2026-03-03. Updated 2026-03-04.
> **This file wins** if any other doc under `docs/` conflicts on currency definitions, shard rules, or the Shield reward.
> Supersedes Section "Currencies" in `docs/07_MAIN_GAME_PROGRESS.md` for the extended definitions below.

---

## 1. Canonical Currency List (Core App-Wide + 1 Temporary)

### 1a. App-Wide Persistent Currencies

| # | Currency | Icon | Symbol | Notes |
|---|---|---|---|---|
| 1 | **Coins** | 🪙 | `coins` | General currency. Primary tile and stop reward. |
| 2 | **Diamonds** | 💎 | `diamonds` | Premium currency. 1 diamond = 1,000 coins. |
| 3 | **Shards** | (placeholder icon — TBD) | `shards` | Persistent progression currency. Earned via specific actions (see §2). Used for special unlocks/upgrades. |

> Island Run canonical HUD order for core loop resources is: Dice → Coins → Essence (v2) + optional progression chips.
> Shards use a placeholder icon until the final asset is designed.

### 1b. Temporary Island / Mini-Game Currency

| Currency | Notes |
|---|---|
| **Tickets** (island mini-game currency) | Earned on the board and via LifeGoal actions. Spent to enter mini-games. Lost when the player travels to a new island. NOT shown in the main HUD — shown in a secondary counter within the mini-game entry flow. |

---

## 2. Shards — Earn & Spend Rules

### 2a. How Shards are earned

- **NOT collected on the 60-tile board.** Shards are a reward, not a tile pick-up.
- Awarded as a reward from: stops, boss defeats, eggs, shop purchases, special events.
- May be awarded by the Mini-Game reward output (`IslandRunMinigameReward`).
- **The Collectible Progress Bar (doc 13) does NOT track shards.** The progress bar tracks the era-specific sub-currency (Energy Cells, Petals, etc.). Shards are a separate persistent currency.

### 2b. How Shards are spent (TBD — placeholder for future design)

- Future: unlock cosmetics, avatar items, special island events.
- For now: Shards accumulate in the player's wallet. No spend path yet. Placeholder icon in HUD.

---

## 3. Shields — TWO DISTINCT TYPES

> ⚠️ **Critical distinction:** There are **two separate Shield concepts** in this game. They share an icon (🛡️) but are fundamentally different systems. Agents and developers must never conflate them.

---

### 3A. Body Habit Shield (Currency) — Earned from Habits

#### 3A-i. Overview

When a player creates a habit tagged as a **Body habit**, that habit earns **Shield** rewards on completion, in addition to the normal coin reward.

- **Icon:** 🛡️ (Shield)
- **Type:** Persistent wallet currency (like Coins/Diamonds/Hearts/Shards)
- **Displayed:** Next to the coin icon for the individual habit in the Today tab's habit row.
- **Conversion:** 1 Shield = 65 Coins, convertible in the Bank tab.
- **⛔ NOT earned from:** The 17 board tiles, the 5 island stops, mini-games, boss battles, or any Island Run gameplay mechanic.
- **✅ Earned exclusively from:** Completing Body-tagged habits in the Today tab.

#### 3A-ii. Body Habit tag

- In the habit creation wizard (PWA), the player can select the habit type. Add a **"Body"** option.
- Body habits are tagged in the database. Suggested approach: use the existing `domain_key` column on `habits_v2` — set `domain_key = 'body'` for Body habits. (Alternatively add a `habit_environment` flag — this column already exists.)
- When a Body habit is completed (logged), the app awards 1 Shield in addition to the normal coin reward.

#### 3A-iii. Shield in the Today tab

- Each habit row in the Today tab shows: `[emoji] [title]` … `[🪙 +N] [🛡️ +1]`
- The Shield counter only appears on Body habits.
- Tapping the shield icon shows a tooltip/mini-popup: "Body Habit bonus — tap Bank to convert shields to coins."

#### 3A-iv. Shield in the Bank tab

- Bank tab shows the Shield balance.
- "Convert Shields" action: converts all held shields to coins (1 shield = 65 coins). One-tap confirm.

#### 3A-v. Database / type changes required

- Add `shields` field to the player's wallet state (alongside coins, diamonds, hearts, shards).
- Add a `Shield` reward type to `IslandRunMinigameReward` and any other reward output types (for future extensibility only — not wired to board/stop rewards).
- In `HabitV2Row`, `domain_key = 'body'` is the canonical tag. No new column needed.

---

### 3B. Shop Shield (Protective Item) — Purchased from the Shop

#### 3B-i. Overview

A **Shop Shield** is a defensive/protective **item** available for purchase in the persistent Shop (🛍️ HUD button). It is a consumable or equipped item, NOT a wallet currency.

- **Icon:** 🛡️ (Shield) — same visual, but contextually different from the Body Habit Shield currency.
- **Type:** Shop item / purchasable asset. NOT a currency in the wallet.
- **Purpose:** Provides a protective gameplay benefit (e.g., blocking a penalty, protecting island progress, absorbing a boss hit — exact mechanic TBD per shop item design).
- **⛔ NOT earned from:** The 17 board tiles, the 5 island stops, Body habits, or any habit completion flow.
- **✅ Obtained by:** Purchasing from the Shop using Coins, Diamonds, or other currencies.

#### 3B-ii. Shop placement

- Available in the persistent 🛍️ Shop HUD button (always accessible, not a stop).
- Tier placement and pricing: TBD in shop item design — can be Tier 1 or Tier 2 depending on the protective benefit.

#### 3B-iii. Naming convention for developers

To avoid confusion in code, use distinct naming:
- Body Habit Shield currency → `shields` (wallet field, e.g. `walletState.shields`)
- Shop Shield item → `shop_shield` or `ShopItemShield` (item type in shop inventory/purchase system)

---

## 4. Rewards Matrix — What awards what (source of truth)

| Reward Source | Coins | Hearts | Shards | Body Shield (currency) | Shop Shield (item) | Tickets |
|---|---|---|---|---|---|---|
| 17 board tiles | ✅ | — | — | ❌ | ❌ | ✅ (some tiles) |
| 5 island stops | ✅ | — | ✅ | ❌ | ❌ | — |
| Boss defeat | ✅ | ✅ | ✅ | ❌ | ❌ | — |
| Mini-game reward | ✅ | ✅ | ✅ | ❌ | ❌ | — |
| Body habit completion | ✅ | — | — | ✅ | ❌ | — |
| Shop purchase | — | — | — | ❌ | ✅ | — |
| Egg hatch | ✅ | — | ✅ | ❌ | ❌ | — |

> This matrix is the canonical reference. If any code or doc contradicts it, this table wins.

---

## 5. Egg Hatchery — Timer Surprise (No Countdown Shown)

### 5a. Hatch duration

Eggs hatch in **1–3 days** (randomly determined per egg, within the island's active timer window). The exact duration is NOT shown to the player — it is a surprise.

### 5b. Visual stages

The egg progresses through **4 animation stages** from unhatched → fully hatched pet. The stages transition automatically based on internal timer milestones (even if the player isn't looking).

| Stage | Visual | When |
|---|---|---|
| 1 | 🥚 Egg (still) | 0–33% of hatch time |
| 2 | 🥚 Egg (wobbling/cracking) | 33–66% of hatch time |
| 3 | 🐣 Egg cracking open | 66–99% of hatch time |
| 4 | 🐾 Pet revealed | 100% = hatched |

> Asset note: The 4 animation frames / Lottie sequences need to be created by the designer. This doc defines the stage logic; assets are a dependency.

### 5c. No countdown shown

- Do NOT show a timer countdown in the hatchery HUD.
- Instead show the current animation stage and a generic message like "Your egg is incubating… check back soon! 🥚"
- When the egg reaches Stage 4 (hatched), show a "Tap to reveal your pet!" CTA.

---

## 6. HUD Currency Display Order

```
[ 🪙 Coins ] [ 💎 Diamonds ] [ ❤️ Hearts ] [ 🛡️ Shields (Body Habit) ] [ (placeholder) Shards ] [ 🎲 Dice ]
```

- The HUD Shield icon (🛡️) represents the **Body Habit Shield currency** only.
- Shop Shield items are NOT shown in the main HUD — they are managed within the Shop/inventory flow.
- On narrow screens: Coins + Diamonds + Hearts are always shown; Shields and Shards collapse into an overflow "+more" indicator that expands on tap.
