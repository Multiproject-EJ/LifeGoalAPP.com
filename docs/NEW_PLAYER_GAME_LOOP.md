# New Player Game Loop — Island Run (first-session-to-retention)

> **Scope.** This document describes the **complete experience of a brand-new
> player** — from the very first app open through their first full island loop
> and their first return the next day. It is a player-journey + design spec,
> not a re-statement of the rules.
>
> **Authority.** This document is **subordinate** to
> [`docs/gameplay/CANONICAL_GAMEPLAY_CONTRACT.md`](./gameplay/CANONICAL_GAMEPLAY_CONTRACT.md).
> Every number, currency, and rule below conforms to that contract (v2.0).
> Where this doc and the contract disagree, **the contract wins**. Notably:
> **Hearts and Coins are fully retired** — they appear nowhere in this loop.
> The live currencies are **Dice 🎲, Essence 🟣, Egg Shards 🥚, Diamonds 💎,
> and Spin tokens 🎰**.

---

## 0) Who this is for

A "totally new player" is an account that, on this session:

- has **never set `onboarding_complete`**, and
- has **no Island Run runtime record** (or a freshly-seeded one), and
- is on **Island 1, cycle 0** (`effectiveIslandNumber = 1`), **Player Level 1**.

Their starting wallet (canonical, from `islandRunEconomy.ts` + the first-run
starter grant in `IslandRunBoardPrototype.tsx`):

| Resource | Start value | Source |
|---|---|---|
| Dice 🎲 | **30** | `ISLAND_RUN_DEFAULT_STARTING_DICE` (= the Level-1 regen floor, `30 + ⌊20·ln(1)⌋`) |
| Dice 🎲 (starter grant) | **+60** | `applyFirstRunStarterRewards` (`STARTING_DICE × 2`) on first-run claim |
| Essence 🟣 | **+250** | First-run starter grant |
| Diamonds 💎 | small starter (≈1) | Welcome pack |
| Egg Shards 🥚 | 0 | Earned from reward bar / stops / boss / egg sell |
| Spin tokens 🎰 | per welcome pack | Legacy-compat; not used for timed-event affordability |
| Player Level | **1** (min dice floor 30, full regen 0→30 in 2h) | `islandRunDiceRegeneration.ts` |

The design intent: a new player begins at the **same state a returning Level-1
player regenerates back up to**, so the first experience feels identical to a
"full tank" return — no special-case starting economy to balance.

---

## 1) The new-player loop at a glance

```
 APP OPEN (cold)
      │
      ▼
 ┌─────────────────────────────────────────────────────────────┐
 │ A. WELCOME      Founder welcome → claim starter pack         │
 │                 (+60 dice, +250 essence, starter cards)      │
 └─────────────────────────────────────────────────────────────┘
      │
      ▼
 ┌─────────────────────────────────────────────────────────────┐
 │ B. ORIENT       Guided "how to play" — board, dice, the      │
 │                 5 landmarks, the reward bar. Non-blocking.    │
 └─────────────────────────────────────────────────────────────┘
      │
      ▼
 ┌─────────────────────────────────────────────────────────────┐
 │ C. STOP 1 GATE  Hatchery — set the island egg to hatch.      │
 │                 FREE (ticket cost 0). Unlocks rolling +Stop 2.│
 └─────────────────────────────────────────────────────────────┘
      │
      ▼
 ┌──────────────── THE CORE SHORT LOOP (repeat) ───────────────┐
 │ D. ROLL → MOVE → LAND → FEED → REWARD BAR → CLAIM            │
 │    Spend dice (×1). 2d6 = 2–12 tiles. Land on currency/      │
 │    chest/micro/hazard. Feeding fills the reward bar →        │
 │    payouts (essence / occasional dice / tokens / stickers).  │
 └─────────────────────────────────────────────────────────────┘
      │  (essence accrues)
      ▼
 ┌─────────────────────────────────────────────────────────────┐
 │ E. SPEND        Pay stop tickets (30→70→130→220 essence) to  │
 │                 open Stops 2–5. Fund 5 buildings (L1→L3).    │
 └─────────────────────────────────────────────────────────────┘
      │
      ▼
 ┌─────────────────────────────────────────────────────────────┐
 │ F. STOPS 2–4    Habit → Mystery → Wisdom. Each is a small    │
 │                 in-game action. The Habit stop is the bridge │
 │                 to the real LifeGoal app.                     │
 └─────────────────────────────────────────────────────────────┘
      │
      ▼
 ┌─────────────────────────────────────────────────────────────┐
 │ G. BOSS (Stop 5) Final gate. Win → island clear conditions.  │
 └─────────────────────────────────────────────────────────────┘
      │
      ▼
 ┌─────────────────────────────────────────────────────────────┐
 │ H. CLAIM ISLAND CLEAR  (all 5 objectives + egg resolved +    │
 │                 all 5 buildings L3) → travel to Island 2.    │
 └─────────────────────────────────────────────────────────────┘
      │
      ▼
 ┌─────────────────────────────────────────────────────────────┐
 │ I. OUT OF DICE / SESSION END → retention hooks               │
 │    Dice regen (2h to floor) · daily treat · lucky spin ·     │
 │    habit→XP bridge · push nudge next morning.                │
 └─────────────────────────────────────────────────────────────┘
```

The **short loop (D)** is what the player does most. Everything else is
scaffolding that makes the short loop legible, rewarding, and connected to the
player's real life.

---

## 2) Stage A — Welcome (first 20 seconds)

**Goal:** give the player agency and a full tank before any explanation.

1. **Founder welcome** — a short, warm intro (one screen). No form, no
   commitment. This is *not* the legacy 20-step "Game of Life" onboarding (that
   was rebranded to the optional "Leap Progress" sprint and decoupled from
   first-run gating — see `onboardingFlowMap.ts`).
2. **Claim the starter pack** — one tap. The `WelcomePackModal` →
   `applyFirstRunStarterRewards` grants **+60 dice, +250 essence**, starter
   sanctuary cards, and a small diamond seed. The grant fires
   `first_run_starter_rewards` telemetry and is **idempotent** (a returning
   player never re-claims).

**Design rules**
- The starter pack is a **gift, not a paywall**. The player should feel rich
  enough to immediately *play*, not shop.
- Nothing here blocks. If the player dismisses the welcome, they still land on
  the board with their starter wallet intact.

---

## 3) Stage B — Orient (guided how-to-play, non-blocking)

**Goal:** teach the three things the player must understand to enjoy the short
loop, and nothing more.

The guided overlay highlights, in order:

1. **The dice button** — "Tap to roll. Each roll spends dice and moves you
   2–12 tiles." (Default multiplier is **×1**; the ×N amplifier stays hidden
   until they have a stash — see §6.)
2. **The reward bar** — "Landing on tiles fills this bar. Fill it to claim
   prizes." This is the central reinforcement channel; teach it early.
3. **The 5 landmarks** — the orbit HUD shows **Hatchery → Habit → Mystery →
   Wisdom → Boss**. "Complete all five in order to finish the island."

**Design rules (from the onboarding design principles)**
- **Saviour, not gatekeeper.** Orientation rescues a confused player; it never
  blocks a confident one. Every step is skippable.
- **Game-native UI.** Use island-themed pop-ups, not the PWA/account onboarding
  components.
- **No duplicate onboarding.** If the player already created a habit/goal in the
  PWA (`checkPWAOnboardingComplete`), skip the habit-setup beat in Stage F and
  auto-credit it — see §7.

On finishing (or skipping) orientation, `DayZeroOnboarding` records
`onboarding_complete` + telemetry. Setting this flag also **unlocks the Oracle
Wisdom boss variant** on eligible later islands.

---

## 4) Stage C — Stop 1: the Hatchery gate (the hook)

**Goal:** one tiny, meaningful action that "opens" the island and starts the
egg the player will care about all session.

- On a fresh island, **only Stop 1 (Hatchery) is open**; all other stops are
  closed. The Hatchery **never costs a ticket** (`ticket vector[0] = 0`).
- The player **sets the island egg to hatch**. That single act is the Stop 1
  *objective* — it immediately:
  - unlocks **Stop 2 (Habit)** for purchase, and
  - flips the Hatchery board marker to a **yellow checkmark** ("halfway"). It
    only turns **green** later when the creature is collected or sold.
- Setting the egg also gives the new player a **goal with a timer they can
  watch** (the egg incubates through 4 visible states), which is the
  longest-arc reason to keep returning this session.

**Why this is the hook:** the contract makes Stop 1 a *meaningful micro-action,
not a passive confirm*. The egg is emotional bait — the player now has
something hatching that is theirs.

> **New-player protection.** On a normal island, **encounter tiles do not
> appear until `dayIndex >= 2`** (contract §5F). A brand-new player therefore
> cannot be ambushed by a modal during their first two sessions on Island 1 —
> the short loop stays pure.

---

## 5) Stage D — The core short loop (roll → feed → claim)

This is the beating heart. A new player will do this dozens of times in session
one.

1. **Roll.** Tap dice. Cost = `1 × N` (N = ×1 for new players). Two standard
   dice produce **2–12 tiles** of movement. The multiplier never changes the
   *distance* — only cost and reward amplification (§6).
2. **Move & land.** The token walks the **40-tile `spark40_ring`** board.
   New players cannot assume a fixed tile count anywhere — movement wraps on the
   profile-derived count.
3. **Resolve the tile** (canonical catalogue, contract §5D):

   | Tile | Effect | Feel for a new player |
   |---|---|---|
   | `micro` (most common) | small essence + **reward-bar progress** | "I'm always making progress" |
   | `currency` | essence | "income" |
   | `chest` | essence bundle + reward-bar progress | "a bigger hit" |
   | `hazard` (rare on Island 1: weight 1) | **deducts essence** (never below 0) | "ooh, careful" — teaches risk gently |

   **Tiles never award dice or shards directly** (contract §3/§3A). Dice come
   only from the reward bar, stops, boss, events, spin, shop, and regen.
4. **Feed the reward bar.** Feeding tiles are the primary bar input. As the bar
   fills, the player claims payouts that **rotate deterministically**: Essence
   → Dice (occasional) → Minigame tokens → Sticker fragments. The **occasional
   dice payout is the new player's first "free roll" moment** — it teaches that
   playing well refills the tank.

**Pacing for Island 1:** with ~90 starting dice and a ×1 cost of 1 die/roll,
a new player gets roughly **90 rolls** before leaning on regen — more than
enough to open at least Stops 2–3 and fund early building levels in one sitting.

---

## 6) The ×N multiplier — intentionally hidden at first

The dice multiplier (`×1…×200`) is a power-user amplifier. For a new player it
should be **invisible/locked** beyond ×1, and reveal itself naturally:

- `×2` unlocks at a **2-dice pool**, `×3` at 3, `×5` at 5 — so it's technically
  available immediately, but the **orientation never mentions it**. The footer
  ×N affordance simply sits there until the player is curious.
- First time a new player taps it, surface a one-line tip: *"Higher multiplier =
  bigger essence and bigger reward-bar gains per roll… but hazards bite harder
  too, and each roll costs N dice."*
- It **auto-downgrades** (`clampMultiplierToPool`) if the pool drops below the
  tier threshold, so a new player can *never* get stuck with an un-rollable
  button. This is the key safety net that lets us expose it without a tutorial.

**Rule of thumb we are encoding:** the new player learns the *short loop* at ×1
first; the multiplier is a depth reward they discover, not a concept we
front-load.

---

## 7) Stage E + F — Spend essence, open Stops 2–4

Once essence accrues, the player converts board play into progression. Two
sinks compete for their essence — by design:

### Stop tickets (gates)
Opening each stop costs an essence **ticket** (contract §4), paid per-island:

| Stop | Ticket (base essence) |
|---|---|
| 1 Hatchery | **0** (always free) |
| 2 Habit | **30** |
| 3 Mystery | **70** |
| 4 Wisdom | **130** |
| 5 Boss | **220** |

The escalating curve is the anti-rush mechanism: a new player **must earn
essence on the board** before each new stop opens. With +250 starter essence,
they can open **Stop 2 immediately** and feel momentum, but Stop 5's 220 ticket
is a genuine session-long goal.

### Buildings (sinks)
Each stop also has a **building (L0→L3)** funded in the Build Panel (10 essence
per tap). Buildings are **decoupled** from stop unlock — a new player can pour
spare essence into building any time. All 5 buildings at **L3** is one of the
three island-clear conditions (§9).

> **Essence drift teaches "spend it."** Essence above 150% of the *remaining*
> island build cost decays at 0.5%/hour (capped 20%/session). A new player who
> hoards will see a small "−N 🟣" on next open — a gentle nudge to keep
> spending on tickets and builds rather than banking. Drift is **suspended**
> once the island is cleared.

### The Habit stop — the real-life bridge (Stop 2)
This is the single most important stop for retention. Its objective is a
**habit/action completion**, and it is the seam between the game and the
LifeGoal app:

- If the player **already has habits** (PWA onboarding complete), the stop can
  be satisfied by logging one — and per the "no duplicate onboarding" rule, an
  existing habit auto-credits.
- If the player has **no habits yet**, this is where we invite them to create
  their first one, framed in-game ("Your island needs a champion habit 🏝️"),
  not as a settings form.
- Completing a real habit also drives the **XP / player-level** system and
  (per the cross-system bridge) can award **minigame tokens** — making the real
  action immediately valuable inside the game.

Stops 3 (Mystery: breathing / check-in / action, rotating) and 4 (Wisdom:
story / questionnaire) are short, **fully in-game** actions — the player never
has to leave the game to clear a stop.

---

## 8) Stage G — Boss (Stop 5)

The final gate. For a new player on Island 1 this is an **easy fight-boss or
milestone check** (Island 1 is in the 1–20 easy band). The Oracle/Wisdom
variant requires `onboarding_complete` + at least one habit & goal; if the new
player hasn't met that, the boss **falls back to ShooterBlitz** with a tooltip
rather than blocking them.

Winning the boss:
- Completes the Stop 5 **objective** (one of the three clear conditions), and
- Pays a **major dice payout** — the biggest single dice injection of the
  island, which directly fuels the *next* island's opening rolls.

---

## 9) Stage H — Claim Island Clear → Island 2

An island is complete **only** when **all three** hold (contract §7):

1. All **5 stop objectives** complete (Hatchery→Habit→Mystery→Wisdom→Boss).
2. The Hatchery **egg is collected or sold** (the creature resolves — Hatchery
   marker turns **green**). On sell, the player **chooses** a shard or dice
   payout (agency).
3. All **5 buildings at L3**.

Then the Build Panel shows **"🎉 Claim Island Clear!"**. There is **no
auto-travel** — the player taps to advance to **Island 2**. On travel:
buildings reset to L0, **tickets must be re-paid**, the per-island egg slot
moves on (a left-behind egg is recoverable on a later cycle), and the
**dice pool carries over** (never reset).

This is the new player's first **"I finished a level"** beat — the macro reward
that justifies the whole session.

---

## 10) Stage I — Out of dice & next-day return (retention)

The loop is deliberately gated by **dice scarcity**, which is the monetization
and retention tension. When a new player runs low:

- **Passive dice regen** — a **minimum-roll floor**: below the Level-1 floor of
  **30 dice**, dice regenerate to that floor over **exactly 2 hours** (~1 roll
  / 8 min at Level 1). At/above the floor, **no regen** (so it can't trivialize
  a stocked player). Use `resolveFullRefillEtaMs` for the "back in N min"
  countdown — never an ad-hoc timer.
- **Daily treat** — once per UTC day, a dice/essence gift, surfaced via push at
  ~8am local.
- **Lucky Spin** — once per day, can output dice/essence/spin rewards.
- **Habit → XP → level** — completing real habits earns XP. Hitting **Level 2**
  raises the dice-regen floor (`30 + ⌊20·ln(2)⌋ = 43`), so the player's "full
  tank" grows. This is the core promise: *doing real-life habits makes the game
  better.*
- **Timed event** — exactly one global timed minigame is active (Feeding
  Frenzy 🔥 / Lucky Spin 🎰 / Space Excavator 🚀 / Companion Feast 🐾). The new
  player has been quietly earning its **tokens** from the reward bar; their
  first event participation is a natural "come back" reason.

**Next-morning re-entry (the second session):** push nudge → app open →
**daily treat + regenerated dice + an egg that has incubated further** →
straight back into the §5 short loop, now possibly on **Island 2** with Stop
tickets and buildings fresh. By day 2, `dayIndex >= 2`, so **encounter tiles
switch on**, adding variety exactly when the player is ready for it.

---

## 11) The new-player "first 5 minutes" success criteria

A new player session is well-designed if, within ~5 minutes, the player has:

1. ✅ Claimed the starter pack (felt rich).
2. ✅ Set their egg (has something to care about).
3. ✅ Rolled at least 10 times and **claimed the reward bar at least once**
   (understood the short loop).
4. ✅ Opened **Stop 2 (Habit)** with earned/starter essence (felt progression).
5. ✅ Seen at least one **"free dice" reward-bar payout** (understood that
   playing refills the tank).

And, within session one, ideally:

6. ✅ Cleared **Island 1** (macro win), or at minimum reached the Boss.
7. ✅ Logged **one real habit** via the Habit stop (the retention bridge).

---

## 12) What a new player must **never** hit

Guardrails specific to the new-player path (all derived from the canonical
contract):

- ❌ **No hearts, no coins.** They are retired. Any UI/string implying a heart
  or coin economy is a regression.
- ❌ **No un-rollable dice button.** ×N auto-downgrades; regen guarantees a
  floor.
- ❌ **No encounter-modal ambush** in the first two sessions on Island 1
  (`dayIndex < 2` gate).
- ❌ **No hard onboarding wall.** Every orientation step is skippable; Stop 1
  has no fail state; the Oracle boss falls back rather than blocking.
- ❌ **No island timer pressure.** Island completion is **not** time-based;
  nothing auto-fails or auto-advances the new player's island.
- ❌ **No duplicate onboarding** for players who already set up habits/goals in
  the PWA.

---

## 13) Telemetry to confirm the loop works

Minimum events to instrument the new-player funnel (most already exist):

| Step | Event |
|---|---|
| Starter claimed | `first_run_starter_rewards` |
| Orientation done | `onboarding_completed` |
| Egg set (Stop 1) | `home_egg_set` / stop-1 objective complete |
| First reward-bar claim | reward-bar payout telemetry |
| First stop ticket paid | stop-ticket purchase telemetry |
| First habit via Habit stop | habit-completion + XP award |
| Island 1 cleared | island-clear telemetry |
| Day-2 return | daily login (5 XP) + daily treat claim |

Funnel drop-off between **"egg set"** and **"first reward-bar claim"** is the
single most important number to watch — it tells us whether the short loop is
legible without a tutorial.

---

## 14) Related documents

- **Authority:** [`docs/gameplay/CANONICAL_GAMEPLAY_CONTRACT.md`](./gameplay/CANONICAL_GAMEPLAY_CONTRACT.md)
- Onboarding design principles & in-game rescue UX:
  [`docs/ISLAND_GAME_ONBOARDING_AND_CONTINUOUS_IMPROVEMENT.md`](./ISLAND_GAME_ONBOARDING_AND_CONTINUOUS_IMPROVEMENT.md)
- Player level / XP / dice-regen detail:
  [`docs/gameplay/CANONICAL_GAMEPLAY_CONTRACT.md`](./gameplay/CANONICAL_GAMEPLAY_CONTRACT.md) §3B,
  `islandRunDiceRegeneration.ts`, `islandRunEconomy.ts`
- Stops & landmarks: [`docs/16_ISLAND_RUN_STOPS_CANONICAL.md`](./16_ISLAND_RUN_STOPS_CANONICAL.md)
- Currencies: [`docs/17_CURRENCIES_AND_SHIELD.md`](./17_CURRENCIES_AND_SHIELD.md)

> ⚠️ The economy/level tables in
> [`docs/12_MINIGAME_BOSS_ECONOMY_PLAYER_LEVEL_DESIGN.md`](./12_MINIGAME_BOSS_ECONOMY_PLAYER_LEVEL_DESIGN.md)
> predate the v2.0 contract and still reference **hearts**. Treat that doc as
> historical context only; this new-player loop follows the **current**
> dice/essence model.
</content>
</invoke>
