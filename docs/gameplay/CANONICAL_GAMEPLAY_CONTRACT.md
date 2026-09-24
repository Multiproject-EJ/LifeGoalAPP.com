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
2. Complete the recommended stop objective, or choose **Come back later** on eligible reflective stops to keep exploring.
3. Spend dice to move on the board and land on tiles.
4. Prioritize feeding tiles to build reward bar progress.
5. Claim reward bar payouts (tokens, occasional dice, stickers).
6. Use Essence earned from board play to upgrade island stops/buildings.
7. Repeat until all 5 stops are genuinely completed.
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
- Multiple unfinished stops may be accessible when the player intentionally chooses **Come back later** on eligible reflective stops.
- One unfinished stop is always the recommended destination; completion credit still requires fulfilling each stop objective.

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
| ×2 | 2 | 2 |
| ×3 | 3 | 3 |
| ×5 | 5 | 5 |
| ×10 | 20 | 10 |
| ×20 | 100 | 20 |
| ×50 | 250 | 50 |
| ×100 | 1 000 | 100 |
| ×200 | 2 000 | 200 |

- The multiplier scales positive essence tile rewards **and** reward-bar progress from tile landings. Hazard deductions are also scaled by the multiplier (high multiplier = high risk too).
- The multiplier auto-downgrades if the player's pool drops below the current tier's unlock threshold, so the dice button can never become un-rollable silently. See `clampMultiplierToPool`.
- The multiplier is player-controlled (via the footer ×N button); default `×1` for every new session.

## Board Topology Model

- Board topology is profile/config-driven.
- Board tile count is not fixed and must always be derived from the active board topology profile.
- The current production default profile is `spark36_ring` (36 tiles).
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
- The player token does not land on landmark structures themselves; landmark structures remain external UI/gameplay objects.
- Landmarks can be accessed by tapping the landmark button on the orbit HUD. A narrow ring exception also exists for **landmark-door tiles**: four outer ring tiles nearest the four non-boss landmarks may open the same canonical landmark modal on landing. When a door is the active, enterable landmark it opens that landmark; when it is dormant/wrong for current progression it may open a lightweight Dormant Door matching minigame with its own small reward ladder. Door tiles do not complete stops, do not award normal tile rewards, and must route all stop completion/progression through canonical stop services.
- When the Boss landmark becomes truly open, the four landmark-door tiles reroute to Boss until island clear.
- One ring tile may be a **Traffic Light** bonus tile. Passing over it lights one of 8 UI lights; at 8/8 it unlocks a coin-flip bonus where heads opens Mystery Box 1 and tails opens Mystery Box 2. Traffic Light rewards are bonus-wallet/sticker-fragment grants, not landmark progression.
- Board profiles do not expose per-stop progression indices. Landmark buttons are positioned in screen space by the UI layer (`OUTER_STOP_ANCHORS` in `islandBoardLayout.ts`), while any landmark-door tile mapping lives in the topology/tile-map service layer and must not become an alternate stop-completion authority.
- The canonical HUD ordering for landmark affordance is: Hatchery → Habit → Mystery → Wisdom → Boss, each pinned to `OUTER_STOP_ANCHORS`.
- Landmark buttons should expose an **attention hint** (small affordability dot) whenever the next sequentially-eligible landmark is payable with current essence and remains unpaid.

### Board topology compatibility note
- Current production board uses a 36-tile topology profile (`spark36_ring`, tileCount 36).
- Legacy `spark40_ring` inputs are normalized to `spark36_ring` during migration; runtime state and telemetry use the canonical `spark36_ring` id.
- Additional board profiles may exist for experimentation, but production gameplay is standardized on the 36-tile profile.

---

## 3) Currency system

**Active island-run currencies (canonical):**
- Dice
- Essence
- Egg Shards
- Diamonds
- Spin tokens

Timed-event ticket authority is `minigameTicketsByEvent[eventId]`. `spinTokens` is legacy compatibility only and must not be used for timed-event launcher affordability or spend.

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

### Dice regeneration ETA contract (canonical UI service surface)
- `islandRunDiceRegeneration.ts` is the canonical service for dice regen math and countdowns.
- `resolveNextRollEtaMs({ dicePool, target, regenState, nowMs })` returns ms until the pool reaches a target threshold.
- `resolveFullRefillEtaMs({ dicePool, regenState, nowMs })` returns ms until passive regen reaches the level floor (`regenState.maxDice`).
- Both ETA helpers are pure/deterministic and must be used for out-of-dice countdown UI to avoid drift from ad-hoc timers.

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
- Stop completion remains objective-based and meaningful; access may advance through postponement for eligible reflective stops.
- A stop is considered complete only when its defined objective is fulfilled.
- Boss is always the final gate for island completion and cannot grant final victory/travel while required earlier objectives remain incomplete.
- The Mystery stop's **content** rotates per island (currently: breathing exercise, action challenge, or check-in reflection). The stop ID is always 'mystery'.
- All stops are designed to be completed **in-game** — the player should never need to leave the game to complete a stop (e.g., breathing is done via an in-game mini exercise).

### Come back later / postponement rules
- Eligible ordinary reflective stops are: **Habit**, **Mystery**, and **Wisdom** (`habit`, `mystery`, `wisdom`).
- Choosing **Come back later** leaves the current stop objective incomplete, records a postponed marker, keeps that stop accessible, and unlocks access eligibility for only the immediate next ordinary stop.
- Postponement never grants stop rewards, completion credit, boss victory, island-clear rewards, or travel eligibility.
- If the next stop normally requires an Essence ticket, the ticket is still required; postponement does not waive or prepay tickets.
- Up to **3** unfinished accessible stops may be open at once (`ISLAND_RUN_MAX_OPEN_INCOMPLETE_STOPS`). At the limit, the player is gently asked to finish one waiting discovery before opening another.
- The final Boss/Arena stop may be previewed only through existing access rules; true final resolution remains blocked until all required earlier stop objectives are complete.
- `recommended` is derived deterministically from canonical stop state and is not a separate reward/completion authority.

### Stop unlock rules
- When an island starts, only Stop 1 (Hatchery) is **open**. All other stops are **closed**.
- Each subsequent stop (2, 3, 4, 5) is **gated by two conditions** that must BOTH be satisfied before the stop can be opened:
  1. The previous stop's objective is complete, or the previous eligible ordinary stop was intentionally postponed via **Come back later** (for the Hatchery this means the egg is **set to hatch** — not collected/sold/hatched — so "halfway completion" is sufficient to unlock the next stop).
  2. The player pays an essence **ticket** (opening fee) for that stop.
- Ticket costs are paid from the essence wallet and scale with `effectiveIslandNumber` using the same multiplier as build costs. The base curve steepens toward the boss so the final gate carries real weight:
  - Canonical ticket vector by stop index is: **`[0, 30, 70, 130, 220]`**.
    - Index 0 (Stop 1 Hatchery) = 0
    - Index 1 (Stop 2 Habit) = 30
    - Index 2 (Stop 3 Mystery) = 70
    - Index 3 (Stop 4 Wisdom) = 130
    - Index 4 (Stop 5 Boss) = 220
  - Stop 2 (Habit): **30 essence** base
  - Stop 3 (Mystery): **70 essence** base
  - Stop 4 (Wisdom): **130 essence** base
  - Stop 5 (Boss): **220 essence** base
- Tickets are **per-island**: a paid ticket unlocks that stop for the current island only. Travelling to a new island requires paying the ticket again.
- The Hatchery (Stop 1) **never** has a ticket cost — it is always free on a new island.
- The ticket rule prevents "rush-through" completion: the player must earn essence on the 36-tile board before each new stop can be opened.
- Canonical cost UI/readout component for market + build panel is `<ShopItemCostLine />`; new cost displays should reuse it (or a shared derivative) instead of re-implementing bespoke "need X more" math.

### Hatchery (Stop 1) — egg lifecycle and checkmark rules
- The Hatchery is **always Stop 1** on every island.
- The egg goes through 4 states, each shown progressively in the 4 stop-progress circles.
- When the egg is **set to hatch**, Stop 2 unlocks and the Hatchery shows a **yellow checkmark** on the board (indicating "halfway complete").
- The Hatchery checkmark turns **green** when the animal is **collected or sold**.
- The egg states continue to update in the 4 circles as each new state is reached.

---

## 4A) Stop completion and stop unlock definition

**Stop unlock (sequential progression):**
- A stop normally advances access to the next stop when the stop's **objective** is complete. Eligible ordinary stops may also advance access, but not completion credit, through **Come back later**.
- Build completion is **NOT** required to unlock the next stop.
- Any accessible unfinished stop can be revisited and completed through its ordinary objective path. Completion rewards are paid once, only on genuine objective completion.

**Hatchery stop objective:**
- Stop 1 (Hatchery) objective = **egg set to hatch**. This immediately unlocks Stop 2.
- Egg collected/sold is **NOT** the objective for stop unlocking — it is a separate island-clear condition (see §7).

**Non-hatchery stops:**
- Each stop's objective is its defined stop-specific task (habit check-in, breathing exercise, wisdom activity, boss trial).

## 4B) Building system

Each island has **5 buildings**, one per stop. Buildings are **completely decoupled from stop unlock sequencing**:
- A building can be funded at **any time**, regardless of which stop is currently active.
- Buildings have **3 levels (L1, L2, L3)**. Each level requires Essence to fund.
- Hold is the primary construction input; release, blur, backgrounding or closing stops further queued spending. Each hold step spends up to one fifth of the current tier (minimum nominal 10 Essence), using the existing discount and affordability rules. The additive reveal interpolates smoothly between funded steps.
- An affordable orange fire action finishes the selected landmark through L3; an affordable blue triple-fire action finishes all remaining construction on the current island. Both display exact remaining costs, revalidate the quote against the current visit/progress/discount, and commit atomically. Island 1's separate Assembly mission and guided first build are excluded. No objective, egg, boss or travel gate is completed by these actions.
- Each newly funded construction level grants one die in the same canonical commit. Reopening, replaying a quote, or reviewing already completed levels grants nothing. Construction dice are recorded separately in economy diagnostics.
- Hold steps use a short accelerating cadence; fast modes use a roughly one-second reveal followed by a protected celebration. The full 3D world is retained during an open construction session. Celebration presents a centered title, front-facing modal crew and dice flight with reduced-motion alternatives. Fireworks play only for Level3 completion of a building, not Levels1 or2.
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
- **Puzzle collection begins on Island 002.** Island 001 does not show the Sticker Album launcher and cannot award sticker/puzzle fragments from the reward bar or traffic-light mystery boxes. When Island 001 reaches the fragment slot in the reward rotation, that payout is replaced by Essence.
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

The 36-tile ring uses the following tile types. **Tile-type `'stop'` is fully retired** — stops are external HUD structures, never board tiles (see §Board Topology). **Tile-type `'event'` is also retired** — the word "event" is reserved for the timed-minigame rotation; reward-bar progress that used to come from `event` tiles is fully covered by `micro`.

| Tile type | On-land effect | Notes |
|---|---|---|
| `currency` | Awards essence | Primary essence income on the board. |
| `chest` | Awards essence bundle + reward bar progress | Larger payout than `currency`. |
| `micro` | Awards reward bar progress + small essence | **Most common tile** on the ring; light feed. |
| `hazard` | **Deducts essence** (never zero) | Intentionally negative outcome. Deduction is capped by the wallet (never goes below 0). Scaled by the dice multiplier. |
| `encounter` | Opens encounter modal | Once-per-visit; completed tiles become inert. See glossary below. |
| `bonus` | Glowing 9-hit accumulator — see §5E | Dormant in the current production tile map; renderer/tile wiring follows in a later PR. |

Weighting on the production profile (`spark36_ring`) is `currency:3, chest:2, micro:4, hazard:1` drawn deterministically per-island from the pool in `islandBoardTileMap.ts`. Encounter tiles are injected at fixed fractional positions (§5F).

Tile topology is **feature-gated via the board profile** — the active profile (`spark36_ring` in production) determines how many tiles of each type exist and their positions, but every tile must be one of the types above.

### Glossary — encounter modal

> **Encounter modal.** A one-shot side-quest popup that opens when the player lands on an `encounter` tile. Content is drawn from `encounterService.ts` (Quiz / Breathing / Gratitude prompts — intentionally easy, near-guaranteed completion). Canonical rewards are essence + reward-bar progress + optional sticker chance (no direct dice per §Dice). Once completed the encounter tile goes inert for the rest of that island visit.
>
> **Known live contradiction (scheduled cleanup):** current runtime still has a legacy encounter direct-dice grant path in `encounterService.ts` / `IslandRunBoardPrototype.tsx`; this behavior is tracked for a dedicated cleanup PR and is not canonical.

## 5E) Bonus tile — 9-hit accumulator

The `bonus` tile is a charging accumulator. Each landing lights one more dot on a shared 8-lamp ring around the tile:

1. Landings 1..8 each increment the tile's per-(island, tileIndex) charge counter by 1.
2. At 8/8 the entire tile glows ("primed").
3. The **next** (9th) landing releases the accumulated payout and resets the counter to 0.

**Per-release payout (island-1 canonical base values, scale by `getIslandEssenceMultiplier(effectiveIslandNumber)` before awarding):**

| Component | Value |
|---|---|
| Essence burst | 80 |
| Reward-bar progress | 5 |

Per §Dice, bonus tiles do **not** grant direct dice in canonical gameplay.

**Live status:** bonus tiles are currently dormant in production (`islandBoardTileMap.ts` excludes `bonus` from the active tile-type union/pool, and there is no live `applyBonusTileCharge` landing call-site yet).

**Implementation note:** `BONUS_BASE_RELEASE_PAYOUT` in `islandRunBonusTile.ts` still contains a legacy dormant dice field from pre-alignment drafts; this is tracked for cleanup before bonus tiles are wired live.

**State shape (persisted):**
```ts
// On IslandRunGameStateRecord (persisted to localStorage + the
// island_run_runtime_state.bonus_tile_charge_by_island jsonb column,
// see migration 0230):
bonusTileChargeByIsland: Record<string, Record<number, number>>;
// outer key: island number (string); inner key: tile index; value: charge 0..8.
```
Resets to `{}` for the current island via `resetBonusTileChargeForIsland` (or
an explicit-empty inner-map patch through `persistIslandRunRuntimeStatePatch`)
on island travel — same pattern as `stopTicketsPaidByIsland`. The backend
overlay-merge preserves explicit-empty inner maps so a cycle 120 → 1 wrap
cleanly drops the previous cycle's charges without touching untouched
islands.

Invariants:
- `applyBonusTileCharge` never mutates its input and always returns a fresh ledger map.
- Two different bonus tiles on the same island have fully independent counters.
- Resetting one island's charges never touches other islands' charges.

### 5F) Encounter tile placement

- Normal islands (rarity `normal`): **1** encounter tile, placed at fractional position `34 / 36` of the ring (the end-of-lap caretaker sector on the production profile). **Day-gated**: on a normal island the encounter only materialises once `dayIndex >= 2`; on day 0 or day 1 the fractional slot falls back to a deterministic pool tile. This protects brand-new players from hitting a modal inside the first two sessions. The older `0.15` slot resolved to the Habit landmark door and was therefore never playable.
- Seasonal islands (every 5th that is not also a 10th): **2** encounter tiles at fractions `0.275` and `0.775`. No day-gate.
- Rare islands (every 10th): **2** encounter tiles at the same fractions. No day-gate.

Fractional positions mean the encounter placement works on any `tileCount` without hard-coded indices.

## 5G) Island 005 Concord recovery

- New Concord fragments appear only on Island005. Nine fixed visible collectible positions clear all possible landmark-door clusters, traffic light, ticket, discount, card and encounter tiles.
- Natural landings, seven-miss crossing resonance, ten-miss signal lock and the 55-eligible-roll completion schedule operate only on005. Other islands do not advance its counter.
- Collection reads the union of legacy001 and005 slots and paid-line ledgers. Existing built capabilities remain available; earned fragments and rewards are not removed or paid again. A new save merely reaching002 does not auto-unlock Concord.
- The ninth distinct fragment activates the canonical Concord hub. Island001 uses its Assembly/mandate departure contract and begins with resource collection/construction, without requiring a Concord fragment.
- First arrival runs the authored ship flight and expansion, pauses at the cabin for the canonical one-time welcome bundle, and resumes crew deployment only after PLAY. Skip and reduced motion retain the welcome claim and final START endpoint.

## 5H) Signature mission route objects

- Signature mission objects are additive metadata on an underlying ordinary tile. A successful mission pickup never replaces that tile's canonical economy reward.
- Authored pickup positions resolve from route fractions through the shared reservation service. Landmark entrance clusters, Traffic Light, Build Discount, Living Ticket, card, and every possible encounter slot have higher placement priority.
- A mission object is finite and claim-once unless its mission explicitly documents a repeatable interaction (for example a fishing spot or Frostwell drill station).
- An exact landing collects the object first. Missions with route pity may instead secure the first unclaimed object crossed during an accepted roll; at most one pity object is collected per roll and token movement is never changed.
- Collection and stage activation are canonical service actions persisted in `signatureMissionProgressByIsland`. React and Three.js only present committed results.
- Playable signature missions shown in the mission phone are required for departure, using the same canonical saved evidence as the phone (§7). Planned missions without implemented gameplay remain excluded.
- Islands 004, 006, 007, 008, and 009 share the staged-restoration state machine but keep authored descriptors and bespoke 3D transformations. Each spend reveals exactly one durable world stage; the final spend triggers the island finale.

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

Arena exhibition games may be offered as alternate playable surfaces during the
currently active event. They do not create another event clock, ticket wallet,
reward bar, or simultaneous active event. An exhibition spends/resumes against
the active event's record-level ticket bucket and routes successful completion
back through the active event reward contract.

An exhibition may present a game-specific nested milestone track when that
track is stored under the current active event runtime id in the canonical
record. Such a track is not a second global reward bar: it cannot own another
clock or wallet, and every claim must route through canonical action services
into the existing Island Run wallets.

Crystal Miners is an Arena exhibition using the current event ticket bucket and reward bar. Opening, gifts, ore purchases and tool arrangement cost no tickets; each accepted whole-rack drop costs one. Its complete mining career (tools, merged upgrades, ore, waiting gifts, cavern terrain and personal league) persists across island travel and event rotation. Event-keyed checkpoints retain spend evidence; the highest career revision supplies the workshop on every visit. A drop settles its ticket, mining result and normal event reward progress atomically before visual playback. Its forty-cavern journey and once-only milestone claims also persist across rotations. Five finish-line chests offer distinct ore/gift rewards; normal levels need one reached chest, levels ending in 8 or 9 need two. Every tenth level has a full-width guardian followed by a generous reward fall. Milestones automatically pay the existing dice/Essence wallets or active-event ticket bucket in the successful dig commit. The result offers Continue or Try again; both always return to workshop preparation. Only a separate explicit Drop action starts another expedition. Mined ore funds level-gated forge upgrades and tool purchases. Tools stay in their lanes except at marked rare deflectors. The playback camera follows the deepest active tool each frame, immediately following overtakes and returning upward to surviving tools after a leader finishes. Weighted normal/super gifts roll once when opened, with revealed tools saved immediately and a tier-20 ceiling. Low-ticket prompts route to island earning or the existing gated Stripe ticket and dice surfaces; ticket counts never alter physics or gift odds. Level forty ends the campaign without resetting investments or enabling repeat finale claims. It has no building side mission or separate island wallet.

Journey Disc Arena reward-track points and claims are event-scoped. Its fighter
rank, weapon levels, and highest Guardian clearance are a permanent owner-scoped
armory profile carried between eligible exhibition islands.

The chapter-opening exhibition is eligible on Islands 6, 11, 16 and onward.
While a canonical timed event is live and the Boss stop remains locked, its
landmark presentation may temporarily transform the ordinary island's centre
into Journey Disc Arena. It must yield the centre as soon as the mandatory Boss
stop becomes available; the exhibition never completes, unlocks, or replaces a
canonical stop and never creates a second ticket or reward write path.

### Timed event rotation

| Event | Duration | Icon | Description |
|---|---|---|---|
| Island Workshop (`feeding_frenzy`) | 8 hours | 🛠️ | Build route structures in the block-placement workshop |
| Lucky Spin | 24 hours | 🎰 | Spin for prizes |
| Space Excavator | 1 day | 🚀 | Excavation/resource gathering event |
| Companion Feast | 4 days | 🐾 | Extended companion bonding event |
| Skybound Academy (`skybound_expedition`) | 3 days | ✈️ | Complete a five-aircraft Pilot Academy and earn Gold Wings |

Skybound Academy is the fifth event in the canonical rotation. It owns no
parallel wallet or reward bar: one valid aircraft launch spends exactly one
ticket from `minigameTicketsByEvent[activeEventRuntimeId]`, and aiming,
navigation, upgrades, invalid short pulls, and opening/closing the event spend
nothing. Its event-scoped Academy record contains the 20-flight syllabus,
five aircraft ranks, medals, certificate, fleet upgrades, earned salvage,
active attempt, and bounded settlement-id ledger. A passed flight adds the
normal four event-progress points; an Ace flight adds eight. The first pass of
each rank checkride refills the shared event-ticket bucket by that rank's
declared amount, and retry/duplicate settlement cannot repay tickets, salvage,
Academy progression, or reward-bar progress. The final Ace checkride awards the
Gold Wings medal and military pilot certificate presentation; it does not
create a second direct wallet payout.

Skybound stunt bonuses remain part of that same bounded flight settlement:
close hazard passes, sustained low terrain skims, completed barrel rolls, and
an actively rotating crash finale may add stunt score before settlement. A
crash finale is presentation and score only — ground contact outside the safe
landing envelope still destroys the aircraft, cannot pass a lesson, and cannot
refund or bypass the one-ticket launch cost.

**Task Tower scope clarification (current product truth):** Task Tower remains available as a standalone game in the Tasks / Actions area. It is **not** currently part of Island Run, not a 120-island landmark stop, not a timed-event minigame, not used for Feeding Frenzy, and not part of mystery-stop rotation.

---

## 7) Island completion rules

An island is complete **only** when ALL of the following are satisfied:
1. All 5 stop **objectives** are complete (Hatchery→Habit→Mystery→Wisdom→Boss, in sequence).
2. The Hatchery egg has been **collected or sold** (not just set — the egg must fully resolve).
3. All 5 **buildings** are at **Level 3** (fully built via the Build Panel).

When all requirements are met, show **Island 100% complete** and automatically open the island-clear celebration/departure sequence once active modals, rolls and mission presentations have settled (updated by user request, 2026-09-13). The player can then claim the displayed rewards and choose Travel; Keep playing and the Finish Island recovery CTA remain available. No automatic account/signup acceptance or bypass of guest/demo/Treasure Path gates is permitted.

Construction and activities must be displayed separately: **Build Landmarks** counts funded Level-3 buildings, not completed activities. The current-island completion checklist uses `resolveIslandRunCompletion` for all required construction, activities, terminal Hatchery eggs and mandatory finales; incomplete progress must never round to 100%.

Island 001 replaces the Boss slot with the completed Assembly: four outer L3 landmarks, their four activities, resolved eggs, ten Assembly charges and the signed peacekeeping mandate are required. Legacy pre-Assembly saves with the activated Concord retain their five-stop completion route. Island 020 additionally requires the Iron Skiff extraction after its ordinary Level-3 clear. All playable signature missions shown in the mission phone are required for departure (updated by user request, 2026-09-20). Planned missions without canonical gameplay remain excluded. The phone and departure share the same objective and saved completion evidence; construction alone never grants activity credit.

Additional rules:
- Island progression is **not** time-based.
- Timer expiration cannot auto-complete or auto-fail island progression.
- A completed island **cannot** decay (Essence drift is suspended once island is fully cleared).
- Buildings **reset** to Level 0 on island travel.

### Beginner presentation (all saves)

- Island001 hides the reward bar, daily spin icon, traffic light and event-minigame launcher. Reward-bar progress and claims are disabled there for both new and existing saves. Existing progress and unlocks are preserved for later islands.
- The blue board caretaker, his shadow, animation and interaction target are absent on Islands001–007. Island008 is his first board introduction. Existing later-island exclusions remain in force.

### Gradual-introduction cohort (`opening-games-v1`)

This user-approved rollout is explicit and persisted, not inferred from island
number or save age. Enrollment remains disabled until the integration gates in
`docs/gauntlets/2026-09-19-gradual-island-feature-introductions.md` pass. Unmarked
and legacy saves retain the rules above and all earned inventory/unlocks.

- On Islands001–003 the first landmark is a **Welcome Venue** with an explicit,
  free arrival check-in. It retains internal stop ID `hatchery`, completes only
  that activity and opens normal next-stop ticket eligibility. It grants no
  currency, egg, construction credit or prepaid ticket. Building alone never
  completes check-in. These islands do not require a resolved egg to depart.
  New egg placement is unavailable until Island004, which introduces the
  Hatchery activity and restores the terminal-egg departure requirement.
- New Island002 requires the opening ceremony **and completed participation in
  its free inaugural game** before island clear/departure. Canceling the game,
  finishing construction, or lighting the beacon alone does not satisfy this.
- New Island001 replaces the Mystery/Event Arena activity with an explicit
  two-question host orientation about building and the Island002 opening.
  Normal previous-stop access and the Mystery ticket remain required. Correct
  completion records only this activity; it creates no event tickets, eggs,
  construction credit or prepaid Wisdom ticket. Closing or incorrect answers
  give no completion credit. Legacy arena activity/boost behavior is preserved
  for unmarked journeys; the boost is unavailable to the gradual cohort before
  ordinary events unlock.
- New Island002's opening presentation is skippable and has a reduced-motion
  equivalent. Presentation never grants a reward or replaces participation in
  its free inaugural game, and the canonical saved beacon milestone precedes
  the animation.
- New Island004 requires twenty canonical Re-Docking rolls and the committed
  completion timestamp for the current cycle's Island004 mission. Old Island002
  progress or a previous-cycle Vault entitlement cannot substitute for it.
- Canonical travel enforces new-cohort completion even if a caller omits the
  legacy optional completed-visit key. No skip-ahead travel is introduced.
- Previously earned eggs remain resolvable; the policy blocks new early egg
  creation, not ownership. Never delete saved eggs or creatures as migration.

The ceremony and Re-Docking requirements specialize the required playable
mission rule for this explicit cohort. Egg reward inventory/other grant
sources and full first-session onboarding remain separately tracked release gates.

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

---

## 11) State authority (client architecture)

Added session 8 (Apr 2026) as part of the Island Run state-architecture
refactor. This section is normative for client-side state handling.

### 11A. One authoritative record

The complete Island Run gameplay state is one object:
`IslandRunGameStateRecord` (defined in
`src/features/gamification/level-worlds/services/islandRunGameStateStore.ts`).
`IslandRunRuntimeState` is a type alias for the same shape and carries no
additional fields. Every gameplay field — `dicePool`, `tokenIndex`,
`essence`, `islandNumber`, `completedStopsByIsland`,
`stopTicketsPaidByIsland`, `perIslandEggs`, `bossState`, `rewardBarProgress`,
`diceRegenState`, etc. — lives on this record and nowhere else.

### 11B. One mutation path

All gameplay mutations flow through an **action service** (e.g.
`islandRunRollAction.ts`, and — in stage C of the refactor — the
consolidated `islandRunStateActions.ts`). Each action:

1. Acquires a per-user async mutex (so `read → compute → commit` is atomic).
2. Reads the current record.
3. Computes the next record purely (incrementing `runtimeVersion`).
4. Calls `commitIslandRunState` (or the underlying
   `writeIslandRunGameStateRecord`) exactly once.

Renderers and React hooks **must not** call `writeIslandRunGameStateRecord`
or `persistIslandRunRuntimeStatePatch` directly. They call actions.

### 11C. One persistence path

`writeIslandRunGameStateRecord` is the only writer to localStorage and
Supabase. It owns the single-flight coordinator, conflict merge,
pending-write queue, and remote backoff. `commitIslandRunState` wraps it
with the in-memory subscribable mirror used by the React hook.

### 11D. UI/local React state is presentation-only

`useState` inside renderer components is reserved for presentation:
modal open/close, animation triggers (e.g. `isRolling`,
`rollingDiceFaces`), transient text (`landingText`), camera mode,
overlay visibility, form inputs, debug-panel flags.

UI state **must not** mirror a gameplay field. Gameplay fields are read
via `useIslandRunState(session, client)` — a `useSyncExternalStore` hook
that returns `{ state, commit, hydrate }`. No `useEffect` mirrors
`state.X → localX` or `localX → store`. There is no race to guard against
because there is only one writer.

### 11E. Hydration

Hydration populates the store from localStorage and Supabase. It is
called once on session open (with `forceRemote: true` so a stale
`remote_backoff_until` cannot pin the device to its own local fallback)
and again on focus / visibility / online events. Hydration always
overwrites the in-memory mirror; pending local writes are preserved by
the commit coordinator, not by hydration logic.

Breaking any of these rules is considered a regression of P0-2 in
`docs/gameplay/ISLAND_RUN_OPEN_ISSUES.md`.

### Crystal Miners ticket funding and diagnostics (2026-09-19)

The event grid launches Crystal Miners with its dedicated icon. Its canonical action converts one shared event ticket into three game-specific drops only when the saved drop bank is empty; each drop consumes one, and exact milestone rewards credit the drop bank directly. Earned and server-confirmed purchased tickets obey the same game-specific quantity profile. Conversion and spend commit atomically with terrain, rewards and career revision; event/island changes preserve already-funded drops and upgrades. Existing games retain their current quantities. Preparation costs ore. No UI wallet writes or new checkout eligibility bypasses.

Versioned attempt/lifecycle/error telemetry uses the existing consent-aware pipeline and admin access policies. Per-cavern analysis is a capped sample, not a whole-population conversion claim. See `CRYSTAL_MINERS_TELEMETRY.md`.

Crystal Miners guardian weapons (2026-09-19): each guardian telegraphs one lane, charges, destroys that lane's active falling tools, reloads and retargets until defeated. Targets can miss empty lanes and are independent of ticket balance. Tool impacts resolve before weapons, so a killing impact cancels a pending shot. Only this expedition's falling bodies are lost; the permanent rack remains intact. Ordinary rock impacts use a short tier-independent rebound: higher difficulty comes from equipment requirements, impact budgets and terrain variety, not stronger tools bouncing more slowly. Version-eight career migration preserves old terrain damage and investment while adding late-cavern obsidian.

Crystal Miners focus and balance update (2026-09-19): normal players prepare in the workshop and automatically switch to the mine for a drop; manual Drop zone/Full shaft/Bottom treasure inspection is available only through admin or explicit development tooling. Six deterministic visual cave themes rotate by level without changing reward odds. Newly opened chests receive a 1.1-second end-of-drop celebration before results, including when fall playback is skipped; no additional reward settlement occurs during this hold. Dragging a valid matching pair highlights both tools before release without a gameplay mutation. Terrain schema nine increases equipment requirements and shortens the per-tool impact budget, while retaining short rebounds, saved damage ratios, opened chests, tools, forge and wallets. The last approaches have a gentler extra-hardness multiplier to avoid excessive retries; tickets never influence difficulty or targeting.


### Shipboard Hatchery loop (2026-09-20)

From Island004, a landmark's activity opens at building Level3 without an additional entry ticket. Stable save indices are unchanged; the recommended activity order is Habit, Event, Wisdom, Hatchery, Boss. Hatchery requires all five buildings at Level3; the other landmark activities do not need to be solved. Claiming the egg completes Hatchery atomically and starts its existing 24–72h incubation aboard the spaceship. Each island slot is awarded once; Egg Mania retains its batch bonus. Existing eggs and completed activities are preserved. Incubation does not block departure. Eggs can be opened or sold from any island through the spaceship incubator; rewards and creature origin use the egg's source island and never clear another island's active egg. Islands001–003 retain their beginner introductions and grant no new Hatchery eggs.

Landmark attention is presentation-only: unfinished construction has a faint light, a fully built and actionable activity has blue major outlines, and completed landmarks have no glow. Hatchery remains unlit until all five buildings reach Level3. Name/progress labels stay hidden by default; explicit selection or completing a landing on that landmark's entry tile fades its label in. Movement fades it out; passing the tile does not reveal it. Red pulsing dots indicate an affordable full next building level, ready eggs/spins and claimable creature bond rewards, respecting beginner feature visibility and reduced motion.

Island001 shows the mission phone from arrival. After its first completed throw and any landing reward, the briefing explains collecting dynamite and creating the Diplomatic Peace Signing Assembly. The existing cycle-scoped narrative acknowledgement prevents repeated introductions.

### Native notification packages (2026-09-20)

Capacitor uses native Local Notifications permission and one-shot schedules. Egg opt-in is contextual after the first egg; Account settings offer separate egg and smart-reminder packages, permission diagnostics and a test alert. Egg schedules reconcile stable per-egg identities from the canonical ledger, across islands, and cancel on collection/sale. Smart reminders use Today health: Stalled and Needs review suppress habit alerts, with no ignored-alert counter. Completed/archived items are excluded; life reminders respect quiet hours and weekend preferences, with at most three scheduled opportunities per day and no repeating overdue trigger. Native consent is per device and optional. Browser push remains a separate existing delivery path.


### Free landmark entry and Arena tickets (2026-09-20)
Ordinary stops charge no entry pass on any island. Islands001–003 expose their introductory stops freely; the finale still follows the introductory activities. From004 the Level3 activity gate and all-buildings-Level3 Hatchery gate remain. Old pass receipts are preserved, but stale purchase callbacks cannot spend money. Event tickets exclusively fund Arena minigames; zero tickets blocks launch, including Crystal Miners. A short ticket-entry animation accompanies launch without a second debit. Existing per-game ticket conversion and saved resources are preserved. The living board-ticket tile awards the active event’s tickets through the canonical roll commit and retains its existing regrowth timing.
The first Island001 tutorial throw lands on a dynamite cache; later rolls retain at-most-one unclaimed cache collection on landing or passing. Landmark-door overlays preserve mission pickup metadata. Collected caches remain finite and do not pay twice.


### Island 017 — The Titan's Last Thought (2026-09-23)

Eight finite soul-bolts and spine stages remain the first chapter. New/incomplete
journeys then require an ordered free potion, an explicit pour, eye-ring, tooth
channel and constellation-lens solutions, and an explicit spirit release. These
are cycle-scoped canonical signature-mission interactions, not landmark activity
credit. Wrong attempts are free; inputs persist; replay never writes state or
pays rewards. Completed legacy spine missions retain departure credit and may
play the new chapter optionally. No completed progress or construction rewards
are revoked, reset or duplicated. Phone and departure use the same combined
spine/awakening objective. The first completed throw introduces the mystery once
per cycle through the existing narrative acknowledgement.
