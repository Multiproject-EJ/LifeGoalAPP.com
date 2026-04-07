# CANONICAL GAMEPLAY CONTRACT — Island Run

Status: **Authoritative**  
Version: **1.0**  
Effective date: **2026-04-07**

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

## 5) Reward bar system

- Feeding tiles are the primary input for reward bar progress.
- Reward bar progress is cumulative within the active island session unless explicitly reset by design rules.
- Reward bar payout types are:
  - Minigame tokens
  - Occasional dice
  - Stickers
- Reward bar tuning (fill rates, threshold counts, payout rates) is implementation-configurable but must preserve the payout type contract above.

---

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
- Fixed 17-tile board requirement.
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
