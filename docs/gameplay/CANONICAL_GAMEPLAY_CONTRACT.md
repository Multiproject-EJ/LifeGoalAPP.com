# CANONICAL GAMEPLAY CONTRACT — Island Run

Version: 1.0  
Status: Active  
Last Updated: 2026-04-07  
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
- Board tile count and board presentation are configurable and may change over time.
- Stops are external structures and are not part of tile movement.

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

## Board Topology Model

- Board topology is profile/config-driven.
- Board tile count is not fixed and must always be derived from the active board topology profile.
- The current production default profile is `spark60_preview` (60 tiles).
- Future profiles (for example larger boards around ~60 tiles) are supported.
- Board topology must be treated as variable and extensible across profiles.

### Strict board-topology rules (critical)
- Gameplay logic must not depend on fixed tile counts (for example `17`).
- Movement, wrap behavior, and tile-selection logic must always use profile-derived tile count.
- Hardcoded tile-count assumptions are forbidden.

### Stop decoupling rules
- Stops are external gameplay structures, not tile positions.
- Stop progression must not depend on landing on specific tile indices.
- Tile positions may be used for visual stop markers only, never for gameplay correctness.

### Board topology compatibility note
- Current production board uses a 60-tile topology profile for stability.
- Additional board profiles may exist for experimentation, but production gameplay is standardized on the 60-tile profile.
- Renderer/layout remains legacy-bound at present and will be updated in later phases.

---

## 3) Currency system

### Dice
- Dice is the **only board energy**.
- Dice is required for movement and core board interactions.

### Essence
- Essence is a **board-loop currency**.
- Essence is earned primarily through board gameplay and reward-loop outputs.
- Essence is spent on stop/building upgrades tied to island progression.

### Gold
- Gold is a persistent economy currency.
- Gold remains meaningful and relatively scarce.
- Gold is not the primary spend path for core board movement.

### Collectibles (Stickers)
- Stickers are collectible progression assets, not movement energy.
- Stickers are earned through reward systems and island progression.
- Sticker collections persist long-term across loops.

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
- Sticker/collection milestones, where configured

Dice reward sources should follow this qualitative pattern:
- Boss completion = major dice payout
- Island completion / larger milestones = meaningful payout
- Stop completion / egg hatching = smaller reinforcement payout
- Reward bar / minigames = variable and tunable payout

## 3B) Player level progression

- Player level is a long-term progression system that improves dice regeneration capacity over time.
- Player level may increase:
  - maximum dice capacity
  - dice regeneration speed
  - visible Essence income scale
  - visible stop/build upgrade costs
- Essence income and stop/build costs may scale upward together so the relative board-loop pressure remains familiar while the player experiences larger numbers and stronger progression fantasy.
- Dice progression should scale more slowly and remain meaningfully constrained to preserve scarcity and monetization tension.

## 4) Stop system

Each island contains exactly 5 stops, in this fixed sequence:

1. **Hatchery**
2. **Habit**
3. **Breathing**
4. **Wisdom**
5. **Boss**

Stop rules:
- Stops are external structures, never board tiles.
- Stops are sequential; parallel stop completion is not allowed.
- A stop is considered complete only when its defined objective is fulfilled.
- Boss is always the final gate for island completion.

---

## 4A) Stop completion definition

- Each stop requires two completion conditions:
  1. the stop-specific objective must be completed, and
  2. the required Essence-funded build/upgrade state must be completed.
- A stop is not complete until both conditions are satisfied.
- Completing a stop unlocks the next stop in sequence.

## 5) Reward bar system

- Feeding tiles are the primary input for reward bar progress.
- Reward bar progress resets after each reward claim and fully resets when the active timed minigame/event changes.
- Reward bar payout types are:
  - Minigame tokens
  - Occasional dice
  - Stickers
- Reward bar tuning (fill rates, threshold counts, payout rates) is implementation-configurable but must preserve the payout type contract above.

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
- On expiry, a new timed minigame/event may replace it according to live-ops scheduling.

---

## 7) Island completion rules

An island is complete **only** when:
1. Stops 1–4 are completed in order, and
2. Stop 5 (Boss) is completed.

Additional rules:
- Island progression is **not** time-based.
- Timer expiration cannot auto-complete or auto-fail island progression.
- Advancing to the next island requires successful completion of all 5 stops.

---

## 8) What is explicitly removed from previous system

The following are not part of the canonical Island Run gameplay contract:

- Time-based island completion gates.
- Fixed board-tile-count requirement.
- Stop-as-tile modeling.
- Hearts as core board-loop energy.
- Multi-active timed minigame/event states.
- Non-sequential stop progression.

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
