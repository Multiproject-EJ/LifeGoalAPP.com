# Wisdom Nuggets Questionnaire — Build Plan

Status: **implementation plan only — no runtime or database implementation yet**  
Date: 2026-07-06  
Scope: add a dedicated 25-part Wisdom Nuggets questionnaire system to the canonical Island Run Wisdom Landmark, persist each player reflection in Supabase, and make the saved reflection available to future AI-supported habit, goal, and quest suggestions.

## 1. Product decision

Create a new named system called **Wisdom Nuggets**.

A Wisdom Nugget is not merely a quote or multiple-choice card. It is a short practical principle followed by a lightweight personal reflection that asks the player to connect the principle to their own life and story.

The player experience at a Wisdom Landmark becomes:

1. a brief, skippable first-use information animation explaining Wisdom Nuggets;
2. the current island's Wisdom Nugget;
3. one simple personal reflection form;
4. save the reflection to Supabase;
5. optionally show a small immediate takeaway;
6. complete the Wisdom stop through the existing canonical Island Run completion path;
7. later, allow AI to use the saved reflection to suggest a fitting action, habit, goal, or quest contribution.

The system must feel supportive and useful rather than like an assessment. There are no right answers, scores, diagnoses, or negative outcomes.

## 2. Repository-grounded starting point

The current repository already provides the correct gameplay insertion point:

- `generateIslandStopPlan(...)` defines the canonical five-stop sequence: Hatchery → Habit → Mystery → Wisdom → Boss.
- Wisdom is stop index 3 with `stopId: 'wisdom'`, `kind: 'fixed_wisdom'`, and copy describing a short story, questionnaire, or learning moment.
- The current Wisdom flow renders a reusable Wisdom encounter inside the common stop modal.
- Completion must continue through the existing shared/canonical stop completion action. The new questionnaire must not introduce a second authority for Island Run progression.
- Current Wisdom content is a static local pool in `wisdomTreeCards.ts`, selected by island number modulo the pool length.
- Current Wisdom choices are not persisted to a journal, knowledge store, or dedicated Supabase record.
- Existing real-life intake patterns already demonstrate session-aware Supabase writes, structured payloads, linked habit IDs, Compass contributions, and non-blocking data capture.

Relevant current files:

- `src/features/gamification/level-worlds/services/islandRunStops.ts`
- `src/features/gamification/level-worlds/services/wisdomTreeCards.ts`
- `src/features/gamification/level-worlds/components/WisdomTreeCardEncounter.tsx`
- `src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx`
- `src/features/gamification/level-worlds/components/IslandRunLifePromptCard.tsx`
- `src/features/gamification/level-worlds/services/islandRunStateActions.ts`
- `src/features/gamification/level-worlds/services/islandRunStopCompletion.ts`
- `src/services/gameLifeIntake.ts`
- `src/services/compassState.ts`
- `supabase/migrations/0251_game_life_intake.sql`

## 3. MVP boundaries

### In MVP

- all 25 Wisdom Nuggets are authored and versioned in code;
- one deterministic nugget is assigned to each of Islands 1–25;
- Islands 26–120 reuse the same catalogue in a deterministic cycle unless a later authored manifest overrides them;
- a dedicated Wisdom Nuggets modal experience is used inside the existing Wisdom stop dialog;
- a first-use information animation appears before the first questionnaire;
- one short free-text reflection is saved per user, island, and nugget;
- the player may edit a previously saved answer;
- save status, retry, empty-state, and “Come back later” behavior are supported;
- completing a saved or intentionally skipped questionnaire can call the existing Wisdom stop completion callback according to the product rule below;
- saved responses are structured so AI can later make grounded suggestions;
- AI output is optional and must never block saving or stop completion.

### Not in MVP

- psychological scoring or personality diagnosis;
- automatic creation of goals or habits without explicit confirmation;
- changing stop ticket prices, stop sequencing, rewards, or boss unlock rules;
- replacing the full Wisdom Tree system elsewhere in the product;
- semantic embeddings or a vector database before there is a demonstrated retrieval need;
- sending every answer to an AI provider automatically;
- public/social sharing of private reflections.

## 4. Content model

Create a new content module rather than expanding the existing soft-choice card shape indefinitely.

Recommended file:

`src/features/gamification/level-worlds/services/wisdomNuggets.ts`

Recommended type:

```ts
export type WisdomNuggetCategory =
  | 'agency'
  | 'attention'
  | 'health'
  | 'growth'
  | 'relationships'
  | 'money_work'
  | 'resilience'
  | 'security';

export type WisdomNugget = {
  id: string;
  version: number;
  order: number;
  category: WisdomNuggetCategory;
  title: string;
  principle: string;
  reflectionPrompt: string;
  optionalProbe?: string;
  actionLens: 'action' | 'habit' | 'goal' | 'boundary' | 'environment' | 'review';
  suggestedLifeWheelAreas?: string[];
  tags: string[];
};
```

Rules:

- `id` is stable forever and must not depend on display text.
- `version` increments when the meaning or prompt materially changes.
- small punctuation corrections do not require a new row version, but semantic changes do.
- `order` defines the first 25-island lineup.
- answers store both `nugget_id` and `nugget_version` so old responses retain their original meaning.
- AI should receive the stable ID, version, principle, prompt, answer, and relevant quest context rather than inferring meaning from an island number.

Recommended selector:

```ts
getWisdomNuggetForIsland(islandNumber: number): WisdomNugget
```

MVP assignment rule:

```ts
const index = (safeIslandNumber - 1) % WISDOM_NUGGETS.length;
```

This gives Islands 1–25 one unique Nugget each and repeats the catalogue for Islands 26–120. A future `islandContentManifest` field can explicitly override the nugget ID without changing saved records.

## 5. The 25 Wisdom Nuggets and questionnaire prompts

The following is the canonical MVP lineup and must be included in the content catalogue.

### 1. Design the environment

**Principle:** Your environment usually beats willpower. Make helpful actions easier to begin and unhelpful actions slightly harder to reach.

**Reflection prompt:** What part of your surroundings currently makes the life you want harder, and what is one small change that would make the better action easier?

**Action lens:** environment / habit

### 2. Find the bottleneck

**Principle:** Most systems improve fastest when you identify the single constraint limiting everything else.

**Reflection prompt:** What feels most stuck in your life right now, and what do you think is the real bottleneck underneath it?

**Optional probe:** What would become easier if that bottleneck improved?

**Action lens:** goal / review

### 3. Start before motivation

**Principle:** Motivation often arrives after starting. A tiny beginning can create the energy that waiting never produces.

**Reflection prompt:** What have you been waiting to feel ready for, and what would a two-minute start look like?

**Action lens:** action / habit

### 4. Prefer reversible experiments

**Principle:** Move quickly on choices that are cheap to undo; slow down when consequences are costly, permanent, or difficult to reverse.

**Reflection prompt:** What decision are you treating as permanent that could instead be tested as a small reversible experiment?

**Action lens:** action / goal

### 5. Notice the opportunity cost

**Principle:** Every yes spends money, time, attention, or future options. The hidden cost is what that commitment prevents.

**Reflection prompt:** What are you currently saying yes to, and what valuable thing may be receiving less time or attention because of it?

**Action lens:** boundary / review

### 6. Protect decision quality with sleep

**Principle:** Exhaustion can disguise itself as laziness, anxiety, hunger, pessimism, or lack of discipline.

**Reflection prompt:** Where might tiredness be influencing how you judge yourself or a problem in your life?

**Action lens:** habit / environment

### 7. Build meals that support you

**Principle:** A balanced meal or snack is more likely to sustain energy when it combines protein, fibre, carbohydrates, and some fat.

**Reflection prompt:** At what point in your day do food choices leave you least supported, and what simple upgrade would make that moment more nourishing or reliable?

**Action lens:** habit / environment

### 8. Invest in strength

**Principle:** Regular strength work supports muscle, bones, mobility, metabolic health, confidence, and long-term independence.

**Reflection prompt:** What kind of strength would improve your life most right now—physical capacity, consistency, confidence, or something else—and what is a safe first step?

**Action lens:** habit / goal

### 9. Respect compounding

**Principle:** Skills, relationships, habits, products, and investments can look unimpressive early while quietly accumulating future power.

**Reflection prompt:** What worthwhile effort in your life may be growing too slowly to notice, and how could you keep it alive long enough to compound?

**Action lens:** habit / goal

### 10. Separate revenue, profit, and cash

**Principle:** Activity and headline numbers can hide whether a project actually creates sustainable value and retains enough cash to survive.

**Reflection prompt:** For a project, job, or financial commitment in your life, what number are you watching—and what more meaningful measure might you be missing?

**Action lens:** review / goal

### 11. Build distribution, not only the product

**Principle:** A good product does not automatically find users. Discovery, understanding, trust, and access must also be designed.

**Reflection prompt:** What are you building or hoping to share, and how will the right people realistically discover and trust it?

**Action lens:** goal / action

### 12. Ask about real behaviour

**Principle:** What people have already done is usually stronger evidence than what they predict they might do.

**Reflection prompt:** Where are you relying on promises, intentions, or compliments when you could look for a concrete past action instead?

**Action lens:** review / action

### 13. Value repeated use over admiration

**Principle:** Something people repeatedly use is usually more valuable than something they praise once and then abandon.

**Reflection prompt:** In one area of your life or work, what gets positive reactions but little repeat behaviour—and what does that tell you?

**Action lens:** review / goal

### 14. Release sunk costs

**Principle:** Time or money already spent cannot be recovered. The useful decision is whether the next unit of effort is still worth spending.

**Reflection prompt:** What are you continuing mainly because you have already invested in it, and would you choose it again today with what you now know?

**Action lens:** boundary / review

### 15. Separate confidence from certainty

**Principle:** A confident voice is not evidence by itself. Strong thinking includes knowing what evidence could change the conclusion.

**Reflection prompt:** What belief or decision in your life feels certain, and what information would genuinely make you reconsider it?

**Action lens:** review

### 16. Design the peak and the ending

**Principle:** People often remember the emotional high point and the ending more strongly than the average moment.

**Reflection prompt:** What experience, routine, product, or relationship moment could be improved by creating a better ending?

**Action lens:** action / environment

### 17. Solve the practical and emotional problem

**Principle:** Many conflicts contain both a practical disagreement and an emotional meaning such as disrespect, fear, rejection, or loss of control.

**Reflection prompt:** Think of a current tension. What is the practical problem, and what might the situation mean emotionally to each person?

**Action lens:** action / relationship

### 18. Make boundaries about your action

**Principle:** A boundary becomes clearer when it describes what you will do rather than trying to control another person.

**Reflection prompt:** Where do you need a clearer boundary, and how could you express it as a calm action you will take?

**Action lens:** boundary

### 19. Question manufactured urgency

**Principle:** Countdowns, pressure, and “last chance” language can weaken judgment. Real urgency should be independently verifiable.

**Reflection prompt:** Where do you currently feel pressured to decide quickly, and what would happen if you paused long enough to verify the deadline?

**Action lens:** boundary / review

### 20. Secure the basics

**Principle:** Unique passwords, a password manager, multi-factor authentication, backups, and protecting verification codes prevent many avoidable disasters.

**Reflection prompt:** Which part of your digital life would cause the most damage if lost or compromised, and what single security step should you take next?

**Action lens:** action / environment

### 21. Use checklists for repeatable importance

**Principle:** Checklists reduce predictable mistakes when a task is repeated, important, or easy to perform inconsistently.

**Reflection prompt:** What recurring task do you keep rebuilding from memory, and what three items belong on its first checklist?

**Action lens:** environment / habit

### 22. Measure the trend

**Principle:** One day is often noise. Weekly and monthly direction usually reveal more than an isolated success or failure.

**Reflection prompt:** What single bad or good day have you been overinterpreting, and what longer trend would give you a fairer picture?

**Action lens:** review

### 23. Shorten the horizon

**Principle:** When the whole problem feels overwhelming, reduce the time horizon and choose the next useful action.

**Reflection prompt:** What feels too large to solve right now, and what useful step could you complete in the next twenty minutes?

**Action lens:** action

### 24. Build a recovery habit

**Principle:** Missing once is normal. A reliable return matters more than emotional punishment or perfect streaks.

**Reflection prompt:** When you fall off a habit or plan, what usually makes returning difficult, and what gentler restart rule would help?

**Action lens:** habit / environment

### 25. Make it easier to repeat

**Principle:** Sustainable systems improve when you ask what would make the useful behaviour easier to repeat.

**Reflection prompt:** Choose one action you want more of. What would make it simpler, safer, more enjoyable, or more automatic next time?

**Action lens:** habit / environment

## 6. Supabase storage design

Create a dedicated table named:

`public.wisdom_nugget_responses`

This is preferable to hiding the full system only inside a generic JSON payload because:

- responses need stable identity and edit semantics;
- product and AI code must query them predictably;
- versioned content must remain auditable;
- future analytics should distinguish completed, skipped, and revisited Nuggets;
- linked actions, habits, and goals may be added later without rewriting opaque payloads.

Recommended migration:

`supabase/migrations/XXXX_wisdom_nugget_responses.sql`

Recommended columns:

```sql
create table public.wisdom_nugget_responses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  nugget_id text not null,
  nugget_version integer not null,
  island_number integer not null check (island_number between 1 and 120),
  response_text text,
  response_state text not null default 'completed'
    check (response_state in ('draft', 'completed', 'skipped')),
  prompt_snapshot text not null,
  principle_snapshot text not null,
  content_category text not null,
  action_lens text not null,
  source text not null default 'island_run_wisdom_stop',
  linked_habit_id uuid null,
  linked_goal_id uuid null,
  linked_quest_id uuid null,
  ai_suggestion_status text not null default 'not_requested'
    check (ai_suggestion_status in ('not_requested', 'pending', 'ready', 'dismissed', 'accepted', 'failed')),
  ai_suggestion_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz null,
  unique (user_id, island_number, nugget_id)
);
```

Notes:

- `response_text` may be null only for `draft` or `skipped` records.
- snapshot fields preserve exactly what the player answered even if content changes later.
- `ai_suggestion_payload` is storage for a concise structured result, not raw provider logs or hidden reasoning.
- linked IDs are nullable future-facing fields. Validate the actual repository goal/habit/quest table names and foreign-key compatibility during implementation before adding FK constraints.
- add `updated_at` trigger using the repository's existing convention.

Recommended indexes:

```sql
create index wisdom_nugget_responses_user_updated_idx
  on public.wisdom_nugget_responses (user_id, updated_at desc);

create index wisdom_nugget_responses_user_nugget_idx
  on public.wisdom_nugget_responses (user_id, nugget_id);

create index wisdom_nugget_responses_ai_status_idx
  on public.wisdom_nugget_responses (user_id, ai_suggestion_status)
  where ai_suggestion_status <> 'not_requested';
```

RLS requirements:

- enable row-level security;
- authenticated users may select only rows where `auth.uid() = user_id`;
- authenticated users may insert only rows where `auth.uid() = user_id`;
- authenticated users may update only their own rows;
- authenticated users may delete only their own rows if product policy permits deletion;
- service-role access remains server-side only.

Do not expose one player's reflection to another player.

## 7. Service layer

Create:

`src/services/wisdomNuggets.ts`

Recommended API:

```ts
export type WisdomNuggetResponseState = 'draft' | 'completed' | 'skipped';

export async function getWisdomNuggetResponse(input: {
  userId: string;
  islandNumber: number;
  nuggetId: string;
}): Promise<Result<WisdomNuggetResponse | null>>;

export async function upsertWisdomNuggetResponse(input: {
  userId: string;
  islandNumber: number;
  nugget: WisdomNugget;
  responseText: string | null;
  state: WisdomNuggetResponseState;
}): Promise<Result<WisdomNuggetResponse>>;

export async function listWisdomNuggetResponsesForUser(input?: {
  limit?: number;
  category?: WisdomNuggetCategory;
}): Promise<Result<WisdomNuggetResponse[]>>;

export async function updateWisdomNuggetAiSuggestion(...): Promise<Result<...>>;
```

Service rules:

- UI components do not call Supabase directly;
- trim response text before save;
- enforce a sensible maximum length, recommended 2,000 characters;
- use an upsert on the unique user/island/nugget key;
- return typed errors suitable for retry UI;
- preserve the user's existing answer if an AI request fails;
- do not mark the Island Run stop complete from the database service. Completion remains a gameplay concern in the existing stop pipeline.

## 8. Modal and interaction design

Create a dedicated component, recommended:

`src/features/gamification/level-worlds/components/WisdomNuggetEncounter.tsx`

It should replace the current card encounter only for this new 25-item lineup, while the outer Wisdom stop modal and canonical completion callback remain intact.

### 8.1 First-use information animation

Show once before the player's first Wisdom Nugget, using a local preference plus a server-derived fallback from whether any response exists.

Animation length: approximately 4–7 seconds, skippable immediately.

Suggested three-beat sequence:

1. **A small piece of wisdom appears**  
   A glowing seed, page fragment, or crystal nugget arrives from the Wisdom Landmark.

2. **The player connects it to their own story**  
   The nugget sends a line toward a simple journal/page silhouette.

3. **Wisdom can become part of the Quest**  
   The line branches into small action, habit, and goal icons, with copy making clear that suggestions remain optional.

Suggested copy:

> Wisdom Nuggets are short ideas that become useful when you connect them to your real life. Write as much or as little as feels helpful. Your reflection stays yours, and you can later ask the guide to turn it into a possible action, habit, or goal.

Buttons:

- `Begin`
- `Skip intro`
- optional checkbox/link: `Don't show this again`

Accessibility:

- respect `prefers-reduced-motion`;
- provide equivalent static panels;
- never autoplay audio;
- focus management must move into the encounter after the animation;
- all animation meaning must also exist as text.

### 8.2 Questionnaire screen

Recommended visual hierarchy:

- `Wisdom Nugget 3 of 25` or island-specific progress;
- category icon;
- title;
- one short principle card;
- personal reflection question;
- large but simple textarea;
- optional character count only near the limit;
- save/continue CTA;
- `Come back later` secondary action;
- subtle statement: `No right answer. This is for your story.`

The form should be one screen on a typical phone where possible. Do not introduce a multi-page survey for a single Nugget.

Suggested textarea placeholder:

`Write a few words, a real example, or the first thing that comes to mind…`

Recommended buttons:

- primary: `Save this wisdom`
- secondary: `Come back later`
- when editing: `Update reflection`
- after save: `Carry this wisdom onward`

### 8.3 Completion rule

Recommended MVP rule:

- a non-empty saved response completes the Wisdom objective;
- `Come back later` uses the existing postponed-stop behavior and does not complete the objective;
- do not award completion merely for opening the modal;
- an explicit future `Skip this Nugget` option may save `response_state = 'skipped'`, but should be a separate product decision from the existing temporary postponement action;
- Supabase save must succeed before the stop is marked complete, because the saved personal reflection is the new objective itself;
- if save fails, keep the answer in component state, show retry, and do not lose the writing.

The completion sequence should be:

1. validate input;
2. save/upsert Supabase response;
3. optionally record a generic game-life intake event for cross-system telemetry;
4. optionally record a Compass contribution only when product rules say the text belongs in the Compass;
5. invoke the existing `onComplete` callback;
6. parent executes the canonical Island Run stop completion action.

## 9. AI integration

AI should make Wisdom Nuggets more actionable without pretending to be an authority on the player's life.

### 9.1 Core behavior

After a response is saved, AI may be invoked in either of two ways:

- **player requested:** `Help me use this`;
- **later contextual suggestion:** the Quest/Coach surfaces a relevant saved Nugget when it clearly fits the player's current goals, habits, Life Wheel state, or island theme.

The AI can creatively suggest:

- one immediate action;
- one tiny or normal habit;
- one short experiment;
- one boundary or environment change;
- one goal or sub-goal;
- one reflection/review cadence;
- one way the insight could contribute to the player's current Quest or Compass phase.

AI must not automatically create or alter any habit, goal, task, calendar event, or quest state. Every mutation requires an explicit user confirmation through the existing creation flows.

### 9.2 Context packet

A server-side AI request should use the minimum useful context:

```ts
{
  nugget: {
    id,
    version,
    title,
    principle,
    reflectionPrompt,
    actionLens,
    category,
    tags
  },
  playerReflection,
  currentQuestSummary,
  relevantActiveGoals,
  relevantActiveHabits,
  latestLifeWheelSignals,
  islandNumber,
  islandTheme,
  requestedOutputKinds
}
```

Only include relevant slices, not the player's complete private history by default.

### 9.3 Structured AI result

Recommended result contract:

```ts
type WisdomNuggetAiSuggestion = {
  summary: string;
  whyItFits: string;
  suggestions: Array<{
    kind: 'action' | 'habit' | 'goal' | 'boundary' | 'environment' | 'review';
    title: string;
    description: string;
    effort: 'tiny' | 'small' | 'medium';
    linkedLifeWheelArea?: string;
  }>;
  questConnection?: {
    label: string;
    explanation: string;
  };
  safetyNote?: string;
};
```

Store the accepted/displayable structured result in `ai_suggestion_payload`. Do not store chain-of-thought, raw provider internals, or unnecessarily large prompt transcripts.

### 9.4 Suggestion UX

After save, show a compact optional card:

- `✨ Turn this into a next step`
- options: `Action`, `Habit`, `Goal`, or `Surprise me`
- generated suggestion appears with `Use this`, `Adjust`, and `Not for me` actions;
- `Use this` routes into the relevant existing creation form with fields prefilled;
- final creation remains user-confirmed;
- `Not for me` may record lightweight feedback so future ranking improves.

### 9.5 AI safety and tone

- supportive, practical, and non-diagnostic;
- clearly label generated suggestions as suggestions;
- avoid claims that one reflection reveals a hidden truth about the user;
- for medical, legal, financial, trauma, or crisis material, avoid overconfident prescriptive output and route to appropriate safe support patterns;
- never punish, shame, or reduce game rewards because of answer content;
- allow the player to use the questionnaire without AI.

## 10. Quest, habit, goal, and Compass connections

Wisdom responses become a **personal knowledge source**, not automatically a new objective.

Recommended future link paths:

### Action

Create a one-off Today Todo or Quest action from an AI/user-selected suggestion.

### Habit

Prefill the existing habit creation path with:

- title;
- minimum version;
- likely life area/domain;
- timing suggestion;
- source metadata linking back to `wisdom_nugget_response_id`.

### Goal

Prefill an existing goal/quest form when the reflection reveals a larger desired outcome. Do not turn every response into a goal.

### Compass

A Wisdom response may contribute to a Compass spoke when:

- the user explicitly chooses `Add to Compass`; or
- the current island/Compass activity explicitly defines that contribution.

Avoid automatically copying every private reflection into multiple stores. Prefer linking by ID or storing a concise user-approved excerpt.

### AI Coach

The coach can retrieve recent or category-relevant Wisdom responses when the user asks questions such as:

- `What pattern do you notice?`
- `Help me choose my next small step.`
- `Which of my Wisdom Nuggets connects to this goal?`
- `Turn this reflection into a habit.`

## 11. Analytics and telemetry

Track product events without recording private response text in analytics payloads.

Recommended events:

- `wisdom_nugget_intro_viewed`
- `wisdom_nugget_intro_skipped`
- `wisdom_nugget_opened`
- `wisdom_nugget_response_saved`
- `wisdom_nugget_response_updated`
- `wisdom_nugget_postponed`
- `wisdom_nugget_ai_requested`
- `wisdom_nugget_ai_suggestion_shown`
- `wisdom_nugget_ai_suggestion_accepted`
- `wisdom_nugget_ai_suggestion_dismissed`
- `wisdom_nugget_linked_to_habit`
- `wisdom_nugget_linked_to_goal`
- `wisdom_nugget_linked_to_quest`

Allowed metadata:

- nugget ID/version;
- island number;
- category;
- response length bucket, not response text;
- save latency/success/failure code;
- suggestion kind;
- accepted/dismissed state.

## 12. Privacy and deletion

- tell players their reflection is saved to their account;
- do not imply that it is fully private from the product operator, but explain that it is not shared with other players;
- AI processing must be disclosed when the player invokes it;
- support editing and deletion from a future Wisdom archive/history screen;
- account deletion cascades responses through `user_id`;
- do not put raw reflection text into logs, analytics, error monitoring breadcrumbs, or URLs;
- preserve only the minimum data needed for the feature.

## 13. Suggested implementation slices

### PR 1 — Content and pure selection logic

- add `wisdomNuggets.ts`;
- add all 25 canonical Nuggets;
- add deterministic island assignment;
- add unit tests for Islands 1, 25, 26, and 120;
- no UI or database changes.

### PR 2 — Supabase persistence

- add migration and RLS;
- add typed service and generated database types if the repository uses generated types;
- test create/read/update and ownership behavior;
- no gameplay completion changes yet.

### PR 3 — Dedicated modal experience

- add `WisdomNuggetEncounter.tsx`;
- add first-use info animation/static reduced-motion version;
- load existing response;
- implement form, validation, save, retry, and edit;
- preserve `Come back later` behavior.

### PR 4 — Canonical Wisdom completion wiring

- replace the old static Wisdom choice encounter in the Wisdom stop path;
- call canonical completion only after successful save;
- maintain ticket and sequencing rules;
- verify no direct gameplay state mutation is introduced.

### PR 5 — Optional AI suggestion

- add explicit `Help me use this` action;
- add server-side context assembly and structured result validation;
- render suggestions;
- route accepted suggestions to existing habit/goal/action forms without automatic creation.

### PR 6 — Wisdom archive and deeper Quest retrieval

- add a place to revisit/edit/delete completed Nuggets;
- support category and Quest relevance retrieval;
- add user-approved Compass linking.

## 14. Testing requirements

### Content tests

- exactly 25 unique stable IDs;
- `order` covers 1–25 exactly once;
- every Nugget has a non-empty principle and reflection prompt;
- action lens and category values are valid;
- deterministic island mapping is stable;
- no accidental text duplication.

### Database tests

- user can CRUD only their own response rows;
- another authenticated user cannot read or mutate them;
- unique key prevents duplicate answers for the same island/Nugget;
- upsert edits the intended row;
- invalid island, state, and null completed answer are rejected by service/schema rules;
- account deletion cascades.

### Component tests

- first-use animation appears and can be skipped;
- reduced-motion variant works;
- prior response loads into the form;
- whitespace-only answer cannot complete;
- failed save retains local text and shows retry;
- successful save calls `onComplete` exactly once;
- `Come back later` does not save a completed response or complete the stop;
- double tapping save cannot duplicate completion;
- keyboard, focus trap, labels, and screen-reader copy work.

### Gameplay integration tests

- Wisdom remains stop index 3;
- ticket and prior-stop requirements are unchanged;
- save failure cannot bypass completion;
- successful response completes only the active Wisdom objective;
- existing boss unlock and island completion semantics remain unchanged;
- hydration and legacy state tests remain green;
- no direct component-level mutation of Island Run currency or stop state is added.

### AI tests

- AI is not called without explicit trigger in MVP;
- missing AI availability does not affect save or completion;
- structured response is schema-validated;
- suggestions never auto-create records;
- only selected relevant context is sent;
- sensitive/high-risk answer fixtures produce cautious, non-diagnostic output;
- no raw reflection is emitted into telemetry or logs.

Recommended validation commands should include the repository's canonical Island Run tests, architecture guards, unit tests for the new service/content, and production build.

## 15. Acceptance criteria

The feature is ready for MVP when:

1. every island resolves a deterministic Wisdom Nugget from the 25-item catalogue;
2. Islands 1–25 present each Nugget once in canonical order;
3. the first Wisdom encounter explains the system through a skippable accessible animation;
4. the player can connect the Nugget to their life in a simple form;
5. the answer is saved in a dedicated owner-only Supabase table with content snapshots and versioning;
6. a failed save never loses the player's writing and never incorrectly completes the stop;
7. a successful save completes Wisdom through the existing canonical stop progression path;
8. `Come back later` continues to postpone rather than complete;
9. the response can later be retrieved as relevant context for the Quest/Coach;
10. AI can optionally suggest an action, habit, goal, boundary, environment change, or review where it fits;
11. no AI suggestion changes the player's records without explicit confirmation;
12. no stop economy, ticket, sequencing, or boss rules are accidentally changed.

## 16. Final implementation recommendation

Build Wisdom Nuggets as a small, durable personal-knowledge system rather than another ephemeral card animation.

The critical architecture separation is:

- **content catalogue** decides what Nugget the island presents;
- **Supabase response service** owns the player's saved reflection;
- **Wisdom encounter UI** owns the form and first-use explanation;
- **canonical Island Run actions** remain the only authority for stop progression;
- **AI/Quest integration** reads the saved reflection and proposes optional next steps, but never silently creates them.

This creates a useful bridge between the game and the player's real life: the Wisdom Landmark gives the insight, the player gives it personal meaning, and the wider Quest system may later help turn that meaning into a practical next move.