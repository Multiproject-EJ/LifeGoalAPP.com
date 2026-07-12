# Archetype Card System

## Overview

The 4-Suit Archetype Card System extends the existing personality test to provide a visual, gamified representation of personality as a "Player's Deck". Instead of just seeing trait percentages, users get:

1. **A 5-card hand** (dominant, secondary, 2 supports, 1 shadow)
2. **Visual card metaphor** (each archetype = a card with icon, level, suit color)
3. **Progressive unlocking** (micro-tests level up cards and unlock new insights)
4. **Growth-oriented framing** (shadow card = opportunity, not weakness)

## Architecture

### Core Concepts

**Foundation Test = Opening Hand**
- The existing 28-question personality test generates the initial 5-card hand
- Archetype scores are derived from existing Big Five + custom axes
- No new questions required for the foundation

**Micro-Tests = Deck Evolution**
- Short 4-8 question quizzes that unlock through gameplay
- Confirm cards, level them up (Lv 0 → Lv 5), discover new archetypes
- Measure optional dimensions (e.g., HEXACO) not in foundation test

**Layered Design**
- Archetype system is **additive**, not replacing existing personality scoring
- Existing trait/axis data remains the source of truth
- Archetype data is optional (backwards compatible)

### File Structure

```
src/features/identity/
├── archetypes/
│   ├── archetypeDeck.ts          # 32 archetype card definitions (8 per suit)
│   ├── archetypeScoring.ts       # Score cards from personality traits
│   ├── archetypeHandBuilder.ts   # Build 5-card hand from scores
│   └── archetypeCopy.ts          # Display copy for cards
├── microTests/
│   ├── microTestData.ts          # Micro-test question banks
│   ├── microTestTriggers.ts      # Unlock conditions
│   ├── microTestScoring.ts       # Blending algorithm with decay
│   └── useMicroTestBadge.ts      # Notification badge hook
├── deck/
│   ├── ArchetypeCard.tsx         # Individual card component
│   ├── PlayerDeck.tsx            # Main 5-card display
│   └── DeckSummary.tsx           # Compact deck view
└── PersonalityTest.tsx           # Integrated with results view
```

## The 32 Archetypes (8 per suit)

### Power Suit (Agency)
- **Commander** ⚔️: Natural leadership and strategic direction
- **Champion** 🏆: Competitive drive and performance focus
- **Strategist** ♟️: Long-term planning and systems thinking
- **Challenger** 🔥: Boundary-pushing and norm-questioning
- **Guardian** 🛡️: Protection, loyalty, and standing firm
- **Warlord** ⚡: Crisis leadership through force of will
- **Diplomat** 🤝: Influence through negotiation and alliances
- **Enforcer** ⚖️: Standards, discipline, and accountability

### Heart Suit (Empathy)
- **Caregiver** 🤲: Nurturing support and emotional attunement
- **Mentor** 🌱: Patient guidance and growth facilitation
- **Peacemaker** ☮️: Conflict resolution and harmony-building
- **Altruist** ❤️: Selfless service and cause-driven action
- **Empath** 🫂: Deep feeling and emotional understanding
- **Healer** 💊: Restoring and mending what is broken
- **Connector** 🔗: Building bridges between people
- **Devotee** 🕊️: Full commitment and unconditional love

### Mind Suit (Reason)
- **Sage** 🧙: Wisdom-seeking and reflective thinking
- **Analyst** 📊: Data-driven precision and objectivity
- **Architect** 🏛️: Systems design and structural elegance
- **Inventor** 💡: Creative problem-solving and innovation
- **Scholar** 📚: Domain mastery through deep study
- **Detective** 🔍: Uncovering hidden truths
- **Philosopher** 🤔: Questioning existence and seeking meaning
- **Engineer** ⚙️: Practical, reliable solutions

### Spirit Suit (Vision)
- **Explorer** 🧭: Adventure-seeking and horizon-expanding
- **Creator** 🎨: Artistic expression and vision-making
- **Rebel** ✊: Status-quo challenging and path-forging
- **Visionary** 🌟: Future-oriented imagination and inspiration
- **Mystic** 🔮: Connection with the unseen and transcendent
- **Dreamer** 💭: Imagining worlds that could be
- **Shaman** 🌿: Bridging worlds and guiding transformation
- **Pioneer** 🚀: Blazing trails into uncharted territory

## Scoring Algorithm

Each archetype has **trait weights** that map to Big Five + custom axes:

```typescript
traitWeights: {
  extraversion: 1.0,        // High extraversion increases score
  conscientiousness: 1.0,   // High conscientiousness increases score
  agreeableness: -0.4,      // LOW agreeableness increases score (negative weight)
}
```

The scoring engine:
1. Takes existing personality trait scores (0-100)
2. For each archetype, computes weighted score from its trait weights
3. Ranks all 16 archetypes by score
4. Builds hand: top = dominant, 2nd = secondary, 3rd & 4th = supports, last = shadow

## Card Levels (0-5)

Cards level up through micro-test confirmations and habit alignment:

- **Lv 0 (Unplayed)**: Shadow card — least developed, growth opportunity
- **Lv 1 (Dealt)**: Initial hand from foundation test
- **Lv 2 (Confirmed)**: 1 micro-test confirmation
- **Lv 3 (Strengthened)**: 2+ confirmations or streak alignment
- **Lv 4 (Mastered)**: 3+ confirmations + active growth habit
- **Lv 5 (Legendary)**: Fully evolved — unlocks hybrid potential

## Micro-Test System

### Trigger Types

Micro-tests unlock through:
- **Level milestones** (e.g., Level 5 → HEXACO intro)
- **Streak achievements** (e.g., 14-day streak → confirm dominant)
- **Time-based** (e.g., 90 days → quarterly deck recheck)
- **Card stagnation** (card hasn't leveled in 30 days)
- **Shadow challenges** (player-initiated shadow exploration)

### Blending Algorithm

When micro-test results come in, they're blended with foundation scores:

- **Foundation weight**: 50% minimum (foundation test always anchors)
- **Decay half-life**: 60 days (micro-test influence fades)
- **Min score change**: 2 points (ignore noise)
- **Max score shift**: 15 points per micro-test (prevent wild swings)

Formula: `blendedScore = (foundationScore × 0.5) + (microScore × decayFactor × 0.5)`

## Data Model

### PersonalityTestRecord

```typescript
{
  id: string,
  user_id: string,
  taken_at: string,
  traits: Record<string, number>,          // Big Five scores
  axes: Record<string, number>,            // Custom axes
  answers: Record<string, number>,         // Raw answers
  archetype_hand?: ArchetypeHand,          // Optional archetype hand
  version: string,
  _dirty?: boolean
}
```

### ArchetypeHand

```typescript
{
  dominant: HandCard,
  secondary: HandCard,
  supports: [HandCard, HandCard],
  shadow: HandCard
}
```

### HandCard

```typescript
{
  card: ArchetypeCard,
  score: number,
  role: 'dominant' | 'secondary' | 'support' | 'shadow',
  level: number  // 0-5
}
```

## Integration Points

### Personality Test Results

After completing the foundation test, users see:
1. Existing trait cards (unchanged)
2. **NEW**: "Your Deck" section with DeckSummary component
3. Archetype hand is computed on-the-fly from trait scores
4. Saved alongside trait data for future reference

### ID Tab Badge

`useMicroTestBadge` is wired into `App.tsx`, but the badge is hard-gated off
(`MICRO_TEST_UI_WIRED = false` in `useMicroTestBadge.ts`) because `MicroTestFlow`
is not mounted anywhere yet. Flip the flag once a surface renders the flow.

### Unmeasured dimensions

The foundation test does not measure `honesty_humility` or `emotionality` —
those are HEXACO dimensions that only get data from micro-tests. Until then,
`scorePersonality` pins them at a neutral 50 so they don't skew archetype
ranking (several cards weight them), and the results UI hides them via
`isDimensionMeasured` from `personalityScoring.ts`.

### Supabase Schema

(TODO) Add `archetype_hand` JSONB column to `personality_tests` table.

## Design Philosophy

### Balance Over Maximization

The shadow card is framed positively as a "growth edge" or "hidden potential", not a weakness. This aligns with the app's AI coach philosophy: growth comes from balance, not from maximizing strengths.

### Player's Deck Metaphor

The deck metaphor makes personality feel:
- **Playful** (game-like, less clinical)
- **Dynamic** (evolves with you)
- **Empowering** (you're building your unique playstyle)

### Micro-Tests as Gameplay

Instead of a single long test, personality insights unfold progressively through gameplay:
- Complete habits → unlock micro-tests
- Micro-tests → level up cards
- Leveled cards → unlock deeper insights

This creates engagement loops and long-term retention.

## Future Enhancements

### Hybrid Archetypes

When 2+ cards reach Lv 5, unlock hybrid archetypes (e.g., "Commander-Sage" = Strategic Leader).

### AI-Generated Card Insights

Use AI coach to generate personalized interpretations of archetype combinations.

### Deck Sharing

Allow users to share their deck as a shareable image/link.

## Testing

See `/tmp/test-*.js` for validation scripts:
- `test-archetype-scoring.js`: Tests scoring algorithm
- `test-hand-builder.js`: Tests hand construction
- `test-micro-triggers.js`: Tests trigger evaluation

## Backwards Compatibility

All archetype features are **optional**:
- Existing personality tests without archetype data continue to work
- Archetype hand is computed on-demand from trait scores
- No breaking changes to existing data structures
