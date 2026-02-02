# Trait Card UI Spec (Personality “Hand”)

## Purpose
Define the UI and content structure for the Personality “Trait Cards,” plus the rules for composing a user’s **hand** (combined cards) into strengths and growth edges.

## Card layout (front)
**Format:** single playing-card-style panel (rounded rectangle). Use existing app card styles and spacing.

**Recommended size:**
- Mobile: full-width card, 160–200px height.
- Desktop: 260–300px wide, 180–220px height.

**Structure (top → bottom):**
1. **Header strip**
   - **Trait name** (e.g., “Openness”).
   - **Trait icon** (simple glyph or emoji).
   - **Score band chip** (Low / Balanced / High) with color cue.
2. **Trait summary line**
   - One-sentence “power line” that describes the strongest expression of the trait.
3. **Strength highlight**
   - Short bold label: “Strength.”
   - One-sentence strength statement.
4. **Growth edge**
   - Short bold label: “Growth Edge.”
   - One-sentence tension or tradeoff statement.
5. **Footer**
   - Optional micro-tip (8–12 words) or linkable chip (e.g., “Try: Focus Sprint”).

## Card layout (back / detail)
Optional secondary view (tap to flip or expand drawer):
- Short paragraph with “how it shows up” in daily life.
- Two bullet examples (one at work, one in relationships).
- Link to recommended tool(s).

## Required fields
- `trait_key` (e.g., `openness`, `agreeableness`, `stress_response`).
- `trait_label` (display name).
- `trait_icon` (emoji or icon token).
- `score` (0–100).
- `band` (low / balanced / high).
- `strength_line` (string).
- `growth_edge_line` (string).
- `power_line` (string).
- `micro_tip` (string, optional).

## Visual rules
- **Color**: each trait has a consistent hue used in the header strip + band chip.
- **Band chip**: apply subtle gradient or tinted background for low/balanced/high.
- **Icon**: 24–28px on mobile, 28–32px on desktop.
- **Text**: keep copy to ≤ 2 lines per field (truncate + expand).

## Hand composition rules
A user’s **hand** is the set of all Trait Cards (Big Five + custom axes). The hand summary highlights **synergies** (strengths) and **tensions** (growth edges) by comparing high/low combinations.

### Strengths (synergy rules)
Select 2–3 strongest synergies where **both traits are High** or one High + one Balanced:
- **High Conscientiousness + High Emotional Stability** → “Steady executor under pressure.”
- **High Extraversion + High Agreeableness** → “Warm connector and motivator.”
- **High Openness + High Conscientiousness** → “Creative planner who ships.”
- **High Openness + High Stress Resilience** → “Bold experimenter, resilient to setbacks.”

### Tensions (growth edge rules)
Select 1–2 most prominent tensions where one trait is High and a paired trait is Low:
- **High Openness + Low Conscientiousness** → “Big ideas, inconsistent follow-through.”
- **High Conscientiousness + Low Openness** → “Reliable, but slow to embrace new approaches.”
- **High Extraversion + Low Agreeableness** → “Direct and energetic, may come off abrasive.”
- **High Neuroticism + Low Stress Resilience** → “Feels pressure strongly; needs strong recovery rituals.”

### Hand summary rendering
- **Headline:** 1–2 sentence summary of playstyle based on top 2 highs.
- **Strengths:** list 2–3 synergy bullets.
- **Growth edges:** list 1–2 tension bullets.
- **Next move:** 1 recommended tool tied to the most relevant tension.

## Trait score → card copy mapping (short table)
Use a consistent banding for all traits.

| Score band | Range | Power line template | Strength line template | Growth edge template |
| --- | --- | --- | --- | --- |
| Low | 0–39 | “You’re low on {{trait}}, which can mean {{low_descriptor}}.” | “Strength: {{low_strength}}.” | “Edge: {{low_edge}}.” |
| Balanced | 40–64 | “You’re balanced on {{trait}}, giving you {{balanced_descriptor}}.” | “Strength: {{balanced_strength}}.” | “Edge: {{balanced_edge}}.” |
| High | 65–100 | “You’re high on {{trait}}, so {{high_descriptor}}.” | “Strength: {{high_strength}}.” | “Edge: {{high_edge}}.” |

### Example trait copy (Openness)
- **Low**
  - Power line: “You’re low on Openness, which means you prefer proven paths.”
  - Strength: “You keep things grounded and practical.”
  - Edge: “You may overlook novel solutions.”
- **Balanced**
  - Power line: “You’re balanced on Openness, blending curiosity with practicality.”
  - Strength: “You adapt without losing focus.”
  - Edge: “You may hesitate to fully commit to new ideas.”
- **High**
  - Power line: “You’re high on Openness, so exploration fuels your growth.”
  - Strength: “You spot possibilities others miss.”
  - Edge: “You can scatter energy across too many ideas.”

## Implementation notes
- Trait card data can be generated from scoring results + a copy map file.
- Keep copy in a centralized `personalityTraitCopy.ts` module for reuse in results and hand summaries.
- The hand summary should be derived deterministically from scores (no AI required).
