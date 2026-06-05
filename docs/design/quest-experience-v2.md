# Quest Experience V2: Quest Journey Product/Design Direction

_Date: 2026-06-05_

## Product vision

Quest Experience V2 should turn HabitGame from a collection of powerful self-improvement tools into a premium **Quest Journey**: a guided life-design experience that helps a person understand who they are, choose where they are going, act today, reflect with a companion, and feel visible progression over time.

The experience should feel less like managing tabs and more like entering a personal journey map.

## Design principles

1. **One journey, many tools**
   - Life Wheel, goals, habits, routines, journal, AI Coach, archetypes, and rewards should feel like parts of one journey rather than separate apps.
2. **Emotional clarity before operational detail**
   - The first screen should answer “what matters now?” before showing lists, tables, or configuration controls.
3. **A single next best step**
   - Users should not have to choose among many competing nudges. The system should present one primary next action with an explanation.
4. **Identity-led behavior change**
   - The journey should connect actions to the person the user is becoming, not just tasks they must complete.
5. **Reflection creates momentum**
   - Journaling, check-ins, and reviews should feed back into direction and execution.
6. **The companion is present, not intrusive**
   - AI Coach should be felt as a supportive guide across the journey, with chat available when the user wants depth.
7. **Progression should be meaningful**
   - XP, profile strength, streaks, archetype levels, and Life Wheel trends should reinforce personal growth, not just engagement loops.

## Future Quest Journey hierarchy

Quest Journey V2 should be organized into five top-level pillars:

```text
Quest Journey
├─ Identity
├─ Direction
├─ Execution
├─ Companion
└─ Progression
```

Each pillar should answer a user question:

| Pillar | User question | Emotional promise |
| --- | --- | --- |
| Identity | Who am I becoming? | “I understand myself and my patterns.” |
| Direction | Where am I going? | “I know what matters now.” |
| Execution | What do I do today? | “I can take the next small step.” |
| Companion | Who is helping me? | “I am supported and understood.” |
| Progression | How am I changing? | “My effort is visible and meaningful.” |

## Quest Journey Home

The future Quest Home should not simply list feature shortcuts. It should be a premium summary surface with emotional hierarchy.

### Recommended screen structure

1. **Hero: Current Quest Chapter**
   - Shows the user’s active chapter, focus area, and identity-oriented framing.
   - Example tone: “This chapter is about rebuilding Body & Energy through small morning rituals.”
2. **One next best step**
   - A single primary call to action.
   - Includes why it was recommended: Life Wheel dip, missed habit, journal pattern, goal status, or profile strength gap.
3. **Journey map preview**
   - Compact visual of Identity, Direction, Execution, Companion, Progression.
   - Each node shows a simple status: clear, needs attention, ready, locked, or growing.
4. **Today’s ritual stack**
   - Habits and routines that serve the active Quest chapter.
5. **Companion insight**
   - Short AI Coach-style brief, not a full chat transcript.
6. **Progress pulse**
   - Life Wheel trend, streak/adherence, profile depth, reflection cadence, and milestone movement.
7. **Deeper paths**
   - Entry cards to Life Area Deep Dive, Goals, Journal, Coach, Identity, and Rewards.

### Emotional design target

The home should feel like:

- A calm coaching dashboard.
- A living map.
- A private life-design studio.
- A game quest log, but mature and wellness-oriented.

It should avoid feeling like:

- A settings panel.
- A productivity spreadsheet.
- A generic habit tracker.
- A cluttered menu of unrelated features.

## Pillar 1: Identity

### Purpose

Identity helps the user understand who they are becoming, what patterns shape their behavior, and which growth style fits them.

### Included concepts

- Personality traits and axes.
- Archetype hand/deck.
- Playstyle identity.
- Ikigai / North Star.
- Values, strengths, blind spots.
- Trait-guided journal prompts.

### Desired UX

Identity should feel like opening a personal character sheet for real life. It should be beautiful, affirming, and practical.

Recommended sections:

1. **Identity card**
   - Dominant archetype, supporting traits, growth edge, current season.
2. **North Star / Ikigai canvas**
   - A concise synthesis of what energizes the user, what they are good at, what they want to contribute, and what practical life direction matters.
3. **Pattern insights**
   - Strengths, friction patterns, stress response, motivation style.
4. **Personalization controls**
   - Let users confirm, reject, or refine identity insights.
5. **Identity-to-action bridge**
   - Recommended rituals and reflection prompts based on archetype/traits.

### UX hierarchy

Identity should not be only a test result. It should be the personalization source for the rest of the journey.

```text
Identity insight
→ Direction recommendation
→ Execution style
→ Companion tone
→ Progression meaning
```

### Premium opportunities

- “Your current growth archetype.”
- “Your likely trap this week.”
- “Best ritual style for your personality.”
- “Reflection prompt for your archetype.”
- “North Star clarity score.”

## Pillar 2: Direction

### Purpose

Direction helps users decide what matters now and where to invest energy.

### Included concepts

- Life Wheel.
- Check-ins.
- Goals / Quest Lines.
- Vision Board.
- Ikigai/North Star.
- Annual/seasonal reviews.

### Desired UX

Direction should feel like a compass and map. It should transform raw scores and goals into a clear focus.

Recommended sections:

1. **Life Wheel compass**
   - Current balance, strongest area, area needing care, trend since last check-in.
2. **Focus area**
   - The domain the journey is emphasizing now, with a short explanation.
3. **Quest Lines**
   - Goals reframed as narrative arcs.
4. **Vision anchors**
   - Images, statements, or symbols from Vision Board that emotionally reinforce direction.
5. **Seasonal review**
   - Monthly/quarterly/annual reflection paths.

### Quest Line model, conceptually

A Quest Line should be the user-facing bridge between goals and everyday action.

```text
Quest Line
├─ Why it matters
├─ Desired identity shift
├─ Life Wheel area
├─ Milestones
├─ Rituals/habits
├─ Reflection cadence
└─ Companion guidance
```

This is a product concept only; implementation details should be designed later.

### Premium opportunities

- Life Area Deep Dive pages.
- “Choose your next chapter” flow.
- Goal-to-ritual alignment review.
- Vision/Ikigai synthesis.
- Seasonal Quest planning.

## Pillar 3: Execution

### Purpose

Execution turns direction into what the user does today.

### Included concepts

- Habits.
- Routines.
- Today’s tasks/actions.
- Starter Quest.
- Goal steps/substeps.
- Timer/focus support.
- Commitment promises.

### Desired UX

Execution should feel light, doable, and confidence-building. The user should see exactly what to do next and why it matters.

Recommended sections:

1. **Today’s Quest Step**
   - One primary action connected to the active Quest Line.
2. **Ritual stack**
   - Routines as named flows like Morning Momentum, Evening Reset, Deep Work Launch.
3. **Supporting habits**
   - Habits grouped by the Quest Line or Life Wheel area they support.
4. **Starter path**
   - A beginner-friendly path for users without enough habits or goals.
5. **Friction support**
   - Environment hacks, fallback steps, and “done-ish” alternatives.

### Starter Quest V2

Starter Quest should evolve from a habit picker into a beginning journey ritual.

Recommended flow:

1. Pick a life area.
2. Pick an identity promise.
3. Pick one tiny habit.
4. Choose when/where it will happen.
5. Name the first-week quest.
6. Celebrate day 1 and route to Today.

### Premium opportunities

- Archetype-specific ritual templates.
- Weekly ritual tuning.
- Habit-to-goal alignment score.
- “Rescue today” fallback plan.
- Focus session tied to current Quest Line.

## Pillar 4: Companion

### Purpose

Companion makes the journey feel supported, interpreted, and adaptive.

### Included concepts

- AI Coach.
- Goal Coach / Goal Doctor.
- Gratitude coach.
- Habit suggestions and interventions.
- Reflection prompts.
- Daily/weekly briefs.

### Desired UX

The companion should not be just a chat modal. It should be a persistent guide that appears in the right places with concise, context-aware support.

Recommended sections:

1. **Daily brief**
   - One short interpretation of today’s focus and one recommended action.
2. **Weekly review companion**
   - Summarizes Life Wheel changes, habit adherence, journal themes, and goal movement.
3. **Ask Coach**
   - Full chat for open-ended support.
4. **Coach cards**
   - Small contextual nudges embedded in Life Wheel, goals, habits, routines, and journal.
5. **Trust and controls**
   - Clear data access, privacy, and “why am I seeing this?” explanations.

### Companion tone

The companion should be:

- Warm.
- Specific.
- Nonjudgmental.
- Action-oriented.
- Transparent about source signals.

It should avoid:

- Overwhelming analysis.
- Generic motivation.
- Hidden recommendations.
- Excessive gamification pressure.

### Premium opportunities

- “Coach noticed…” cards.
- One-tap coaching for low Life Wheel areas.
- Reflection-to-action conversion.
- Personalized obstacle planning.
- Companion memory timeline.

## Pillar 5: Progression

### Purpose

Progression shows the user that their journey is moving and becoming more personalized.

### Included concepts

- Profile Strength.
- XP and levels.
- Streaks and adherence.
- Life Wheel trends.
- Goal milestones.
- Archetype/card evolution.
- Game of Life rewards.

### Desired UX

Progression should create pride and meaning, not pressure. It should answer: “What is changing because I keep showing up?”

Recommended sections:

1. **Journey depth**
   - Reframed Profile Strength: how well the app understands the user.
2. **Momentum**
   - Streaks, adherence, routine completion, check-in cadence.
3. **Transformation evidence**
   - Life Wheel improvements, goal milestones, reflection themes.
4. **Identity evolution**
   - Archetype/card progression and micro-tests.
5. **Rewards**
   - Game rewards connected to meaningful growth moments.

### Premium opportunities

- Weekly “evidence of change” recap.
- Journey timeline.
- Milestone ceremonies.
- Life Wheel before/after stories.
- Profile depth unlocks better companion personalization.

## Proposed future screen organization

### Top-level Quest Journey screen

```text
Quest Journey Home
├─ Current Chapter hero
├─ Next Best Step
├─ Journey Map
├─ Today's Ritual Stack
├─ Companion Insight
├─ Progress Pulse
└─ Deepen Your Journey cards
```

### Secondary screens

```text
Identity
├─ Archetype / trait profile
├─ Ikigai / North Star
├─ Pattern insights
└─ Identity-guided prompts

Direction
├─ Life Wheel compass
├─ Life Area Deep Dive
├─ Quest Lines / goals
├─ Vision anchors
└─ Seasonal review

Execution
├─ Today’s Quest Step
├─ Rituals / routines
├─ Habits
├─ Starter path
└─ Focus / timer

Companion
├─ Daily brief
├─ Coach chat
├─ Coach cards
└─ Data access / trust

Progression
├─ Journey depth
├─ Momentum
├─ Milestones
├─ Archetype evolution
└─ Rewards
```

## UX hierarchy for recommendations

Future Quest Journey should avoid showing many competing recommendations. A premium hierarchy should be:

1. **Primary next step**
   - The one thing the user should do now.
2. **Reason**
   - Why it matters, sourced from Life Wheel, goal, habit, journal, or profile signal.
3. **Fallback**
   - A smaller version if the user has low energy.
4. **Deeper support**
   - Open coach, journal, or edit plan.
5. **Progress link**
   - Show how completion affects the journey.

## Emotional design language

Recommended language directions:

- “Chapter” instead of generic dashboard section.
- “Quest Line” for meaningful goals.
- “Ritual” for routines and habit stacks.
- “North Star” for Ikigai/direction synthesis.
- “Journey depth” for profile strength.
- “Companion” for AI Coach.
- “Evidence of change” for progress summaries.

Terms to be careful with:

- “Quest” for every small feature.
- “Score” when the user needs compassion.
- “Complete profile” without explaining personalization value.
- “AI says” without transparency.

## Non-goals for this document

This document intentionally does not define:

- Database changes.
- Service APIs.
- Component architecture.
- Migration plan.
- Implementation phases.
- Exact copy for production UI.
- Gameplay changes.

Those should follow only after the product hierarchy and language system are agreed.

## Success criteria

A future Quest Journey V2 design should be considered successful if:

1. A new user understands what to do first within 30 seconds.
2. A returning user sees one meaningful next step immediately.
3. Life Wheel, goals, habits, routines, journal, coach, identity, and progression feel connected.
4. Recommendations explain their source and feel emotionally appropriate.
5. The user can see how today’s action relates to who they are becoming.
6. Game rewards enhance the coaching journey without replacing its meaning.
7. The experience feels premium enough to sit beside modern coaching, wellness, and life-design apps.
