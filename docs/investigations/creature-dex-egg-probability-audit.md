# Creature Dex, Egg, Card, and Hatch Probability Audit

**Date:** 2026-06-09  
**Type:** Investigation only — no code was changed  
**Scope:** Full creature collection system: catalog, eggs, hatching, packs, acquisition sources, probabilities, economy balance

---

## 1. Executive Summary

The creature collection system is **substantially implemented and production-facing**. It includes a 45-creature catalog across three rarity tiers, a weighted egg-tier roll, a deterministic seed-based creature selection, a 5-card booster pack system with guaranteed new-creature protection, and a Supabase-backed ownership ledger. Real probability weights exist at every key decision point.

The critical finding is that **mythic creatures are currently inaccessible through any legitimate automated reward path.** Eggs can roll mythic tier (5% chance), but no production reward source currently delivers those eggs to players in volume. Pack slots are capped at common/rare (no mythic slot weights exist in `STANDARD_CREATURE_PACK_SLOT_WEIGHTS`). The treasure path delivers only common/rare eggs. Admin grants are capped to common/rare eggs. So mythic creatures sit in the catalog with no practical route to collection for ordinary players.

There is **no pity timer, no bad-luck protection, and no duplicate-soft-landing** (selling duplicates for meaningful value). The emotional "chase" — the core loop of a collection game — is underdeveloped. Common-tier creatures dominate all pack openings and have 70% probability in egg hatching.

The system is production-ready structurally (Supabase state, Stripe purchase flow, onboarding packs, UI), but needs economy design work before it can support sustained engagement.

---

## 2. Current Implementation Map

### 2.1 Core Services

| File | Purpose | Production? | Affects Player State? |
|---|---|---|---|
| `src/features/gamification/level-worlds/services/creatureCatalog.ts` | 45-creature definition catalog; rarity tiers; companion bonuses; island-featured pools; `selectCreatureForEgg()` | YES | YES |
| `src/features/gamification/level-worlds/services/eggService.ts` | Egg tier roll (70/25/5); hatch delay (24–72 h); egg reward payouts by tier; sell rewards | YES | YES |
| `src/features/gamification/level-worlds/services/islandRunCreaturePackResolver.ts` | 5-card booster pack builder; weighted slot tiers; guaranteed-new logic | YES | YES |
| `src/features/gamification/level-worlds/services/islandRunGameStateStore.ts` | Zustand store; authoritative creature collection in Supabase | YES | YES |
| `src/features/gamification/level-worlds/services/islandRunCreatureCollectionLedger.ts` | Runtime ledger ops (add creature, increment copies, update bond) | YES | YES |
| `src/features/gamification/level-worlds/services/creatureCollectionService.ts` | Legacy localStorage-backed collection (fallback/UI only, non-authoritative) | Fallback only | Indirectly |
| `src/features/gamification/level-worlds/services/creatureCollectionProgress.ts` | Formats "08/45" progress display | YES | NO |
| `src/features/gamification/level-worlds/services/creatureSanctuaryAdapter.ts` | Sanctuary gallery model builder (discovery, copies, bond, eggs) | YES | NO |
| `src/features/gamification/level-worlds/services/creatureCardCatalog.ts` | Card display metadata (flavor, passives, stats) | YES | NO |
| `src/features/gamification/level-worlds/services/creatureCardV2Adapter.ts` | v2 card rendering adapter | YES | NO |

### 2.2 Acquisition Services

| File | Purpose | Production? |
|---|---|---|
| `src/features/gamification/level-worlds/services/islandRunFirstSessionCreaturePackAction.ts` | Onboarding welcome pack (5 cards, min 2 new, +100 dice) | YES |
| `src/features/gamification/level-worlds/services/islandRunWelcomePackClaimAction.ts` | One-time welcome pack starter cards (5 cards, min 2 new) | YES |
| `src/features/gamification/level-worlds/services/islandRunWelcomePackRewardBundleAction.ts` | Welcome pack resource bundle (150 dice, 2000 essence, 20 tickets) | YES |
| `src/features/gamification/level-worlds/services/islandRunTreasurePathEggReward.ts` | Treasure path egg reward (1% rare, 99% common) | YES |
| `src/features/gamification/level-worlds/services/islandRunEggRewardInventoryAction.ts` | Opens egg inventory entries; resolves creature via `selectCreatureForEgg()` | YES |
| `src/features/gamification/level-worlds/services/islandRunLuckyRollAction.ts` | Lucky Roll board; can award eggs | YES |
| `src/features/gamification/level-worlds/services/islandRunEggMania.ts` | Egg Mania: up to 3 eggs/island on 4 scheduled islands per cycle | YES (feature flag) |
| `src/features/gamification/level-worlds/services/islandRunAdminDevPackGrantAction.ts` | Admin/dev creature and egg grants (max 12 each, common/rare eggs only) | DEV/ADMIN only |
| `src/services/creaturePackPurchases.ts` | Stripe-backed creature pack purchase tracking | YES |
| `supabase/functions/create-checkout-session-creature-pack/index.ts` | Stripe checkout session for pack purchase | YES |
| `supabase/functions/stripe-webhook/index.ts` | Stripe webhook; fulfills purchased packs | YES |

### 2.3 Companion and Bond Services

| File | Purpose | Production? |
|---|---|---|
| `src/features/gamification/level-worlds/services/companionRegenModifier.ts` | Companion bonus regen by affinity + bond level | YES |
| `src/features/gamification/level-worlds/services/creatureFitEngine.ts` | Perfect companion ranking by hand archetype match | YES |
| `src/features/gamification/level-worlds/services/perfectCompanionConfig.ts` | Perfect companion selection config | YES |
| `src/features/gamification/level-worlds/services/creatureTreatInventoryService.ts` | Treat inventory (basic, favorite, rare treats) | YES |

### 2.4 UI Components

| File | Purpose | Production? |
|---|---|---|
| `src/features/gamification/level-worlds/components/CreatureCard.tsx` | Card display | YES |
| `src/features/gamification/level-worlds/components/CreatureGridCard.tsx` | Sanctuary grid tile | YES |
| `src/features/gamification/level-worlds/components/CreatureHatchRevealModal.tsx` | Hatch reveal animation | YES |
| `src/features/gamification/level-worlds/components/CreaturePackOpeningPrototypeModal.tsx` | Pack opening reveal UI (noted as prototype) | YES (with prototype caveat) |
| `src/features/gamification/level-worlds/components/FirstSessionCreaturePackModal.tsx` | First session pack UI | YES |

### 2.5 Database

| File | Purpose |
|---|---|
| `supabase/migrations/0191_island_run_creature_collection_sync.sql` | Adds `creature_collection` JSONB and `active_companion_id` to `island_run_runtime_state` |

---

## 3. Creature Catalog Counts by Tier

**Total creatures: 45**

| Tier | Count | Example creatures | Obtainable today? | Notes |
|---|---:|---|---|---|
| Common | 15 | common-sproutling, common-glowtail, common-fern-fox | YES | Available via packs, common eggs |
| Rare | 15 | rare-luma-hatchling, rare-aurora-finch, rare-ember-sprout | YES (limited) | Pack slots 1–4 have 5–20% rare odds; treasure path eggs 1% rare |
| Mythic | 15 | mythic-starhorn-seraph, mythic-voidlight-familiar, mythic-sunflare-kirin | NOT IN PRACTICE | Egg roll includes 5% mythic tier, but no production reward source delivers mythic eggs in volume; pack weights have no mythic slot |

### Full Catalog

**Common (15)**

| ID | Island/Habitat | Affinity |
|---|---|---|
| common-sproutling | Zen Garden | Builder |
| common-pebble-spirit | Root Atrium | Grounded |
| common-mossling | Moss Gallery | Nurturer |
| common-glowtail | Hydro Deck | Steady |
| common-drift-pup | Zen Garden | Explorer |
| common-bloom-mite | Root Atrium | Caregiver |
| common-stone-hopper | Moss Gallery | Builder |
| common-fern-fox | Hydro Deck | Mentor |
| common-dewling | Zen Garden | Peacemaker |
| common-root-whisp | Root Atrium | Steady |
| common-garden-puff | Moss Gallery | Nurturer |
| common-lichen-kit | Hydro Deck | Grounded |
| common-twilight-seed | Zen Garden | Dreamer |
| common-river-bud | Hydro Deck | Caregiver |
| common-petal-scout | Root Atrium | Explorer |

**Rare (15)**

| ID | Island/Habitat | Affinity |
|---|---|---|
| rare-luma-hatchling | Zen Garden | Visionary |
| rare-nebula-wisp | Astral Dome | Explorer |
| rare-dewleaf-sprite | Hydro Deck | Guardian |
| rare-aurora-finch | Sky Foundry | Visionary |
| rare-ember-sprout | Ember Lab | Catalyst |
| rare-solar-pika | Solar Orchard | Champion |
| rare-comet-cub | Engine Wing | Strategist |
| rare-bloom-seraph | Zen Garden | Mentor |
| rare-shard-marten | Sky Foundry | Architect |
| rare-cinder-mouse | Ember Lab | Challenger |
| rare-tide-lantern | Hydro Deck | Peacemaker |
| rare-halo-staglet | Solar Orchard | Guardian |
| rare-gear-wing | Engine Wing | Builder |
| rare-mirage-pup | Astral Dome | Creator |
| rare-crown-drifter | Sky Foundry | Explorer |

**Mythic (15)**

| ID | Island/Habitat | Affinity |
|---|---|---|
| mythic-starhorn-seraph | Astral Dome | Oracle |
| mythic-voidlight-familiar | Dream Observatory | Visionary |
| mythic-sunflare-kirin | Aurora Bridge | Radiant |
| mythic-dreamroot-ancient | Star Archive | Sage |
| mythic-celest-pup | Astral Dome | Cosmic |
| mythic-lux-leviathan | Aurora Bridge | Commander |
| mythic-orbit-vulpine | Dream Observatory | Explorer |
| mythic-astral-titanet | Star Archive | Architect |
| mythic-solstice-sylph | Aurora Bridge | Creator |
| mythic-echo-phoenix | Dream Observatory | Champion |
| mythic-nightbloom-drake | Astral Dome | Rebel |
| mythic-prism-warden | Star Archive | Guardian |
| mythic-aurora-maned-cat | Aurora Bridge | Visionary |
| mythic-cosmos-songbird | Dream Observatory | Sage |
| mythic-infinity-sprite | Astral Dome | Oracle |

**Rarity and gameplay impact:**
- Common tier: accessible, drives early collection
- Rare tier: available but uncommon, produces most "pull" excitement currently
- Mythic tier: catalog-defined, companion bonuses exist in code, but practically unobtainable through normal play as of audit date

---

## 4. Acquisition Source Map

| Source | File path | Reward type | Real/prod or dev/test | Probability/condition | Notes |
|---|---|---|---|---|---|
| First Session Creature Pack | `islandRunFirstSessionCreaturePackAction.ts` | 5 creature cards (common/rare mix) + 100 dice | PROD | One-time; triggers on island 1, cycle 0, after tutorial state `first_creature_pack_available` | Guaranteed ≥2 new creatures |
| Welcome Pack Starter Cards | `islandRunWelcomePackClaimAction.ts` | 5 creature cards (common/rare mix) | PROD | One-time; gated by `welcomePackClaimed` flag | Guaranteed ≥2 new creatures; slot weights escalate toward rare |
| Welcome Pack Resource Bundle | `islandRunWelcomePackRewardBundleAction.ts` | 150 dice, 2000 essence, 20 event tickets | PROD | One-time; gated by `welcomePackRewardBundleClaimed` | No creatures |
| Lucky Roll Board | `islandRunLuckyRollAction.ts` | Egg (among dice/essence/shards) | PROD | When egg tile is landed; board tile composition unknown | Egg enters `eggRewardInventory` as unopened |
| Treasure Path Egg | `islandRunTreasurePathEggReward.ts` | Egg (common 99%, rare 1%) | PROD | After completing a Lucky Roll on treasure path milestones | Seed-based rarity roll; determinate per user+roll |
| Egg Inventory Opening | `islandRunEggRewardInventoryAction.ts` | Creature (tier = egg tier) | PROD | When player opens an egg from inventory | Deterministic creature selection via seed + tier + island |
| Egg Mania Islands | `islandRunEggMania.ts` | Up to 3 eggs per scheduled island | PROD (feature flag) | 4 scheduled islands/cycle, deterministically selected | Egg tier follows standard `rollEggTierWeighted()` |
| Hatchery Stop (per-island egg) | `creatureCatalog.ts`, `eggService.ts` | Creature (after 24–72 h incubation) | PROD | Egg set when player lands on hatchery stop (index 0) | Tier rolled at placement; creature resolved at hatch |
| Creature Pack Purchase | `creaturePackPurchases.ts`, Stripe functions | 5 creature cards (common/rare mix) | PROD | Paid; Stripe checkout | Same slot weights as welcome pack; guaranteed ≥2 new |
| Island Run Tiles | `islandRunTileRewardAction.ts` | Essence, dice (no direct creature reward) | PROD | Per tile landed | No direct creature/egg reward |
| Reward Bar | `islandRunContractV2RewardBar.ts` | Dice → essence → minigame_tokens → sticker_fragments (cycling) | PROD | Per island completion | No creature/egg reward |
| Space Excavator Milestones | `spaceExcavatorCampaignProgress.ts` | Essence, dice, shards, bundles | PROD | Per milestone (clear_1 to clear_35) | No creature rewards in current config |
| Daily Treats Calendar | `src/services/dailyTreats.ts` | Gold/dice | PROD | Per day | No creature rewards |
| Admin/Dev Grant | `islandRunAdminDevPackGrantAction.ts` | Up to 12 specific creatures OR up to 12 common/rare eggs + optional dice/essence | DEV/ADMIN only | Requires `grantSource: 'dev'|'admin'` and `allowGrant: true` | Idempotency via `grantId`; mythic eggs not grantable via this path |

---

## 5. Current Probability Calculations

### 5.1 Egg Tier Roll (`rollEggTierWeighted()`)

Called when an egg is placed on the hatchery stop.

| Outcome | Probability |
|---|---:|
| Common egg | 70.0% |
| Rare egg | 25.0% |
| Mythic egg | 5.0% |

Source: `eggService.ts`

```typescript
export function rollEggTierWeighted(): EggTier {
  const roll = Math.random();
  if (roll < 0.70) return 'common';
  if (roll < 0.95) return 'rare';
  return 'mythic';
}
```

> **Note:** This roll only occurs on per-island hatchery eggs. Treasure path eggs are separately assigned (see §5.3). Egg Mania eggs presumably use this same roll.

### 5.2 Creature Pack Slot Weights (`STANDARD_CREATURE_PACK_SLOT_WEIGHTS`)

Each pack has 5 slots. Slot 0 is always common. Slots 1–4 escalate toward rare.

| Slot | Common | Rare | Mythic |
|---|---:|---:|---:|
| 0 | 100% | 0% | 0% |
| 1 | 95% | 5% | 0% |
| 2 | 90% | 10% | 0% |
| 3 | 85% | 15% | 0% |
| 4 | 80% | 20% | 0% |

**Probability of getting exactly 0 rare cards in a 5-card pack:**

P(0 rares) = 1.00 × 0.95 × 0.90 × 0.85 × 0.80 = **0.5814 (≈ 58.1%)**

**Probability of getting at least 1 rare card:**

P(≥1 rare) ≈ **41.9%**

**Expected number of rare cards per pack:**

E(rares) = 0 + 0.05 + 0.10 + 0.15 + 0.20 = **0.50 rare cards per pack on average**

**Mythic probability per pack: 0%** — no mythic slot weight exists in standard packs.

### 5.3 Treasure Path Egg Rarity

```typescript
export const TREASURE_PATH_EGG_RARITY_ROLL_DENOMINATOR = 500;
export const TREASURE_PATH_RARE_EGG_THRESHOLD = 5;
// rarityRoll % 500 < 5 → rare
```

| Outcome | Probability |
|---|---:|
| Rare egg | 1.0% (5/500) |
| Common egg | 99.0% |
| Mythic egg | 0% |

> **Confirmed code behavior.** The treasure path never produces mythic eggs.

### 5.4 Creature Selection Within Tier (`selectCreatureForEgg()`)

```typescript
const pool = CREATURES_BY_TIER[eggTier]; // 15 creatures per tier
const index = Math.abs((seed * 17) + (islandNumber * 31)) % pool.length;
return pool[index] ?? pool[0];
```

**Assuming uniform distribution across the 15-creature pool (not proven — depends on seed distribution):**

| Outcome | Implied probability |
|---|---:|
| Any specific common creature | ~6.67% (1/15) |
| Any specific rare creature | ~6.67% (1/15) |
| Any specific mythic creature | ~6.67% (1/15) |

> **This is implied by equal random selection, not a confirmed uniform distribution.** The hash formula `(seed * 17 + islandNumber * 31) % 15` is deterministic and biased by both the seed generator and island number. Without a statistical analysis of real seeds, exact per-creature odds cannot be confirmed. Treat as approximately uniform.

### 5.5 Early Featured Pool (Islands 1–5)

For islands 1–5, creature selection uses a curated "featured pool":

```typescript
const shouldUseFeaturedPool =
  Math.abs((seed * 29) + (islandNumber * 13) + (eggTier.length * 7)) % 100
  < featuredWeightPercent; // default: 70
```

| Outcome | Probability |
|---|---:|
| Creature from featured pool for this island | ~70% |
| Creature from full tier pool | ~30% |

The featured pool for island 1 is:
- Common: `['common-sproutling']`
- Rare: `['rare-ember-sprout', 'rare-aurora-finch']`
- Mythic: `['mythic-starhorn-seraph']`

So for a common egg on island 1, a new player has approximately:
- 70% chance of getting `common-sproutling` specifically
- 30% chance spread across the other 14 common creatures

> **Confirmed code behavior.**

### 5.6 Probability of Getting a Specific Creature from a Single Pack Opening

Assumptions: paid/welcome pack, slots 0–4, featured pool not active (island > 5), uniform creature selection.

For a **specific rare creature:**

- Probability any single slot is rare (weighted avg of slots 0–4): (0 + 0.05 + 0.10 + 0.15 + 0.20) / 5 = **10% per slot**
- Given slot is rare, probability of specific rare: 1/15 ≈ 6.67%
- Per-slot probability of specific rare: 0.10 × 0.0667 ≈ **0.67%**
- Probability NOT getting specific rare in 5-card pack: (1 - 0.0067)^5 ≈ 96.7%
- **P(specific rare in one pack) ≈ 3.3%**

For a **specific common creature:**

- Per-slot probability: 0.90 avg × (1/15) ≈ 6.0%
- P(specific common NOT in 5-card pack) ≈ (1 - 0.06)^5 ≈ 73.4%
- **P(specific common in one pack) ≈ 26.6%**

For a **specific mythic creature:**

- **P = 0% from standard packs.** Mythic creatures are currently inaccessible through packs.

### 5.7 Egg Hatch Payouts (Not Creatures — Currency Rewards from "Selling" Eggs)

These are the resource rewards when a hatched/opened egg yields currency rather than tracking a creature. Based on `eggService.ts`:

| Tier | Essence | Shards | Spin tokens | Diamonds | Cosmetic |
|---|---|---|---|---|---|
| Common | 3–10 | 1 | 25% chance of 1 | 0 | 0% |
| Rare | 10–24 | 2–3 | 1 (guaranteed) | 0 | 0% |
| Mythic | 30–54 | 4–6 | 2 (guaranteed) | 15% chance of 1 | 30% chance |

> **Note:** It is unclear from this audit whether these payouts are given *instead of* or *in addition to* creature rewards. The service is named `rollEggRewards()` suggesting additional currency, but the integration point needs separate investigation.

### 5.8 Duplicate Probability

**Within a single pack:** Deduplication logic in `chooseCreatureForSlot()` prevents the same creature appearing twice in one pack.

**Across packs:** No cross-pack duplicate protection. After the initial onboarding packs (which guarantee ≥2 new creatures), subsequent packs can and will produce creatures already owned. The system tracks `copies` but provides no soft landing (no meaningful dupe-to-currency conversion beyond egg sell rewards).

**Probability of complete collection:**

This depends on: number of packs opened, egg hatches, and sources active. No enough data exists to calculate a clean "expected packs to complete" number. However:

- 15 common creatures, accessible through packs and common eggs
- 15 rare creatures, accessible only through pack rare slots (≈10% per slot) and rare eggs (1% of treasure path eggs, 25% of hatchery eggs)
- 15 mythic creatures: **No practical path to collect today**

---

## 6. Egg System Audit

### 6.1 Where Egg State Is Stored

- **Per-island incubating eggs:** `perIslandEggs` ledger within `island_run_runtime_state` (Supabase JSONB)
- **Egg reward inventory (unopened from Lucky Roll / treasure path):** `eggRewardInventory` array in `island_run_runtime_state`
- **Legacy fallback:** localStorage (non-authoritative)

### 6.2 Egg Types

There are two conceptually distinct egg systems:

1. **Per-island hatchery eggs** — placed when player lands on hatchery stop (index 0); tier assigned via `rollEggTierWeighted()` at placement; hatch after 24–72 hours; creature resolved at hatch
2. **Egg reward inventory entries** — granted by Lucky Roll or treasure path; stored as unopened; tier pre-assigned at grant time; player opens manually; creature resolved at open

Both types follow the same creature selection logic (`selectCreatureForEgg()`), but their tier assignment sources differ.

### 6.3 Egg System Detail Table

| Egg type/source | How obtained | Hatch behavior | Odds | Canonical state updated? | Risk/notes |
|---|---|---|---|---|---|
| Hatchery stop egg | Land on island hatchery stop (index 0) | Incubates 24–72 h randomly; auto-resolves to creature on hatch | 70% common / 25% rare / 5% mythic tier roll | YES — Supabase `creature_collection` updated | 5% mythic tier possible here (only route) |
| Treasure path egg | Awarded after Lucky Roll completion on treasure path | Stored in `eggRewardInventory`; player opens manually | 99% common / 1% rare | YES | Mythic tier not grantable here |
| Lucky Roll egg tile | Land on egg tile in Lucky Roll board | Stored in `eggRewardInventory`; player opens manually | Unknown — depends on Lucky Roll board tile composition | YES | Tier assignment mechanism unclear for this source; needs separate audit |
| Egg Mania island eggs | Feature-flag-controlled; up to 3 eggs on 4 scheduled islands/cycle | Standard hatchery flow | Presumably same 70/25/5 roll | YES | Feature flag must be active |
| Admin/dev grant egg | Dev/admin tooling only | Stored in `eggRewardInventory` | Only common or rare tiers grantable | YES | Mythic excluded from admin grants |

### 6.4 Hatching Implementation Status

**Hatching IS implemented** end-to-end:

1. Egg placed → tier rolled → hatch delay calculated → stored as `status: 'incubating'` with `hatchAtMs`
2. UI shows 4 visual stages (smooth → mostly gold → cracked → ready to open)
3. Player opens when ready → `selectCreatureForEgg(tier, seed, islandNumber)` resolves to specific creature
4. Creature added to `creatureCollection` with `copies++`, timestamps, bond XP initialized

**What is NOT implemented:**
- Mythic egg delivery at scale (eggs can roll mythic, but practically no player receives them regularly)
- Pity timer (no protection if every egg lands common)
- Ownership-aware hatching (if you already own the creature, you get a duplicate with no protection)
- Per-island creature pool restriction (same full 15-creature pool regardless of island, except featured pool on islands 1–5)

---

## 7. Pokémon-Style Comparison Table

Reference context: Pokémon Base Set, 1999. A booster pack contained 11 cards, roughly 1 guaranteed rare, ~1/3 packs contained a holo rare (≈33%), probability of a specific holo: ~3%. Big 3 (Charizard/Blastoise/Venusaur holos): ~1% each.

| Chase outcome | Pokémon analogy | Current app equivalent | Current odds |
|---|---|---|---:|
| Any rare in a pack | Any rare card in booster | At least 1 rare creature card from a 5-card pack | ~41.9% per pack |
| Specific rare | Specific rare (non-holo) | Specific rare creature from a pack | ~3.3% per pack |
| Specific holo rare | Specific holo rare | No direct equivalent (no mythic pack slot) | **0% from packs** |
| Any holo rare | Any holo rare | Any mythic creature | **Not achievable through normal play** |
| Big 3 equivalent | Charizard, Blastoise, Venusaur | Best mythic creatures (e.g., mythic-starhorn-seraph) | **Not achievable** |
| Complete common set | Full common set | All 15 common creatures | ~10–15 packs estimated (rough) |
| Complete rare set | Full rare set | All 15 rare creatures | Many packs; no data |
| Complete set | Complete Pokédex | All 45 creatures | **Mathematically impossible today** (mythic blocked) |

**Chase categories today:**
- Primary chase: first rare creature (41.9% chance per pack)
- Secondary chase: specific rare creature (3.3% per pack)
- No "legendary" chase category exists in practice

**What is missing compared to Pokémon:**
- No mythic in pack pulls (Pokémon always had holos in packs)
- No guaranteed rare per pack (Pokémon had 1 guaranteed rare per booster; our slot 0 is always common)
- No "opening experience" drama for high-rarity outcomes
- No meaningful rarity signal in pack art or egg appearance before opening

---

## 8. Product and Balance Observations

### 8.1 Too Stingy for Core Loop
The free ongoing creature acquisition loop is thin. Once the welcome packs are claimed, the primary ongoing sources are:
- Lucky Roll egg tiles (frequency unknown)
- Treasure path eggs (1% rare, 99% common)
- Hatchery stop eggs (24–72 h incubation, then one creature)

For a player who doesn't purchase packs, the path to rare creatures is slow and undramatic.

### 8.2 Mythic Creatures Are Currently Decorative
15 mythic creatures exist in the catalog with full companion bonus definitions and artwork implied. They are practically unobtainable:
- No standard pack slot produces mythic
- Admin grants explicitly cap at common/rare eggs
- Treasure path explicitly excludes mythic
- Only hatchery eggs can roll mythic (5%), and even then, no island's featured pool routes players toward mythic in early play

**Economy risk:** If mythic creatures are supposed to be a premium draw (paid or major milestone), the current system creates no aspiration for them.

### 8.3 No Pity Timer
A player could theoretically open 50 packs and never receive a specific rare. There is no counter, no soft guarantee, and no fallback. For a collection game, this is an engagement risk.

### 8.4 Duplicates Are Dead Weight
The `copies` field tracks duplicates, and bond XP can be gained per copy, but there is no meaningful soft conversion (selling duplicates gives only small essence/shard amounts via egg sell rewards). Long-term collectors will accumulate many common duplicates with no satisfying use.

### 8.5 Egg Mania Potentially Generous
If feature-flagged Egg Mania is active, up to 3 eggs × 4 islands = 12 eggs per cycle. At 25% rare egg probability each, this could produce 3 rare eggs per cycle. This is potentially very generous relative to the rest of the economy. Needs monitoring.

### 8.6 Dev/Admin Grant Pathway Is Safe
Admin grants require explicit `grantSource` + `allowGrant: true`. They are idempotent via `grantId`. No risk of accidental production leakage from this path alone.

### 8.7 Hatchery Stop Is the Only Mythic Route — and It Is Passive
The hatchery incubation path (24–72 h) is the only non-admin path to a mythic creature, and it requires waiting. This could be a strong design choice (mythics feel special and time-gated) but is currently invisible to players — there is no communication that hatchery eggs can produce mythic outcomes.

### 8.8 Creature Selection Is Deterministic (Seed-Based) — Advantage and Risk
Using `(seed * 17 + islandNumber * 31) % 15` means the same inputs always yield the same creature. This is good for reproducibility and auditing. The risk is that players may discover they are "locked" into a specific creature on a given island and cannot reroll, which could feel frustrating.

### 8.9 No Odds Transparency
There is no in-app disclosure of egg odds or pack odds. For a monetized system (Stripe purchase of packs), this may have legal implications in some jurisdictions (loot box legislation).

---

## 9. Recommended Future Probability Model (Do Not Implement)

This is a design proposal only. No code changes are implied.

### 9.1 Suggested Egg Types (3 tiers + 1 special)

| Egg name | How obtained | Notes |
|---|---|---|
| Mossy Egg (Common) | Lucky Roll, treasure path, daily streaks | Common creature pool |
| Glimmer Egg (Rare) | Milestone rewards, special events, Island Run achievements | Rare pool; ~10% mythic possibility |
| Celestial Egg (Mythic) | Major milestones, seasonal events, highest-tier achievements | Guaranteed mythic |
| Seasonal Egg | Limited seasonal events only | Time-limited creature pool |

### 9.2 Suggested Rarity Odds

**For Glimmer Egg hatch:**

| Tier | Suggested odds |
|---|---:|
| Common | 65% |
| Rare | 30% |
| Mythic | 5% |

**For Celestial Egg hatch:**

| Tier | Suggested odds |
|---|---:|
| Rare | 70% |
| Mythic | 30% |

**For 5-card creature pack:**

| Slot | Common | Rare | Mythic |
|---|---:|---:|---:|
| 0 | 100% | 0% | 0% |
| 1 | 85% | 15% | 0% |
| 2 | 75% | 24% | 1% |
| 3 | 65% | 30% | 5% |
| 4 | 50% | 40% | 10% |

Expected rare per pack: ~1.09 | Expected mythic per pack: ~0.16 (about 1 in 6 packs)

### 9.3 Suggested Per-Island Creature Pools

- Islands 1–5 (tutorial zone): Featured common pool only; no rare or mythic
- Islands 6–15 (mid game): Full common pool + featured rare pool (3–5 rares per island)
- Islands 16+ (late game): Full common + rare pool + mythic pool unlocks at island 20+
- Seasonal events: Dedicated seasonal creature pool (3–5 creatures) replaces some slots during event windows

### 9.4 Suggested Duplicate Protection

- First 15 packs: Guarantee no duplicate (redirect to unowned creature in same tier)
- After 15 packs: Duplicates allowed, but convert at 3:1 (3 duplicate commons → 1 random rare shard)
- After collecting all common creatures: Common pack slots automatically upgrade to rare tier

### 9.5 Suggested Pity / Guarantee Rules

- **Rare pity:** After 3 packs with 0 rare cards, next pack guarantees at least 1 rare
- **Mythic pity:** After 20 packs with 0 mythic cards, next pack guarantees at least 1 mythic
- **First mythic:** First mythic obtained through hatchery egg is guaranteed to be from island-featured pool (curated introduction)
- **Egg pity:** After 10 common eggs hatched in a row, next egg auto-upgrades to rare tier

### 9.6 Suggested First Creature Rules

- Player's very first creature (island 1 hatchery): Always `common-sproutling` (known, lovable, named in onboarding)
- First rare encounter: Always `rare-luma-hatchling` or equivalent "gateway rare" — familiar name, easy to love
- First mythic: Milestone-gated; cannot arrive before island 15 or 10 hours of play

### 9.7 Suggested Special Event / Seasonal Creature Handling

- Seasonal creatures (e.g., winter solstice event): Appear only in Seasonal Eggs during their event window; rotate to "dormant" after event; can only be obtained through future re-runs
- Event milestone creatures: Granted at specific event completion tiers; not available through eggs or packs
- Featured creature weeks: One creature highlighted in pack art; increased odds for that specific creature for 7 days

### 9.8 Suggested Odds Display Wording

For each reward source, show in plain language:
- **Mossy Egg:** "Common creatures hatch here. Roughly 1 in 100 has a surprise inside."
- **Glimmer Egg:** "Mostly rare creatures. Occasional mythic (1 in 20 chance)."
- **Celestial Egg:** "Guaranteed mythic creature."
- **Creature Pack:** "5 creature cards. At least 1 rare in most packs. Rare chance of mythic."
- Avoid percentage-heavy language; use everyday words

### 9.9 Suggested Economy Safety Tests

Before any probability change goes to production:

1. Simulate 1,000 player sessions of 30 days; verify median player reaches 15 common creatures within 14 days
2. Verify median player does not obtain first mythic within first 7 days
3. Verify no free (non-paid) path produces more than 2 rare creatures per cycle without major milestone completion
4. Verify mythic probability is not achievable via any exploit combining Egg Mania + hatchery + treasure path
5. Verify seasonal creature pool is correctly gated by event window and does not leak post-event
6. Verify pity counter resets correctly on pack purchase, not on free pack grant
7. Monitor duplicate rate; if >60% of packs produce only duplicates for any player after 30 days, re-evaluate soft conversion

---

## 10. Open Questions

1. **Lucky Roll egg tile frequency:** How often does the Lucky Roll board include an egg tile? The tile composition of the Lucky Roll board was not fully audited here and directly affects total eggs entering the economy.

2. **Egg Mania active status:** Is Egg Mania currently feature-flagged on for production users? If yes, how many players are receiving it, and what is the observed egg-per-cycle rate?

3. **`rollEggRewards()` integration point:** Is the currency payout from `eggService.ts` (`essenceDelta`, `shardsDelta`, etc.) delivered *instead of* a creature, or *in addition to*? The creature vs. currency split in egg opening needs explicit clarification.

4. **Mythic egg from hatchery — is creature selection working?** There is no confirmed evidence that a real player has ever hatched a mythic egg. Has this path been verified in staging or production?

5. **Creature pack opening modal status:** `CreaturePackOpeningPrototypeModal.tsx` is noted as a prototype. Is this the production pack opening modal, or is there a separate production version?

6. **Stripe pack purchase volume:** Are players currently purchasing creature packs? What is the observed conversion rate? This affects whether the pack odds are currently a product concern.

7. **Bond milestone rewards:** The bond milestone system (levels 3, 5, 8, 10) grants rewards based on form levels. What are those rewards? Do they include creatures, eggs, or essence? This was not fully audited.

8. **Companion bonus impact on progression:** How significantly do companion bonuses (essence, spins, dice) affect progression speed? If high, mythic companion inaccessibility is a real late-game balance gap.

9. **Seasonal creature pool:** No seasonal creature pool was found in the current catalog. Is seasonal content planned, and if so, are the 45 creatures the permanent roster or the initial set?

10. **Lucky Roll board composition audit:** A complete probability tree for the Lucky Roll board (including egg tile frequency, position, and landing probability) is needed to calculate end-to-end egg economy rates.

---

## 11. Files Inspected

```
src/features/gamification/level-worlds/services/creatureCatalog.ts
src/features/gamification/level-worlds/services/eggService.ts
src/features/gamification/level-worlds/services/creatureCollectionService.ts
src/features/gamification/level-worlds/services/islandRunGameStateStore.ts
src/features/gamification/level-worlds/services/islandRunCreatureCollectionLedger.ts
src/features/gamification/level-worlds/services/creatureCollectionProgress.ts
src/features/gamification/level-worlds/services/creatureSanctuaryAdapter.ts
src/features/gamification/level-worlds/services/creatureCardCatalog.ts
src/features/gamification/level-worlds/services/creatureCardV2Adapter.ts
src/features/gamification/level-worlds/services/islandRunCreaturePackResolver.ts
src/features/gamification/level-worlds/services/islandRunFirstSessionCreaturePackAction.ts
src/features/gamification/level-worlds/services/islandRunWelcomePackClaimAction.ts
src/features/gamification/level-worlds/services/islandRunWelcomePackRewardBundleAction.ts
src/features/gamification/level-worlds/services/islandRunTreasurePathEggReward.ts
src/features/gamification/level-worlds/services/islandRunEggRewardInventoryAction.ts
src/features/gamification/level-worlds/services/islandRunLuckyRollAction.ts
src/features/gamification/level-worlds/services/islandRunEggMania.ts
src/features/gamification/level-worlds/services/islandRunAdminDevPackGrantAction.ts
src/features/gamification/level-worlds/services/islandRunTileRewardAction.ts
src/features/gamification/level-worlds/services/islandRunContractV2RewardBar.ts
src/features/gamification/level-worlds/services/companionRegenModifier.ts
src/features/gamification/level-worlds/services/creatureFitEngine.ts
src/features/gamification/level-worlds/services/perfectCompanionConfig.ts
src/features/gamification/level-worlds/services/creatureTreatInventoryService.ts
src/features/gamification/level-worlds/components/CreatureCard.tsx
src/features/gamification/level-worlds/components/CreatureGridCard.tsx
src/features/gamification/level-worlds/components/CreatureHatchRevealModal.tsx
src/features/gamification/level-worlds/components/CreaturePackOpeningPrototypeModal.tsx
src/features/gamification/level-worlds/components/FirstSessionCreaturePackModal.tsx
src/features/gamification/level-worlds/components/IslandRunDebugPanel.tsx
src/features/gamification/level-worlds/components/IslandRunLuckyRollDevOverlay.tsx
src/features/gamification/level-worlds/services/islandRunProgressReset.ts
src/services/creaturePackPurchases.ts
src/services/dailyTreats.ts
supabase/migrations/0191_island_run_creature_collection_sync.sql
supabase/functions/create-checkout-session-creature-pack/index.ts
supabase/functions/stripe-webhook/index.ts
supabase/functions/spaceExcavatorCampaignProgress.ts (referenced as src/features/.../services/spaceExcavatorCampaignProgress.ts)
docs/investigations/creature-card-system-v2-data-model.md
docs/investigations/creature-sanctuary-companion-regen-investigation.md
docs/investigations/creature-companion-wisdom-stop-plan.md
docs/investigations/creature-pack-purchasing-stripe-market-investigation.md
docs/investigations/creature-cards-dex-investigation-part-ii.md
docs/investigations/creature-hatch-bond-question-plan.md
docs/investigations/welcome-pack-reset-and-dev-creature-pack-investigation-2026-05-24.md
docs/investigations/admin-dev-creature-pack-grant-tooling-snapshot-2026-05-20.md
```

---

## 12. PASS/FAIL Safety Summary

| Check | Status | Notes |
|---|---|---|
| No code changed | ✅ PASS | Investigation only |
| No schema/migration changes | ✅ PASS | No migrations touched |
| No gameplay/economy changes | ✅ PASS | All values read-only |
| No probability values changed | ✅ PASS | |
| No reward values changed | ✅ PASS | |
| All probability findings grounded in inspected files | ✅ PASS | Code snippets sourced from actual files |
| No production data touched | ✅ PASS | |
| Exact probabilities calculable for eggs and packs | ✅ PASS | Weights are explicit in code |
| Exact per-creature probability confirmed | ⚠️ PARTIAL | Hash formula is deterministic but uniformity not statistically proven |
| Lucky Roll egg frequency calculable | ❌ BLOCKER | Lucky Roll board tile composition not fully audited; egg tile frequency unknown |
| Mythic accessibility confirmed | ❌ BLOCKER | Mythic eggs are theoretically producible by hatchery stop but no real player path is confirmed; pack slots have no mythic weights |
| `rollEggRewards()` integration (currency vs. creature) | ❌ BLOCKER | The relationship between currency egg rewards and creature collection outcomes is ambiguous from code inspection alone |
| Egg Mania active status | ❌ UNKNOWN | Feature flag status not determinable from code inspection |
