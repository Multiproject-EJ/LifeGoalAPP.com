# Quest System Audit

_Date: 2026-06-05_

## Scope and method

This audit reviews the current HabitGame Quest ecosystem across Quest Home, Life Wheel, check-ins, goals, habits, routines, Starter Quest, AI Coach, reflections, Ikigai, traits/archetypes, profile strength, and navigation between Quest screens. The investigation is repo-only and intentionally does not modify gameplay or user-facing behavior.

Primary code paths reviewed:

- App shell and navigation: `src/App.tsx`
- Quest home: `src/features/goals/MyQuestHub.tsx`
- Life Wheel and check-ins: `src/features/checkins/LifeWheelCheckins.tsx`
- Goals and goal planning: `src/features/goals/*`, `src/services/goals.ts`, `src/services/lifeGoals.ts`
- Habits and Starter Quest: `src/features/habits/*`, `src/services/habitsV2.ts`, `src/services/questHabit.ts`
- Routines: `src/features/routines/*`, `src/services/routines.ts`, `src/types/routines.ts`
- AI Coach: `src/features/ai-coach/AiCoach.tsx`, `src/types/aiCoach.ts`
- Journal/reflections: `src/features/journal/*`, `src/services/journal.ts`, `src/services/goalReflections.ts`
- Identity and archetypes: `src/features/identity/*`, `src/world/ArchetypePicker.tsx`, `src/world/archetypes.ts`
- Profile strength: `src/features/profile-strength/*`, `src/constants/profileStrength.ts`

## Executive summary

The current Quest ecosystem already has the raw ingredients for a high-value coaching product: life-area diagnosis, long-term goals, habits, routines, journaling, AI coaching, archetype identity, and profile-completion intelligence. The main issue is not feature absence; it is experience fragmentation.

The strongest near-term opportunity is to turn `My Quest` from a small dashboard card stack into a unified journey layer that answers five questions for the user:

1. **Who am I becoming?** Identity, traits, archetypes, Ikigai, values.
2. **Where am I going?** Life Wheel, focus area, goals, vision.
3. **What do I do today?** Habits, routines, actions, Starter Quest.
4. **Who is helping me?** AI Coach, prompts, nudges, reflections.
5. **How am I progressing?** Profile Strength, trends, XP, streaks, reviews.

The current system has many duplicated concepts that can be consolidated without removing data: Quest, Game of Life, Daily Quest Guidance, Personal Quest calendar, Starter Quest, Goal Coach, AI Coach, Life Wheel insights, Profile Strength tasks, and journal reflections all frame progress in different ways. A premium Quest Journey can preserve each tool while organizing them into a coherent hierarchy.

## Screen inventory

| Area | Current screen/component | Shell/navigation location | Primary role |
| --- | --- | --- | --- |
| Quest Home | `MyQuestHub` | Mobile Quest submenu / My Quest flow | Snapshot of Life Wheel, focus area, active goal, supporting habits, and next actions. |
| Dashboard | default workspace nav item `goals` | Sidebar/footer | Broader dashboard/home surface; Quest-related entry but not named Quest Home. |
| Life Wheel / Check-ins | `LifeWheelCheckins` | Workspace nav `rituals`; My Quest backflow | Full, area, and annual-review check-in experiences. |
| Goals | `GoalWorkspace`, `LifeGoalsSection` | Workspace nav `support`; My Quest action | Goal creation, category grouping, steps/substeps, goal health, AI-assisted goal work. |
| Habits | `HabitsModule`, `DailyHabitTracker`, `MobileHabitHome` | Workspace nav `habits`; Today workspace; quick actions | Habit setup, tracking, streaks, adherence, suggestions, lifecycle, today completion. |
| Routines | `RoutinesTab`, `RoutinesTodayLane` | Workspace nav `routines`; Today workspace | Ordered routine flows composed of habit steps. |
| Starter Quest | `StarterHabitPicker`, `StarterHabitDetailSheet` | My Quest, Today mobile sheet | Tiny habit onboarding by Life Wheel domain. |
| AI Coach | `AiCoach` modal | Main/mobile menu, game/coach entry points, journal handoff | Chat-based companion with optional data access and proactive interventions. |
| Reflections | `Journal`, `GoalReflectionJournal`, `LifeWheelInsightsPanel` | Workspace nav `journal`; goals; check-ins | Free/guided journaling, goal reflections, Life Wheel notes/trends. |
| Ikigai | App-level `isMyIkigaiModalOpen` modal state and mobile submenu handlers | Mobile Quest menu | Intended identity/direction surface; appears more as a navigation concept than a fully integrated journey layer. |
| Traits / Archetypes | `PersonalityTest`, archetype deck/hand components, micro-tests | Identity route/menu and launcher card surfaces | Personality test results, archetype hand, trait-guided journal templates, playstyle identity. |
| Profile Strength | App-level profile-strength overlay and scoring services | Mobile menu long-press/overlay | Cross-feature completeness score with next tasks. |
| Vision Board | `VisionBoard` | Workspace nav `insights` | Direction/identity visualization linked to goals/habits. |
| Breathing Space | `BreathingSpace` | Workspace nav `breathing-space` | Mindfulness execution/support surface adjacent to Quest. |
| Game of Life / Score | `ScoreTab`, `GameBoardOverlay`, Level Worlds | Workspace nav `score` / `game` | Gamified progression, rewards, creatures, islands, currencies. |

## Navigation map

### Primary desktop workspace navigation

The app shell defines a broad workspace nav with Quest-adjacent items: Dashboard, Today's Habits & Routines, Actions, Score, Projects, Body, Habits, Routines, Promises, Wellbeing Wheel Check-in, Journal, Breathing Space, Vision Board, Goals, Game of Life, and Placeholder. This means Quest functionality is spread across many siblings rather than grouped under a single Quest Journey hierarchy.

```text
Workspace shell
├─ Dashboard
├─ Today's Habits & Routines
├─ Actions
├─ Score
├─ Projects
├─ Body
├─ Habits
├─ Routines
├─ Promises
├─ Wellbeing Wheel Check-in
├─ Journal
├─ Breathing Space
├─ Vision Board
├─ Goals
└─ Game of Life
```

### Mobile Quest/menu navigation

Mobile adds richer Quest semantics through menu overlays and sheets:

```text
Mobile footer/menu
├─ Quest Menu / My Quest submenu
│  ├─ My Quest hub
│  ├─ Starter Quest sheet
│  ├─ Life Wheel / check-ins
│  ├─ Goals
│  ├─ Ikigai-related paths
│  └─ Profile Strength overlay
├─ Today's habits/routines
├─ AI Coach modal
├─ Journal quick launch
├─ Game / rewards overlay
└─ Personal Quest daily treat calendar
```

### Cross-screen navigation paths

- My Quest can open Starter Quest, Check-ins, and Goals.
- Check-ins can show a “Back to My Quest” control when launched from My Quest.
- Starter Quest can be opened from My Quest or Today and can preselect a Life Wheel domain.
- Journal can navigate to goals, habits, timer, and AI Coach.
- Routines can return to Today through `onOpenToday`.
- Profile Strength tasks can send users to improvement areas.
- AI Coach can be opened as a modal and seeded with starter questions from other surfaces.

## Feature inventory

| Feature | Current functionality | Data sources | Quest relationship |
| --- | --- | --- | --- |
| My Quest hub | Loads latest check-ins, goals, and habits; computes lowest/highest Life Wheel categories, suggested focus, active goal, and supporting habits. | `checkins`, `goals`, `habits_v2` via services. | Closest existing Quest Home, but currently shallow and action-link oriented. |
| Life Wheel categories | Eight canonical life areas shared by check-ins, goals, habits, Starter Quest, annual review. | Static category list in check-ins module. | Strong taxonomy foundation for Quest Journey. |
| Full check-in | 24-question flow, three questions per life area, converts 1-3 answers into 0-10 category scores. | `checkins`; gamification XP/challenge services. | Diagnosis layer. |
| Area check-in | Focused question set for one Life Wheel area using latest score context. | `checkins`. | Useful for weekly/monthly focus rituals. |
| Annual review | `ReviewWizard` embedded as check-in view. | Annual review feature data plus Life Wheel categories. | Seasonal/deep reflection layer. |
| Goal system | Goals with descriptions, status, categories, timing fields, plan quality/environment fields, steps/substeps/alerts. | `goals`, `life_goal_steps`, `life_goal_substeps`, `life_goal_alerts`, goal health/snapshots. | Direction and planning layer. |
| Goal reflections | Confidence, highlight, challenge per goal/date; also journal has goal mode. | `goal_reflections`, `journal_entries.goal_id`. | Reflection loop for goals. |
| Habits V2 | Habit creation, daily logging, schedule interpretation, streak/adherence, lifecycle, adjustments, environment context, domain and goal links. | `habits_v2`, `habit_logs_v2`, streak/adherence services. | Execution layer. |
| Starter Quest | Domain-specific tiny habit catalog with why/how/environment copy; creates a daily habit via quick add. | Static catalog + `habits_v2`. | Excellent onboarding seed for a journey, but currently only creates a habit. |
| Quest Habit | Account-level selected habit that unlocks the Daily Momentum Personal Quest bonus door. | `user_quest_habit` remote table/local cache in `questHabit` service. | Naming overlaps with broader Quest journey. |
| Routines | Create routines with schedule, attach ordered habit steps, mark required/fallback/display modes. | `routines`, `routine_steps`, `routine_logs`; local fallback. | Execution choreography layer. |
| Journal | Hub/write/read modes, guided templates, moods, tags, privacy, linked goals/habits, soundscape, weekly recap, gratitude coach. | `journal_entries`, goals, habits, personality history. | Reflection and meaning layer. |
| Life Wheel insights | Notes for celebration/growth/best/toughest/support ideas plus trend cards; some claim buttons are future feature placeholders. | Recent `checkins`; currently local component state for notes. | Strong coaching UI direction but not fully persisted/integrated. |
| AI Coach | Modal chat with topic starters, optional data access, context from goals/habits/check-ins/journal/vision/life stage, interventions. | AI access settings, goals, habits, check-ins, journals, goal snapshots, workspace profile. | Companion layer, currently modal-first rather than journey-native. |
| Personality test | Trait/axis scoring, profile persistence, summary generation, history. | `personality_profiles`, `personality_tests`, static questions. | Identity foundation. |
| Archetype hand/deck | Dominant and supporting cards based on personality scores; used in launcher and guided journals. | Personality scores + archetype scoring. | Premium emotional identity layer. |
| Micro-tests | Lightweight future/adjacent trait refinement flows; badge state is partially placeholder in app shell. | Static micro-test registry; TODO loading noted in app. | Good long-term progression mechanic. |
| Profile Strength | Scores goals, habits, journal, vision board, Life Wheel, identity; offers next tasks; awards profile-strength XP. | Aggregated service reads across feature tables. | Meta-progression and activation layer. |
| Ikigai | Mobile menu and modal concept exists, but the repository shows less integration than goals/check-ins/journal/personality. | Likely app state plus nearby identity/goal surfaces. | Missing central identity-direction bridge. |

## Area-by-area audit

### 1. Quest Home / My Quest

1. **Purpose**
   - Provide a central “what is my Quest?” snapshot: current Life Wheel state, focus area, active goal, supporting habits, and next actions.
2. **Current functionality**
   - Fetches latest check-ins, goals, and habits.
   - Computes lowest and highest Life Wheel category from latest check-in.
   - Selects suggested focus from lowest category, goal category counts, or recent categorized goals.
   - Chooses an active goal and up to three supporting habits linked by goal or domain.
   - Presents cards: Life Wheel Snapshot, Current Focus, Active Goal, Supporting Habits, Next Actions.
3. **Navigation entry points**
   - Mobile My Quest submenu and related Quest menu flows.
   - Internal buttons to Starter Quest, Check-in, and Goals.
4. **Existing data sources**
   - `fetchCheckinsForUser(session.user.id, 12)`.
   - `fetchGoals()`.
   - `listHabitsV2()`.
5. **Related screens**
   - Life Wheel Check-ins, Goals, Starter Quest, Habits, Profile Strength, Journal, AI Coach.
6. **Duplicated concepts**
   - Overlaps with Dashboard, Today, Profile Strength, Game of Life, and Personal Quest calendar as “home” surfaces.
7. **Missing UX opportunities**
   - No narrative journey state, chapter, milestone, readiness/energy check, or clear “next best step.”
   - Supporting habits do not link directly to Today or habit detail.
   - Focus logic is hidden and not framed as a coaching recommendation.
8. **Technical constraints**
   - Depends on three asynchronous service calls and only shallow derived state.
   - It is not a canonical data model; it derives from existing tables.
9. **Candidate redesign opportunities**
   - Reframe as “Quest Journey Home” with a hero narrative, focus area, weekly theme, companion insight, and one primary action.
   - Add clear sections for Identity, Direction, Execution, Companion, Progression.
   - Make the Life Wheel domain taxonomy the backbone rather than just a card detail.

### 2. Life Wheel

1. **Purpose**
   - Diagnose life balance across eight areas and create a shared taxonomy for goals, habits, Starter Quest, reviews, and profile strength.
2. **Current functionality**
   - Eight categories: Mind/Meaning, Money/Admin, Love/Relationships, Joy/Play, Work/Growth, Body/Energy, Connections, Home.
   - Radar chart, history, trend timeline, full check-in, area check-in, annual review.
3. **Navigation entry points**
   - Workspace nav `Wellbeing Wheel Check-in`.
   - My Quest `Run check-in` actions.
   - Profile Strength next tasks.
4. **Existing data sources**
   - Static category list and question set.
   - `checkins` table with `date` and JSON `scores`.
5. **Related screens**
   - My Quest, Goals, Starter Quest, Annual Review, Profile Strength, AI Coach.
6. **Duplicated concepts**
   - “Wellbeing Wheel,” “Life Wheel,” “Check-ins,” “Rituals,” and Annual Review all overlap semantically.
7. **Missing UX opportunities**
   - No clear interpretation layer like “your season,” “needs care,” “source of energy,” or “recommended quest line.”
   - Notes in insight panel appear to be transient, and “claim” buttons are disabled future placeholders.
8. **Technical constraints**
   - Scores are JSON without richer persisted answer/note history.
   - Full check-in and area check-in both write the same aggregate check-in model.
9. **Candidate redesign opportunities**
   - Make Life Wheel the “Direction diagnostic” with emotional explanation and domain-specific journey cards.
   - Persist qualitative reflections separately or connect them to journal entries.
   - Add a premium “Life Area Deep Dive” per domain.

### 3. Check-ins

1. **Purpose**
   - Capture periodic self-assessment and feed progress/reflection loops.
2. **Current functionality**
   - Full, area, quick/manual score editing, history by year, trend deltas.
   - Awards XP and records challenge activity for completed check-ins.
3. **Navigation entry points**
   - Life Wheel screen, My Quest, annual-review selector.
4. **Existing data sources**
   - `checkins`; gamification profile/activity services; challenge service.
5. **Related screens**
   - AI Coach interventions, Profile Strength, Annual Review, My Quest.
6. **Duplicated concepts**
   - Check-in overlaps with Journal reflections and Profile Strength signals.
7. **Missing UX opportunities**
   - No lightweight daily/weekly emotional check-in tied to today’s plan.
   - No explicit follow-up loop from low-score area to Starter Quest/Goal/Habit recommendations except My Quest derivation.
8. **Technical constraints**
   - Historical answers and notes are not modeled separately in the check-in table.
9. **Candidate redesign opportunities**
   - Add a “Quest Pulse” check-in tier: daily 30 seconds, weekly Life Wheel area, monthly full wheel, annual review.

### 4. Goals

1. **Purpose**
   - Translate direction into structured outcomes and plans.
2. **Current functionality**
   - Goals include title, description, Life Wheel category, dates, status, progress notes, why/priority/workload/quality/environment fields.
   - Life goal steps, substeps, and alerts support planning.
   - Goal health, goal doctor, goal suggestions, snapshots, and AI goal coach exist in related files/services.
3. **Navigation entry points**
   - Workspace nav `Goals`.
   - My Quest Active Goal/Open goals.
   - Journal and AI Coach handoffs.
4. **Existing data sources**
   - `goals`, `life_goal_steps`, `life_goal_substeps`, `life_goal_alerts`, `goal_health_snapshots`, `goal_reflections`, `goal_snapshots`.
5. **Related screens**
   - My Quest, Life Wheel, Habits, Journal goal mode, AI Coach, Vision Board.
6. **Duplicated concepts**
   - “Goal,” “Life Goal,” “Project,” “Action,” and “Quest” can all represent an aim.
7. **Missing UX opportunities**
   - Goals are more workspace/planning-oriented than emotionally journey-oriented.
   - Goal hierarchy does not appear as a Quest chapter/arc in the main Quest home.
8. **Technical constraints**
   - Goal services include offline/local mutation paths; redesign should avoid bypassing them.
   - Several fields exist but may not be consistently surfaced in a single UX hierarchy.
9. **Candidate redesign opportunities**
   - Reframe selected goals as “Quest Lines” with why, milestone, obstacles, next ritual, and review cadence.
   - Separate strategic goals from today’s execution in the UX.

### 5. Habits

1. **Purpose**
   - Convert goals/life areas into repeatable behaviors and daily completion.
2. **Current functionality**
   - Habit V2 supports scheduling, target values, lifecycle states, domain keys, goal links, environment design, suggestions, adherence, streaks, and auto-progression.
   - Today surfaces allow checking off scheduled habits and opening related features.
3. **Navigation entry points**
   - Workspace nav `Habits`.
   - Today’s Habits & Routines.
   - Starter Quest creation.
   - Profile Strength tasks and AI Coach interventions.
4. **Existing data sources**
   - `habits_v2`, `habit_logs_v2`, habit streak/adherence/adjustment services, local/demo repositories.
5. **Related screens**
   - Goals, Routines, Today, Starter Quest, AI Coach, Journal.
6. **Duplicated concepts**
   - Habits, routine steps, actions, projects, daily quest guidance, Quest Habit, and Starter Quest all compete as execution units.
7. **Missing UX opportunities**
   - Habits are operationally strong but not consistently tied back to the user’s identity/direction narrative.
   - “Why this habit matters” could be elevated into the Quest Journey home.
8. **Technical constraints**
   - Habit system is large and contains offline/local sync, lifecycle, auto-progression, and tracking logic; redesign should avoid duplicating completion logic.
9. **Candidate redesign opportunities**
   - Group habits by Quest Line/domain and display “rituals that prove who you are becoming.”
   - Use environment design and adherence as coaching cards rather than hidden detail.

### 6. Routines

1. **Purpose**
   - Sequence habits into repeatable flows.
2. **Current functionality**
   - Users can create routines with schedule modes, attach habits as ordered steps, mark steps required/fallback, and manage routine logs.
3. **Navigation entry points**
   - Workspace nav `Routines`.
   - Today workspace via `onOpenToday`.
   - Habits and app feature gating paths.
4. **Existing data sources**
   - `routines`, `routine_steps`, `routine_logs`, plus linked `habits_v2`.
5. **Related screens**
   - Today, Habits, Goals, Starter Quest, AI Coach.
6. **Duplicated concepts**
   - Routines duplicate some scheduling/execution semantics of habits but add order and flow.
7. **Missing UX opportunities**
   - No premium “morning/evening quest flow” narrative tied to identity/archetype.
   - Routine completion does not appear prominently in Quest progression.
8. **Technical constraints**
   - Routines are typed as a database extension rather than fully present in generated DB types, implying schema/type mismatch risk.
9. **Candidate redesign opportunities**
   - Treat routines as “Quest Rituals” under Execution; keep habits atomic and routines as choreography.

### 7. Starter Quest

1. **Purpose**
   - Help users begin with a tiny behavior in a Life Wheel area.
2. **Current functionality**
   - Select Life Wheel area, show first three catalog habits, view details, add selected starter as daily habit.
   - Details include why it works, how to start, and environment hack.
3. **Navigation entry points**
   - My Quest Next Actions/Supporting Habits.
   - Today mobile sheet.
   - Initial domain key can come from My Quest focus.
4. **Existing data sources**
   - Static `STARTER_HABIT_CATALOG`; `quickAddDailyHabit` writes to `habits_v2`.
5. **Related screens**
   - My Quest, Habits, Life Wheel, Today.
6. **Duplicated concepts**
   - “Starter Quest” is essentially a starter habit; “Quest Habit” and “Personal Quest” also use quest naming.
7. **Missing UX opportunities**
   - Does not ask for motivation, obstacle, commitment, or preferred timing.
   - Does not produce a journey card or first-week path; it only creates the habit.
8. **Technical constraints**
   - The catalog is static and limited to the first three per domain for compact UI.
9. **Candidate redesign opportunities**
   - Turn Starter Quest into a 3-step onboarding ritual: choose focus, choose identity promise, choose tiny action.
   - After creation, route to Today with celebration and “day 1 of your quest” context.

### 8. AI Coach

1. **Purpose**
   - Provide conversational guidance and proactive coaching interventions.
2. **Current functionality**
   - Modal chat with starter topics: motivation, goal setting, progress review, mindfulness, habit building, obstacles.
   - Optional data access controls for goals, habits, journaling, reflections, vision board, life stage, and goal evolution.
   - Builds interventions from check-in imbalance, habit struggles, goal evolution, and journal mindset patterns.
3. **Navigation entry points**
   - Main/mobile menu, Game of Life, Journal report-to-AI flows, starter question handoffs.
4. **Existing data sources**
   - AI access settings, workspace profile, goals, habits, check-ins, journals, goal snapshots, telemetry difficulty.
5. **Related screens**
   - Journal, Goals, Habits, Check-ins, Profile Strength, Vision Board.
6. **Duplicated concepts**
   - AI Coach, Goal Coach, Goal Doctor, gratitude coach, habit suggestions, and Profile Strength tasks all provide recommendations.
7. **Missing UX opportunities**
   - Coach is modal-first, not embedded as a persistent companion in the Quest Journey hierarchy.
   - No clear memory timeline or “coach plan” visible outside chat.
8. **Technical constraints**
   - Data access preferences must be respected.
   - Edge-function configuration and Supabase session affect behavior.
9. **Candidate redesign opportunities**
   - Position AI Coach as “Companion” with daily brief, weekly review, and contextual cards that can open chat when needed.

### 9. Reflections / Journal

1. **Purpose**
   - Capture self-awareness, gratitude, progress, fears/solutions, and goal-specific reflection.
2. **Current functionality**
   - Journal hub/write/read views; multiple journal types; mood and mood score; tags; privacy; linked goals/habits; attachments; guided templates; weekly recap; soundscape; gratitude coach; goal reflection journal.
   - Saves entries through offline-capable journal service and awards XP/challenge activity.
3. **Navigation entry points**
   - Workspace nav `Journal`.
   - Dream/today reminders, quick launches, AI Coach handoff, goal reflection panels.
4. **Existing data sources**
   - `journal_entries`, `goal_reflections`, goals/habits lookups, personality history for templates.
5. **Related screens**
   - AI Coach, Goals, Habits, Personality/Archetypes, Check-ins.
6. **Duplicated concepts**
   - Life Wheel notes, Journal entries, GoalReflectionJournal, gratitude coach, annual review all capture reflective text.
7. **Missing UX opportunities**
   - Reflection outputs are not summarized into Quest Journey milestones or identity evolution.
   - Guided templates are powerful but not visible from Quest Home.
8. **Technical constraints**
   - Private journal entries are intentionally excluded from AI context.
   - Journal service has local queue/sync behavior that should remain central.
9. **Candidate redesign opportunities**
   - Create a Reflection layer in Quest Journey: “capture,” “make meaning,” “turn into one action.”
   - Let archetype/Ikigai/Life Wheel context recommend reflection prompts.

### 10. Ikigai

1. **Purpose**
   - Ideally, connect identity, joy, skill, service, and livelihood into a direction narrative.
2. **Current functionality**
   - App state and mobile Quest submenu handlers reference an Ikigai modal/paths, but the investigated code suggests it is not yet as deeply modeled as check-ins/goals/journal/personality.
3. **Navigation entry points**
   - Mobile Quest menu / My Quest submenu.
4. **Existing data sources**
   - No dedicated Ikigai table was identified in the reviewed paths; likely inferred from goals, check-ins, identity, journal, and profile.
5. **Related screens**
   - Personality, Life Wheel, Goals, Journal, Vision Board, AI Coach.
6. **Duplicated concepts**
   - Overlaps with vision board, personality summary, archetypes, and “why it matters” goal fields.
7. **Missing UX opportunities**
   - Ikigai could be the emotional center of Direction, but currently appears disconnected.
8. **Technical constraints**
   - Without a dedicated source of truth, Ikigai should initially be a design/UX composition rather than a new implementation proposal.
9. **Candidate redesign opportunities**
   - Make Ikigai a premium “North Star” canvas that synthesizes identity, Life Wheel, goals, and journal insights.

### 11. Traits / Archetypes

1. **Purpose**
   - Provide emotionally resonant identity, strengths, blind spots, and personalization.
2. **Current functionality**
   - Personality test scores traits and axes.
   - Archetype scoring ranks a deck and builds a hand with dominant/supporting/shadow-style cards.
   - Journal templates use archetype hand and trait bands.
   - Micro-tests exist as a lightweight refinement concept.
3. **Navigation entry points**
   - Identity/personality routes and launcher card surfaces.
   - Journal guided templates.
   - Mobile menu trait cards.
4. **Existing data sources**
   - `personality_profiles`, `personality_tests`, static deck/copy/scoring data, local micro-test registry.
5. **Related screens**
   - Journal, AI Coach, Profile Strength, Ikigai, Quest Home.
6. **Duplicated concepts**
   - Playstyle, archetype, trait card, profile, identity, and game-avatar concepts overlap.
7. **Missing UX opportunities**
   - Archetypes do not yet clearly drive Quest path recommendations or routine styles.
   - Micro-test progression appears partially unfinished in app-level state.
8. **Technical constraints**
   - Backward compatibility exists between profile table data and personality test history.
9. **Candidate redesign opportunities**
   - Use archetypes as the Identity layer of Quest Journey: “your path, your energy style, your trap, your next ritual.”

### 12. Profile Strength

1. **Purpose**
   - Encourage users to complete and maintain a richer personal profile across goals, habits, journal, vision board, Life Wheel, and identity.
2. **Current functionality**
   - Aggregates signals for each area; computes coverage, quality, recency, and needs-review states.
   - Displays next tasks and can award profile-strength XP events.
3. **Navigation entry points**
   - Mobile menu overlay/long-press affordance and profile-strength dialogs.
4. **Existing data sources**
   - Goals, habits, journal entries, vision images, check-ins, personality data, XP state.
5. **Related screens**
   - All Quest screens.
6. **Duplicated concepts**
   - Duplicates activation nudges from empty states, AI interventions, and Quest next actions.
7. **Missing UX opportunities**
   - Profile Strength is useful but framed as completeness rather than “your journey is becoming more personalized.”
8. **Technical constraints**
   - Data loading spans multiple feature services; failures can produce unavailable signals.
9. **Candidate redesign opportunities**
   - Reposition as Progression: “Journey depth,” “Coach personalization,” or “Map clarity.”

## Duplicate concept analysis

### Quest naming collisions

| Concept | Current meaning | Risk |
| --- | --- | --- |
| My Quest | A snapshot hub with focus, goal, habits, and next actions. | Should be the main journey surface but currently small. |
| Starter Quest | A starter habit picker. | Name implies a journey but output is one habit. |
| Quest Habit | One selected habit for a Personal Quest calendar bonus. | Could confuse users if Quest means the entire life-design journey. |
| Personal Quest calendar | Daily treat/reward calendar. | Game progression meaning conflicts with coaching Quest meaning. |
| Daily Quest Guidance | Account setting for daily life upgrade guidance. | Another quest-like guidance layer. |
| Game of Life | Rewards/game shell. | Competes with Quest as the main progress metaphor. |

Recommendation: reserve **Quest Journey** for the coaching/life-design hierarchy. Rename or subordinate smaller quest terms in future design explorations, e.g. “Starter Ritual,” “Focus Habit,” “Daily Reward Calendar,” or “Journey Guidance.”

### Reflection duplication

- Life Wheel insight notes.
- Journal entries and guided templates.
- Goal reflections.
- Annual review prompts.
- AI Coach chat history/prompts.

Recommendation: keep separate entry surfaces but unify outputs in a “Reflection Memory” concept: quick note, journal, goal reflection, and annual review all become different weights of the same meaning-making layer.

### Recommendation duplication

- AI Coach interventions.
- Goal Doctor/Goal Coach.
- Habit suggestions and adjustment recommendations.
- Profile Strength next tasks.
- Starter Quest recommendations from Life Wheel focus.

Recommendation: introduce a product-level “Next Best Step” hierarchy so one recommendation is primary, supporting recommendations are secondary, and the source/reason is transparent.

### Execution duplication

- Habits, routine steps, actions, projects, goal steps/substeps, daily todos, commitment promises.

Recommendation: define hierarchy in the product language:

```text
Quest Line / Goal
└─ Milestone / Project / Step group
   └─ Ritual / Routine
      └─ Habit / Action / Todo
```

## Current strengths

- Strong canonical Life Wheel taxonomy shared across multiple features.
- Rich data model for goals, habits, journals, personality, and check-ins.
- Good first version of My Quest derived focus logic.
- Starter Quest copy already includes premium behavior-design ideas: why it works, how to start, environment hack.
- AI Coach has data-access controls and can create proactive interventions from several sources.
- Journal has multiple modes, privacy, links to goals/habits, moods, weekly recaps, and archetype-guided templates.
- Profile Strength provides a cross-feature personalization/completeness lens.
- Gamification and XP can support motivation once the UX hierarchy is clarified.

## Current weaknesses

- Quest functionality is fragmented across many nav items and modals.
- “Quest” has too many meanings.
- Identity, direction, execution, companion, and progression are not presented as a single journey.
- My Quest is useful but not emotionally premium yet.
- Several coaching concepts are surfaced as tools rather than an orchestrated user path.
- Reflection text is spread across multiple feature-specific surfaces.
- AI Coach is powerful but feels like a modal add-on rather than a journey companion.
- Ikigai appears under-modeled relative to its potential importance.
- Routines are not clearly connected to goals/identity in the Quest hierarchy.
- Profile Strength is not yet framed as unlocking better coaching/personalization.

## Quick wins

1. **Quest language audit**
   - Clarify product vocabulary in copy/docs: Quest Journey, Starter Ritual, Focus Habit, Daily Reward Calendar.
2. **My Quest hierarchy refresh**
   - Without changing behavior, document/design a stronger information hierarchy: hero focus, one primary action, progress, companion insight.
3. **Navigation grouping**
   - Design a Quest Journey nav cluster that groups Life Wheel, Goals, Habits/Routines, Journal, Coach, Identity.
4. **Recommendation source labels**
   - Future UX copy should explain whether a next action comes from Life Wheel, Profile Strength, AI Coach, or habit adherence.
5. **Starter Quest outcome clarity**
   - Design should clarify that Starter Quest creates a habit and begins a 7-day path.
6. **Profile Strength reframing**
   - Recast as personalization depth or journey clarity rather than generic profile completeness.
7. **Reflection consolidation doc**
   - Define how Life Wheel notes, goal reflections, and journal entries relate in the future product model.

## Medium redesign opportunities

1. **Quest Journey Home**
   - A premium dashboard organized into Identity, Direction, Execution, Companion, Progression.
2. **Life Area Deep Dives**
   - Each Life Wheel area gets a page with score, story, goals, habits, reflections, and coach recommendations.
3. **Weekly Quest Review**
   - Combine check-in trends, journal recap, habit adherence, goal status, and AI Coach into a guided review.
4. **Starter Quest 2.0**
   - Convert the picker into a first-week onboarding path with commitment, obstacle, environment, and celebration.
5. **Companion brief**
   - AI Coach provides a daily/weekly brief card before opening chat.
6. **Reflection Memory**
   - Product-level design that lets reflections from multiple surfaces roll up into journey insights.
7. **Ritual builder**
   - Reframe routines as premium quest rituals with archetype-specific templates.

## Large redesign opportunities

1. **Quest Journey operating system**
   - A complete journey architecture: identity profile, direction map, quest lines, rituals, companion, progression.
2. **North Star / Ikigai canvas**
   - A synthesis layer that turns identity, Life Wheel, goals, vision, and reflections into a living direction statement.
3. **Personalized coaching engine UX**
   - A unified recommendation orchestration layer that resolves conflicts among AI Coach, Profile Strength, habits, and goals.
4. **Seasonal life-design cycles**
   - Monthly/quarterly/annual chapters with check-ins, goals, rituals, reviews, and rewards.
5. **Archetype-powered personalization**
   - Archetypes influence copy tone, routine suggestions, friction handling, and progression visuals.
6. **Premium journey map**
   - Visual map showing identity, domains, quest lines, current rituals, milestones, and earned insights.

## Technical constraints and guardrails

- Do not duplicate habit completion, routine, goal, or check-in writes in new UI surfaces; route future changes through existing services.
- Preserve offline/local-sync behavior in journal, goals, habits, and routines.
- Respect AI Coach data-access preferences and journal privacy rules.
- Treat Life Wheel category keys as shared taxonomy; avoid introducing competing domain IDs without migration planning.
- Routines currently rely on service-level database type extensions, so generated type coverage should be verified before deeper redesign implementation.
- Profile Strength derives from multiple services and should remain resilient to partial data failure.
- Quest Home should initially remain a derived/read model until the product model for Quest Journey is finalized.

## Open product questions

1. Should “Quest Journey” be the primary app home, or a premium mode inside the existing workspace?
2. Should a user have one active Quest Line, multiple domain Quest Lines, or both?
3. What is the source of truth for Ikigai/North Star: a new object, a synthesized view, or journal/profile fields?
4. How should AI Coach recommendations be ranked against Profile Strength tasks and habit suggestions?
5. What is the difference between a goal, project, quest line, action, habit, and routine in user-facing language?
6. Should Life Wheel notes become journal entries, check-in metadata, or a separate reflection model?
7. How should game progression and coaching progression reinforce each other without confusing the user?
