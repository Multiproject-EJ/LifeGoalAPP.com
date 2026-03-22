# EGGS + HATCHERY (DETAILED)

## Egg tiers
- common
- rare
- mythic

## Egg stages (4)
1) smooth
2) mostly gold (no cracks)
3) cracked
4) ready to open

Stage is derived from progress to hatch_at.

---

## Hatch time
When setting egg:
- hatchDelayHours = random integer between 24 and 72
- hatch_at = now + hatchDelayHours

---

## Where eggs live
Egg location enum:
- island  (current island egg)
- dormant (ready but uncollected from an island)

---

## Hatchery stop (Step 1)
Step 1 (Hatchery) is always the first stop on every island and must be completed before the
player can roll dice (it is the onboarding/orientation gate for each island).

Each island has **exactly one egg slot** that is permanent and non-renewable across all cycles.
Once an egg on a given island has been sold or collected, that island never provides a new egg
— even when the player returns on cycle 2 or later.

Special case:
- Island 1: hatchery is guaranteed and is the forced first action (onboarding).

The egg timer (`hatch_at`) is set when the egg is placed and runs from that point,
**regardless of the player’s current location**.  If the player travels to another island
before the egg hatches, the timer keeps running.  The egg can be collected/sold when the
player revisits that island on a future cycle.

Multiple dormant or hatched-but-unclaimed eggs may exist across different islands simultaneously.

---

## Set Egg Rules
- On Island 1, force “Set Egg” on first hatchery visit (onboarding).
- On later islands:
  - if the island egg slot has never been used: allow set.
  - if an active island egg exists (in progress or hatched-but-uncollected): show progress.
  - if the island egg was already sold/collected: show “Egg already collected — no new egg
    on this island” (permanent; non-renewable).

---

## Resolve Hatched Egg
Egg can be resolved when:
- `stage == 4` (i.e., `now >= hatch_at`)

The player **does not need to be on the island at hatch time**.  If the egg hatched while
the player was away or on another island, the egg remains on that island in a hatched-but-
uncollected state and can be collected/sold when the player revisits the island on a future
cycle.

Current hatchery flow:
- **Collect Creature** → clears the active egg, marks the island egg as `collected`, and reserves
  the species for the ship manifest / future sanctuary systems.
- **Sell for Rewards** → clears the active egg, marks the island egg as `sold`, and grants the
  tier-based reward bundle immediately.

---

## Dormant / Unclaimed Egg Persistence
Because the egg hatch timer runs regardless of player location, an egg may hatch while the
player is away.  When the island expires (timer runs out):

- If the egg is hatched (`stage == 4`) but not yet collected, it stays on that island in a
  **hatched-but-unclaimed** state (`location = dormant`).
- The `island_number` of origin is preserved so the egg can be located later.
- The egg remains collectable/sellable the next time the player visits that island on a
  future cycle (it does **not** disappear).

Multiple dormant eggs may exist across different islands simultaneously.

Dormant egg collect condition:
- Player visits (or revisits) the island on any future cycle.
- The UI surfaces a “Dormant egg ready” prompt when visiting the hatchery stop on that island.

---

## Reward Contract (output)
Define function:
`rollEggRewards(eggTier, seed) -> RewardBundle`

RewardBundle includes:
- heartsDelta (Hearts — persistent app-wide energy)
- coinsDelta (Coins — app-wide currency)
- diamondsDelta (Diamonds — premium app-wide currency; 1 diamond = 1,000 coins)
- spinTokensDelta
- boosters[] (optional)
- cosmetics[] (rare)

v1: keep simple
- common: small hearts, small coins, occasional spin
- rare: bigger bundle + guaranteed spin
- mythic: large bundle + cosmetic chance

Current implementation notes:
- Island eggs use `rollEggRewards(...)` when the player chooses **Sell for Rewards** in the
  hatchery overlay.
- Reward output is deterministic per egg because the seed is the egg's `set_at` timestamp.

Current v1 reward schedule in code:
- common → `+1 heart`, `+5–19 coins`, `25%` chance of `+1 spin token`
- rare → `+2 hearts`, `+20–49 coins`, `+1 spin token`
- mythic → `+3 hearts`, `+75–124 coins`, `15%` chance of `+1 diamond`, `+2 spin tokens`,
  `30%` chance of cosmetic

Additional current rewards:
- Selling a hatched creature also awards `+2 wallet shards`.

---

## Egg Asset Naming (locked)
`/public/assets/eggs/<tier>/egg_<tier>_stage_1.png` ... stage_4.png

Creatures:
`/public/assets/eggs/creatures/creature_<tier>_001.png`

---

## Acceptance Tests
- Island 1 forces egg set (onboarding gate)
- Egg hatch timer runs from `set_at` regardless of player location
- Egg can be resolved when `stage == 4` with an immediate **Collect Creature** or **Sell for Rewards** choice
- If egg hatched while player was away, egg is in dormant/unclaimed state on that island
- Multiple dormant eggs can exist simultaneously across different islands
- Once an island egg is sold/collected, that island never provides a new egg (non-renewable)
- Dormant egg persists and can be opened when player revisits the origin island
