# 45 Animals in the 120-Island Game — Code Analysis Report

## Source of truth
The full animal list is defined in:

- `src/features/gamification/level-worlds/services/creatureCatalog.ts`

The catalog is split into 3 egg tiers with 15 creatures each:

- 15 **Common**
- 15 **Rare**
- 15 **Mythic**

Total = **45 animals**.

## Complete roster (all 45)

### Common (15)
1. Sproutling
2. Pebble Spirit
3. Mossling
4. Glowtail
5. Drift Pup
6. Bloom Mite
7. Stone Hopper
8. Fern Fox
9. Dewling
10. Root Whisp
11. Garden Puff
12. Lichen Kit
13. Twilight Seed
14. River Bud
15. Petal Scout

### Rare (15)
1. Luma Hatchling
2. Nebula Wisp
3. Dewleaf Sprite
4. Aurora Finch
5. Ember Sprout
6. Solar Pika
7. Comet Cub
8. Bloom Seraph
9. Shard Marten
10. Cinder Mouse
11. Tide Lantern
12. Halo Staglet
13. Gear Wing
14. Mirage Pup
15. Crown Drifter

### Mythic (15)
1. Starhorn Seraph
2. Voidlight Familiar
3. Sunflare Kirin
4. Dreamroot Ancient
5. Celest Pup
6. Lux Leviathan
7. Orbit Vulpine
8. Astral Titanet
9. Solstice Sylph
10. Echo Phoenix
11. Nightbloom Drake
12. Prism Warden
13. Aurora Maned Cat
14. Cosmos Songbird
15. Infinity Sprite

## How a creature is selected in gameplay

Creature assignment happens via `selectCreatureForEgg(...)` in `creatureCatalog.ts`.

Inputs:
- `eggTier` (common / rare / mythic)
- `seed` (from egg set timestamp)
- `islandNumber`

Formula:

```ts
index = Math.abs((seed * 17) + (islandNumber * 31)) % pool.length
```

Then the creature at `pool[index]` is used. Since `pool.length` is 15 for each tier, selection is deterministic among those 15 options in that tier.

## Collection + persistence behavior

Creature collection persistence and progression are managed in:

- `src/features/gamification/level-worlds/services/creatureCollectionService.ts`

Key behavior:
- Collected creatures are stored per user in localStorage key `island_run_creature_collection_{userId}`.
- Duplicate pulls increase `copies` for the same `creatureId`.
- Companion progression tracks `bondXp`, `bondLevel`, feeding timestamp, and claimed milestone levels.
- Milestone levels are currently `[3, 5, 8, 10]`.

## Design implications

1. **Exactly 45 unique animals currently shipped**
   - Because catalog arrays are hardcoded at 15 + 15 + 15.

2. **Deterministic egg-to-creature mapping**
   - Same `tier + seed + islandNumber` gives same creature.
   - Good for predictable debugging and anti-reroll exploits.

3. **Replay value comes from tier + collection progression, not randomness alone**
   - Players can collect copies and build bond level progression.

4. **Expansion path is straightforward**
   - Add more `CreatureDefinition` entries to tier arrays to expand beyond 45.
   - No architectural change needed, but distribution behavior changes because modulo pool length changes.

## Quick verification checklist

To verify the "45 animals" claim in code:
1. Open `creatureCatalog.ts`.
2. Count entries in each tier array (`COMMON_CREATURES`, `RARE_CREATURES`, `MYTHIC_CREATURES`) — each has 15.
3. Confirm `CREATURE_CATALOG` concatenates all three arrays.


## Relationship to player profiles (personality archetypes)

### What the code does today
There is currently **no direct runtime function** that maps a creature to a player's archetype card.

- Creature systems use creature `affinity` labels and gameplay bonuses in `creatureCatalog.ts`.
- Personality profile systems score and rank a separate 32-card archetype deck in `src/features/identity/archetypes/*`.

So today, creature ↔ archetype linkage is **conceptual overlap by naming/theme**, not a strict hard-coded join key.

### Explicit overlap between creature affinities and archetype card names
The following creature affinity labels have a direct naming match with archetype IDs/cards:

- `Caregiver`
- `Mentor`
- `Peacemaker`
- `Explorer`
- `Creator`
- `Visionary`
- `Champion`
- `Strategist`
- `Architect`
- `Challenger`
- `Commander`
- `Rebel`
- `Sage`
- `Guardian`
- `Dreamer`

### Creature affinities that do NOT currently appear as archetype card IDs
These appear in creature definitions but not as archetype IDs in the deck:

- `Builder`
- `Grounded`
- `Nurturer`
- `Steady`
- `Oracle`
- `Cosmic`
- `Radiant`

### Practical interpretation for product/design
Because there is no strict binding code yet, the safest implementation interpretation is:

1. Creature `affinity` currently drives **companion and specialty bonus families**.
2. Archetype cards are computed from **personality test trait/axis scores**.
3. When names overlap (e.g., `Visionary`, `Explorer`, `Guardian`), that is useful for UX storytelling and future personalization, but not enforced by a direct mapper today.

### Recommended future mapping contract (if you want deterministic profile-aligned pets)
If you want creatures to explicitly reflect a player archetype hand, add a bridge layer such as:

- `CreatureAffinityToArchetypeCardId` map (string → archetype id), plus
- a resolver that prioritizes creature pools linked to the player's dominant/secondary archetypes.

That would convert the current thematic relationship into a strict, testable one.

## Proposed implementation: "Perfect Companion" system (personality-aligned creatures)

You described this target flow:

1. User takes personality test (+ ads/upsell around tests).
2. System identifies trait strengths and weakness edges from the player's archetype hand.
3. During 120-island play, animals appear as usual, but only **1–3 creatures** are marked as
   "perfect for you" because they both amplify strengths and support weaknesses.

This can be implemented cleanly on top of current systems.

### A) Add a canonical affinity-to-archetype bridge

Create a new mapping module (example: `creatureArchetypeBridge.ts`) with two layers:

- `affinity -> archetypeId[]` (semantic family match)
- `affinity -> weaknessSupportTags[]` (what weakness this affinity can soften)

Example structure:

```ts
export const AFFINITY_TO_ARCHETYPE: Record<string, string[]> = {
  Visionary: ['visionary', 'dreamer', 'pioneer'],
  Guardian: ['guardian', 'caregiver', 'mentor'],
  Strategist: ['strategist', 'architect', 'analyst'],
  // ...
};

export const AFFINITY_WEAKNESS_SUPPORT: Record<string, string[]> = {
  Guardian: ['stress_fragility', 'low_safety'],
  Mentor: ['decision_confusion', 'low_confidence'],
  Builder: ['inconsistency', 'overwhelm'],
  // ...
};
```

### B) Build a "player companion fit profile" from archetype hand

Input sources (already available in code architecture):

- Ranked archetype hand (dominant/secondary/support/shadow)
- Trait/axis scores from personality engine

Compute two vectors:

- `strengthVector`: weighted from dominant + secondary + high traits
- `healingVector`: weighted from shadow + low traits + stress-sensitive axes

Then score each creature:

```ts
fitScore =
  (0.60 * strengthMatch)
+ (0.40 * healingMatch)
+ rarityBonus
+ recencyPenalty
```

Sort all 45 and persist top picks.

### C) Enforce 1–3 "perfect" creatures deterministically

Keep gameplay fair/predictable by selecting from top fit candidates with deterministic seeds
(per cycle or per island range), for example:

- 1 guaranteed perfect creature in islands 1–40
- up to 2 total in islands 41–80
- up to 3 total in islands 81–120

Use deterministic seed `(userId + cycleIndex + islandNumber)` so outcomes are stable, debuggable,
and anti-reroll.

### D) Make value obvious in UI (very easy to understand)

For each creature card/encounter modal, show a simple high-signal badge:

- `⭐ Perfect for your hand`
- `✅ Strength boost: Visionary (+Spin)`
- `🛡️ Weakness support: Stress Response`

Also add a compact "Why this helps you" drawer:

- "Because your hand has **Visionary + Dreamer** and your growth edge is **stress overload**, this creature boosts momentum and adds protection during high-pressure islands."

### E) Add one global discoverability surface

Add a persistent mini-panel in Island HUD / Creature Collection:

- `Your Best Companions (3)`
- ranked chips: `#1`, `#2`, `#3`
- tap opens reason cards + recommended islands/stops

This ensures players always know which creatures are extra valuable *for them* without reading long text.

### F) Reward loop design

When a perfect creature is equipped or newly collected:

- Trigger personalized celebration copy: "Perfect synergy unlocked"
- Grant small, visible, profile-aligned reward (e.g., +1 bonus spin or +1 safety heart once per island)
- Track telemetry:
  - `perfect_companion_seen`
  - `perfect_companion_equipped`
  - `perfect_companion_effect_triggered`

### G) Fast MVP slice order

1. Mapping table + fit scoring util (pure functions, fully unit testable).
2. Persist top-3 fit creature IDs in profile runtime state.
3. Badge + "Why this helps you" UI in creature cards.
4. Deterministic island encounter injection from top fit set.
5. Telemetry + tuning dashboard.

### H) Tuning knobs (for live balancing)

Keep these in config (not hardcoded):

- strength vs healing weight (default 60/40)
- max perfect creatures per 120-island cycle (default 3)
- rarity multiplier
- duplicate protection window
- pity rule (guarantee at least 1 perfect by island N)

With this, your core goal is met: players get personalized creatures that both **amplify
who they already are** and **support where they struggle**, and the UI clearly explains why each
valuable creature matters for *their* current archetype hand.
