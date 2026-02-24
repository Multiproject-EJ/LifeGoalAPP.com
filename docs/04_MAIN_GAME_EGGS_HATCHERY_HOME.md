# EGGS + HATCHERY + HOME ISLAND (DETAILED)

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
- home   (home island eggs)
- dormant (ready but uncollected from an island)

---

## Hatchery stop (Stop 1)
Stop 1 is always present as a stop destination in the run.
But hatchery *availability* depends on rarity:

Spawn rate by rarity:
- normal: 40%
- seasonal: 60%
- rare: 100%

Special case:
- Island 1: hatchery guaranteed, tile 0

If hatchery does NOT spawn:
- Stop 1 still exists as a stop tile destination, but opens a “No Hatchery this Island” lightweight panel:
  - explains hatchery absent
  - suggests Home hatchery or market purchase
(Alternative: hide stop 1 on those islands. v1 recommendation: keep stop but “inactive”, to avoid UI inconsistencies.)

---

## Set Egg Rules
- On Island 1, force “Set Egg” on first hatchery visit (onboarding)
- On later islands:
  - if hatchery exists and no active island egg: allow set
  - if active island egg exists: show progress

Only 1 active island egg at a time (v1).

---

## Collect / Open Egg
Egg can only be opened when:
- stage == 4
AND
- player is at hatchery stop (landed)

Opening:
- consumes egg record (set opened_at)
- spawns rewards (see reward contract)
- optionally “sell” step via market

---

## Dormant Egg Creation
If:
- active island egg stage==4
AND
- island expires
AND
- egg not opened

Then:
- move egg location -> dormant
- keep island_number of origin
- egg remains openable only when player lands on hatchery in a future cycle

Dormant egg open condition:
- player lands on hatchery stop on an island where hatchery is present
- then UI shows “Dormant egg ready” tab

---

## Home Island Hatchery
Home hatchery is always available.

Rules:
- user can set home egg any time if slot available
- home egg can be opened any time after stage==4 without movement

Slots:
- 1 free slot (v1)
- + slots via life level later (v2)

---

## Reward Contract (output)
Define function:
`rollEggRewards(eggTier, seed) -> RewardBundle`

RewardBundle includes:
- heartsDelta
- currencyDelta
- spinTokensDelta
- boosters[] (optional)
- cosmetics[] (rare)

v1: keep simple
- common: small hearts, small currency, occasional spin
- rare: bigger bundle + guaranteed spin
- mythic: large bundle + cosmetic chance

---

## Egg Asset Naming (locked)
`/public/assets/eggs/<tier>/egg_<tier>_stage_1.png` ... stage_4.png

Creatures:
`/public/assets/eggs/creatures/creature_<tier>_001.png`

---

## Acceptance Tests
- Island 1 forces egg set
- Egg progresses stages over time
- Egg can only open at hatchery when ready
- On expiry: ready egg becomes dormant
- Dormant egg persists and can be opened later
- Home egg is always collectible
