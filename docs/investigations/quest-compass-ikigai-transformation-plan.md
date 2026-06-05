# Quest Compass / Life Realm Compass Ikigai Transformation Plan

_Date: 2026-06-05_

## Current state

### Summary

The current Ikigai feature is a lightweight mobile-only concept embedded in the main app shell. It is not a dedicated route, component, service, table, test suite, or feature-flagged module. It appears as a **My Ikigai** entry in the mobile **My Quest** submenu and opens a static purpose-map modal with four action buttons that route the user into existing surfaces.

Current behavior:

1. User opens the mobile menu / My Quest submenu.
2. User taps **My Ikigai**.
3. `App.tsx` closes other mobile overlays and opens `isMyIkigaiModalOpen`.
4. The modal displays:
   - Eyebrow: `Purpose map`
   - Title: `My Ikigai`
   - Static copy about building a purpose compass
   - Static SVG diagram at `/assets/ikigai/ikigai-diagram.svg`
   - Four buttons:
     - Brainstorm with AI Coach
     - Write your Ikigai note
     - Pick one aligned habit
     - Run weekly check-in
5. Buttons hand off to existing app surfaces rather than saving Ikigai-specific data.

Important current limitation: the **Run weekly check-in** handler calls `handleMobileNavSelect('planning')`, while the Life Wheel check-in workspace is rendered under `activeWorkspaceNav === 'rituals'`. On mobile, selecting `planning` opens Today home. This is either intentional legacy routing or a likely wiring bug to verify before reuse.

### Existing Ikigai-related files, routes, components, services, data models, copy, tests, and flags

| Type | Current location | Current role | Recommendation |
| --- | --- | --- | --- |
| App state | `src/App.tsx` — `isMyIkigaiModalOpen` | Tracks whether the mobile Ikigai modal is open. | Replace with Quest Compass modal/workspace state, or move into a dedicated feature component. |
| App handlers | `src/App.tsx` — `openMyIkigaiFromMobileMenu`, `openIkigaiCoachPrompt`, `openIkigaiJournalPrompt`, `openIkigaiHabits`, `openIkigaiCheckins` | Opens the modal and routes to AI Coach, Journal, Habits, and check-ins. | Reuse the handoff pattern, rename handlers, and fix check-in routing. |
| Mobile menu item | `src/App.tsx` — `myQuestSubmenuActions` item `{ id: 'ikigai', label: 'My Ikigai', icon: '✨' }` | Entry point under My Quest. | Rename to `Quest Compass` or `Life Realm Compass`; keep position near Starter Quest. |
| Modal markup | `src/App.tsx` — `aria-label="My Ikigai"` modal block | Static Ikigai modal UI. | Replace with dedicated Compass overview + nested modal architecture. |
| Static asset | `public/assets/ikigai/ikigai-diagram.svg` | Four-circle Ikigai diagram with copy: What you love / world needs / good at / paid for. | Replace with branded compass/realm visual; delete later only after all references are removed. |
| Styles | `src/index.css` — `.mobile-menu-overlay__ikigai-*` | Styles copy, diagram wrapper, image, caption, dark-theme variants. | Rename or replace with `quest-compass` styles; preferably colocate component styles if the repo pattern allows. |
| Design docs | `docs/design/quest-journey-visual-system-v2.md`, `docs/design/quest-experience-v2.md` | Mention Ikigai/North Star as a future Quest Journey canvas. | Reuse visual direction: premium wellness + cozy magical quest layer. |
| Prior investigation | `docs/investigations/quest-system-audit.md` | Notes Ikigai is under-modeled and likely should synthesize goals, check-ins, journal, identity, and profile. | Treat as supporting context, not implementation source of truth. |
| Services | None dedicated to Ikigai. | No Ikigai persistence or API. | Avoid new schema in first PR; synthesize from existing data first. |
| Data models | None dedicated to Ikigai. | No `ikigai` table/columns found. | Use existing `checkins`, `goals`, `habits_v2`, `journal_entries`, and AI context first. |
| Tests | None dedicated to Ikigai. | No Ikigai test coverage found. | Add tests around pure mapping/scoring utilities once extracted. |
| Feature flags | None dedicated to Ikigai. | No `ikigai` entry in `featureAvailabilityRegistry`. | Decide whether Compass ships live under My Quest or as demo/preview behind a new `app.questCompass` flag. |
| Routes | No dedicated Ikigai route. | It is app-modal-only. | Keep mobile modal-first initially; consider a desktop workspace later. |

## Target concept

Transform **My Ikigai** from a static purpose-finding diagram into a branded **Quest Compass** / **Life Realm Compass** that answers:

- Where is my life aligned right now?
- Which life force needs attention?
- What is the next real-life quest I can take?
- What should I reflect on or ask the AI Guide?

Candidate life forces:

1. **Fire** — passion, energy, drive
2. **Strength** — skills, health, resilience
3. **Connection** — love, friends, community
4. **Wealth** — money, resources, freedom
5. **Growth** — learning, wisdom, evolution
6. **Direction** — purpose, vision, legacy

This should build on Ikigai without copying its four-circle model. The product should feel like a living compass that changes as the user checks in, creates goals, completes habits, writes journals, and asks the AI Guide for help.

### Brand direction

- Use “Quest Compass” for the practical product surface.
- Use “Life Realm Compass” for the more magical/emotional visual metaphor if desired.
- Replace static Ikigai language with movement-oriented language:
  - `Purpose map` → `Life Realm Compass`
  - `My Ikigai` → `Quest Compass`
  - `Build your purpose compass...` → `Read today’s alignment and choose your next real-life quest.`
  - `Run weekly check-in` → `Refresh alignment`
  - `Pick one aligned habit` → `Start next quest`
  - `Brainstorm with AI Coach` → `Ask AI Guide`

## Data map

### Existing data that can power the Compass now

| Compass need | Existing source | Current fields / behavior | Notes |
| --- | --- | --- | --- |
| Current alignment score | `checkins` via `src/services/checkins.ts` and `LifeWheelCheckins` | `date`, `scores` JSON keyed by Life Wheel categories | Strongest existing signal. Use latest check-in first. |
| Trends / changes | `checkins` history | Latest vs previous scores already used for trend insights | Can power “rising force” and “needs care”. |
| Active quest line | `goals` via `src/services/goals.ts` | `title`, `status_tag`, `life_wheel_category`, `target_date`, `why_it_matters`, planning fields | Can anchor Next Quest recommendations. |
| Goal execution | `life_goal_steps`, `life_goal_substeps`, `life_goal_alerts` via `src/services/lifeGoals.ts` | Goal breakdown, completion state, alerts | Useful for later Quest detail modal. |
| Supporting rituals | `habits_v2` via `src/services/habitsV2.ts` | `domain_key`, `goal_id`, `status`, `schedule`, `habit_intent`, duration fields | Existing bridge from life area to daily action. |
| Habit completion | `habit_logs_v2` | `date`, `done`, `mood`, `progress_state`, completion percentage | Can power consistency and momentum per force. |
| Current quest habit | `user_quest_habits` via `src/services/questHabit.ts` | Single selected quest habit cached locally and persisted by user | Useful for Next Quest / Today handoff. |
| Reflections | `journal_entries` via `src/services/journal.ts` | `type`, `content`, tags, linked goal/habit IDs, mood, category | Can power Direction/Growth/Fire if AI/data access allows. |
| AI Guide | `AiCoach` and AI services | Starter question handoffs, data access preferences, proactive interventions | Reuse modal handoff; respect existing AI settings and quota model. |
| My Quest synthesis | `src/features/goals/MyQuestHub.tsx` | Loads check-ins, goals, habits; computes lowest/highest categories, focus category, active goal, supporting habits | Best starting point for Compass data composition. |
| Starter Quest | `StarterHabitPicker`, `starterHabitCatalog.ts` | Static catalog by Life Wheel category; quick-adds daily habit | Can become “Next Quest” modal MVP. |

### Proposed Life Wheel → life force mapping

Use a pure mapper for MVP, with labels configurable in code. Do **not** migrate stored `life_wheel_category` values in the first PR.

| Existing Life Wheel category | Proposed force | Rationale |
| --- | --- | --- |
| `health_fitness` / Body & Energy | Strength | Health, resilience, physical capacity. |
| `career_development` / Work & Growth | Growth or Direction | Work skill growth maps to Growth; work alignment maps to Direction. MVP can weight it toward Growth unless goal copy indicates purpose. |
| `finance_wealth` / Money | Wealth | Direct match. |
| `love_relations` | Connection | Direct match. |
| `family_friends` | Connection | Direct match. |
| `fun_creativity` | Fire | Joy, creativity, play, passion. |
| `spirituality_community` / Mind & Meaning | Direction | Purpose, meaning, awareness; community sub-signal may also support Connection. |
| `living_spaces` / Home | Strength or Wealth | Environment supports resilience/resources; MVP can map to Strength as “stability”. |

Recommended MVP force score approach:

1. Read latest Life Wheel scores.
2. Map each category score into one or more force buckets.
3. Average scores per force.
4. Identify:
   - strongest force
   - force needing care
   - recently rising/falling force if previous check-in exists
5. Use goals/habits to choose the next quest for the lowest or most urgent force.

### Schema recommendation

Do **not** change database schema in the first implementation PR.

Reasons:

- There is no current Ikigai persistence to preserve or migrate.
- Existing `checkins.scores`, `goals.life_wheel_category`, `habits_v2.domain_key`, `habits_v2.goal_id`, `journal_entries`, and `user_quest_habits` already provide useful inputs.
- A schema change would prematurely lock the force model before UX validation.

Potential later schema only if needed:

- `quest_compass_preferences` for chosen terminology, pinned force, or onboarding completion.
- `quest_compass_snapshots` if product needs historical force snapshots independent of Life Wheel check-ins.
- `quest_compass_quests` only if Next Quest becomes more than a habit/goal wrapper.

## UX architecture

### Phone-first modular model

The requested phone UX maps well to a single Compass entry point with layered sheets:

```text
My Quest submenu
└─ Quest Compass / Life Realm Compass
   ├─ Main Compass / Realm overview
   ├─ Region / force modal
   ├─ Check-in modal
   ├─ Next Quest modal
   └─ AI Guide modal
```

### 1. Main Compass / Realm overview

Purpose: show current life alignment at a glance and provide one clear next action.

Content:

- Hero: `Quest Compass` / `Life Realm Compass`
- Six force cards or radial compass segments: Fire, Strength, Connection, Wealth, Growth, Direction
- Current interpreted signal:
  - strongest force
  - force needing care
  - latest check-in date
  - active quest line if available
- Primary CTA:
  - If no check-in: `Refresh alignment`
  - If no active goal/habit for focus force: `Choose next quest`
  - If supporting habit exists: `Start today’s quest step`
- Secondary actions:
  - `Explore force`
  - `Ask AI Guide`
  - `Open goals`

Implementation note: extract data synthesis from `MyQuestHub` instead of duplicating fetch and score logic in `App.tsx`.

### 2. Region / force modal

Purpose: explain one life force and show why it is scored that way.

Content per force:

- Name, icon, short definition
- Current score and trend
- Contributing Life Wheel categories
- Related goals and habits
- Suggested reflection prompt
- Actions:
  - `Start a quest here`
  - `Run area check-in`
  - `Ask AI Guide about this force`

### 3. Check-in modal

Purpose: let users refresh the Compass without leaving the flow.

MVP recommendation:

- Reuse existing `LifeWheelCheckins` by routing correctly to `rituals` or by extracting a compact check-in sheet later.
- Do not build a second check-in persistence path.
- If embedded in a sheet, it must still write to `checkins` through `insertCheckin` / `updateCheckin`.

### 4. Next Quest modal

Purpose: turn an alignment signal into a real-life action.

MVP recommendation:

- Reuse `StarterHabitPicker` and `quickAddDailyHabit` for first implementation.
- Preselect the Life Wheel domain that maps from the selected force or lowest category.
- Later, evolve this into a force-aware quest picker that can choose between:
  - create habit
  - continue active goal step
  - write reflection
  - ask AI Guide

### 5. AI Guide modal

Purpose: contextual coaching around Compass state.

MVP recommendation:

- Reuse `AiCoach` modal and starter-question handoff.
- Seed force-aware prompt text, for example: ask about why the current lowest force needs care and what next quest would help.
- Respect existing AI data access preferences and quota behavior.
- Do not introduce separate AI persistence in the first slice.

## What to rename, reuse, replace, or delete

### Rename

- `My Ikigai` menu label → `Quest Compass` or `Life Realm Compass`.
- `isMyIkigaiModalOpen` → a Compass-specific state name in the first implementation PR if still held in `App.tsx`.
- `openIkigai*` handlers → `openQuestCompass*` handlers.
- `.mobile-menu-overlay__ikigai-*` classes → Compass-specific classes.
- Copy mentioning Ikigai, four circles, and purpose sweet spot → branded Compass/realm language.

### Reuse

- My Quest submenu placement and modal handoff pattern in `App.tsx`.
- Existing `MyQuestHub` data synthesis ideas: latest check-in, lowest/highest category, active goal, supporting habits.
- `LifeWheelCheckins` and `checkins` persistence for alignment refresh.
- `StarterHabitPicker` and `starterHabitCatalog` for first Next Quest MVP.
- `AiCoach` starter question pattern for AI Guide.
- Existing Quest Journey visual tokens/components from `src/features/quest-journey/QuestJourneyVisualSystem` where suitable.
- Existing goals, habits, journal, and quest habit services.

### Replace

- Static SVG Ikigai diagram with a branded six-force compass/realm visualization.
- Static modal copy with dynamic alignment summary.
- Four generic action buttons with state-aware CTAs.
- Current check-in handoff if it continues to route to `planning` instead of the actual check-in workspace.

### Delete later

Only after the new Compass is fully wired and no references remain:

- `public/assets/ikigai/ikigai-diagram.svg`
- `.mobile-menu-overlay__ikigai-*` styles
- Old Ikigai handler names/copy

Do not delete in a docs-only planning task. Do not touch 120 Island Run game logic.

## Risks and constraints

### Persistence risks

- There is no Ikigai source of truth today. If Compass starts as synthesized UI, users cannot manually save a “Compass identity” yet.
- Life force scores derived from Life Wheel categories may surprise users if the mapping is opaque.
- Adding schema too early could create migration burden if force names or scoring changes.
- Check-in notes from questionnaire answers are currently local to the flow; saved `checkins.scores` only stores scores, not per-answer notes.

Mitigation: first PR should be read-only synthesis plus existing write paths for check-ins/habits; explain force mapping in UI.

### Existing users

- Existing users may recognize `My Ikigai`; abruptly renaming could feel like a missing feature.
- Existing check-in/goals/habits data should remain untouched and interpreted through a compatibility layer.

Mitigation: use transitional copy such as “Your old purpose map is becoming a living Quest Compass.” only if product wants continuity.

### Routing risks

- Current Ikigai check-in button targets `planning`, but check-ins render under `rituals`. Fix this before relying on the handoff.
- The feature is currently mobile-modal-only. Desktop users do not have an equivalent Ikigai route.
- `App.tsx` already owns many modal states; adding more nested Compass states there will increase complexity.

Mitigation: extract a dedicated `QuestCompass` feature component with callbacks supplied by `App.tsx`.

### Demo/live gating risks

- Ikigai is currently not in `featureAvailabilityRegistry`, so it is effectively not demo-gated.
- If Quest Compass is more ambitious or AI-heavy, decide whether it should be live, admin-only, or preview-only.
- AI Guide depends on existing AI settings, data access, and local quota behavior; app-funded AI would need separate server-side quota/idempotency.

Mitigation: first implementation can ship as a live replacement using existing data and existing AI Coach modal. Add a feature flag only if product wants preview voting or admin rollout.

### Mobile layout risks

- The requested UX has multiple modals/sheets. Nested modals can create focus, scroll-lock, safe-area, and back-button issues on phones.
- The current Ikigai modal is simple and uses shared mobile-menu overlay styles; a compass visualization may overflow small screens.
- Current check-in UI has its own mobile chooser/questionnaire layout; embedding it inside another modal may be too cramped.

Mitigation: keep Main Compass as one sheet; route to existing full check-in workspace for MVP; add compact embedded check-in only after layout QA.

### Data interpretation risks

- Six forces do not map one-to-one to the eight Life Wheel categories.
- Some categories naturally contribute to multiple forces.
- Habits may have `domain_key` but no goal; goals may have `life_wheel_category` but no supporting habit.

Mitigation: create a pure mapping utility with documented defaults and tests; show contributing categories in the Force modal.

### 120 Island Run constraint

Do not edit Island Run gameplay, state, services, migrations, economy, or UI logic for this transformation. Existing game entry points can remain untouched.

## Slice plan

### Slice 1 — Documentation and decision lock

- Confirm final product name: `Quest Compass`, `Life Realm Compass`, or both with one as display title.
- Confirm six force names and descriptions.
- Confirm whether Compass is live immediately or gated as preview/demo.
- Confirm no schema change for MVP.

### Slice 2 — Extract Compass data model without UI replacement

- Add a pure force taxonomy and Life Wheel → force mapping utility.
- Add a pure selector that accepts check-ins, goals, and habits and returns a Compass view model.
- Reuse current data sources already used by `MyQuestHub`.
- Add unit/smoke coverage for mapping, empty states, lowest/highest force, and active quest selection.

### Slice 3 — Create dedicated Quest Compass component

- Move the static Ikigai modal out of inline `App.tsx` into a feature component.
- Render dynamic main Compass overview using the view model.
- Keep callbacks for AI Guide, check-ins, goals, and Next Quest in `App.tsx`.
- Keep the existing My Quest submenu entry point but rename it.

### Slice 4 — Replace Ikigai copy and asset

- Replace old Ikigai language with Compass/realm language.
- Replace the static Ikigai SVG with a six-force visual built in React/SVG/CSS or a new branded asset.
- Rename CSS classes and remove old class references.
- Keep the old SVG file until a later cleanup commit verifies no references remain.

### Slice 5 — Wire Region / force modal

- Add force selection from the main overview.
- Show score, trend, contributing Life Wheel categories, active goals, supporting habits, and suggested action.
- Add actions for Start Quest, Refresh Alignment, and Ask AI Guide.

### Slice 6 — Wire Next Quest modal using existing habit flow

- Reuse `StarterHabitPicker` as the first Next Quest flow.
- Preselect the best Life Wheel domain from selected force or current lowest category.
- On creation, close the Compass/Next Quest sheet and dispatch existing habit-created refresh behavior.

### Slice 7 — Improve check-in handoff

- Fix or clarify current routing so `Refresh alignment` opens the actual check-in surface.
- Preserve `entryOrigin='my-quest'`-style back navigation if launched from Compass.
- Defer embedded compact check-in until after mobile QA.

### Slice 8 — AI Guide contextual prompts

- Replace generic Ikigai AI prompt with force-aware Compass prompt.
- Include selected force, latest check-in summary, active goal, and suggested habit in the starter question when available.
- Ensure existing AI data access preferences remain the control point.

### Slice 9 — Cleanup and compatibility

- Remove old Ikigai handler names, class names, and static asset after references are gone.
- Update docs/design references if implementation changes the final naming.
- Confirm no Island Run files were modified.

### Slice 10 — Optional persistence after product validation

Only consider schema if MVP proves users need saved Compass-specific state:

- pinned force
- custom force notes
- Compass snapshot history
- selected next quest independent of habit/goal

## Testing plan

### Static/code checks

- Run `npm run build` after implementation PRs.
- If dependencies are absent, run `npm ci` first.
- Run any existing targeted smoke scripts relevant to touched areas.

### Unit/pure utility coverage

Add coverage for the new pure Compass utilities:

- Empty data returns no-score state and `Refresh alignment` CTA.
- Latest check-in maps Life Wheel categories into six force scores.
- Previous check-in produces trend direction.
- Lowest force picks a matching active goal when one exists.
- Supporting habits are found by `goal_id` first and `domain_key` second.
- Multi-category forces average or weight scores predictably.

### Component/manual QA

Phone viewport:

- Open My Quest submenu.
- Open Quest Compass.
- Verify modal fits small screens, scrolls internally, and closes correctly.
- Open a force modal and return to overview.
- Open Next Quest and create a starter habit.
- Open Refresh Alignment and verify it reaches the check-in flow.
- Open AI Guide and verify starter prompt is force-aware.

Desktop viewport:

- Verify renamed menu/copy does not create a dead desktop-only feature if no desktop entry exists.
- Verify existing workspace nav remains unchanged unless intentionally updated.

Regression QA:

- Existing My Quest hub still loads check-ins/goals/habits.
- Existing Life Wheel check-ins still save/update `checkins` and award XP where applicable.
- Existing Starter Quest still creates `habits_v2` rows.
- Existing AI Coach modal still opens from other entry points.
- No 120 Island Run files or behavior changed.

### Accessibility QA

- Modal has correct `role="dialog"`, `aria-modal`, title/label, and close control.
- Focus does not get trapped behind nested sheets.
- Buttons have clear labels beyond icon-only visuals.
- Compass colors are not the only indication of force status.

## Open questions

1. Final display name: **Quest Compass**, **Life Realm Compass**, or both?
2. Should “Ikigai” appear anywhere as transitional copy, or be fully removed from user-facing UI?
3. Should the first release be live for all users or demo/preview-gated?
4. Should desktop get a Compass entry point in the first implementation, or is phone-only acceptable?
5. Should forces be exactly the six proposed, or should Home/Environment remain separate from Strength/Wealth?
6. Should a force score be a simple average, weighted average, or AI/interpreted score?
7. Should journal content influence Compass scores in MVP, or only appear as optional context for AI Guide?
8. Should Next Quest create only habits at first, or can it also choose an existing goal step?
9. Should check-ins remain Life Wheel-branded internally while Compass is the outer interpretation layer?
10. Is a new feature flag desired before exposing AI Guide and dynamic Compass copy?

## Recommended first implementation PR

Recommended scope: **replace the static My Ikigai modal with a non-persistent Quest Compass overview powered by existing check-ins/goals/habits.**

Include:

- Rename mobile menu label from `My Ikigai` to `Quest Compass`.
- Extract a small dedicated `QuestCompass` component.
- Add a pure Compass force mapping/view-model utility.
- Use existing `fetchCheckinsForUser`, `fetchGoals`, and `listHabitsV2` data, mirroring `MyQuestHub` behavior.
- Render six force cards with empty/loading/error states.
- Reuse existing handoffs for AI Coach, Goals, Starter Quest, and check-ins.
- Fix the check-in handoff to target the actual Life Wheel check-in workspace.
- Do not add or change database schema.
- Do not touch 120 Island Run game logic.
- Keep old Ikigai SVG until the replacement visual is fully wired and verified unused.

Do not include in first PR:

- New Supabase tables.
- Embedded check-in questionnaire inside the Compass modal.
- AI-generated scoring.
- Journal-content analysis.
- Island Run changes.
- Full desktop route redesign.
