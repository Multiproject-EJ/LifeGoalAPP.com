# Today / My Habits “Todo” Button Investigation

Date: 2026-05-26
Scope: Investigation only (no runtime code changes).

## Executive summary

The Today / My Habits UI is currently driven by `DailyHabitTracker` rendering in `src/features/habits/DailyHabitTracker.tsx`, with styling mostly in `src/index.css`.

A safe Slice 1 can be implemented without touching Island Run gameplay state by:
- Renaming `+ Starter quest` label to `+ My quest`.
- Adding a second header pill button (`Todo`) beside it.
- Adding a small local “today todo” model persisted in localStorage (or existing actions service reuse; recommendation below).
- Rendering todos at the top of the My Habits list using a dedicated card variant (blue glow/border).
- Adding a dedicated “Add today todo” modal and a todo-expanded panel with only todo-specific actions.

The largest integration risks are:
- Avoiding accidental reuse of full habit-detail controls for todo rows.
- Choosing storage that does not entangle existing Actions/Projects or habits schema unexpectedly.
- Wiring AI coach launch with starter prompt safely through existing app-level modal controls.

---

## 1) Where Today compact / My Habits header and “+ Starter quest” are rendered

### Primary render location
- `src/features/habits/DailyHabitTracker.tsx`
  - Header title block contains `My Habits` and the `+ Starter quest` button.
  - Current button is gated by `onOpenStarterQuest` and uses `habit-checklist-card__starter-launcher` class.

Relevant code landmarks:
- `My Habits` header and action buttons around lines ~6275-6298.
- `+ Starter quest` button text appears in two places:
  1) Header action row (desktop/regular context).
  2) Compact starter quest launcher section further down (~8201+).

### Implication for request
- Rename should be applied to both visible UI entry points for consistency.
- New `Todo` button belongs in the same header action container (`habit-checklist-card__title-actions`) to preserve current layout behavior.

---

## 2) Existing habit card rendering + Quest Habit yellow treatment

### Card rendering path
- Habit list container: `ul.habit-checklist`.
- Items are rendered from `visibleHabits.map(...)` in `DailyHabitTracker.tsx`.
- Per-item classes include:
  - `habit-checklist__item`
  - conditionally `habit-checklist__item--quest` when selected as Quest Habit.

### Quest visual treatment source
- Class application in TSX: `isQuestHabit ? 'habit-checklist__item--quest' : ''`.
- Style definitions are in `src/index.css`:
  - `.habit-checklist__item--quest`
  - `.habit-checklist__quest-badge`
  - `.habit-checklist__quest-btn--active`
- This is the closest precedent for your requested todo blue-glow/border variant.

### Implication
- Todo rows should use a dedicated modifier class (e.g., `habit-checklist__item--todo`) with blue border/glow mirroring the quest pattern, while keeping row anatomy similar for visual consistency.

---

## 3) Existing modal patterns for adding habits/tasks

### In habits area
- `DailyHabitTracker.tsx` contains multiple modal patterns (overlay + content + close button + portal usage).
- Reusable structural pattern seen in:
  - `habit-edit-modal-overlay` / `habit-edit-modal-content` blocks.
  - “Today’s Offer”, “Intentions”, “Today Wins”, etc.
- Habit creation itself is mostly driven by `HabitsModule.tsx` wizard flows, which are heavier than needed for simple todo creation.

### In actions/tasks area
- `src/features/actions/ActionsTab.tsx` has “Quick add action” and action detail modal patterns.
- This model is “3-day rolling todo list”, not explicitly “today-only”.

### Implication
- For requested UX (“Add today todo”), the lightweight path is:
  - Implement a focused modal inside `DailyHabitTracker` patterned after existing habit modal overlay styles.
  - Avoid forcing users through full habit creation or Actions tab redirection for Slice 1.

---

## 4) Existing timer / focus / pomodoro entry points

### Confirmed entry points
- `ActionsTab.tsx` receives `onNavigateToTimer` and launches timer with context payload (`sourceType`, `sourceId`, `sourceName`).
- App-level navigation wiring exists (in `App.tsx`) for timer-related flows.

### Implication
- Todo expanded action “Quick start 25 min focus timer / pomodoro” can safely call existing timer navigation callback with todo context.
- No need to reintroduce legacy `pomodoro_sprint` mini-game; current timer route is the right integration.

---

## 5) Existing AI coach/chat entry points + prefill feasibility

### Confirmed entry points
- `App.tsx` owns `showAiCoachModal` and `aiCoachStarterQuestion` state.
- `AiCoach` is opened with an optional starter question.
- Multiple child surfaces already call callbacks like `onOpenAiCoach(starterQuestion)` / `onNavigateToAiCoach(starterQuestion)`.

### Implication
- Todo action “help me figure out next step” can safely route through existing callback plumbing by passing a crafted starter prompt.
- Recommended prompt template (runtime-generated):
  - Include task title + optional notes.
  - Ask for practical, creative, doable next steps.
  - Ask for an A→Z “what done means” breakdown.

No architectural blocker found for prefilled launch.

---

## 6) Task Tower source + safe query for up to 3 undone tasks

### What exists
- Task Tower is a gamification minigame in `src/features/gamification/games/task-tower/TaskTower.tsx`.
- User task/todo-like data source already exists in Actions domain via `useActions` / Actions list (`Action` items with `completed` boolean).
- Actions tab explicitly frames data as todo list (“Your 3-day rolling todo list”).

### Recommendation for “Task Tower suggestions” (optional section)
- Use existing Actions source as the safe fallback source for “up to 3 undone tasks” rather than inventing Task Tower-specific storage.
- Label copy in UI can still be “Task Tower suggestions” while data is derived from undone actionable items already available.

### Caveat
- If product strictly requires “tasks currently active in Task Tower board state”, that source is less obvious from current scan and would require deeper game-state analysis. For Slice 1 investigation objective, using existing undone Actions is the safest non-invasive path.

---

## 7) Existing “today task/todo” model status

### Findings
- No clear dedicated “Today Todo” model in habits module was found.
- Existing candidates:
  1) Actions model (`Action`) in ActionsTab/hooks/services.
  2) Project tasks model (`projects` domain with status including `todo`).
  3) Intention/todo text captured in habits intentions journal modal (not structured todo rows for checklist display).

### Storage recommendation

#### Slice 1 recommendation (lowest-risk)
Create a **lightweight local today-todo model** scoped to Today/Habits only:
- Persist in localStorage using userId + date key.
- Fields: `id`, `title`, `notes?`, `dateKey`, `completed`, `createdAt`, `updatedAt`.
- Render only in Today/My Habits list top section.

Why:
- Fast to ship, reversible, minimal coupling.
- Avoids schema migrations and cross-feature side effects.
- Satisfies “do not create new task tower storage logic”.

#### Later slice option
Unify with Actions domain once UX/usage is validated:
- Could map today todos into Actions with explicit tag/source.
- Requires careful dedupe, visibility, and lifecycle rules.

---

## 8) Recommended implementation plan

### Slice 1 (requested MVP behavior)
1. **Header controls**
   - Rename “+ Starter quest” → “+ My quest”.
   - Add “Todo” button beside it with distinct style token/class.
2. **Todo modal**
   - Add “Add today todo” modal (title required, notes optional).
   - Save locally (today-keyed).
3. **Todo list rendering in My Habits**
   - Insert todos at top before habit rows.
   - Reuse row anatomy but apply `--todo` blue-glow variant.
4. **Todo expanded panel (todo-only controls)**
   - Show notes/details.
   - Show “Start 25m focus” action -> existing timer route.
   - Show “Help me figure out next step” -> existing AI coach open callback with prefilled prompt.
   - Exclude habit-only controls (life wheel, goal, skip/pause/deactivate, done-ish grading etc.).
5. **Optional Task Tower suggestions section in modal**
   - Collapsed by default behind toggle.
   - On expand: query up to 3 undone items from safe existing source (recommended: undone Actions), read-only suggestions.

### Later slices
- Sync/merge today todos with Actions or Projects domain.
- Add recurrence/rollover rules.
- Add analytics events.
- Add richer AI handoff (structured function-like prompt payload).

---

## 9) Risks

1. **UI complexity risk**
   - `DailyHabitTracker.tsx` is large and densely stateful; adding another row type can increase fragility.
2. **Behavioral leakage risk**
   - If todo rows share too much habit row code, habit-specific controls may accidentally appear.
3. **Storage divergence risk**
   - Local today-todos can drift from Actions unless later unification is planned.
4. **Prompt quality risk**
   - AI handoff needs concise but specific starter prompt to avoid generic responses.
5. **Date-bound behavior risk**
   - “Today” keying must be timezone-safe and consistent with app’s existing date handling helpers.

---

## 10) Slice 1 vs later slices

### Include in Slice 1
- Button rename and new Todo button in My Habits header.
- Add today-todo modal (title + optional notes).
- Local today-only storage.
- Todo cards at top with blue border/glow.
- Todo-expanded panel with only:
  - details/notes
  - 25m focus timer shortcut
  - AI next-step launch
- Optional collapsed Task Tower suggestions (read-only up to 3 undone items from safe existing source).

### Defer to later slices
- Cross-device sync backend persistence.
- Full Actions/Projects integration/migration.
- Advanced todo lifecycle (carryover, snooze, recurring).
- Deep Task Tower game-state-coupled suggestions.

---

## 11) Exact proposed files to change for Slice 1

> Proposal only — no code changed in this investigation.

1. `src/features/habits/DailyHabitTracker.tsx`
   - Header button rename + add Todo button.
   - Add todo modal state/render/save handlers.
   - Add todo list render path at top of checklist.
   - Add todo-expanded panel actions.
   - Wire timer and AI coach callbacks.
2. `src/index.css`
   - Add styling for:
     - new Todo header pill button
     - todo item modifier class (blue glow/border)
     - todo detail panel/action controls
3. `src/features/habits/*` (new helper/service file, recommended)
   - e.g., `src/features/habits/todayTodos.ts` (or `src/services/todayTodos.ts`)
   - localStorage model helpers + date key helpers.
4. (Optional for safer reuse) `src/App.tsx`
   - only if additional callback plumbing is needed to ensure `onOpenAiCoach` and timer launch are accessible where todo rows are rendered.

---

## 12) Confirmation

- Investigation-only task completed.
- No application runtime code was modified.
- Only this investigation document was added.

---

## Follow-up

A dedicated Supabase storage follow-up investigation is now available at `docs/investigations/today-todo-supabase-storage-investigation.md` (2026-05-26).
