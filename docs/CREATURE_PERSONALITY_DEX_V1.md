# Creature Personality Dex v1

## Purpose

Creature Personality Dex v1 defines the first production-ready personality layer for the Creature Dex / Creature Card system.

The current code already gives creatures:

- species identity via `id`, `imageKey`, `name`
- rarity via `tier`
- elemental/location flavor via `habitat` and `shipZone`
- personality bridge metadata via `affinity`
- Perfect Companion matching through archetype and weakness support mappings

This document adds the missing product layer:

> Every creature should answer: **“This creature helps the player with ______.”**

Creatures should act as personality support companions connected to the Player’s Hand. They should strengthen useful traits or balance growth edges without permanently changing a user’s personality scores.

## Core philosophy

Use this formula for Creature Card identity:

```text
Creature = species + element + rarity + personality role + trait support + weakness balance + card power
```

Do **not** frame creatures as changing a player’s underlying personality.

Use language like:

- “Pebble Spirit supports Stress Response today.”
- “Glowtail helps turn intention into rhythm.”
- “Mossling offers a gentle recovery prompt.”

Avoid language like:

- “Your Emotional Stability increased permanently.”
- “Your personality score changed.”

## Source-of-truth systems to reuse

Reuse existing repo language rather than inventing a new framework.

Personality traits and axes:

- Openness
- Conscientiousness
- Extraversion
- Agreeableness
- Emotional Stability
- Regulation Style
- Stress Response
- Identity Sensitivity
- Cognitive Entry
- Honesty-Humility
- Emotionality

Creature weakness support tags from `creatureArchetypeBridge.ts`:

- `stress_fragility`
- `decision_confusion`
- `low_consistency`
- `low_momentum`
- `low_confidence`
- `overwhelm`

Player’s Hand roles:

- Dominant card = amplify natural strength
- Secondary/support cards = stabilize and make strengths practical
- Shadow card = offer growth prompt / balancing companion

## Proposed Creature Personality Dex fields

These fields are product/design planning fields, not implementation requirements yet.

| Field | Purpose |
| --- | --- |
| `id` | Existing creature id from `creatureCatalog.ts`. |
| `imageKey` | Existing image key from `creatureCatalog.ts`. |
| `name` | Existing creature display name. |
| `tier` | Existing rarity tier: common, rare, mythic. |
| `existingAffinity` | Existing affinity from `creatureCatalog.ts`. |
| `existingHabitat` | Existing habitat from `creatureCatalog.ts`. |
| `existingShipZone` | Existing ship zone: zen, energy, cosmic. |
| `speciesIdentity` | What the creature physically/visually is. |
| `personalityTraitStrengthened` | Existing Big Five/custom trait or axis this creature supports. |
| `weaknessBalanced` | Existing weakness support tag this creature helps. |
| `playerHandSynergy` | How it interacts with dominant, secondary/support, or shadow cards. |
| `emotionalRole` | Simple human-readable purpose: “helps the player with ____.” |
| `passiveTraitConcept` | Card passive concept; should feel supportive, not score-changing. |
| `signatureMoveConcept` | Iconic card move / active moment. |
| `flavorQuote` | Short identity line for card/art direction. |
| `identityRiskNotes` | Notes to prevent generic overlap or unsafe framing. |

## First 8 personality-enhanced creature cards

| id | imageKey | name | tier | existingAffinity | existingHabitat | existingShipZone | speciesIdentity | personalityTraitStrengthened | weaknessBalanced | playerHandSynergy | emotionalRole | passiveTraitConcept | signatureMoveConcept | flavorQuote | identityRiskNotes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `common-sproutling` | `common-sproutling` | Sproutling | common | Builder | Zen Garden | zen | Tiny habit seed-builder with new roots and starter leaves. | Conscientiousness | `low_consistency` | Helps support cards become small daily steps; gives shadow cards a safe first action. | Helps the player start tiny and follow through without pressure. | Small Roots: offers a gentle routine prompt or first-step reminder. | First Step Sprout | “Small roots hold big dreams.” | Must be habit-builder, not just generic plant mascot. Keep separate from Twilight Seed by making Sproutling practical, not dreamy. |
| `common-pebble-spirit` | `common-pebble-spirit` | Pebble Spirit | common | Grounded | Root Atrium | zen | Calm stone-and-moss spirit with a patient, grounded presence. | Emotional Stability / Stress Response | `stress_fragility` | Stabilizes shadow-card work and helps intense dominant cards pause before acting. | Helps the player pause, ground, and endure. | Grounding Stone: supports a one-breath reset before stressful actions. | Stillness Pulse | “Pause. Then choose.” | Avoid “emotion score increased” language. Make it patience and grounding, not permanent Emotional Stability. |
| `common-mossling` | `common-mossling` | Mossling | common | Nurturer | Moss Gallery | zen | Soft moss companion that grows slowly in shaded places. | Agreeableness / self-kindness | `low_confidence` | Supports Heart-suit cards and helps shadow cards recover without self-criticism. | Helps the player recover gently without self-criticism. | Soft Recovery: offers a kind recovery prompt after a missed habit or failed attempt. | Gentle Cover | “Growth can be quiet.” | Must not duplicate Garden Puff or Bloom Mite. Mossling owns quiet self-care and recovery. |
| `common-glowtail` | `common-glowtail` | Glowtail | common | Steady | Hydro Deck | zen | Water-deck guide with a glowing tail that marks the next safe step. | Regulation Style | `decision_confusion` | Turns dominant intent into rhythm; helps support cards make a plan practical. | Helps the player find one clear next step. | Guiding Rhythm: highlights a simple next action when choices feel noisy. | Glow Path | “One clear step is enough.” | Distinguish from Tide Lantern: Glowtail is personal rhythm/next-step guidance, not conflict peacekeeping. |
| `rare-ember-sprout` | `rare-ember-sprout` | Ember Sprout | rare | Catalyst | Ember Lab | energy | Fire-sprout activation companion with warm ember leaves. | Extraversion / action energy | `low_momentum` | Amplifies action-oriented dominant cards and wakes up stalled support cards. | Helps the player start when motivation is low. | Activation Spark: gives a small “start now” nudge without demanding perfection. | Ember Kickstart | “Start warm. Burn steady.” | Catalyst is not a canonical archetype card, but code maps Catalyst to Challenger, Inventor, Creator. Keep it activation-focused, not reckless. |
| `rare-aurora-finch` | `rare-aurora-finch` | Aurora Finch | rare | Visionary | Sky Foundry | energy | Bright sky messenger with aurora feathers and a clear signal call. | Openness / Visionary expression | `low_momentum` | Helps Visionary, Creator, and Pioneer hands communicate the future instead of only imagining it. | Helps the player express an inspiring direction. | Horizon Call: turns a big idea into a shareable intention. | Aurora Call | “Sing the next horizon.” | Avoid overlap with Cosmos Songbird. Aurora Finch is outward communication and momentum, not deep cosmic wisdom. |
| `rare-nebula-wisp` | `rare-nebula-wisp` | Nebula Wisp | rare | Explorer | Astral Dome | cosmic | Cosmic route-finder made of soft nebula light. | Openness | `decision_confusion` | Helps Spirit-suit hands explore uncertainty without freezing; turns shadow uncertainty into curiosity. | Helps the player move through uncertainty safely. | Unknown Map: reframes unclear choices as safe experiments. | Nebula Drift | “Unknown does not mean unsafe.” | Strong identity already. Keep it uncertainty/exploration, not generic cosmic spirit. |
| `mythic-starhorn-seraph` | `mythic-starhorn-seraph` | Starhorn Seraph | mythic | Oracle | Astral Dome | cosmic | Celestial horned guardian with oracle-light and protective presence. | Cognitive Entry | `decision_confusion` | Guides shadow cards toward wisdom; supports Sage/Mystic/Philosopher-style reflection before action. | Helps the player turn confusion into wisdom. | Pattern Mercy: offers a reflective prompt that finds the kindest pattern in uncertainty. | Starhorn Omen | “The pattern is kinder than the fear.” | Oracle is not a canonical archetype card, but code maps Oracle to Sage, Mystic, Philosopher. Avoid fatalistic prophecy; frame as reflective wisdom. |

## First 8 quick design summary

| Creature | Personality role | Helps with | Boosts | Card identity |
| --- | --- | --- | --- | --- |
| Sproutling | Beginner habit-builder | `low_consistency` | Conscientiousness | “Small roots hold big dreams.” |
| Pebble Spirit | Grounded patience | `stress_fragility` | Emotional Stability / Stress Response | “Pause. Then choose.” |
| Mossling | Gentle recovery | `low_confidence` | Agreeableness / self-kindness | “Growth can be quiet.” |
| Glowtail | Rhythm guide | `decision_confusion` | Regulation Style | “One clear step is enough.” |
| Ember Sprout | Activation spark | `low_momentum` | Extraversion / action energy | “Start warm. Burn steady.” |
| Aurora Finch | Inspired communication | `low_momentum` | Openness / Visionary expression | “Sing the next horizon.” |
| Nebula Wisp | Uncertainty explorer | `decision_confusion` | Openness | “Unknown does not mean unsafe.” |
| Starhorn Seraph | Oracle guardian | `decision_confusion` | Cognitive Entry | “The pattern is kinder than the fear.” |

## Bonus framing rules

Creature bonuses should be small, temporary, and framed as support.

Recommended copy patterns:

- `{Creature} supports {Trait/Axis} today.`
- `{Creature} helps turn {hand strength} into a practical next step.`
- `{Creature} offers a {weakness support} prompt when this hand feels stuck.`

Avoid:

- permanent score changes
- clinical claims
- “fixed your weakness” language
- rarity-only power spikes

## Player’s Hand interaction rules

| Hand role | Creature effect |
| --- | --- |
| Dominant | Amplify the player’s natural strength with a light, visible boost or prompt. |
| Secondary/support | Stabilize the strength and make it practical. |
| Shadow | Offer a growth prompt or balancing companion. |

Example:

If a player has Challenger as dominant but Peacemaker as shadow, Dewling or Tide Lantern can appear as balancing companions because they help soften stress and support harmony without suppressing the player’s Challenger energy.

## Recommended next visual design order

Use these 8 creatures as the next card redesign batch:

1. Sproutling
2. Pebble Spirit
3. Mossling
4. Glowtail
5. Ember Sprout
6. Aurora Finch
7. Nebula Wisp
8. Starhorn Seraph

Together they cover:

- starter habit formation
- stress grounding
- gentle recovery
- decision clarity
- activation / momentum
- inspired expression
- uncertainty exploration
- mythic wisdom

## Full Dex Expansion Plan

The First 8 table should become the template for all 45 production creatures, but the expansion should stay grounded in the current code-truth:

1. Start from `creatureCatalog.ts` for each creature’s `id`, `name`, `tier`, `habitat`, `shipZone`, and existing `affinity`.
2. Use `creatureArchetypeBridge.ts` for the allowed weakness support tags associated with that affinity.
3. Assign one primary personality-support role per creature using existing Big Five/custom trait language from the Player’s Hand system.
4. Write one simple emotional-role sentence for every creature: “This creature helps the player with ______.”
5. Add identity risk notes before art/card production so creatures with similar habitats or affinities do not collapse into the same role.
6. Review the full 45-creature table as content/design planning before adding optional config fields or gameplay bonuses.

The goal is not to create a new personality framework. The goal is to make every existing creature more legible as a supportive companion within the current affinity, weakness-support, and Player’s Hand model.

## Remaining 37 creature mapping backlog

These are placeholders for the 37 creatures not finalized in the First 8 table. Weakness tags below are selected from the current affinity bridge and should be reviewed during the full Dex pass.

| id | name | tier | existing affinity | proposed personality role placeholder | likely trait strengthened | likely weakness balanced | identity risk note |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `common-drift-pup` | Drift Pup | common | Explorer | Gentle route-tester | Openness | `low_momentum` / `decision_confusion` | Keep softer and more playful than Nebula Wisp or Crown Drifter. |
| `common-bloom-mite` | Bloom Mite | common | Caregiver | Tiny nurture nudge | Agreeableness | `low_confidence` / `stress_fragility` | Avoid overlap with Mossling; make it active micro-encouragement, not recovery. |
| `common-stone-hopper` | Stone Hopper | common | Builder | Sturdy follow-through buddy | Conscientiousness | `low_consistency` / `overwhelm` | Keep physical, repeatable progress distinct from Sproutling’s beginner habit identity. |
| `common-fern-fox` | Fern Fox | common | Mentor | Clever path mentor | Cognitive Entry / Agreeableness | `decision_confusion` / `low_confidence` | Should feel wise and nimble, not mystical like Oracle creatures. |
| `common-dewling` | Dewling | common | Peacemaker | Emotional soft-reset companion | Stress Response / Agreeableness | `stress_fragility` / `overwhelm` | Owns softening and reset; avoid making it a generic water creature. |
| `common-root-whisp` | Root Whisp | common | Steady | Values-return anchor | Regulation Style | `low_consistency` / `decision_confusion` | Distinguish from Pebble Spirit by focusing on returning to what matters, not pausing. |
| `common-garden-puff` | Garden Puff | common | Nurturer | Light comfort companion | Agreeableness / self-kindness | `low_confidence` / `stress_fragility` | Keep buoyant and comforting; do not duplicate Mossling’s quiet recovery lane. |
| `common-lichen-kit` | Lichen Kit | common | Grounded | Resilient grounding learner | Emotional Stability / Stress Response | `stress_fragility` / `overwhelm` | Should feel adaptive and durable, not another Pebble Spirit. |
| `common-twilight-seed` | Twilight Seed | common | Dreamer | Quiet possibility keeper | Openness | `low_momentum` / `low_confidence` | Keep dreamy and future-oriented; do not become Sproutling’s practical habit role. |
| `common-river-bud` | River Bud | common | Caregiver | Emotional replenishment sprout | Agreeableness / Stress Response | `low_confidence` / `stress_fragility` | Make it replenishing flow, not Dewling’s reset or Mossling’s recovery. |
| `common-petal-scout` | Petal Scout | common | Explorer | Tiny discovery scout | Openness | `low_momentum` / `decision_confusion` | Keep scout-like curiosity distinct from Drift Pup’s route testing. |
| `rare-luma-hatchling` | Luma Hatchling | rare | Visionary | First-light vision starter | Openness / Visionary expression | `low_momentum` / `decision_confusion` | Should feel like emerging inspiration, not Aurora Finch’s outward communication. |
| `rare-dewleaf-sprite` | Dewleaf Sprite | rare | Guardian | Protective daily steadier | Emotional Stability / Conscientiousness | `stress_fragility` / `low_consistency` | Keep guardian role gentle; avoid making it a defensive power fantasy. |
| `rare-solar-pika` | Solar Pika | rare | Champion | Confidence charge companion | Extraversion / action energy | `low_confidence` / `low_momentum` | Should spark courage without implying confidence is permanently fixed. |
| `rare-comet-cub` | Comet Cub | rare | Strategist | Fast planner | Cognitive Entry | `decision_confusion` / `overwhelm` | Keep planning compact and playful; avoid becoming a cold analytics mascot. |
| `rare-bloom-seraph` | Bloom Seraph | rare | Mentor | Compassionate guidance companion | Cognitive Entry / Agreeableness | `decision_confusion` / `low_confidence` | Distinguish from Starhorn Seraph by making it nurturing guidance, not oracle wisdom. |
| `rare-shard-marten` | Shard Marten | rare | Architect | Precision builder | Conscientiousness / Cognitive Entry | `low_consistency` / `decision_confusion` | Avoid harsh perfectionism; frame precision as supportive clarity. |
| `rare-cinder-mouse` | Cinder Mouse | rare | Challenger | Tiny courage spark | Extraversion / action energy | `low_confidence` / `low_momentum` | Keep courage warm and small-scale, not aggressive or reckless. |
| `rare-tide-lantern` | Tide Lantern | rare | Peacemaker | Calm conflict lantern | Stress Response / Agreeableness | `stress_fragility` / `overwhelm` | Owns harmony and pressure relief; keep separate from Glowtail’s next-step rhythm. |
| `rare-halo-staglet` | Halo Staglet | rare | Guardian | Protective confidence guide | Emotional Stability / Conscientiousness | `stress_fragility` / `low_consistency` | Avoid divine certainty; make it gentle protection and steadiness. |
| `rare-gear-wing` | Gear Wing | rare | Builder | Mechanical routine helper | Conscientiousness / Regulation Style | `low_consistency` / `overwhelm` | Keep systems-oriented; do not duplicate Stone Hopper’s physical persistence. |
| `rare-mirage-pup` | Mirage Pup | rare | Creator | Playful reframing companion | Openness | `low_momentum` / `overwhelm` | Make it creative perspective, not decision-clarity like Nebula Wisp. |
| `rare-crown-drifter` | Crown Drifter | rare | Explorer | Brave horizon drifter | Openness | `low_momentum` / `decision_confusion` | Keep bold exploration distinct from Drift Pup’s gentle test and Nebula Wisp’s uncertainty safety. |
| `mythic-voidlight-familiar` | Voidlight Familiar | mythic | Visionary | Shadow-light vision familiar | Openness / Visionary expression | `low_momentum` / `decision_confusion` | Mythic should deepen meaning, not grant stronger pay-to-win outcomes. |
| `mythic-sunflare-kirin` | Sunflare Kirin | mythic | Radiant | Radiant resolve guardian | Extraversion / Agreeableness | `low_confidence` / `stress_fragility` | Keep warmth and courage balanced; avoid pure power fantasy. |
| `mythic-dreamroot-ancient` | Dreamroot Ancient | mythic | Sage | Deep reflection elder | Cognitive Entry | `decision_confusion` / `overwhelm` | Should be patient wisdom, not prophecy or deterministic advice. |
| `mythic-celest-pup` | Celest Pup | mythic | Cosmic | Cosmic comfort companion | Openness / Stress Response | `overwhelm` / `stress_fragility` | Keep emotionally safe and approachable despite cosmic scale. |
| `mythic-lux-leviathan` | Lux Leviathan | mythic | Commander | Steady command companion | Extraversion / Conscientiousness | `low_confidence` / `low_consistency` | Avoid dominance language; frame command as calm leadership support. |
| `mythic-orbit-vulpine` | Orbit Vulpine | mythic | Explorer | Patterned exploration guide | Openness | `low_momentum` / `decision_confusion` | Differentiate from Nebula Wisp by emphasizing orbit/pattern, not uncertainty safety. |
| `mythic-astral-titanet` | Astral Titanet | mythic | Architect | Cosmic structure builder | Conscientiousness / Cognitive Entry | `low_consistency` / `decision_confusion` | Avoid making mythic structure feel like unavoidable optimization. |
| `mythic-solstice-sylph` | Solstice Sylph | mythic | Creator | Seasonal renewal muse | Openness | `low_momentum` / `overwhelm` | Keep creative renewal distinct from Mirage Pup’s playful reframing. |
| `mythic-echo-phoenix` | Echo Phoenix | mythic | Champion | Resilient comeback spark | Extraversion / action energy | `low_confidence` / `low_momentum` | Frame comeback as encouragement, not guaranteed victory. |
| `mythic-nightbloom-drake` | Nightbloom Drake | mythic | Rebel | Courageous boundary companion | Openness / action energy | `low_momentum` / `low_confidence` | Avoid rebelliousness as harm or defiance; make it healthy boundary energy. |
| `mythic-prism-warden` | Prism Warden | mythic | Guardian | Many-angle protector | Emotional Stability / Conscientiousness | `stress_fragility` / `low_consistency` | Keep protection reflective and supportive, not invulnerability. |
| `mythic-aurora-maned-cat` | Aurora Maned Cat | mythic | Visionary | Poised inspiration companion | Openness / Visionary expression | `low_momentum` / `decision_confusion` | Distinguish from Aurora Finch by making it quiet poise, not communication. |
| `mythic-cosmos-songbird` | Cosmos Songbird | mythic | Sage | Cosmic meaning singer | Cognitive Entry / Openness | `decision_confusion` / `overwhelm` | Keep meaning-making lyrical; avoid overlap with Aurora Finch’s horizon call. |
| `mythic-infinity-sprite` | Infinity Sprite | mythic | Oracle | Infinite perspective sprite | Cognitive Entry | `decision_confusion` / `stress_fragility` | Avoid fatalism or “knows your destiny”; frame as perspective and kindness. |

## Card UI / copy guardrails

- Creature cards should show only simple personality-support copy at first glance.
- The primary card copy should answer: “This creature helps the player with ______.”
- Detail panels, modals, or “Why this helps you” views can reveal deeper Player’s Hand synergy.
- Avoid clinical language, diagnostic claims, therapy-style promises, or fixed labels.
- Avoid permanent trait-change language such as “your score increased” or “your personality changed.”
- Avoid making mythics feel pay-to-win; mythic cards can feel more iconic, but their support should be framed as rarer flavor, deeper reflection, or stronger narrative identity rather than objectively superior self-development.
- Keep card copy emotionally useful, short, and game-like.

## Next implementation candidates

1. Keep `docs/CREATURE_PERSONALITY_DEX_V1.md` as planning only for now.
2. Review and finalize the full 45-creature mapping table with product/design before adding data fields.
3. After review, consider optional static config fields for `speciesIdentity`, `personalityTraitStrengthened`, `weaknessBalanced`, `emotionalRole`, and card copy.
4. Do not implement gameplay bonuses directly from this document yet.
5. If gameplay effects are added later, route them through approved creature/Perfect Companion systems and keep them temporary, explainable, and non-deterministic about personality.

## Open product notes

- `Catalyst` and `Oracle` are creature affinities, not canonical archetype cards; current code bridges them to archetype families.
- The doc uses current weakness tags from `creatureArchetypeBridge.ts`.
- Future Creature Dex work should extend this table to all 45 creatures before additional creature card art is finalized.
