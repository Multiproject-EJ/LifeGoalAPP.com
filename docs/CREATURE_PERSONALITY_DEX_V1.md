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

## Open product notes

- `Catalyst` and `Oracle` are creature affinities, not canonical archetype cards; current code bridges them to archetype families.
- The doc uses current weakness tags from `creatureArchetypeBridge.ts`.
- Future Creature Dex work should extend this table to all 45 creatures before additional creature card art is finalized.
