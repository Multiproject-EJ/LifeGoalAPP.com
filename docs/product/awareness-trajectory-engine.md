# Awareness Trajectory Engine

> Product concept for HabitGame / LifeGoalAPP
>
> Status: exploratory product specification, not an approved implementation plan

## Executive summary

The Awareness Trajectory Engine is a proposed intelligence layer that helps a user notice how their attention, emotions, context, decisions, and actions tend to move over time.

It does **not** claim to read consciousness, diagnose personality, or discover the true hidden cause of behaviour. Its job is narrower and more useful:

1. Observe what the app already knows.
2. Ask the smallest possible clarifying question only when necessary.
3. Reconstruct likely short trajectories.
4. Mark interpretations as hypotheses rather than facts.
5. Find recurring branch points where a different response may change the outcome.
6. Test tiny interventions.
7. Keep only insights that improve prediction or results.

The core product promise is not:

> An AI that understands you.

It is:

> An AI that learns alongside you and helps you discover which small changes reliably improve your trajectory.

The system should never reward analysis for its own sake. A beautiful map that changes nothing is a failed product outcome.

---

## 1. The underlying idea

A person's day can be represented as a sequence of transitions:

```text
Context
→ external or internal trigger
→ first noticed shift
→ thought / feeling / urge
→ decision or automatic response
→ action
→ immediate result
→ delayed result
```

Example:

```text
Poor sleep + difficult coding task
→ error message
→ "this will take forever"
→ urge to escape uncertainty
→ opens messages
→ loses task context
→ 42 minutes lost
```

The meaningful unit is not an isolated mood or thought. It is the **trajectory**: how one condition or event changes what becomes likely next.

Repeated trajectories may form:

- loops;
- reliable productive routes;
- recurring failure routes;
- recovery routes;
- branch points;
- context-sensitive patterns;
- externally prompted routes;
- increasingly self-directed routes.

The app's purpose is not to assign a fixed identity from these routes. It is to help the user answer:

> Which repeated routes are gaining control over my life, what outcomes are they producing, and what is the smallest proven change that redirects them?

---

## 2. Three levels of analysis

### Level 1: What happened?

Capture a grounded episode:

- context;
- trigger;
- first noticed shift;
- what happened next;
- action;
- immediate result;
- delayed result.

This is descriptive rather than interpretive.

### Level 2: How does my awareness tend to move?

Look for recurring paths such as:

```text
Ambiguous task
→ discomfort
→ context switch
→ attention fragmentation
→ slow recovery
```

or:

```text
Walk
→ reduced pressure
→ new association
→ product idea
→ note captured
```

At this level, the engine searches for:

- recurring sequences;
- loops;
- common triggers;
- common endings;
- branch points;
- conditions that alter the path;
- interventions associated with better results.

### Level 3: What capacities and future tendencies are being strengthened?

This must not become a personality verdict.

Avoid:

> You are becoming an avoidant person.

Prefer:

> In recorded episodes involving high task uncertainty, switching away from the task has become more frequent during the last month.

The engine should describe **demonstrated capacities**, for example:

- returning after distraction;
- tolerating uncertainty;
- starting without an external prompt;
- protecting attention;
- recovering after failure;
- keeping commitments;
- converting emotion into useful action;
- asking for help earlier;
- interrupting rumination;
- choosing long-term direction over immediate relief.

Identity language may appear only as a cautious summary after the evidence:

> You are increasingly becoming someone who returns faster after disruption.

The measurable evidence must come first.

---

## 3. The weakest point and the safeguards

The weakest part of this entire concept is the jump from a reconstructed path to a claim about causality or identity.

A self-report is not a direct recording of consciousness. It can be affected by memory, storytelling, hindsight, context, mood, shame, and confirmation bias.

The system therefore risks:

### False precision

Graphs, percentages, probabilities, and confidence scores may look more scientific than the data deserves.

### Narrative overfitting

Once the system names a route, the user may start seeing that route everywhere and overlooking exceptions.

### Turning states into identity

Temporary or context-specific behaviour can become a rigid self-description.

### Mistaking correlation for cause

A notification may appear before distraction, while the deeper driver may be fatigue, task ambiguity, hunger, stress, or fear of poor performance.

### Measurement changing the user

The map may train the user to interpret themselves through the model, even when the model is incomplete.

To counter this, every psychological interpretation should include:

- a confidence level;
- at least one alternative explanation;
- the observations it is based on;
- a testable prediction;
- a small intervention;
- a measurable result;
- a review threshold or review period.

If the system cannot produce those elements, the output is storytelling rather than analysis.

---

## 4. Product doctrine

### 4.1 Do not interrogate consciousness directly

Questions such as "Why did you do that?" create effort and invite reconstructed explanations.

Prefer observable transitions:

- What changed?
- What happened immediately before that?
- What happened immediately after?
- What became easier?
- What got in the way?
- What surprised you?
- Did the day gain or lose momentum?

### 4.2 Let the app know most of the answer already

The engine should first use signals the app already possesses, where the user has consented to their use:

- habit completion and skips;
- today todos;
- goals and quests;
- journal entries;
- focus sessions;
- check-ins;
- Life Wheel data;
- project activity;
- time of day;
- app interaction context;
- campaign participation;
- recovery after missed days;
- optional calendar context;
- optional Apple Health-derived sleep, movement, or exercise summaries;
- optional coarse context such as home / work / gym, without retaining precise location unnecessarily.

The system should ask only when uncertainty materially affects the next useful action.

### 4.3 Ask users to correct, not generate

Humans are often better editors than blank-page generators.

Instead of:

> Describe what happened.

Show:

```text
I think today looked like this:

Deep work
→ unexpected bug
→ attention shifted
→ short distraction
→ recovery
→ task completed
```

Then ask:

> What did I miss?

Possible one-tap answers:

- Looks right
- The trigger was different
- I did not recover
- The result was different
- Add one detail

### 4.4 One sentence, one tap, one slider, or one choice

A reflection interaction should generally require no more than one of:

- a tap;
- a short phrase;
- a three-position control;
- a correction to a proposed path;
- a lightweight voice note.

The engine should avoid multi-question surveys in the moment.

### 4.5 Insight is not the outcome

The engine is successful only when it leads to one or more of:

- a better outcome;
- an easier useful behaviour;
- faster recovery;
- greater repeatability;
- generalisation to similar situations;
- less dependence on the intervention over time.

---

## 5. Data model: observed versus inferred

Every episode should separate what is directly known from what is inferred.

### Observed data

Examples:

- Opened a focus session at 10:03.
- Paused after 11 minutes.
- Opened the app again at 10:41.
- Completed the task at 11:08.
- Reported energy as low.

### User-reported data

Examples:

- "I got confused."
- "I felt defensive."
- "I wanted to avoid it."

These are real reports but are still not objective causal facts.

### Inferred data

Examples:

- Task ambiguity may have contributed to the context switch.
- Fatigue may have reduced persistence.
- The user may have used messages as relief from uncertainty.

Each inference should store:

- hypothesis;
- confidence;
- supporting observations;
- alternative explanations;
- whether the user confirmed, rejected, or ignored it;
- predictive track record;
- intervention track record.

Suggested conceptual shape:

```ts
interface TrajectoryEpisode {
  id: string;
  userId: string;
  startedAt: string;
  endedAt?: string;
  contextSignals: ContextSignal[];
  observedTransitions: ObservedTransition[];
  userCorrections: UserCorrection[];
  outcomeSignals: OutcomeSignal[];
  hypotheses: TrajectoryHypothesis[];
  privacyScope: PrivacyScope;
}

interface TrajectoryHypothesis {
  label: string;
  confidence: 'low' | 'medium' | 'high';
  evidenceRefs: string[];
  alternatives: string[];
  prediction?: string;
  proposedIntervention?: string;
  status: 'untested' | 'testing' | 'supported' | 'weakened' | 'rejected';
}
```

This is a conceptual model only. It should not be implemented without a separate privacy, retention, schema, and product review.

---

## 6. The branch-point model

The most useful point in a path is the earliest realistic moment where another response could alter the result.

Example:

```text
Error message
→ frustration
→ [branch point]
   A. open messages
   B. write the exact uncertainty
```

For each recurring route, the engine should try to identify:

1. The earliest detectable branch.
2. The easiest intervention at that branch.
3. The intervention with the strongest observed effect.
4. The context in which the intervention fails.

The engine should not try to redesign an entire personality. It should redirect one branch at a time.

---

## 7. The personal experiment loop

Each recurring path can become a tiny personal experiment.

Example:

```text
When:
I hit a technical problem and feel the urge to leave the task.

Then:
I write one sentence describing the exact problem before opening anything else.

Measure:
Did I return to useful work within five minutes?
```

After repeated episodes:

```text
Without intervention
- Returned within five minutes: 2 / 10
- Median disruption: 31 minutes

With intervention
- Returned within five minutes: 7 / 10
- Median disruption: 9 minutes
```

The valid conclusion is:

> In recorded episodes like these, writing the uncertainty sentence was associated with a 22-minute reduction in median disruption.

The invalid conclusion is:

> You cured your avoidance.

### Experiment requirements

Every experiment should contain:

- trigger condition;
- one alternative response;
- one primary metric;
- optional secondary metric;
- minimum number of episodes or test duration;
- stopping condition;
- result;
- confidence / limitations;
- keep, modify, or discard decision.

### Result hierarchy

The system should evaluate itself in this order:

1. Did the outcome improve?
2. Did the useful behaviour become easier?
3. Did the improvement repeat?
4. Did it generalise to similar situations?
5. Did the user need less intervention over time?

The long-term goal is not permanent tracking. It is for the improved route to become increasingly natural and for the system to become less necessary.

---

## 8. Four cause classes to check before blaming character

Every difficult path should be tested against at least four broad cause classes.

### Internal state

- fatigue;
- hunger;
- anxiety;
- overstimulation;
- emotional residue;
- illness;
- low energy.

### Environment

- notifications;
- device placement;
- noise;
- interruptions;
- social context;
- visual cues;
- accessibility friction.

### Task structure

- ambiguity;
- excessive size;
- unclear next action;
- lack of feedback;
- missing information;
- unrealistic deadline;
- poor sequencing.

### Learned response

- habitual context switching;
- reassurance seeking;
- rumination;
- avoidance;
- perfectionistic delay;
- impulsive relief seeking.

The engine should test easier and more external causes before implying a deep internal flaw.

If moving the phone fixes the problem, that is a successful intervention. There is no prize for solving an environmental problem through heroic willpower.

---

## 9. Awareness prompting and self-direction

One useful lens is to examine what appears to initiate a trajectory.

Possible categories:

### Immediate external prompting

- sound;
- notification;
- conversation;
- visual object;
- interruption.

### Delayed external prompting

- memory of something previously read;
- learned association;
- prior conversation;
- unresolved social event;
- environmental cue resurfacing later.

### Internal-state prompting

- hunger;
- anxiety;
- fatigue;
- bodily sensation;
- spontaneous memory;
- emotion.

### Goal-directed prompting

- intentionally choosing a question;
- deliberately returning to a task;
- initiating reflection;
- selecting a valued action.

The product should avoid pretending these categories are perfectly separable. Their value is practical: they may help reveal whether the user's next moments are primarily reactive, habitual, or increasingly intentionally redirected.

A useful capacity is not freedom from all prompting. It is the growing ability to choose what receives continued attention after a prompt arrives.

---

## 10. Low-resistance question system

### Core principle

Do not ask the user to explain themselves when the app can propose a reconstruction and request correction.

### Highest-value questions

#### Transition detection

> What changed?

#### Preceding condition

> What happened immediately before that?

#### Consequence

> What happened immediately after?

#### Friction

> What got in the way?

#### Facilitation

> What made it easier?

#### Surprise

> What surprised you?

#### Momentum

> Did today lose momentum, stay level, or gain momentum?

#### Recovery

> Did you return, replace the task, or leave it unfinished?

#### Branch confirmation

> Was this the moment the path changed?

#### Outcome confirmation

> Did this help now, help later, or only feel relieving in the moment?

### Avoid where possible

- Why did you do that?
- What does this say about you?
- Describe your full thought process.
- Rate ten different emotions.
- Explain your motivation.
- What childhood experience caused this?

These questions are high-resistance and often generate overconfident narratives.

### Answer surfaces

Use the least demanding surface that preserves useful data:

- binary choice;
- three-choice segmented control;
- swipe direction;
- tap to confirm;
- tap a point in the trajectory;
- one-line correction;
- voice note;
- optional expanded reflection.

---

## 11. Passive and active data collection

### Passive, app-native signals

The system can derive useful context from existing app activity, such as:

- planned versus completed habits;
- skipped habits;
- task rescheduling;
- focus session starts, pauses, and completions;
- repeated abandonment points;
- return after missed days;
- journal timing;
- quest progress;
- campaign adherence;
- time between intention and action;
- completion following coach prompts;
- completion without coach prompts;
- repeated edits to goals or tasks;
- app-open context and feature transitions.

### Optional external signals

Only with explicit permission and a clear benefit:

- sleep duration / quality summary;
- exercise / movement summary;
- calendar load;
- broad weather context;
- coarse place category;
- device focus mode state.

### Active signals

Ask only when the answer changes the next intervention or disambiguates competing explanations.

Example:

> You paused two focus sessions after about 12 minutes. Which was closer?
>
> - The task was unclear
> - My energy dropped
> - Something interrupted me
> - None of these

### Event sampling rather than constant journaling

The app should not interrupt every meaningful event.

Possible sampling rules:

- one daily correction prompt at most;
- prompt after a strong deviation from the user's baseline;
- prompt after a repeated pattern appears several times;
- prompt after a user-requested experiment episode;
- prompt during a natural journal or review moment;
- no prompt when confidence is already adequate and no immediate action is needed.

---

## 12. Visual language

The visual system should make trajectories understandable without implying perfect scientific certainty.

### 12.1 Daily path view

A simple short path:

```text
Morning energy
→ deep work
→ unexpected bug
→ attention shifted
→ recovered
→ finished
```

Interaction:

- tap a node to correct it;
- tap between nodes to add a missing transition;
- hold a node to mark it as inferred rather than observed;
- highlight the likely branch point;
- show the outcome at the end.

### 12.2 Branch view

Show the old and tested routes:

```text
Unexpected difficulty
          |
          v
    First urge to leave
       /          \
      /            \
Open messages    Define the problem
      |            |
42 min lost      9 min recovery
```

The visual emphasis belongs on the intervention and measured result, not on dramatic psychological interpretation.

### 12.3 River landscape metaphor

A more distinctive monthly or long-term view can represent repeated trajectories as terrain and rivers.

- small streams = isolated episodes;
- wider rivers = repeated routes;
- rapids = high-friction or high-stress transitions;
- lakes = reflection or recovery;
- dams = recurring blockers;
- forks = branch points;
- channels = increasingly automatic routes;
- dry channels = weakening routes;
- tributaries = different triggers feeding the same result;
- delta = one route producing several life outcomes.

Example monthly interpretation:

> One river repeatedly flows from task uncertainty into phone use.
>
> Another increasingly flows from a short walk into creative work.
>
> The uncertainty sentence experiment is beginning to cut a new channel toward clarification.

This metaphor supports the product philosophy:

> The user is not fighting themselves forever. They are gradually reshaping the terrain so that a better path becomes easier to enter.

### 12.4 Evidence badges

Every route should visually distinguish:

- observed;
- user reported;
- inferred;
- tested;
- supported;
- uncertain;
- contradicted.

A possible visual grammar:

- solid node: directly observed in app data;
- outlined node: user reported;
- dotted node: AI inference;
- small flask marker: intervention tested;
- confidence halo or label: confidence range;
- crossed alternative route: hypothesis weakened or rejected.

Avoid presenting every path as a polished, definitive line.

### 12.5 Monthly Observatory

The system should not need its own daily tab. A periodic command-centre view could be called:

- The Observatory;
- Trajectory Engine;
- Compass Intelligence;
- Pathways;
- Current & Course;
- The Inner Map.

Possible summary:

```text
Your Trajectories This Month

3 routes strengthened

▲ Returning after setbacks
▲ Starting difficult work
▼ Evening attention protection

Most improved capacity
Returning after distraction

Most expensive recurring route
Task uncertainty → phone → lost focus

Observed cost
6.8 hours across recorded episodes

Best supported intervention
Write the uncertainty sentence before switching apps
```

Costs should only be shown where the system has enough direct data. Otherwise use cautious language such as "recorded disruption time" rather than total life cost.

---

## 13. Scenario analysis

For each recurring path, produce three scenarios.

### Continuation scenario

What is likely if the path remains unchanged?

```text
Frequent uncertainty
→ avoidance
→ lower output
→ reduced confidence
→ harder starts
→ greater avoidance
```

This must be framed as a plausible scenario, not destiny.

### Intervention scenario

What may happen if one branch changes?

```text
Uncertainty
→ define the problem
→ stay engaged for five minutes
→ occasional solution
→ increased confidence
→ easier future starts
```

### Breakdown scenario

Under what conditions does the improved path fail?

```text
Severe sleep loss
→ reduced inhibition
→ intervention ignored
```

The breakdown scenario protects the user from interpreting every failure as a moral or character failure.

### Scenario output requirements

Each scenario should state:

- evidence base;
- uncertainty;
- relevant context;
- assumed continuation rate;
- likely effects;
- what could invalidate the scenario;
- smallest next test.

---

## 14. Personal trajectory simulator

The long-term engine could estimate context-sensitive route probabilities.

Example:

```text
State
Tired + ambiguous task + phone nearby

Likely routes before intervention
- 46% distraction loop
- 31% slow persistence
- 23% deliberate clarification

Best tested intervention
Write uncertainty sentence + put phone face down

Observed routes with intervention
- 18% distraction loop
- 57% slow persistence
- 25% deliberate clarification
```

These numbers must only appear after enough data and should include sample size and uncertainty. Early versions should use qualitative labels instead:

- commonly observed;
- sometimes observed;
- rarely observed;
- insufficient evidence.

The simulator's practical question is:

> Given your current conditions, which route are you most likely to enter, and what tested change improves the odds?

---

## 15. Where it fits in HabitGame

The Awareness Trajectory Engine should not begin as a separate major tab. It should operate as connective intelligence beneath existing systems.

### Habits

Beyond tracking completion, learn the typical successful and failed routes around a habit.

```text
Tea
→ sits down
→ reads
```

versus:

```text
Phone nearby
→ notification
→ scrolling
→ reading skipped
```

The engine can suggest environmental or sequencing changes rather than only reminders.

### Today todos

Detect friction around starting, abandoning, rescheduling, and returning.

Possible lightweight prompt:

> This was moved twice. Was the main issue size, uncertainty, energy, or timing?

### Journal

The journal is the primary place for user correction and richer context.

At the end of an entry, show a proposed path and ask for one correction rather than adding a second questionnaire.

### Goals and quests

Show known trajectory risks and helpful conditions relevant to a goal.

```text
Known friction
- ambiguous first steps increase delay
- late evening work increases abandonment

Helpful routes
- ten-minute planning note improves next-day starts
- walking often precedes useful product ideas
```

### Campaigns

Campaigns can become explicit trajectory experiments.

A campaign may test:

- starting before motivation arrives;
- returning after interruption;
- protecting evening attention;
- reducing task ambiguity;
- using a recovery ritual;
- replacing an unhelpful branch.

### Contracts and pacts

A pact can commit the user not only to an action but to a branch response.

Example:

> When I notice I am avoiding the task because it is unclear, I will write the exact uncertainty before switching away.

Journal check-ins can verify the path without moralising success or failure.

### AI Coach

The coach should use the engine to replace generic advice with grounded pattern language.

Instead of:

> Try to focus.

Prefer:

> In four recent recorded episodes, unclear tasks were followed by a context switch. The shortest recovery happened when you wrote down the missing decision. Shall we test that again today?

### Life Wheel / Quest Compass

The engine can show how routes spill across life realms.

Example:

```text
Poor sleep
→ lower work tolerance
→ unfinished work
→ late evening catch-up
→ less sleep
```

This is more useful than treating each Life Wheel category as isolated.

### 120-island journey

The islands may symbolically represent capacities rather than only topic categories.

Possible themes:

- Island of Beginnings — starting despite uncertainty;
- Island of Attention — protecting focus;
- Island of Courage — remaining present with discomfort;
- Island of Recovery — returning after setbacks;
- Island of Reflection — learning rather than replaying;
- Island of Vision — choosing long-term direction;
- Island of Adaptation — revising a failed strategy;
- Island of Momentum — creating self-sustaining progress.

The game journey can mirror the gradual strengthening of real capacities, while avoiding the claim that game progress objectively proves psychological transformation.

---

## 16. Suggested user experience

### Moment-level capture

The user records a voice note:

> I was working on the payment bug, got confused, opened messages, and lost almost an hour.

The app proposes:

```text
Possible trajectory

Task uncertainty
→ discomfort
→ context switch
→ attention fragmentation
→ 54 minutes until useful work resumed

Likely branch point
The first urge to open another app

Possible causes
- task ambiguity — moderate confidence
- fatigue — low confidence
- message habit — moderate confidence

Smallest experiment
Before switching, write:
"The exact thing I do not understand is _____."

Primary metric
Minutes until useful work resumes
```

The user can:

- confirm;
- correct the trigger;
- reject an inference;
- select an alternative cause;
- begin the experiment;
- dismiss without penalty.

### After several episodes

```text
Experiment update

Recorded episodes: 8

Without intervention
Median recovery: 37 minutes

With intervention
Median recovery: 11 minutes

Observed difference
26 minutes faster recovery

Confidence
Promising, but the sample is still small

Recommendation
Keep testing for 5 more episodes
```

### Monthly view

```text
This month, you became more reliable at returning after disruption.

Evidence
- return rate within 15 minutes rose from 41% to 68%
- the improvement was concentrated in work tasks
- evening episodes did not improve

Likely next constraint
Low evening energy, not the same uncertainty route
```

---

## 17. Trust and language rules

### Good language

- "The recorded episodes suggest..."
- "One possible explanation is..."
- "This route appeared 6 times in the last 3 weeks."
- "The intervention was associated with..."
- "This may be worth testing."
- "The evidence is still limited."
- "This pattern appears mainly under these conditions..."
- "You rejected this interpretation twice, so it has been weakened."

### Bad language

- "We know why you do this."
- "Your subconscious is..."
- "You are an avoidant person."
- "This proves that..."
- "Your consciousness is externally controlled."
- "You will become..."
- "The AI understands you better than you understand yourself."

### Confidence standard

#### High confidence

Directly measured and repeated behavioural relation with adequate observations.

Example:

> In the last 18 recorded focus sessions, sessions started before noon were completed more often than sessions started after 6 p.m.

#### Medium confidence

Repeated relation with plausible alternatives or limited data.

Example:

> Task ambiguity may be contributing to context switching.

#### Low confidence

Speculative psychological interpretation.

Example:

> Perfectionistic concern may be one explanation, but there is not enough evidence to distinguish it from fatigue or task size.

Low-confidence interpretations should rarely be shown unless they generate a useful, safe, low-cost test.

---

## 18. Privacy and safety principles

This feature could contain unusually sensitive personal data. Privacy is part of the product, not a later compliance task.

Minimum principles:

- explicit opt-in for trajectory analysis;
- explain which data sources are used;
- granular controls for external integrations;
- no precise location retention unless essential and explicitly chosen;
- allow the user to exclude journals, goals, or specific categories;
- easy deletion of episodes, hypotheses, and derived models;
- bounded retention for raw event-level data;
- separate raw observations from long-term aggregates;
- no sale or advertising use of psychological trajectory data;
- do not use the system for employment, insurance, credit, or eligibility decisions;
- avoid diagnosis and crisis inference unless a separately reviewed safety system exists;
- allow users to inspect and correct what the system believes;
- store rejected hypotheses so the system does not repeatedly reassert them;
- provide an off switch that truly stops further analysis.

A separate privacy threat model, Supabase schema review, retention plan, and consent UX are required before implementation.

---

## 19. Product success metrics

Do not optimise primarily for number of reflections, time in the feature, or amount of personal data collected.

Better success metrics:

- percentage of proposed paths corrected by users;
- calibration of confidence versus user confirmation;
- intervention completion rate;
- percentage of experiments with a measurable outcome;
- median improvement in the selected primary metric;
- repeated improvement after the initial novelty period;
- reduced prompt frequency required for the same result;
- faster recovery after missed habits or interrupted work;
- increased completion without increased stress;
- user-reported usefulness and trust;
- frequency of rejected or harmful interpretations;
- deletion / opt-out friction;
- whether the engine learns from rejection.

The north-star result should resemble:

> Users discover and retain small, individually validated changes that reliably improve real outcomes.

---

## 20. MVP recommendation

Do not begin with a full consciousness graph, passive surveillance layer, or predictive identity engine.

Start with one narrow loop inside the existing journal / coach flow.

### MVP scope

1. User records or writes a short account of a meaningful episode.
2. AI proposes a 3–6 node trajectory.
3. User confirms or corrects it with one interaction.
4. AI identifies one possible branch point.
5. AI offers one tiny experiment.
6. User chooses a simple result metric.
7. The app reviews after 5–10 relevant episodes.
8. It keeps, modifies, or discards the experiment.

### MVP constraints

- no identity labels;
- no diagnostic claims;
- no numerical route probabilities;
- no automatic external-health integrations initially;
- no background psychological profiling;
- no broad life prediction;
- no more than one active experiment per domain;
- no claim stronger than the available observations;
- user can reject every inference;
- rejected inference materially updates future suggestions.

### MVP visual

A simple branch card is enough:

```text
WHAT HAPPENED
Unclear task → switched apps → returned 42 min later

POSSIBLE BRANCH
The first urge to leave the task

TRY NEXT TIME
Write the exact uncertainty first

MEASURE
Minutes until useful work resumes
```

Only after this loop produces repeated useful results should the product invest in the larger river landscape and trajectory simulator.

---

## 21. Open product questions

- What qualifies as enough evidence to show a recurring route?
- How should the system handle contradictory contexts?
- How often should it ask for correction?
- When should a hypothesis expire?
- How should confidence be calibrated and communicated?
- What happens when the most effective intervention conflicts with another goal?
- How can the engine avoid rewarding excessive self-monitoring?
- How should negative outcomes be shown without shame?
- How should the system recognise healthy rest versus avoidance?
- How should it distinguish immediate relief from long-term benefit?
- Which signals are useful enough to justify their privacy cost?
- How can users export or delete their personal model?
- Should long-term visuals represent only tested routes or also tentative patterns?
- How does the app prevent the river metaphor from implying destiny?
- What minimum sample sizes are appropriate for different statements?
- How should an experiment stop when it appears harmful or burdensome?

---

## 22. Final framing

The strongest version of this feature is not a personality test, a diary, or an AI that claims to decode consciousness.

It is a **personal trajectory optimisation system**.

It observes, asks sparingly, proposes cautiously, tests cheaply, measures honestly, and changes its mind when the evidence does not support the story.

Its central principle is:

> Do not reward insight. Reward changed trajectories.

And its central user question is:

> What route am I entering, where can it still change, and what small action has actually improved the outcome before?
