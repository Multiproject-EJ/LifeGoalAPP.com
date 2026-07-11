# Awareness Trajectory Engine — MVP Build Plan

> Implementation-ready plan for HabitGame / LifeGoalAPP
>
> Status: proposed MVP build scope
>
> Depends on: `docs/product/awareness-trajectory-engine.md`

## Goal

Build the smallest useful version of the Awareness Trajectory Engine that can prove one thing:

> Can the app help a user notice a recurring route, test one tiny intervention, and measurably improve the outcome without adding friction or pretending to understand the user's mind?

This MVP is not a full consciousness model, personality system, or long-term simulator. It is a narrow loop connecting Journal, AI Coach, and a weekly Compass recap.

## Product promise

The MVP should never say:

> I know why you did this.

It may say:

> Based on what you recorded, this route may be repeating. Here is one small change we can test.

Every interpretation must remain a hypothesis until repeated observations support it.

---

## MVP surfaces

### 1. Journal completion: capture and correction

After a user finishes a journal entry, optionally show a compact card titled:

> A path I noticed

The app proposes a short route with 3–6 steps, for example:

```text
Unexpected bug
→ uncertainty
→ attention shifted
→ short distraction
→ return
→ task completed
```

The user is asked to correct rather than generate.

Primary responses:

- Looks right
- The trigger was different
- I did not recover
- The result was different
- Add one detail
- Not useful

Rules:

- no more than one follow-up question;
- always skippable;
- never block journal save;
- no identity language;
- no diagnosis;
- no confident causal claim;
- do not show when the journal entry is too short or lacks a sequence.

### 2. AI Coach: recurring-route hypothesis and experiment

When at least three sufficiently similar corrected trajectories exist, the AI Coach may surface:

> This route may be recurring.

It should show:

- the observed route;
- supporting episode count;
- confidence label;
- one alternative explanation;
- one proposed branch point;
- one tiny experiment;
- one primary result metric.

Example:

```text
Possible recurring route

Unclear task
→ pressure
→ context switch
→ slow recovery

Seen in 4 corrected entries.
Confidence: tentative.
Alternative explanation: low energy may be contributing.

Small experiment:
Before switching apps, write one sentence naming the exact uncertainty.

Measure:
Did useful work resume within five minutes?
```

The user can:

- Start experiment
- Edit experiment
- Dismiss
- This is wrong

### 3. Weekly Compass card: evidence recap

Add one compact weekly card in the existing reflective / Compass area. Do not create a new top-level tab for the MVP.

The card shows at most:

- one route that appeared repeatedly;
- one route that improved;
- one current experiment;
- one measured result;
- one uncertainty or limitation.

Example:

```text
Your routes this week

Repeated:
Unclear task → switch away → slow return

Improved:
Setback → short pause → return

Experiment:
Name the uncertainty before switching

Result so far:
3 of 5 episodes returned within five minutes

Still uncertain:
Low energy may explain part of the pattern
```

This is the deepest visual analysis included in the MVP. The river / terrain map is deferred until the usefulness of the underlying data is proven.

---

## Explicitly out of scope

Do not include these in the first build:

- a new Awareness or Observatory tab;
- river landscape visualization;
- identity projections;
- personality labels;
- long-term future scenario simulation;
- passive phone-wide activity surveillance;
- precise location storage;
- Apple Health integration;
- calendar integration;
- automatic intervention notifications;
- game-island progression based on psychological interpretations;
- Contracts / Pacts integration;
- automatic habit modifications;
- clinical mental-health claims;
- claims of causal certainty.

These may be considered only after the core correction-and-experiment loop produces useful outcomes.

---

## Data model

Prefer a small, auditable schema rather than burying this inside journal JSON.

### `trajectory_episodes`

Suggested fields:

```text
id uuid primary key
user_id uuid not null
source_type text not null            -- journal for MVP
source_id uuid nullable
occurred_at timestamptz not null
observed_steps jsonb not null
user_corrections jsonb not null default '[]'
outcome_summary jsonb nullable
status text not null                 -- proposed, confirmed, rejected
model_version text nullable
created_at timestamptz not null
updated_at timestamptz not null
```

### `trajectory_patterns`

```text
id uuid primary key
user_id uuid not null
label text not null
canonical_steps jsonb not null
supporting_episode_ids jsonb not null
confidence text not null             -- tentative, emerging, supported
alternative_explanations jsonb not null default '[]'
status text not null                 -- active, dismissed, rejected, archived
created_at timestamptz not null
updated_at timestamptz not null
```

### `trajectory_experiments`

```text
id uuid primary key
user_id uuid not null
pattern_id uuid nullable
trigger_description text not null
intervention_description text not null
primary_metric text not null
status text not null                 -- proposed, active, completed, abandoned
started_at timestamptz nullable
ended_at timestamptz nullable
minimum_episode_count integer not null default 5
result_summary jsonb nullable
created_at timestamptz not null
updated_at timestamptz not null
```

### `trajectory_experiment_observations`

```text
id uuid primary key
user_id uuid not null
experiment_id uuid not null
trajectory_episode_id uuid nullable
intervention_used boolean not null
metric_result jsonb not null
notes text nullable
occurred_at timestamptz not null
created_at timestamptz not null
```

### Security and retention

- Owner-only RLS on every table.
- No admin reading path in the MVP.
- No raw chain-of-thought storage.
- Store only concise user-facing steps and corrections.
- Add deletion support with the user account deletion flow.
- Add a feature-specific reset action so a user can erase trajectory data without deleting journal entries.
- Never reuse trajectory data for marketing or ranking.

---

## Service boundaries

Create a dedicated feature module, for example:

```text
src/features/trajectory-engine/
  components/
  services/
  types.ts
  trajectoryEngine.css
```

Suggested services:

```text
trajectoryEpisodeService.ts
trajectoryPatternService.ts
trajectoryExperimentService.ts
trajectoryPromptBuilder.ts
trajectorySafetyGuards.ts
trajectoryWeeklySummary.ts
```

Important rules:

- UI components must not write directly to Supabase.
- All writes go through service functions.
- Pattern detection must be deterministic where possible and AI-assisted only for summarizing or matching.
- AI output must pass safety guards before display or persistence.
- Rejected hypotheses must be retained as rejected so they are not repeatedly resurfaced.
- A correction by the user outranks the model proposal.

---

## AI contract

The model should receive only the minimum necessary context:

- current journal entry;
- optional nearby goal / habit labels where already linked;
- previous confirmed trajectory summaries, not full unrelated journal history;
- current experiment, when relevant.

Expected structured output:

```ts
interface ProposedTrajectory {
  steps: Array<{
    type: 'context' | 'trigger' | 'shift' | 'response' | 'action' | 'outcome';
    label: string;
    evidence: 'explicit' | 'inferred';
  }>;
  confidence: 'low' | 'medium';
  alternativeExplanation?: string;
  shouldAskForCorrection: boolean;
  reasonForNoProposal?: string;
}
```

The model must not output:

- diagnoses;
- personality verdicts;
- claims about subconscious truth;
- trauma claims;
- moral judgments;
- manipulative urgency;
- exact numerical certainty unsupported by data;
- claims that a route caused an outcome.

Display language should use:

- may;
- might;
- appears in these entries;
- based on what you recorded;
- tentative;
- one possible explanation.

---

## Pattern matching

Do not rely on free-form AI memory alone.

For the MVP:

1. Normalize confirmed steps into broad categories.
2. Compare route order and outcome similarity.
3. Require at least three confirmed or corrected episodes.
4. Require similarity above a conservative threshold.
5. Mark the first surfaced pattern as tentative.
6. Increase confidence only when later episodes predictably match.
7. Lower or reject confidence when the user corrects or rejects it.

A pattern should not be surfaced merely because the same emotion word appears repeatedly.

---

## Experiment loop

An experiment must contain:

- a specific trigger;
- one small response;
- one measurable result;
- a minimum observation count;
- an end state;
- keep, revise, or discard decision.

For the MVP, support only simple metrics:

- returned within X minutes;
- completed / not completed;
- momentum improved / unchanged / worsened;
- intervention used / not used;
- perceived effort: easier / same / harder.

Do not calculate causal effect from tiny samples. Present results descriptively.

Good:

> In 4 of 6 recorded episodes where you used this response, you returned within five minutes.

Bad:

> This intervention makes you 67% more resilient.

---

## UX principles

### Zero resistance

- proposed route appears only after journal save;
- one compact card;
- one tap to confirm;
- one tap to reject;
- one optional correction field;
- no forced onboarding questionnaire;
- no multi-step analysis wizard;
- no daily nagging.

### Correct, do not generate

The app proposes. The user edits.

### Evidence before interpretation

Always show the route and supporting count before any higher-level statement.

### No identity verdicts

Use demonstrated capacity language only after repeated evidence.

### Quiet failure

When the system lacks enough information, show nothing. Do not force a weak insight merely to fill the UI.

---

## Feature flag and rollout

Add a dedicated feature flag, default off in production.

Suggested phases:

### Phase 0 — developer preview

- journal completion card;
- local or dev-account-only data;
- route correction flow;
- no recurring patterns yet.

### Phase 1 — internal MVP

- Supabase persistence;
- tentative recurring patterns;
- manual experiment start;
- weekly card;
- reset / delete flow.

### Phase 2 — limited users

- opt-in disclosure;
- feedback controls;
- usefulness telemetry;
- no expansion to other app surfaces yet.

Only after Phase 2 should the team consider Today, Habits, Quest, Life Wheel, Contracts, Pacts, or Island Run integration.

---

## Telemetry

Track product usefulness, not sensitive content.

Allowed event examples:

```text
trajectory_card_shown
trajectory_card_confirmed
trajectory_card_corrected
trajectory_card_rejected
trajectory_pattern_shown
trajectory_pattern_rejected
trajectory_experiment_started
trajectory_experiment_observation_recorded
trajectory_experiment_completed
trajectory_weekly_summary_opened
trajectory_data_reset
```

Do not put journal text, route labels, hypotheses, or experiment notes in telemetry payloads.

Key MVP metrics:

- percentage of proposed paths confirmed or corrected;
- rejection rate;
- average taps / time required;
- percentage of eligible users starting an experiment;
- experiment observation completion rate;
- percentage of completed experiments kept, revised, or discarded;
- self-reported usefulness;
- whether measured outcomes improve descriptively;
- opt-out and reset rates.

The feature fails if it produces many insights but few experiments or no changed outcomes.

---

## Acceptance criteria

### Journal capture

- A saved journal entry can optionally produce a proposed 3–6-step trajectory.
- The proposal never blocks or alters journal saving.
- The user can confirm, correct, reject, or dismiss it.
- Rejected proposals do not contribute to patterns.
- User corrections are persisted and take precedence.
- No proposal appears when evidence is insufficient.

### Patterns

- A recurring pattern requires at least three accepted / corrected episodes.
- Every surfaced pattern displays support count and tentative confidence.
- Every pattern includes an alternative explanation or explicitly says none is supported yet.
- A user can reject a pattern and prevent it resurfacing unchanged.

### Experiments

- A user can start one active experiment from a pattern.
- The experiment has one trigger, one intervention, and one primary metric.
- Observations can be recorded in one or two taps.
- Results are descriptive and include sample size.
- The user can keep, revise, abandon, or complete the experiment.

### Weekly card

- The card displays no more than one repeated route, one improvement, and one active experiment.
- It clearly distinguishes observation from inference.
- It does not use personality labels.
- It hides when there is insufficient data.

### Safety and privacy

- Owner-only RLS is present and tested.
- A user can delete all trajectory-engine data separately.
- Sensitive text is excluded from telemetry.
- AI output is schema validated and safety filtered.
- No raw model reasoning is stored.

### Quality

- TypeScript passes.
- Production build passes.
- Unit tests cover normalization, similarity thresholds, confidence transitions, user rejection, experiment calculations, and weekly-summary hiding rules.
- Component tests cover confirm, correct, reject, dismiss, and insufficient-data states.

---

## Suggested implementation sequence

1. Inspect the current Journal save flow, AI Coach services, feature-flag system, Supabase migration conventions, and reflective / Compass surfaces.
2. Add types and pure normalization / matching helpers with tests.
3. Add migration and RLS policies.
4. Add episode persistence service.
5. Add the post-journal proposal card behind a default-off flag.
6. Add correction and rejection persistence.
7. Add recurring-pattern detection and Coach presentation.
8. Add the simple experiment model and observation flow.
9. Add the weekly Compass card.
10. Add reset / deletion controls and privacy copy.
11. Add non-sensitive telemetry.
12. Run focused tests, typecheck, build, and relevant architecture guards.

---

## Required implementation restraint

Do not expand the scope merely because adjacent systems are available.

The MVP should remain limited to:

```text
Journal capture
→ corrected trajectory
→ tentative recurring pattern
→ one tiny experiment
→ descriptive weekly result
```

The next expansion decision should be based on evidence from real usage, not the attractiveness of the concept.

## Final success condition

The MVP is successful when a user can truthfully say:

> The app noticed a route I recognized, helped me test one small change, and showed whether that change actually helped.

Anything beyond that is secondary.