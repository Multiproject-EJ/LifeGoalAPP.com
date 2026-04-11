> [!WARNING]
> This document is no longer the primary authoritative gameplay source of truth.
>
> The canonical gameplay contract is now:
> `docs/gameplay/CANONICAL_GAMEPLAY_CONTRACT.md`
>
> This file may still contain useful supporting detail, implementation notes, or historical context, but it must not override the canonical gameplay contract.

# ISLAND RUN STOPS — CANONICAL DESIGN (5 Stops / Steps)

> **Status:** Canonical. Authored 2026-03-03.
> **This file wins** if any other doc under `docs/` conflicts on stop ordering, stop IDs, or stop behaviour.
> Supersedes earlier descriptions in `docs/07_MAIN_GAME_PROGRESS.md` (the main progress doc defers to this file for stop details).

---

## 1. Terminology Lock

| Term | Definition |
|---|---|
| **Tile** | One of the 60 spaces on the looping dice board |
| **Stop / Step** | One of the 5 special nodes that sit *outside* the 60-tile ring. Reached by landing on a `stop` tile. |

**Do not use "stop" and "tile" interchangeably.** Tiles are on the board. Stops are the special actions outside the board.

---

## 2. The 5 Canonical Stops (fixed positions)

| Stop # | Stop ID | Tile Index (stop tile on board) | Name | Behaviour |
|---|---|---|---|---|
| 1 | `hatchery` | 0 | 🥚 Hatchery | The egg hatchery. The player either sets a new egg OR collects/sells a ready egg. **Must be resolved before the player can roll dice on a new island.** (Onboarding/orientation gate.) |
| 2 | `minigame` | 4 | 🎮 Mini-Game | Triggers the currently active global mini-game. Entry cost = island mini-game currency (tickets). |
| 3 | `mystery` | 8 | 🎭 Mystery Stop | A **blind box / mystery stop**. The content is unknown until opened. Could be: a gift, a task, a short story/webtoon panel, a life-goal reflection prompt, a bonus reward, a challenge — anything. Rotated/seeded per island. |
| 4 | `dynamic` | 12 | ⚡ Dynamic Stop | A flexible, semi-predictable stop. Common examples: a brief Life Wheel slice review (1–2 min timer/countdown), a quick goal check-in, a habit nudge, a utility action (heart refill, dice gift). Could also be a "countdown challenge" (30–120 second timed task). |
| 5 | `boss` | 16 | 👾 Boss | Always Stop 5. The island boss battle. Defeat to mark island as `boss_defeated` and unlock shop tiers. |

> **Hatchery and Mini-Game can swap position (Stop 1 ↔ Stop 2)** per island, as specified by the island definition. Default order: Hatchery = Stop 1, Mini-Game = Stop 2. When swapped, the **hatchery is still the onboarding gate** (wherever it falls, it must be resolved before dice roll if it is Stop 1; if it swaps to Stop 2, then there is no dice-block gate on that island).

---

## 3. Stop Ordering Notes

- **Stop 1 = Onboarding gate** (default: Hatchery). The player cannot roll dice on a new island until Stop 1 is resolved. This applies regardless of which stop ID occupies Stop 1.
- **Stop 5 = Always Boss.** This never changes.
- **Stops 2–4** can vary per island. The canonical assignment is:
  - Stop 2: Mini-Game (default) or Hatchery (when swapped with Stop 1)
  - Stop 3: Mystery Stop (blind box — always a surprise)
  - Stop 4: Dynamic Stop (timed/review/utility)

---

## 4. Mystery Stop (Stop 3) — Blind Box Design

The Mystery Stop is intentionally opaque. The player sees a sealed box/envelope icon on the board. When they land on the stop tile and open the Mystery Stop modal, the content is revealed. Possible content types (seeded per island, weighted):

| Weight | Content Type | Description |
|---|---|---|
| 3 | 🎁 Gift | Instant reward: coins, dice, hearts, or a shard |
| 2 | 📋 Task | Complete a short in-app action (log a habit, write a journal line, etc.) for a reward |
| 2 | 📖 Story | A short webtoon-style panel or narrative beat (lore of the island / world) |
| 2 | 🧭 Reflection | A single Life Wheel slice review or goal reflection prompt |
| 1 | 💥 Challenge | A mini-challenge with risk/reward (e.g. "answer in 30s or lose 10 coins") |
| 1 | 🌟 Bonus Island Event | A rare special event unique to this island/cycle |

Content is **deterministically seeded** per `(islandNumber, cycleIndex)` so it's consistent within a cycle but changes on the next cycle.

---

## 5. Dynamic Stop (Stop 4) — Flexible Actions

Stop 4 is predictable in flavour (the player knows it's a "do something useful" stop) but the specific action varies. Examples:

- 🕐 **Timed review:** A Life Wheel slice is shown with a 1–2 minute countdown; player rates it and optionally writes a note. Reward on completion.
- 🎯 **Goal check-in:** Review progress on one active goal; mark a step done or add a note. Reward on completion.
- 💊 **Utility bonus:** Receive a free heart top-up or dice bundle (no action required; just claim).
- 🏋️ **Habit nudge:** Reminder to complete a specific habit today; clicking through to log it awards a bonus.
- 🧠 **Community quiz pulse (occasional):** A single multiple-choice community question appears (for example: "I love tracking habits daily" with options like A/B/C player-style preferences). After answering, the player immediately sees aggregate community distribution (e.g. `20% A / 45% B / 35% C`). Questions can be scoped to a specific archetype/player-type cohort or to the full player base.

Dynamic Stop content is also **deterministically seeded** per `(islandNumber, cycleIndex)`.

### 5.1 Community Quiz Pulse — Planning Notes (v1 concept, implementation later)

- Build and maintain a bank of **100 community quiz questions** for recurring use across islands/cycles.
- Purpose: increase community feeling by letting players compare their style/preferences with others in real time.
- Quiz result reveal should happen **after answer submission** and show percentage split by option.
- Exact implementation details (sampling rules, anti-spam/answer integrity, cohort logic, refresh cadence, reward hooks) are intentionally deferred to a later dedicated build/design slice.

---

## 6. Implementation Status

- `islandRunStops.ts` currently uses IDs: `hatchery`, `minigame`, `utility`, `dynamic`, `boss` (5 entries: tiles 0, 4, 8, 12, 16).
- **Required updates:**
  - Rename the stop at tile 8 from `market` → `mystery` (it was called `market` in `islandBoardTileMap.ts`'s `STOP_INDICES`). Update `islandBoardTileMap.ts` and `islandRunStops.ts`.
  - Add Mystery Stop modal (`MysteryStopModal.tsx`) with blind-box reveal animation.
  - Add seeded content selector for Mystery Stop.
  - Update Dynamic Stop to support timed-review and goal-check-in variants.
  - Add an occasional Community Quiz variant (100-question bank, post-answer aggregate percentage reveal, cohort-or-global audience scope).
  - Add hatchery ↔ minigame swap logic per island definition.
