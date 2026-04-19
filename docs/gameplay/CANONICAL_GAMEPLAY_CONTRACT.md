# CANONICAL GAMEPLAY CONTRACT — Island Run

Version: 2.0  
Status: Active  
Last Updated: 2026-04-18  
Owner: Gameplay System

This document defines the only authoritative gameplay rules for Island Run.
If implementation, planning notes, or legacy docs conflict with this contract, this contract prevails.

---

## 1) Core loop (player perspective)

1. Enter an island.
2. Complete the currently active stop objective.
3. Spend dice to move on the board and land on tiles.
4. Prioritize feeding tiles to build reward bar progress.
5. Claim reward bar payouts (tokens, occasional dice, stickers).
6. Use Essence earned from board play to upgrade island stops/buildings.
7. Repeat until all 5 stops are completed in order.
8. Defeat Boss (Stop 5) to complete the island and unlock the next island.

---

## 2) System layers

### A. Movement loop
- Player movement is tile-based and consumes **dice**.
- Each roll costs `1 × N` dice, where `N` is the player's currently selected **dice multiplier** (default `×1` = flat 1 die). See §2E.
- Each roll uses **2 standard dice** (each rolls 1–6), producing a total movement of **2–12 tiles** per roll — the multiplier affects cost and reward amplification only, never the movement distance.
- Board tile count and board presentation are configurable and may change over time.
- Stops are external structures and are not part of tile movement.
- **Spin-based movement is fully retired.**

### B. Reward loop
- Feeding tiles are the central reward-driver in board play.
- Feeding tile interactions fill a reward bar.
- Reward bar outputs are the primary short-loop reinforcement channel.

### C. Progression loop
- Each island has exactly 5 sequential stops.
- Only one stop is active at a time.
- Completing the active stop unlocks the next stop.

### D. Meta loop
- Players progress island-to-island by completing all 5 stops.
- Sticker collectibles persist across islands/loops as long-term progression.
- Timed event state persists independently of island transitions.

### E. Dice multiplier (opt-in amplifier)
- The roll cost is `1 × N` where `N ∈ { 1, 2, 3, 5, 10, 20, 50, 100, 200 }`.
- Each tier unlocks at a minimum dice stash so players can't burn out early. Canonical tiers (source of truth: `MULTIPLIER_TIERS` in `islandRunContractV2RewardBar.ts`):

| Multiplier | Unlocks at (dice pool) | Dice cost per roll |
|---|---|---|
| ×1 | 0 | 1 |
| ×2 | 20 | 2 |
| ×3 | 50 | 3 |
| ×5 | 100 | 5 |
| ×10 | 200 | 10 |
| ×20 | 500 | 20 |
| ×50 | 1 000 | 50 |
| ×100 | 2 000 | 100 |
| ×200 | 5 000 | 200 |

- The multiplier scales positive essence tile rewards **and** reward-bar progress from tile landings. Hazard deductions are also scaled by the multiplier (high multiplier = high risk too).
- The multiplier auto-downgrades if the player's pool drops below the current tier's unlock threshold, so the dice button can never become un-rollable silently. See `clampMultiplierToPool`.
- The multiplier is player-controlled (via the footer ×N button); default `×1` for every new session.

## Board Topology Model

- Board topology is profile/config-driven.
- Board tile count is not fixed and must always be derived from the active board topology profile.
- The current production default profile is `spark40_ring` (40 tiles).
- Future profiles are supported.
- Board topology must be treated as variable and extensible across profiles.

### Strict board-topology rules (critical)
- Gameplay logic must not depend on fixed tile counts (for example `17`).
- Movement, wrap behavior, and tile-selection logic must always use profile-derived tile count.
- Hardcoded tile-count assumptions are forbidden.

### Stop decoupling rules (a.k.a. Landmarks)
- Stops — the 5 side-quest structures on each island — are increasingly referred to in UI and new code as **Landmarks**. The terms are equivalent in this contract; internal code symbols (`stopId`, `stopTicketsPaidByIsland`, `IslandStopPlanEntry`, etc.) still use "stop" pending a future rename PR.
- Landmarks are external gameplay structures, not tile positions.
- Landmark progression must not depend on landing on specific tile indices.
- The player token **never** lands on a landmark. Landmarks are accessed only by tapping the landmark button on the orbit HUD.
- Board profiles no longer expose per-stop tile indices. Landmarks are **fully decoupled from ring tile indices** — the 5 HUD buttons are positioned in screen space by the UI layer (`OUTER_STOP_ANCHORS` in `islandBoardLayout.ts`). Every one of the ring tiles is a pure movement tile picked by the normal tile-map generator; no index is reserved for a landmark.

### Board topology compatibility note
- Current production board uses a 40-tile topology profile.
- Additional board profiles may exist for experimentation, but production gameplay is standardized on the 40-tile profile.

---

## 3) Currency system

### Dice
- Dice is the **only board energy**.
- Dice is required for movement and core board interactions.
- Each roll costs `1 × N` dice where `N` is the player's selected multiplier (default `×1`). See §2E.
- **Tiles never award dice directly.** Dice are only sourced from: reward bar payouts, boss/stop/island completion, daily treats, lucky spin, shop purchases, and passive regeneration.
- **The dice pool is never implicitly reset.** Hoarded dice carry over across rolls, island travel, and cycle wraps. The only ways the pool shrinks are: being spent on rolls, and losses explicitly awarded by a game event (none exist today). If a future event resets the pool it must persist the reset in the same patch as it updates the React state — see the historical `performIslandTravel` desync, fixed 2026-04-19.

### Essence
- Essence is a **board-loop currency**.
- Essence is earned primarily through board gameplay and reward-loop outputs.
- Essence is spent on stop/building upgrades tied to island progression.
- Tiles may award essence directly as a landing reward.

### Egg Shards
- Egg shards are the **sanctuary currency**.
- Shards are earned from: reward bar payouts, stop completion, boss wins, and egg sell choices.
- **Tiles do NOT award shards.** Shards are removed from tile rewards.
- Shards are spent on creature treats and creature upgrades in the Animal Sanctuary shard shop.

### Collectibles (Stickers)
- Stickers are collectible progression assets, not movement energy.
- Stickers are earned through reward systems and island progression.
- Sticker collections persist long-term across loops.

### Hearts (RETIRED)
- Hearts are **fully removed** from the game.
- No heart-based conversion, heart-gated boss retries, or heart economy exists.
- The `hearts` column on `island_run_runtime_state` was dropped in migration `0227_retire_hearts_coins_island_run.sql`. Client code keeps a tolerant read-fallback for one release so older rows hydrate cleanly.
- All references to hearts in code and docs are legacy and must not be re-introduced.

### Coins (RETIRED)
- Coins are **fully removed** from the island game.
- No coin economy exists. Use essence and shards instead.
- The `coins` column on `island_run_runtime_state` was dropped in migration `0227_retire_hearts_coins_island_run.sql` (paired with `hearts`).
- All references to coins in code and docs are legacy and must not be re-introduced.

---

## 3A) Dice reward sources

Dice may be awarded from the following sources:
- Boss completion
- Stop completion
- Egg hatching completion
- Reward bar payouts
- Timed minigame/event milestones
- Microgames and larger minigames
- Island completion
- New island start
- Sticker/collection milestones, where configured
- Daily treat calendar
- Lucky spin
- Shop/market purchases

**Tiles do NOT award dice directly.** Tile rewards are limited to essence, island-native currency, reward bar progress, and lucky spin triggers.

Dice reward sources should follow this qualitative pattern:
- Boss completion = major dice payout
- Island completion / larger milestones = meaningful payout
- Stop completion / egg hatching = smaller reinforcement payout
- Reward bar / minigames = variable and tunable payout

## 3B) Player level progression and dice regeneration

- Player level is a long-term progression system tied to XP points.
- XP is earned from habits, goals, journal, check-ins, vision boards, meditation, streaks, challenges, etc.
- Player level determines dice regeneration capacity via a **minimum-roll passive regeneration system** (Monopoly GO style).
- XP requirements are **conservative** (formula: 150 × (level-1) × level), meaning levels are meaningful achievements.

### Dice regeneration rules (canonical)
- The regeneration system operates as a **minimum-roll floor**: if the player has fewer dice than their level's minimum threshold, dice regenerate passively over time.
- If the player already has dice at or above the minimum threshold, **no regeneration occurs**.
- Full regeneration from 0 to the minimum takes exactly **2 hours**.
- Each roll costs `1 × N` dice, where `N` is the currently selected **dice multiplier** (default `×1`). See §2E for the full ladder and unlock gates. The dice-regen system is unaffected by `N` — regen targets the level's floor on a per-hour basis regardless of spend velocity.
- There is **no hard cap** on dice regen — the formula works for any player level.

### Dice regeneration formula (continuous, no cap)

The minimum dice threshold uses a continuous logarithmic formula:
```
minDice = 30 + floor(20 × ln(level))
```

| Player Level | Min Dice Threshold | Effective Rolls (2h) | Regen Rate |
|---|---|---|---|
| 1 | 30 | ~15 rolls | 1 roll / ~8 min |
| 5 | 62 | ~31 rolls | 1 roll / ~3.9 min |
| 10 | 76 | ~38 rolls | 1 roll / ~3.2 min |
| 20 | 90 | ~45 rolls | 1 roll / ~2.7 min |
| 50 | 108 | ~54 rolls | 1 roll / ~2.2 min |
| 100 | 122 | ~61 rolls | 1 roll / ~2.0 min |
| 500 | 154 | ~77 rolls | 1 roll / ~1.6 min |
| 1000 | 168 | ~84 rolls | 1 roll / ~1.4 min |

### Additional player-level scaling
- Player level may also increase:
  - visible Essence income scale
  - visible stop/build upgrade costs
- Essence income and stop/build costs may scale upward together so the relative board-loop pressure remains familiar while the player experiences larger numbers and stronger progression fantasy.
- Dice progression should scale slowly and remain meaningfully constrained to preserve scarcity and monetization tension.

## 4) Stop system

Each island contains exactly 5 stops, in this fixed sequence:

1. **Hatchery** (always Stop 1 — the egg stop)
2. **Habit** (complete a habit/action)
3. **Mystery** (rotating content: breathing, guided meditation, check-in, etc.)
4. **Wisdom** (story, questionnaire, learning content)
5. **Boss** (always the final gate)

Stop rules:
- Stops are external structures, never board tiles.
- Stops are sequential; parallel stop completion is not allowed.
- A stop is considered complete only when its defined objective is fulfilled.
- Boss is always the final gate for island completion.
- The Mystery stop's **content** rotates per island (currently: breathing exercise, action challenge, or check-in reflection). The stop ID is always 'mystery'.
- All stops are designed to be completed **in-game** — the player should never need to leave the game to complete a stop (e.g., breathing is done via an in-game mini exercise).

### Stop unlock rules
- When an island starts, only Stop 1 (Hatchery) is **open**. All other stops are **closed**.
- Each subsequent stop (2, 3, 4, 5) is **gated by two conditions** that must BOTH be satisfied before the stop can be opened:
  1. The previous stop's objective is complete (for the Hatchery this means the egg is **set to hatch** — not collected/sold/hatched — so "halfway completion" is sufficient to unlock the next stop).
  2. The player pays an essence **ticket** (opening fee) for that stop.
- Ticket costs are paid from the essence wallet and scale with `effectiveIslandNumber` using the same multiplier as build costs. The base curve steepens toward the boss so the final gate carries real weight:
  - Stop 2 (Habit): **30 essence** base
  - Stop 3 (Mystery): **70 essence** base
  - Stop 4 (Wisdom): **130 essence** base
  - Stop 5 (Boss): **220 essence** base
- Tickets are **per-island**: a paid ticket unlocks that stop for the current island only. Travelling to a new island requires paying the ticket again.
- The Hatchery (Stop 1) **never** has a ticket cost — it is always free on a new island.
- The ticket rule prevents "rush-through" completion: the player must earn essence on the 40-tile board before each new stop can be opened.

### Hatchery (Stop 1) — egg lifecycle and checkmark rules
- The Hatchery is **always Stop 1** on every island.
- The egg goes through 4 states, each shown progressively in the 4 stop-progress circles.
- When the egg is **set to hatch**, Stop 2 unlocks and the Hatchery shows a **yellow checkmark** on the board (indicating "halfway complete").
- The Hatchery checkmark turns **green** when the animal is **collected or sold**.
- The egg states continue to update in the 4 circles as each new state is reached.

---

## 4A) Stop completion and stop unlock definition

**Stop unlock (sequential progression):**
- A stop advances to the next stop in sequence when the stop's **objective** is complete.
- Build completion is **NOT** required to unlock the next stop.
- Only the active stop's objective can be completed (stops are strictly sequential).

**Hatchery stop objective:**
- Stop 1 (Hatchery) objective = **egg set to hatch**. This immediately unlocks Stop 2.
- Egg collected/sold is **NOT** the objective for stop unlocking — it is a separate island-clear condition (see §7).

**Non-hatchery stops:**
- Each stop's objective is its defined stop-specific task (habit check-in, breathing exercise, wisdom activity, boss trial).

## 4B) Building system

Each island has **5 buildings**, one per stop. Buildings are **completely decoupled from stop unlock sequencing**:
- A building can be funded at **any time**, regardless of which stop is currently active.
- Buildings have **3 levels (L1, L2, L3)**. Each level requires Essence to fund.
- Tapping a building in the Build Panel spends 10 Essence toward the current level. Holding continues spending.
- When a level is fully funded, the building animates and advances to the next level.
- When **all 3 levels are funded**, the building's `buildComplete` flag is set.

**Build cost scaling:**
- Build costs scale with `effectiveIslandNumber = cycleIndex × 120 + islandNumber`.
- Island 1 (cycle 0, `cycleIndex=0`) uses effectiveIslandNumber = 1. Island 1 on cycle 1 (`cycleIndex=1`) uses effectiveIslandNumber = 121. Island 1 on cycle 2 (`cycleIndex=2`) uses effectiveIslandNumber = 241.
- This ensures costs are substantially higher on every new cycle, preserving meta-progression tension.
- Costs also scale with stop index (boss stop costs 4× base).

**Building visuals (L0→L3):** 🏗️ → 🏠 → 🏡 → 🏰 with a scale+glow animation on level-up.

**Essence drift:**
- Excess essence above **150% of the REMAINING island build cost** (essence still owed to finish all 5 buildings on the current island) decays at **0.5%/hour** (linear, not compounding), capped at a **20% loss per hydration session**.
- Drift is **suspended** when the island is fully cleared (nothing left to build/spend on) or when the player has claimed the island-clear reward.
- The softened drift rate (previously 5%/hour above 80%) is intentional: the player needs a comfortable essence buffer to pay stop tickets AND fund builds without losing essence faster than it can be earned on the board.
- Using the *remaining* cost (not the fresh-island total) keeps late-island hoarding visible: once most buildings are funded, the drift threshold contracts and the system nudges the player to spend on the final stops or start saving for the next island.

**Building reset on island travel:**
- All 5 buildings reset to Level 0 on every island travel (fresh build costs for the new island).


## 5) Reward bar system

- Feeding tiles are the primary input for reward bar progress.
- Reward bar progress resets after each reward claim and fully resets when the active timed minigame/event changes.
- Reward bar payout types (one per fill, rotated):
  - **Essence** (wallet income for stop tickets + buildings)
  - **Dice** (occasional; adds to the dice pool)
  - **Minigame tokens** (entry currency for the active timed event)
  - **Sticker fragments** (long-term collectibles)
- Payouts rotate deterministically in the order above; see `REWARD_ROTATION` in `islandRunContractV2RewardBar.ts`. Exact quantities scale with the escalation ladder (§5A).
- Reward bar tuning (fill rates, threshold counts, payout rates) is implementation-configurable but must preserve the payout-kind set above.

---

## 5A) Reward bar reset and escalation

- Reward bar progress resets after each reward claim.
- Reward bar rewards escalate within the currently active timed minigame/event.
- Escalation may affect:
  - payout quantity
  - payout rarity
  - sticker chance
  - minigame token output
  - occasional dice output
- When the active timed minigame/event expires and a new one begins, the reward bar resets fully, including its escalation state.

## 5B) Feeding tile output rules

- Feeding tiles are multi-progression inputs and should usually advance multiple systems at once.
- A feeding tile may contribute to:
  - reward bar progress
  - active timed minigame/event progress
  - Essence income
  - sticker chance or sticker-fragment style collectible progress
  - occasional dice payout
  - microgame trigger, where configured
- Exact tuning is implementation-configurable, but feeding tiles must remain one of the most valuable and visible tile categories in the board loop.

## 5D) Tile type catalogue (authoritative)

The 40-tile ring uses the following tile types. **Tile-type `'stop'` is fully retired** — stops are external HUD structures, never board tiles (see §Board Topology). **Tile-type `'event'` is also retired** — the word "event" is reserved for the timed-minigame rotation; reward-bar progress that used to come from `event` tiles is fully covered by `micro`.

| Tile type | On-land effect | Notes |
|---|---|---|
| `currency` | Awards essence | Primary essence income on the board. |
| `chest` | Awards essence bundle + reward bar progress | Larger payout than `currency`. |
| `micro` | Awards reward bar progress + small essence | **Most common tile** on the ring; light feed. |
| `hazard` | **Deducts essence** (never zero) | Intentionally negative outcome. Deduction is capped by the wallet (never goes below 0). Scaled by the dice multiplier. |
| `encounter` | Opens encounter modal | Once-per-visit; completed tiles become inert. See glossary below. |
| `bonus` | Glowing 9-hit accumulator — see §5E | Logic layer shipped; renderer wiring follows in a later PR. |

Weighting on the production profile (`spark40_ring`) is `currency:3, chest:2, micro:4, hazard:1` drawn deterministically per-island from the pool in `islandBoardTileMap.ts`. Encounter tiles are injected at fixed fractional positions (§5F).

Tile topology is **feature-gated via the board profile** — the active profile (`spark40_ring` in production) determines how many tiles of each type exist and their positions, but every tile must be one of the types above.

### Glossary — encounter modal

> **Encounter modal.** A one-shot side-quest popup that opens when the player lands on an `encounter` tile. Content is drawn from `encounterService.ts` (Quiz / Breathing / Gratitude prompts — intentionally easy, near-guaranteed completion). Rewards: essence + reward-bar progress + optional sticker chance. Once completed the encounter tile goes inert for the rest of that island visit.

## 5E) Bonus tile — 9-hit accumulator

The `bonus` tile is a charging accumulator. Each landing lights one more dot on a shared 8-lamp ring around the tile:

1. Landings 1..8 each increment the tile's per-(island, tileIndex) charge counter by 1.
2. At 8/8 the entire tile glows ("primed").
3. The **next** (9th) landing releases the accumulated payout and resets the counter to 0.

**Per-release payout (island-1 base values, scale by `getIslandEssenceMultiplier(effectiveIslandNumber)` before awarding):**

| Component | Value |
|---|---|
| Essence burst | 80 |
| Dice kicker | 4 |
| Reward-bar progress | 5 |

Source of truth: `BONUS_BASE_RELEASE_PAYOUT` in `islandRunBonusTile.ts`.

**State shape (persisted):**
```ts
// On IslandRunRuntimeState (added when the renderer wires up the bonus tile):
bonusTileChargeByIsland: Record<string, Record<number, number>>;
// outer key: island number (string); inner key: tile index; value: charge 0..8.
```
Resets to `{}` via `resetBonusTileChargeForIsland` on island travel (same pattern as `stopTicketsPaidByIsland`).

Invariants:
- `applyBonusTileCharge` never mutates its input and always returns a fresh ledger map.
- Two different bonus tiles on the same island have fully independent counters.
- Resetting one island's charges never touches other islands' charges.

### 5F) Encounter tile placement

- Normal islands (rarity `normal`): **1** encounter tile, placed at fractional position `0.15` of the ring. **Day-gated**: on a normal island the encounter only materialises once `dayIndex >= 2`; on day 0 or day 1 the fractional slot falls back to a deterministic pool tile. This protects brand-new players from hitting a modal inside the first two sessions.
- Seasonal islands (every 5th that is not also a 10th): **2** encounter tiles at fractions `0.275` and `0.775`. No day-gate.
- Rare islands (every 10th): **2** encounter tiles at the same fractions. No day-gate.

Fractional positions mean the encounter placement works on any `tileCount` without hard-coded indices.

## 5C) Reward amplification and session dynamics

- Reward intensity may increase during active play sessions (“hot state”).
- Continued play during the same timed minigame/event may result in:
  - higher reward bar efficiency
  - improved minigame token output
  - improved sticker/drop chances
  - stronger feedback/animation intensity
- This amplification is not required to be strictly linear and may be governed by internal tuning systems.
- The hot-state/amplification layer resets when the active timed minigame/event rotates out and a new one begins.

## 6) Timed minigame system

- At any given time, there is exactly **one** active timed minigame/event.
- The active timed minigame/event is global for the player and persists across island transitions.
- The active timed minigame/event remains available until its timer expires.
- On expiry, the next event in the rotation starts automatically.
- Each event has its own micro/currency required to play the associated minigame.

### Timed event rotation

| Event | Duration | Icon | Description |
|---|---|---|---|
| Feeding Frenzy | 8 hours | 🔥 | Feed creatures for bonus rewards |
| Lucky Spin | 24 hours | 🎰 | Spin for prizes |
| Space Excavator | 2 days | 🚀 | Excavation/resource gathering event |
| Companion Feast | 4 days | 🐾 | Extended companion bonding event |

---

## 7) Island completion rules

An island is complete **only** when ALL of the following are satisfied:
1. All 5 stop **objectives** are complete (Hatchery→Habit→Mystery→Wisdom→Boss, in sequence).
2. The Hatchery egg has been **collected or sold** (not just set — the egg must fully resolve).
3. All 5 **buildings** are at **Level 3** (fully built via the Build Panel).

When all three conditions are met, the Build Panel shows a **"🎉 Claim Island Clear!"** button. The player must tap it to trigger island travel (no auto-travel).

Additional rules:
- Island progression is **not** time-based.
- Timer expiration cannot auto-complete or auto-fail island progression.
- A completed island **cannot** decay (Essence drift is suspended once island is fully cleared).
- Buildings **reset** to Level 0 on island travel.

---

## 8) What is explicitly removed from previous system

The following are not part of the canonical Island Run gameplay contract:

- Time-based island completion gates (island timers are **fully retired**).
- Island timer expiry auto-advance.
- Fixed board-tile-count requirement.
- Stop-as-tile modeling.
- **Hearts as any form of currency, energy, or game mechanic** (fully retired).
- **Coins as any form of island game currency** (fully retired).
- Heart-to-dice conversion.
- Spin-based token movement (fully retired).
- Multi-active timed minigame/event states.
- Non-sequential stop progression.
- Tiles awarding dice directly (dice only come from reward bar, stops, boss, events, shop, regeneration).
- **Tiles awarding egg shards** (shards only from reward bar, stop completion, boss wins, egg sell).
- Capped dice regeneration tier table (replaced with continuous logarithmic formula).

> **Note on roll cost.** The dice multiplier (§2E) is part of the **current**
> design, not a removed feature — cost is `1 × N` (softened from `2 × N` on
> 2026-04-19). Earlier drafts of this contract claimed a strictly flat cost;
> that wording has been superseded.

### Egg sell reward choice
- When selling an egg instead of collecting the creature, the player **chooses** between a shard payout or a dice payout.
- Mythic eggs give more than rare, rare gives more than common.
- This gives the player agency over their reward.

### Essence drift notification
- When essence drift has been applied on session open, a small red animation shows the amount lost (e.g., "- 42 🟣").
- The `lastEssenceDriftLost` field in runtime state tracks this value for UI display.

---

## 9) Compatibility notes (what this replaces)

This contract supersedes all fragmented prior gameplay-rule documents and establishes a single authoritative rule set for:

- Core loop behavior
- Stop structure and progression gating
- Board energy model
- Currency roles
- Reward bar outputs
- Timed minigame/event constraints
- Island completion requirements

Implementation and migration notes may exist in separate docs, but they must conform to this contract and cannot redefine gameplay rules.

## 10) Related documents (subordinate)

The following documents may contain supporting detail, implementation notes, or narrower domain definitions, but they do not override this contract:

- docs/16_ISLAND_RUN_STOPS_CANONICAL.md
- docs/17_CURRENCIES_AND_SHIELD.md
- docs/12_MINIGAME_BOSS_ECONOMY_PLAYER_LEVEL_DESIGN.md
- docs/13_COLLECTIBLE_PROGRESS_BAR.md
- docs/03_MAIN_GAME_FIXED_BOARD_UI_AND_MOVEMENT.md
- docs/02_MAIN_GAME_DATA_MODEL_AND_SUPABASE.md

If any supporting document conflicts with this contract, this contract prevails.
