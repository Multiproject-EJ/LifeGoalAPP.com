# Wisdom Tree UX and Emotional Design Investigation

## Product direction

Wisdom Tree should feel like a cozy magical card encounter, not a therapy session.

Good emotional feel:

- Magical
- Warm
- Gentle
- Reflective
- Playful
- Safe
- Human

Bad emotional feel:

- Clinical
- Preachy
- Pushy
- Diagnostic
- Shame-based
- Morally judging
- Infinite chatbot-like

## Existing UX systems to reuse

### Island Run reflection pattern

- `src/features/gamification/level-worlds/components/IslandRunReflectionComposer.tsx`
  - Uses a prompt selector, short textarea, private journal save, and Island Run tags.
  - Good precedent for optional reflection that connects Island Run to the main journal.
  - Current wording is useful but more direct/productivity-oriented than the desired cozy fantasy tone.

### Existing Wisdom Landmark

- `src/features/gamification/level-worlds/services/islandRunStops.ts`
  - Stop 4 already exists as `📖 Wisdom Landmark`.
  - The description already names “short story, questionnaire, or learning moment.”
  - This is the cleanest UX home for Wisdom Tree cards.

### Existing encounter feel

- `src/features/gamification/level-worlds/services/encounterService.ts`
  - Current encounter types are quiz, breathing, and gratitude.
  - The service intentionally keeps them easy and low-friction.
  - Wisdom Tree should copy the low-pressure completion style, not the reward logic.

### Existing card/reveal feel

- `src/features/gamification/level-worlds/components/ShardClaimModal.tsx`
  - Blind-box shimmer reveal.
- `src/features/gamification/level-worlds/components/CreatureHatchRevealModal.tsx`
  - Magical reveal card with creature art.
- `src/features/gamification/daily-treats/ScratchCardReveal.tsx`
  - Tactile reveal with a threshold and “reveal now” pattern.
- `src/features/identity/deck/ArchetypeCard.tsx`
  - Existing symbolic card component pattern with icon, suit, role, stars, strengths, and growth edges.

### Existing modal/safe-area patterns

- `src/styles/feature-preview-overlay.css`
  - Centered panel, safe-area padding, scroll limit, nested feedback modal.
- `src/features/gamification/level-worlds/LevelWorlds.css`
  - Island Run uses full-screen mobile shell, safe-area padding, warm wood/amber/gold styling, HUD chips, and layered overlays.

## Emotional category system

Recommended six-category system:

| Category | Player-facing meaning | Visual language | Good use |
|---|---|---|---|
| Flame | drive, courage, forward motion | candle, ember, lantern, sunrise | when the player needs momentum |
| Hearth | comfort, care, connection | cabin, tea, blanket, warm window | when the player needs rest or belonging |
| Tide | feelings, reflection, flow | moon water, shells, soft waves | when the player needs to notice feelings |
| Storm | challenge, pressure, bravery | rain, clouds, safe shelter, lightning far away | when the player faces friction |
| Bloom | growth, hope, small beginnings | seed, sprout, flower, garden | when the player needs a tiny next step |
| Mirror | identity, values, self-image | mirror pool, stars, old key | when the player is choosing who they are becoming |

Design note:

- Keep these as fantasy symbols, not psychological labels.
- Avoid making one category “better” than another.
- Do not describe the player as a type. Describe the current card as a moment.

## Symbolic card system

### Card anatomy

Recommended card structure:

1. Category badge
   - Example: “Flame Card”
2. Card title
   - Example: “The Small Lantern”
3. One-line story
   - Example: “A tiny light is still enough to cross the next bridge.”
4. Two or three choices
   - Example:
     - “Rest the lantern”
     - “Carry it forward”
     - “Share the glow”
5. Tiny reflection
   - Example: “Which choice would make tonight feel kinder?”
6. Optional save
   - “Save a note to my journal”

### Future-self cards

Use symbolic names, not diagnoses:

- Burned-Out You → “The Tired Lantern”
- Peaceful You → “The Quiet Harbor”
- Focused You → “The Clear Path”
- Disconnected You → “The Far Window”

Recommended framing:

- “A future version of you sends a small note.”
- “This is a story mirror, not a verdict.”
- “Pick the note that feels useful today.”

Avoid:

- “Your anxiety profile says…”
- “You are burned out.”
- “Your attachment style means…”
- “This indicates a disorder.”

## Personality vector UX

Recommended internal sliders:

- Discipline ↔ Spontaneity
- Ambition ↔ Calm
- Social ↔ Solitary
- Structure ↔ Freedom
- Comfort ↔ Growth

User-facing translation:

- Do not show slider labels by default.
- Convert them into card tendencies:
  - “You often choose warm steady steps.”
  - “Your recent cards lean toward quiet focus.”
  - “The tree has noticed you like brave little starts.”

Good state names:

- Lantern
- Garden
- Harbor
- Ember
- Window
- Moonpath

Bad state names:

- Personality profile
- Diagnosis
- Disorder marker
- Emotional score
- Compliance level

## Cozy UX recommendations

### Modal presentation

- Use a full-screen dimmed forest/cabin backdrop on mobile.
- Keep card text short enough to read in one breath.
- Use one primary action and one soft secondary action.
- Let players leave without penalty.
- Use “Continue” rather than “Submit” where possible.

### Interaction pacing

- Wisdom Landmark: once per island is enough.
- Encounter tile: rare and cached only.
- Do not interrupt every roll.
- Do not show cards while dice/reward animations are in flight.

### Micro-interactions

- Soft leaf shimmer.
- Lantern glow on selected choice.
- Tiny “card settles” animation.
- Optional scratch/reveal pattern for rare cards.
- Haptic only if already consistent with Island Run haptics.

### Journal save

- Use “Save this note privately” rather than “Log mental health reflection.”
- Pre-fill nothing sensitive.
- Let the player write one sentence.
- Use cozy tags in future implementation, such as `wisdom-tree`, `island-run`, and category tag.

## Wording and tone rules

### Use

- “What feels kind today?”
- “Which path has a little light on it?”
- “Choose the step your future self would thank you for.”
- “You can move softly and still move.”
- “A small promise is still a real promise.”

### Avoid

- “Optimize your productivity.”
- “Correct your behavior.”
- “Your emotional pattern indicates…”
- “You should…”
- “Failure to choose growth means…”
- “This diagnosis suggests…”

### Words to avoid in player-facing copy

- entropy
- externalities
- homeostasis
- diminishing returns
- maladaptive
- pathology
- diagnosis
- treatment
- compliance
- intervention

## Good / bad card wording examples

### Flame

Good:

- “The ember is small, but it knows where the path begins. Pick one brave step.”
- Choices:
  - “Take a tiny action”
  - “Rest before the climb”
  - “Ask for a spark”

Bad:

- “Your ambition is underperforming. Select a productivity correction.”

### Hearth

Good:

- “A warm window glows in the distance. What would help you feel held today?”
- Choices:
  - “Send one kind message”
  - “Make the task softer”
  - “Pause with tea”

Bad:

- “You are socially deficient and should increase connection behaviors.”

### Tide

Good:

- “The tide is quiet enough to hear. Name one feeling and let it pass like a wave.”
- Choices:
  - “Name the feeling”
  - “Write one line”
  - “Take three breaths”

Bad:

- “Analyze your emotional regulation failure.”

### Storm

Good:

- “The storm is loud, but there is a little shelter nearby. Choose your safest next move.”
- Choices:
  - “Make it smaller”
  - “Wait one breath”
  - “Ask for help”

Bad:

- “Your anxiety response is irrational and requires correction.”

### Bloom

Good:

- “A seed does not need to become a forest today. Give it one cup of water.”
- Choices:
  - “Do the tiny version”
  - “Prepare the space”
  - “Celebrate starting”

Bad:

- “You have low conscientiousness and must increase adherence.”

### Mirror

Good:

- “The mirror pool shows a version of you who kept showing up gently. What would they want you to remember?”
- Choices:
  - “I can begin again”
  - “I am allowed to rest”
  - “I know what matters”

Bad:

- “Your identity sensitivity score is high; adjust your self-concept.”

## What NOT to do

- Do not create an infinite AI chat inside Island Run.
- Do not call AI every tile, roll, or encounter.
- Do not imply the app knows the player better than they know themselves.
- Do not use card choices to shame missed habits.
- Do not connect “good” emotional choices to better dice/reward outcomes.
- Do not diagnose, assess, or label mental health.
- Do not force journaling to complete core gameplay unless the stop is explicitly a reflection stop with a soft minimum.
- Do not expose raw personality vector math to players.

## Free vs Pro UX

### Free

- Mostly handcrafted cards.
- Light personalization from visible context:
  - active goal category
  - current island number
  - recent habit title if already in view/permissioned
- Low frequency.
- No live chat.

### Pro

- More card variety.
- Generated bundles with soft personalization.
- Future-self notes.
- Longer memory of chosen card themes.
- Still paced and finite.

## Recommended UX MVP

- Place Wisdom Tree at the existing Wisdom Landmark.
- Show one card with three choices.
- Use handcrafted text only.
- Let player continue without saving.
- Offer “Save one private note” as optional.
- Keep all wording symbolic, short, and non-clinical.
