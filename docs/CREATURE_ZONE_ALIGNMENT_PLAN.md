# Creature Zone Alignment Plan (Brainstorm → Current Code)

## Why this doc
Your brainstorm is strong for onboarding + retention. This document aligns that vision with the
**current shipped 45-creature roster** in code, so design and engineering stay in sync.

## 1) Important reality check: names in brainstorm vs names in code
The brainstorm list of names (e.g., Spriglet, Emberlord, Astryx) is **not** the roster currently
implemented in `creatureCatalog.ts`.

Current production roster is:
- 15 Common
- 15 Rare
- 15 Mythic
- Total = 45

So if you want to use the brainstorm names, that is a **content migration**, not just a UI change.

## 2) Recommended macro-structure for spaceship habitat
Use a two-layer model:

1. **Rarity tier** (already implemented): Common / Rare / Mythic
2. **Ship zone family** (additive metadata):
   - 🌿 Zen/Nature Bay
   - 🔥 Energy/Forge Bay
   - 🌌 Cosmic/Void Bay

This preserves existing progression while giving you the clean spaceship storytelling you want.

## 3) Map existing habitats to 3 spaceship bays
Current creatures already have habitat strings. Group those habitats into 3 bays:

### 🌿 Zen/Nature Bay
Habitats:
- Zen Garden
- Root Atrium
- Moss Gallery
- Hydro Deck

### 🔥 Energy/Forge Bay
Habitats:
- Ember Lab
- Solar Orchard
- Engine Wing
- Sky Foundry

### 🌌 Cosmic/Void Bay
Habitats:
- Astral Dome
- Dream Observatory
- Aurora Bridge
- Star Archive

## 4) 45 creatures mapped to spaceship zones (using current code names)

### 🌿 Zen/Nature Bay (15)
**Common:** Sproutling, Pebble Spirit, Mossling, Glowtail, Drift Pup, Bloom Mite, Stone Hopper, Fern Fox, Dewling, Root Whisp, Garden Puff, Lichen Kit, Twilight Seed, River Bud, Petal Scout

### 🔥 Energy/Forge Bay (9)
**Rare:** Aurora Finch, Ember Sprout, Solar Pika, Comet Cub, Shard Marten, Cinder Mouse, Halo Staglet, Gear Wing, Crown Drifter

### 🌌 Cosmic/Void Bay (21)
**Rare:** Luma Hatchling, Nebula Wisp, Dewleaf Sprite, Bloom Seraph, Tide Lantern, Mirage Pup
**Mythic:** Starhorn Seraph, Voidlight Familiar, Sunflare Kirin, Dreamroot Ancient, Celest Pup, Lux Leviathan, Orbit Vulpine, Astral Titanet, Solstice Sylph, Echo Phoenix, Nightbloom Drake, Prism Warden, Aurora Maned Cat, Cosmos Songbird, Infinity Sprite

> Note: with current habitat assignments, distribution is 15 / 9 / 21 across the three bays.
> If you want strict 15/15/15 by bay, update habitat assignments or add `shipZone` as explicit metadata.

## 5) How this fits your onboarding narrative
Your onboarding flow can stay exactly as drafted (name ship → hatch → feed → place in habitat).
To support that in code without large rewrites:

- keep first hatch deterministic (starter creature)
- set starter creature's `shipZone`
- open sanctuary panel focused on that zone slot
- show one clear reward pulse (+XP/+energy)

## 6) Product recommendation
If your top priority is speed + consistency with shipped systems:

- Keep current 45 names for now
- Add `shipZone` metadata + bay UI framing
- Re-theme visuals around zones without renaming content

If your top priority is brand tone from brainstorm names:

- Plan a dedicated **roster migration** (IDs, localization, telemetry compatibility, save migration)

## 7) Next implementation slice
1. Add `shipZone: 'zen' | 'energy' | 'cosmic'` in creature definitions.
2. Derive sanctuary filters/tabs by zone.
3. Add slot-capacity visuals per zone in ship habitat UI.
4. Gate deep slots by progression (tier reveal).
5. Keep rarity unchanged in reward economy.
