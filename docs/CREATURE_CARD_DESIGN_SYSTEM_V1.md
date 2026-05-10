# Creature Card Design System v1

## 1. Purpose

Creature Card Design System v1 locks the visual/card structure before more creature card art is produced.

Creature card image generation has already shown style drift across frames, top bars, badge positions, and overall presentation. This contract gives future Copilot, Codex, and image generation work a stable reference so the Creature Dex can grow without each card becoming a one-off design.

This is a planning and art-direction document. It does not require code changes.

## 2. Core card philosophy

> “Complex collectibility should feel visually simple.”

Creature Cards should feel collectible, premium, magical, and readable without becoming visually noisy.

- Use the same structure every time so cards can be compared quickly.
- Make creature art the emotional focus of the card.
- Present one clear power number.
- Keep personality-support copy short and supportive.
- Place deeper detail in modal or dex views instead of overloading the card face.
- Take inspiration from the clarity of classic trading cards without copying Pokémon layout, branding, or exact visual language.

## 3. Universal card skeleton

Every creature card must share the same skeleton.

| Part | Purpose | What stays fixed | What can vary |
| --- | --- | --- | --- |
| Outer frame | Creates the premium collectible object. | Same frame shape, border thickness, corner treatment, and gold/dark framing language. | Accent glow, rarity finish, subtle element trim. |
| Top name bar | Gives the fastest identity read. | Same location, height, typography hierarchy, and layout. | Creature name, small accent color, subtle motif. |
| Rarity badge | Shows collectibility tier without changing the card layout. | Same badge position and approximate size. | Common/rare/mythic label, icon detail, finish treatment. |
| Power badge | Gives one clear comparative number. | Same position, size family, and visual priority on every card. | Power score and small element/rank treatment. |
| Element/type icon | Adds quick element recognition. | Same placement and icon container size. | Element icon and accent color. |
| Art window | Makes the creature the hero. | Same size, position, crop zone, and inner-frame shape. | Creature art, pose, background motif, lighting accent. |
| Species/personality role line | Connects the creature identity to its support purpose. | Same line position below the art window. | Species phrase and role text. |
| Passive trait box | Communicates the always-on support concept. | Same box location, heading style, and text limit. | Passive name and short supportive text. |
| Simple move box | Provides a basic game-like action. | Same box order and size. | Move name and short action text. |
| Signature move box | Gives each creature an iconic moment. | Same box order, size, and emphasis level. | Signature move name and short text. |
| Strengths/weaknesses row | Shows what the creature supports and balances. | Same row location and chip/icon style. | Trait/axis, weakness support tag, small icons. |
| Flavor quote strip | Adds emotional memorability. | Same bottom strip position and quote style. | One short quote. |
| Card number/collection marker area | Supports set tracking and future collection structure. | Same bottom metadata area. | Card number, set marker, edition, or collection symbol. |

## 4. What may change per card

- Creature art
- Name
- Species identity
- Element accent color
- Rarity label
- Power score
- Role
- Passive name/text
- Move names/text
- Quote
- Small background/element motif

## 5. What must not change per card

- Outer frame shape
- Top bar structure
- Power badge location
- Art window size/location
- Ability box structure
- Overall information hierarchy

Element and rarity should decorate the locked skeleton. They should not redesign it.

## 6. Rarity visual rules

Rarity changes the accent treatment, not the card skeleton.

### Common

Common cards should feel clean, charming, friendly, and immediately readable.

- Light sparkle only.
- Minimal texture.
- Clear creature silhouette.
- Soft element accent.

### Rare

Rare cards should feel brighter and more magical than common cards while remaining easy to read.

- Stronger accent glow.
- Slightly richer frame finish.
- More visible background motif.
- Extra magical particles only if they do not compete with the creature face.

### Mythic

Mythic cards should feel premium and celestial without becoming noisy.

- Celestial or premium foil-like accent treatment.
- Deeper contrast and more dramatic lighting.
- Elegant frame shimmer, not a full layout redesign.
- Strong restraint: mythic should feel special because the same skeleton has been elevated.

## 7. Element/type accent rules

Element colors are accents, not full layout redesigns.

| Element/type | Accent direction |
| --- | --- |
| Nature | Leaf green, warm moss, gentle botanical highlights. |
| Earth | Stone brown, moss-gold, grounded amber shadows. |
| Water | Clear blue, aqua highlights, soft ripple motifs. |
| Fire | Ember orange, warm red, controlled spark motifs. |
| Sky | Aurora cyan, pale blue, feather-light gradients. |
| Cosmic | Nebula purple, star blue, soft galaxy specks. |
| Light | Gold, pearl, sunlit cream, radiant edge highlights. |
| Void | Deep indigo, violet-black, restrained luminous contrast. |
| Machine/gear | Brass, steel blue, small gear-line accents. |
| Spirit | Mist teal, pale violet, translucent glow accents. |

The same element should use a consistent accent family across cards so the Dex feels organized.

## 8. Creature art rules

Use the Creature Personality Dex v1 philosophy:

> Every creature should answer: **“This creature helps the player with ______.”**

Every creature art brief should include:

- Species identity.
- Personality support role.
- Weakness balanced.
- Silhouette rule.
- What makes it impossible to confuse with another creature.
- Transparent cutout compatibility.

Creature art should:

- Have unique species identity.
- Use a big readable face.
- Create an iconic silhouette.
- Work as a transparent cutout outside the card.
- Stay readable in Sanctuary grid, detail, hatch reveal, and card surfaces.

Avoid:

- Generic dog/fox/cat repetition.
- All creatures becoming green blobs.
- Over-realism.
- Over-detailing.
- Unreadable small silhouettes.
- Baked card frames, baked text, or baked rarity markers in cutout assets.

## 9. Copy rules

Card copy must be:

- Short.
- Supportive.
- Game-like.
- Non-clinical.
- Non-diagnostic.
- Temporary/supportive, not permanent trait-changing.

Use the merged Creature Personality Dex v1 language. Creature cards should strengthen useful traits or balance growth edges without claiming to change who the player is.

Good example:

> “Pebble Spirit supports Stress Response today.”

Bad example:

> “Your Emotional Stability increased permanently.”

Avoid:

- Permanent personality score changes.
- “Fixed your weakness” language.
- Clinical claims.
- Long ability text.
- Rarity-only power spike language.

## 10. First 8 card redesign notes

These notes use `docs/CREATURE_PERSONALITY_DEX_V1.md` as the source for personality role, support purpose, and identity risks.

| Creature | Personality role | Visual identity rule | Card accent direction | One-line card purpose |
| --- | --- | --- | --- | --- |
| Sproutling | Beginner habit-builder supporting Conscientiousness and `low_consistency`. | Must read as a tiny habit seed-builder with new roots and starter leaves, not a generic plant mascot. | Nature accent: clean leaf green with warm seedling highlights. | Helps the player start tiny and follow through without pressure. |
| Pebble Spirit | Grounded patience supporting Emotional Stability / Stress Response and `stress_fragility`. | Must read as a calm stone-and-moss spirit with patient grounding, not a permanent emotion-score booster. | Earth accent: stone brown, moss-gold, subtle grounding glow. | Helps the player pause, ground, and endure. |
| Mossling | Gentle recovery supporting Agreeableness / self-kindness and `low_confidence`. | Must own quiet self-care and recovery without duplicating Garden Puff or Bloom Mite. | Nature/spirit accent: soft moss green with shaded cozy texture. | Helps the player recover gently without self-criticism. |
| Glowtail | Rhythm guide supporting Regulation Style and `decision_confusion`. | Must read as a personal next-step guide with a glowing tail, not Tide Lantern’s conflict-harmony role. | Water accent: aqua-blue path glow and clean ripple motif. | Helps the player find one clear next step. |
| Ember Sprout | Activation spark supporting Extraversion / action energy and `low_momentum`. | Must be warm activation, not reckless fire or generic plant repetition. | Fire accent: ember orange with controlled spark highlights. | Helps the player start when motivation is low. |
| Aurora Finch | Inspired communication supporting Openness / Visionary expression and `low_momentum`. | Must be an aurora-feathered sky messenger focused on expression, not deep cosmic wisdom. | Sky accent: aurora cyan, pale blue, feather-light shine. | Helps the player express an inspiring direction. |
| Nebula Wisp | Uncertainty explorer supporting Openness and `decision_confusion`. | Must be a cosmic route-finder made of soft nebula light, not a generic cosmic spirit. | Cosmic accent: nebula purple, star blue, soft drift particles. | Helps the player move through uncertainty safely. |
| Starhorn Seraph | Oracle guardian supporting Cognitive Entry and `decision_confusion`. | Must be a celestial horned guardian with reflective wisdom, not fatalistic prophecy. | Light/cosmic mythic accent: pearl-gold, star blue, restrained celestial foil. | Helps the player turn confusion into wisdom. |

## 11. Production workflow

Recommended flow:

1. Define card data.
2. Generate creature cutout.
3. Test creature in Sanctuary grid/detail/hatch reveal.
4. Generate card mockup using locked frame.
5. Compare card against the template.
6. Only then proceed to next creature.

Do not produce a large card batch until the first locked frame holds up across common, rare, and mythic examples.

## 12. Open decisions

- Whether cards are purely visual/collectible at first.
- Whether power scores enter gameplay later.
- Whether Lv1/Lv2/Lv3 evolution gets separate cards.
- Whether card backgrounds are app-rendered or image-generated.
- Whether the locked frame becomes an app-rendered UI component, a generated art template, or both.
- Whether collection markers are global Dex numbers, set numbers, event numbers, or all three.
