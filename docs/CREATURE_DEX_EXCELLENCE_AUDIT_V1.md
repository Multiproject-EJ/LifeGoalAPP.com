# Creature Dex Excellence Audit v1

## 1) Purpose

This audit exists to make the core 45-creature Dex excellent before final art and full card system production are locked.

> **Small Dex, deep companions.**

This means we should:

- avoid inflating the roster with forgettable creatures,
- make each creature emotionally legible at a glance,
- make each creature reliably useful for personality/archetype support,
- create depth through stage/form/card versions instead of endlessly adding species.

## 2) Current Dex code-truth summary

### Current catalog status

- **Total creatures:** 45 (15 common, 15 rare, 15 mythic). 
- **Tier split:** perfectly balanced at 15/15/15. 
- **Current creature fields:** `id`, `imageKey`, `name`, `tier`, `habitat`, `affinity`, `shipZone`. 
- **Affinity set in use (23 total):** Builder, Grounded, Nurturer, Steady, Explorer, Caregiver, Mentor, Peacemaker, Dreamer, Visionary, Guardian, Catalyst, Champion, Strategist, Architect, Challenger, Creator, Oracle, Cosmic, Radiant, Sage, Commander, Rebel. 
- **Habitats in use (12 total):** Zen Garden, Root Atrium, Moss Gallery, Hydro Deck, Ember Lab, Solar Orchard, Engine Wing, Sky Foundry, Astral Dome, Dream Observatory, Aurora Bridge, Star Archive. 
- **ShipZones in use (3 total):** `zen`, `energy`, `cosmic`; distribution is zen-heavy (19), cosmic (17), energy-light (9). 
- **Image key convention:** `imageKey` mirrors `id` and maps to `/public/assets/creatures/{imageKey}.webp` with png/silhouette fallback behavior. 
- **Curated card metadata:** 8 creatures are curated; the remaining 37 currently use fallback metadata generation. 
- **Evolution/stage/card-variant model today:** no explicit per-creature stage schema, no stage-specific image conventions in runtime catalog, and no separate card variant entries by stage/form yet.

### Current “production-leaning” status from code/docs

- Early featured hatch weighting currently biases toward 5 creatures (`common-sproutling`, `rare-aurora-finch`, `rare-ember-sprout`, `rare-nebula-wisp`, `mythic-starhorn-seraph`), consistent with “5 production assets exist” direction. 
- The current card system already supports metadata layering but not stage-based card IDs yet. 

## 3) Archetype / affinity coverage audit

### 3.1 Affinity counts (45 total)

| Affinity | Count |
| --- | ---: |
| Explorer | 5 |
| Visionary | 4 |
| Builder | 3 |
| Guardian | 3 |
| Grounded | 2 |
| Nurturer | 2 |
| Steady | 2 |
| Caregiver | 2 |
| Mentor | 2 |
| Peacemaker | 2 |
| Champion | 2 |
| Architect | 2 |
| Creator | 2 |
| Oracle | 2 |
| Sage | 2 |
| Dreamer | 1 |
| Catalyst | 1 |
| Strategist | 1 |
| Challenger | 1 |
| Radiant | 1 |
| Cosmic | 1 |
| Commander | 1 |
| Rebel | 1 |

### 3.2 Tier distribution quality

| Tier | Count | Notes |
| --- | ---: | --- |
| common | 15 | Strong starter density; many nature-coded identities. |
| rare | 15 | Good midpoint variety, but still leans mammal/cute in several entries. |
| mythic | 15 | High cosmic concentration; identity overlap risk in “celestial spirit” lane. |

### 3.3 ShipZone distribution

| ShipZone | Count | Risk |
| --- | ---: | --- |
| zen | 19 | Safe and coherent, but can feel over-natured. |
| cosmic | 17 | Strong fantasy signal, but overlap risk (“vague cosmic spirit”). |
| energy | 9 | Underrepresented relative to other zones. |

### 3.4 Weakness support tag coverage (via affinity bridge)

| Weakness tag | Coverage quality | Notes |
| --- | --- | --- |
| `stress_fragility` | Strong | Covered by Grounded/Nurturer/Caregiver/Peacemaker/Guardian/Oracle/Cosmic/Radiant. |
| `decision_confusion` | Strong | Covered by Steady/Explorer/Mentor/Visionary/Strategist/Architect/Oracle/Sage. |
| `low_consistency` | Medium-strong | Builder/Steady/Guardian/Architect/Commander. |
| `low_momentum` | Strong | Explorer/Dreamer/Visionary/Catalyst/Champion/Challenger/Creator/Rebel. |
| `low_confidence` | Strong | Nurturer/Caregiver/Mentor/Dreamer/Champion/Challenger/Radiant/Commander/Rebel. |
| `overwhelm` | Strong | Builder/Grounded/Peacemaker/Catalyst/Strategist/Creator/Cosmic/Sage. |

### 3.5 Suit/archetype role observations

| Area | Current status |
| --- | --- |
| **Heart-style support** (caregiver/guardian/peacemaker/healer-like) | Broadly healthy across zen and some energy/cosmic. |
| **Mind-style support** (architect/strategist/sage/oracle) | Present, especially in rare+mythic; could use more common-level legibility. |
| **Spirit-style support** (visionary/dreamer/mystic-like) | Very strong, potentially overrepresented in cosmic tier. |
| **Power-style support** (champion/commander/challenger/rebel) | Present but less visually distinct in species language; should be sharpened. |

### 3.6 Over/under representation callouts

- **Overrepresented role lanes:** Explorer/Visionary + cosmic/ethereal presentation.
- **Underrepresented lane:** strong **energy-zone** diversity and non-cosmic “action/power” forms.
- **Potential trait-gap risk:** practical, everyday “mind + consistency” identities at common tier could be stronger and less plant-adjacent.

## 4) Creature identity uniqueness audit (all 45)

Legend:
- **Identity Strength:** 1 (weak/generic) to 5 (very distinct)
- **Overlap risk:** Low / Medium / High

| id | name | tier | affinity | score | overlap risk | suggested action | notes |
| --- | --- | --- | --- | ---: | --- | --- | --- |
| common-sproutling | Sproutling | common | Builder | 4 | Medium | Keep + sharpen silhouette | Strong anchor starter; protect from generic “plant blob.” |
| common-pebble-spirit | Pebble Spirit | common | Grounded | 4 | Low | Keep as-is | Distinct material identity (stone/moss). |
| common-mossling | Mossling | common | Nurturer | 3 | Medium | Keep + sharpen species cues | Good role; overlaps with Garden Puff/Bloom Mite if too soft-generic. |
| common-glowtail | Glowtail | common | Steady | 4 | Low | Keep as-is | Clear functional identity. |
| common-drift-pup | Drift Pup | common | Explorer | 2 | High | Visual reinterpretation | “Pup” lane crowded; needs unique locomotion cue. |
| common-bloom-mite | Bloom Mite | common | Caregiver | 3 | Medium | Keep + sharpen insect identity | Ensure it reads “mite” not another fluffy sprout creature. |
| common-stone-hopper | Stone Hopper | common | Builder | 4 | Low | Keep as-is | Distinct movement and material identity possible. |
| common-fern-fox | Fern Fox | common | Mentor | 2 | High | Rename/reinterpret species | Fox lane overlap risk with vulpine/pup/cat motifs. |
| common-dewling | Dewling | common | Peacemaker | 3 | Medium | Keep + sharpen water/dew physics | Avoid becoming generic cute droplet. |
| common-root-whisp | Root Whisp | common | Steady | 2 | High | Reinterpret to clearer physical form | “Whisp/wisp” + cosmic overlaps; needs unique root-anchor behavior. |
| common-garden-puff | Garden Puff | common | Nurturer | 2 | High | Reinterpret | Highly generic naming; silhouette risk with Mossling. |
| common-lichen-kit | Lichen Kit | common | Grounded | 2 | High | Rename/reinterpret | “Kit” adds feline overlap; identity can be more lichen-forward organism. |
| common-twilight-seed | Twilight Seed | common | Dreamer | 3 | Medium | Keep + sharpen dream motif | Good contrast to Sproutling if clearly dreamy vs practical. |
| common-river-bud | River Bud | common | Caregiver | 3 | Medium | Keep + sharpen flow identity | Distinguish from Dewling/Mossling. |
| common-petal-scout | Petal Scout | common | Explorer | 3 | Medium | Keep + sharpen scout mechanics | Differentiate from Drift Pup explorer lane. |
| rare-luma-hatchling | Luma Hatchling | rare | Visionary | 3 | Medium | Keep + sharpen species source | “Hatchling” is broad; needs parent lineage cues. |
| rare-nebula-wisp | Nebula Wisp | rare | Explorer | 4 | Medium | Keep as-is | Strong if constrained from generic cosmic puff. |
| rare-dewleaf-sprite | Dewleaf Sprite | rare | Guardian | 3 | Medium | Keep + sharpen guardian silhouette | Distinguish from other zen spirits. |
| rare-aurora-finch | Aurora Finch | rare | Visionary | 5 | Low | Keep as-is | Excellent species + role clarity. |
| rare-ember-sprout | Ember Sprout | rare | Catalyst | 4 | Medium | Keep + sharpen fire-plant hybrid language | Strong role, slight overlap with Sproutling naming family. |
| rare-solar-pika | Solar Pika | rare | Champion | 3 | Medium | Keep + unique energy motif | Avoid becoming generic “electric cute rodent.” |
| rare-comet-cub | Comet Cub | rare | Strategist | 3 | Medium | Keep + sharpen strategist behavior | “Cub” cute bias vs strategic role tension. |
| rare-bloom-seraph | Bloom Seraph | rare | Mentor | 3 | Medium | Keep + separate from Starhorn Seraph | Avoid seraph overlap by floral/mentor framing. |
| rare-shard-marten | Shard Marten | rare | Architect | 4 | Low | Keep as-is | Distinct species + material cue. |
| rare-cinder-mouse | Cinder Mouse | rare | Challenger | 4 | Low | Keep as-is | Good small-but-bold role clarity. |
| rare-tide-lantern | Tide Lantern | rare | Peacemaker | 4 | Low | Keep as-is | Great object-creature hybrid distinctiveness. |
| rare-halo-staglet | Halo Staglet | rare | Guardian | 4 | Low | Keep as-is | Strong iconography and role. |
| rare-gear-wing | Gear Wing | rare | Builder | 4 | Low | Keep as-is | Machine niche valuable for variety. |
| rare-mirage-pup | Mirage Pup | rare | Creator | 2 | High | Rename/reinterpret | Another pup; should lean mirage construct/spirit form. |
| rare-crown-drifter | Crown Drifter | rare | Explorer | 3 | Medium | Keep + sharpen crown mechanic | Explorer lane crowded; crown behavior can separate. |
| mythic-starhorn-seraph | Starhorn Seraph | mythic | Oracle | 5 | Low | Keep as-is | Flagship mythic identity. |
| mythic-voidlight-familiar | Voidlight Familiar | mythic | Visionary | 3 | Medium | Keep + sharpen voidlight signature | Avoid generic dark cosmic spirit. |
| mythic-sunflare-kirin | Sunflare Kirin | mythic | Radiant | 4 | Low | Keep as-is | Distinct mythic species. |
| mythic-dreamroot-ancient | Dreamroot Ancient | mythic | Sage | 4 | Low | Keep as-is | Strong elder/tree identity potential. |
| mythic-celest-pup | Celest Pup | mythic | Cosmic | 2 | High | Rename/reinterpret strongly | Mythic “pup” feels underpowered conceptually. |
| mythic-lux-leviathan | Lux Leviathan | mythic | Commander | 5 | Low | Keep as-is | Excellent silhouette potential. |
| mythic-orbit-vulpine | Orbit Vulpine | mythic | Explorer | 3 | Medium | Keep + sharpen orbit mechanic | Vulpine overlaps fox/pup/cat family if not differentiated. |
| mythic-astral-titanet | Astral Titanet | mythic | Architect | 4 | Low | Keep as-is | Strong structural mythic lane. |
| mythic-solstice-sylph | Solstice Sylph | mythic | Creator | 3 | Medium | Keep + sharpen seasonal signature | Could blur with generic celestial spirit. |
| mythic-echo-phoenix | Echo Phoenix | mythic | Champion | 4 | Low | Keep as-is | Iconic mythic archetype. |
| mythic-nightbloom-drake | Nightbloom Drake | mythic | Rebel | 4 | Low | Keep as-is | Clear drake silhouette and mood. |
| mythic-prism-warden | Prism Warden | mythic | Guardian | 4 | Low | Keep as-is | Distinct if prism geometry is emphasized. |
| mythic-aurora-maned-cat | Aurora Maned Cat | mythic | Visionary | 2 | High | Rename/reinterpret | Cat + aurora lane overlaps finch/songbird/other aurora visuals. |
| mythic-cosmos-songbird | Cosmos Songbird | mythic | Sage | 3 | Medium | Keep + sharpen “cosmos voice” role | Must avoid overlap with Aurora Finch communication lane. |
| mythic-infinity-sprite | Infinity Sprite | mythic | Oracle | 2 | High | Rename/reinterpret | “Sprite” is too broad at mythic tier; needs stronger species/form logic. |

## 5) Recommended Dex improvements before final art

### High-confidence “keep” group (finalize sooner)

- Sproutling, Pebble Spirit, Glowtail, Aurora Finch, Ember Sprout, Nebula Wisp, Starhorn Seraph, Tide Lantern, Halo Staglet, Gear Wing, Lux Leviathan, Echo Phoenix. 

### Priority reinterpretation group (before final lock)

- **common-drift-pup, common-fern-fox, common-garden-puff, common-lichen-kit, rare-mirage-pup, mythic-celest-pup, mythic-aurora-maned-cat, mythic-infinity-sprite**.
- For these, prioritize **visual/species reinterpretation** first (movement, body plan, material language) before renaming or ID changes.

### Reassignment recommendations (light-touch)

- Consider improving **energy-zone representation** by giving 1–2 ambiguous zen/cosmic visual identities a stronger energy-read (without code ID churn yet).
- Preserve existing IDs unless production review finds unavoidable confusion in naming.

## 6) Core creature identity rules (final production contract)

Each creature must have:

1. A distinct species identity.
2. A distinct silhouette.
3. A distinct movement inspiration.
4. A distinct personality support role.
5. A distinct sentence: “This creature helps the player with ____.”
6. A clear trait/weakness bridge.
7. No default “generic animal-with-leaves” treatment unless deliberately intentional.

## 7) Card stage philosophy

Cards are **collectible snapshots**, not upgrading objects.

Example set:
- Mossling Baby Card
- Mossling Medium Card
- Mossling Adult Card

The card itself does not upgrade. Players collect multiple versions/cards over time.

Companion progression can unlock stage/card access, but that relationship system is separate from the collectible card object.

## 8) Creature stage / trait depth model

- **Lv1 / Baby**: 1 core trait, simple silhouette, one clear behavior/speech identity.
- **Lv2 / Medium**: keeps Lv1 trait, adds second trait, richer behavior and art detail.
- **Lv3 / Adult**: keeps Lv1+Lv2 traits, adds third trait, complete identity expression.
- **Lv4 / Awakened**: only for a very small flagship subset, max fourth trait, mostly narrative/visual premium (not pay-to-win).

Scope rule:
- Do **not** force all creatures to all stages.
- Most should have 3.
- Simple identities may have 2.
- Only 1–2 should launch with Lv4.

## 9) Bond level vs stage vs card collection

Keep these concepts separate:

- **Bond XP**: progression currency/points for relationship system.
- **Bond Level**: existing runtime relationship level (must not be silently redefined).
- **Visual/Personality Stage**: form depth layer (art + behavior + personality expression).
- **Collectible Card Version**: collectible snapshot at stage/form/variant.

Rule: Bond may later unlock stages/cards, but Bond is not stage, and stage is not the card object.

## 10) Recommended card/Dex structure

### Core Creature Dex
- Keep **45 creature identities**.

### Card Dex (future metadata-driven layer)
- Add card entries for stage/form/variant snapshots, e.g.:
  - `common-mossling-baby-card`
  - `common-mossling-medium-card`
  - `common-mossling-adult-card`
  - `common-mossling-shiny-card`

Recommendation: represent this by extending card metadata/catalog structure later, **not** by expanding `creatureCatalog` identities.

## 11) Asset naming recommendation

Current creature convention should remain:
- `public/assets/creatures/{imageKey}.webp`

Future-safe stage art naming:
- `{imageKey}.webp` (base/Lv1)
- `{imageKey}-lv2.webp`
- `{imageKey}-lv3.webp`
- `{imageKey}-lv4.webp`

If static card art files are needed later:
- `public/assets/creature-cards/{cardKey}.webp`

Preferred long-term direction: app-rendered card frames + metadata text + creature cutouts, with card-specific background/effects modularized.

## 12) Recommended production order

Given current status (5 production assets, active draft exploration, 8 curated metadata creatures):

1. **Curated-metadata creatures missing finalized production art** first.
2. **Common creatures with strongest identity clarity** second.
3. **Ambiguous identities only after reinterpretation passes** third.
4. **Rare/mythic expansion after common identity system is stable** fourth.

Suggested immediate production sequence:
- Finish curated 8 identity lock (Sproutling, Pebble Spirit, Mossling, Glowtail, Ember Sprout, Aurora Finch, Nebula Wisp, Starhorn Seraph).
- Then advance strong commons/rares with low overlap risk.
- Defer high-overlap pup/fox/cat/sprite entries until silhouette/species reinterpretation decisions are approved.

## 13) Final recommendations

- Keep the core count at **45 creatures** for now.
- Improve weak/overlapping identities before producing additional final art.
- Use stage/form/card layers to add depth.
- Do **not** expand `creatureCatalog` count yet.
- Do **not** add DB schema changes yet.
- **Next safest PR after this audit:** add a docs-only “Creature Identity Lock Sheet” for the 8 reinterpretation-priority creatures (species silhouette, movement, role sentence, and overlap guardrails), then finalize only after design sign-off.

## Validation

This pass is docs-only and does not propose runtime code, gameplay/economy/hatch/sell/collection/bond-XP, or schema changes.

## 12) Stage metadata sync note (2026-05-25)

- The core Dex remains **45 primary creatures**; staged forms are not new unrelated species IDs.
- Stage forms are modeled as **family/stage metadata + image/card forms**, preserving existing base creature IDs.
- Card variants may represent stage snapshots (for example Lv1/Lv2/Lv3) while still belonging to one core creature family.
- Companion progression may later unlock stage forms, but this change-set does **not** implement gameplay unlock logic.
