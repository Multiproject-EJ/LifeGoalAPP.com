# GOAL_STRATEGY_ENGINE_DEV_PLAN.md

> **Purpose**: A living, agent-optimised development plan for the Goal Strategy Engine — a system that lets users choose *how* they pursue a goal, not just *what* the goal is. Any AI agent or human engineer can pick up a single slice, execute it safely, and hand off with full context.
> **Status**: 🟡 Phase 1 complete — ready for Phase 2 execution
> **Owner**: Founder + AI collaborators
> **Last updated**: 2026-03-09
> **Linked from**: [`DEV_PLAN.md`](./DEV_PLAN.md) → Linked Feature Plans

---

## 0) How to Use This Document (Mandatory Read)

1. **Read the current status snapshot** (Section 2) before touching any code.
2. **Pick one slice** from the current phase. Do not work on two slices in parallel unless explicitly noted.
3. **Follow the AI Operating Contract per slice**:
   - 🔍 Scan — read referenced files before writing anything
   - 📋 Plan — confirm the slice steps match what you see in the codebase
   - 🛠 Implement — make the smallest change that completes the slice
   - ✅ Verify — run the verification checklist at the bottom of the slice
   - 📝 Document — update the Progress Log (Section 11) and status table (Section 2)
   - ⏸ Pause — stop and surface any blockers or deviations before continuing
4. **Never modify** existing goal CRUD behaviour, Supabase schema, or the `goalHealth.ts` / `planQuality.ts` engines without a dedicated slice that explicitly says so.
5. **Demo mode parity**: every new feature must work in demo mode (no Supabase configured). Use the `canUseSupabaseData()` guard and add demo fallbacks.
6. **TypeScript strict**: no `any` types in new files. All new interfaces must be exported from the file they are defined in.

---

## 1) North Star

Transform LifeGoalApp from a goal *tracker* into a **Goal Strategy Engine** — a system that understands that different people reach goals through fundamentally different psychological approaches, and adapts its UI, XP mechanics, and AI coaching accordingly.

### The One-Liner
> "Tell us your goal. We'll match you with the strategy most likely to make *you* succeed."

### Success Metrics (when this is complete)
- Users can select a strategy type when creating or editing a goal
- The "Goal Doctor" card diagnoses stalled goals and prescribes a strategy switch
- At least 3 strategy modes render a meaningfully different card UI
- Strategy selection is connected to the AI Coach (can ask coach about diagnosis)
- XP multipliers are applied per strategy type
- Zero regressions in existing goal CRUD, demo mode, or offline sync

---

## 2) Current Status Snapshot

| Phase | Slice | Description | Status |
|---|---|---|---|
| Phase 1 | 1.1 | `goalStrategy.ts` — type definitions + meta | ✅ Complete |
| Phase 1 | 1.2 | Supabase migration — add `goal_strategy_type` column | ✅ Complete |
| Phase 1 | 1.3 | Wire `goal_strategy_type` into services + types | ✅ Complete |
| Phase 1 | 1.4 | Strategy Picker UI component | ✅ Complete |
| Phase 1 | 1.5 | Add strategy picker as optional step in `LifeGoalInputDialog` | ✅ Complete |
| Phase 1 | 1.6 | Display strategy badge on goal card | ✅ Complete |
| Phase 2 | 2.1 | `goalDoctor.ts` — diagnosis + prescription engine | 🔲 Not started |
| Phase 2 | 2.2 | Goal Doctor card UI on `GoalWorkspace` | 🔲 Not started |
| Phase 2 | 2.3 | "Switch Strategy" action on goal card | 🔲 Not started |
| Phase 2 | 2.4 | Goal Doctor → AI Coach bridge | 🔲 Not started |
| Phase 3 | 3.1 | Micro Wins strategy mode card view | 🔲 Not started |
| Phase 3 | 3.2 | Experiment Lab strategy mode card view | 🔲 Not started |
| Phase 3 | 3.3 | Identity Builder strategy mode card view | 🔲 Not started |
| Phase 4 | 4.1 | Hero Quest strategy mode (5-stage progress) | 🔲 Not started |
| Phase 4 | 4.2 | Anti-Goal Shield strategy mode | 🔲 Not started |
| Phase 4 | 4.3 | Chaos Dice strategy mode + challenge pool | 🔲 Not started |
| Phase 5 | 5.1 | Archetype → Strategy auto-suggestion | 🔲 Not started |
| Phase 5 | 5.2 | Strategy XP multipliers wired into `awardXP` | 🔲 Not started |
| Phase 5 | 5.3 | Strategy analytics / telemetry events | 🔲 Not started |

---

## 3) Invariants (Must Never Break)

These rules apply to every slice in every phase:

1. **Existing goal CRUD is untouched** — `fetchGoals`, `insertGoal`, `updateGoal`, `deleteGoal` in `src/services/goals.ts` must not change their signatures or return shapes.
2. **Offline-first parity** — `goalsRepo.ts` and `localDb.ts` offline sync must continue to work. If `goal_strategy_type` is added to the DB, it must be nullable and gracefully handled when absent.
3. **Demo mode works** — All new UI must render correctly when `canUseSupabaseData()` returns false. Add demo data where needed.
4. **`goalHealth.ts` and `planQuality.ts` are read-only** — These engines are consumed, not modified, by the strategy system (except a dedicated slice that explicitly extends them).
5. **No new required fields** on goal creation — `goal_strategy_type` defaults to `'standard'` everywhere; users can always skip strategy selection.
6. **TypeScript build passes** — Every slice must result in a clean `npm run build` with zero type errors.
7. **Mobile-first** — All new components must be usable on a 375px viewport. No horizontal scroll introduced.

---

## 4) Architecture Overview

### Where This Lives in the Codebase

```
src/
├── features/goals/
│   ├── goalStrategy.ts          ← NEW (Phase 1.1) — strategy type definitions + meta
│   ├── goalDoctor.ts            ← NEW (Phase 2.1) — diagnosis + prescription logic
│   ├── GoalWorkspace.tsx        ← MODIFIED (Phase 1.6, 2.2, 2.3) — strategy badge + doctor card
│   ├── goalHealth.ts            ← READ ONLY — consumed by goalDoctor.ts
│   └── planQuality.ts           ← READ ONLY — consumed by goalDoctor.ts
│
├── components/
│   ├── StrategyPicker.tsx       ← NEW (Phase 1.4) — strategy selection UI
│   ├── GoalDoctorCard.tsx       ← NEW (Phase 2.2) — diagnosis display card
│   ├── strategy-modes/
│   │   ├── MicroWinsCard.tsx    ← NEW (Phase 3.1)
│   │   ├── ExperimentLabCard.tsx← NEW (Phase 3.2)
│   │   ├── IdentityBuilderCard.tsx ← NEW (Phase 3.3)
│   │   ├── HeroQuestCard.tsx    ← NEW (Phase 4.1)
│   │   ├── AntiGoalCard.tsx     ← NEW (Phase 4.2)
│   │   └── ChaosDiceCard.tsx    ← NEW (Phase 4.3)
│   └── LifeGoalInputDialog.tsx  ← MODIFIED (Phase 1.5) — strategy picker step
│
├── services/
│   └── goals.ts                 ← MODIFIED (Phase 1.3) — pass strategy_type in payloads
│
└── supabase/migrations/
    └── XXXX_goal_strategy_type.sql ← NEW (Phase 1.2)
```

### Data Flow

```
User creates goal
      ↓
StrategyPicker (optional step in LifeGoalInputDialog)
      ↓
goal_strategy_type stored on GoalRow (Supabase + IndexedDB)
      ↓
GoalWorkspace renders strategy badge + strategy-specific card mode
      ↓
GoalDoctorCard reads goalHealth signals → diagnoseAndPrescribe()
      ↓
"Switch Strategy" → re-opens StrategyPicker for existing goal
      ↓
AI Coach receives strategy context in goal summary
```

### The 12 Strategy Types

| Type | Icon | Tagline | XP Multiplier | Best For |
|---|---|---|---|---|
| `standard` | 🎯 | Define → Track → Achieve | 1.0× | Well-defined goals with clear outcomes |
| `micro` | ⚡ | Small steps, big momentum | 1.2× | Breaking procrastination, habit building |
| `anti_goal` | 🛡️ | Protect what matters | 1.0× | Health, finances, relationships |
| `process` | ⚙️ | Run the engine, trust the goal | 1.1× | Long-term goals with uncertain timelines |
| `experiment` | 🧪 | Test. Learn. Adapt. | 1.3× | New habits, lifestyle changes, pivots |
| `identity` | 🪞 | Become who you want to be | 1.2× | Deep personal transformation |
| `friction_removal` | 🔧 | Remove the block, not the goal | 1.1× | Goals that keep failing despite motivation |
| `hero_quest` | ⚔️ | Every goal is a story | 1.5× | Big life goals you want to feel epic |
| `reverse` | 🔄 | Start from success | 1.1× | Project goals, launches, creative work |
| `chaos` | 🎲 | Spin. Act. Grow. | 1.4× | Fun, exploration, breaking routine |
| `energy_based` | 🔋 | Match tasks to energy | 1.0× | Creative work, variable energy people |
| `constraint` | 🔒 | Less is more | 1.3× | Focus, digital detox, budget discipline |

### Archetype → Strategy Affinity (Phase 5.1)

| Dominant Suit | Affinity Strategies | Secondary |
|---|---|---|
| ⚔️ Power (Commander, Champion, Strategist, Challenger) | `hero_quest`, `reverse`, `constraint` | `process` |
| ❤️ Heart (Caregiver, Mentor, Peacemaker, Altruist) | `identity`, `anti_goal`, `micro` | `process` |
| 🧠 Mind (Sage, Analyst, Architect, Inventor) | `experiment`, `process`, `friction_removal` | `reverse` |
| 🌿 Spirit (Explorer, Creator, Rebel, Visionary) | `micro`, `chaos`, `energy_based` | `identity` |

---

## 5) Phase 1 — Foundation (Strategy Type on Goals)

**Goal**: Add `goal_strategy_type` to goals, create the type system, add optional picker to goal creation. No UI mode changes yet — just store and display.

**Estimated complexity**: Low. No behaviour changes to existing flows.

---

### Slice 1.1 — `goalStrategy.ts` — Core Type Definitions

**Files to create**: `src/features/goals/goalStrategy.ts`
**Files to read first**: `src/features/goals/goalStatus.ts` (follow its pattern exactly)

#### Steps

1. Create `src/features/goals/goalStrategy.ts` with the following exports:
   - `GoalStrategyType` union type (12 values listed in Section 4)
   - `GoalStrategyMeta` interface: `{ label: string; icon: string; tagline: string; description: string; bestFor: string; xpMultiplier: number; }`
   - `GOAL_STRATEGY_META: Record<GoalStrategyType, GoalStrategyMeta>` — full definitions for all 12 types
   - `GOAL_STRATEGY_OPTIONS` — array of `{ value: GoalStrategyType; label: string; icon: string; tagline: string }` for dropdowns/pickers
   - `DEFAULT_GOAL_STRATEGY: GoalStrategyType = 'standard'`
   - `normalizeGoalStrategy(value: string | null | undefined): GoalStrategyType` — returns `DEFAULT_GOAL_STRATEGY` for unknown/null values
   - `getStrategyXpMultiplier(strategyType: string | null | undefined): number` — returns the XP multiplier (1.0 for unknown)

2. Export everything from `src/features/goals/index.ts` (add `export * from './goalStrategy';`)

#### Verification Checklist
- [ ] `npm run build` passes with zero TypeScript errors
- [ ] All 12 strategy types are present in `GOAL_STRATEGY_META`
- [ ] `normalizeGoalStrategy(null)` returns `'standard'`
- [ ] `normalizeGoalStrategy('unknown_value')` returns `'standard'`
- [ ] `getStrategyXpMultiplier(null)` returns `1.0`
- [ ] File is exported from `index.ts`

---

### Slice 1.2 — Database Migration: `goal_strategy_type` Column

**Files to create**: `supabase/migrations/XXXX_goal_strategy_type.sql`
(Use the next sequential migration number — check the highest existing number in `supabase/migrations/` and increment by 1)

**Files to read first**: Any recent migration in `supabase/migrations/` to confirm column naming conventions; `supabase/migrations/0101_vision_core.sql` as a style reference.

#### Steps

1. Determine the next migration number (scan `supabase/migrations/` for highest number).
2. Create the migration file with:
   ```sql
   -- Add goal_strategy_type column to goals table
   -- Nullable with default 'standard' for backwards compatibility
   ALTER TABLE goals
     ADD COLUMN IF NOT EXISTS goal_strategy_type text NOT NULL DEFAULT 'standard';

   -- Optional: add a check constraint for valid strategy types
   ALTER TABLE goals
     ADD CONSTRAINT IF NOT EXISTS goals_strategy_type_check
     CHECK (goal_strategy_type IN (
       'standard', 'micro', 'anti_goal', 'process', 'experiment',
       'identity', 'friction_removal', 'hero_quest', 'reverse',
       'chaos', 'energy_based', 'constraint'
     ));

   COMMENT ON COLUMN goals.goal_strategy_type IS
     'The psychological strategy the user has chosen to pursue this goal. Defaults to standard.';
   ```

3. Add migration to `docs/RELEASE_CHECKLIST.md` in the correct section (goals/strategy area, near `0130`-range migrations).

#### Verification Checklist
- [ ] Migration file created with correct sequential number
- [ ] Migration uses `IF NOT EXISTS` / `IF NOT EXISTS` guards (idempotent where possible)
- [ ] Column defaults to `'standard'` — existing goals are unaffected
- [ ] `RELEASE_CHECKLIST.md` updated with migration entry

---

### Slice 1.3 — Wire `goal_strategy_type` into Services and Types

**Files to modify**:
- `src/services/goals.ts` — include `goal_strategy_type` in insert/update payloads and return types
- `src/data/goalsRepo.ts` — add `goal_strategy_type` to `GoalRecord` interface and sync logic
- `src/data/localDb.ts` — add `goal_strategy_type` to the IndexedDB schema value type

**Files to read first**: Full content of all three files above before making any changes.

#### Steps

1. **`src/data/localDb.ts`**: Add `goal_strategy_type?: string | null;` to the `goals` value type in `LifeGoalAppDB`. This is optional/nullable for backwards compatibility with existing IndexedDB records.

2. **`src/data/goalsRepo.ts`**:
   - Add `goal_strategy_type?: string | null;` to `GoalRecord` interface
   - Add `goal_strategy_type?: string;` to `CreateGoalInput` interface
   - In `createGoalOfflineFirst`: pass `goal_strategy_type: input.goal_strategy_type ?? 'standard'` to the local record
   - In `syncGoalsWithSupabase` insert path: include `goal_strategy_type` in the Supabase insert payload
   - In `syncGoalsWithSupabase` update path: include `goal_strategy_type` in the Supabase update payload
   - In `refreshGoalsFromSupabase`: map `g.goal_strategy_type` when constructing local records

3. **`src/services/goals.ts`**: The `GoalRow` and `GoalInsert` / `GoalUpdate` types are derived from `Database['public']['Tables']['goals']['Row']`. Once the migration runs, the generated types will include `goal_strategy_type`. No manual change needed to the type — only verify that `insertGoal` and `updateGoal` accept it through the payload. Add a note comment if needed.

#### Verification Checklist
- [ ] `npm run build` passes with zero TypeScript errors
- [ ] `GoalRecord` interface includes `goal_strategy_type`
- [ ] `createGoalOfflineFirst` passes `goal_strategy_type` through
- [ ] `syncGoalsWithSupabase` includes `goal_strategy_type` in both insert and update paths
- [ ] `refreshGoalsFromSupabase` maps `goal_strategy_type` from Supabase response
- [ ] No breaking changes to `insertGoal` or `updateGoal` signatures

---

### Slice 1.4 — `StrategyPicker` Component

**Files to create**: `src/components/StrategyPicker.tsx`
**Files to read first**: `src/features/goals/goalStrategy.ts` (just created), `src/features/goals/goalStatus.ts` (style reference), `src/components/LifeGoalInputDialog.tsx` (context for where this will be embedded)

#### Steps

1. Create `src/components/StrategyPicker.tsx`:

   ```tsx
   // Props:
   type StrategyPickerProps = {
     value: GoalStrategyType;
     onChange: (strategy: GoalStrategyType) => void;
     suggestedStrategy?: GoalStrategyType | null; // From archetype (Phase 5.1, optional for now)
     compact?: boolean; // True = show only icon + label; False = show full card with description
   };
   ```

   - **Default (non-compact) mode**: renders a scrollable grid of strategy cards. Each card shows: icon (large), label, tagline, XP multiplier badge, and `bestFor` text. Selected card has a highlighted border/background. Tapping selects it.
   - **Compact mode**: renders a single-row select/dropdown showing icon + label. Used for edit forms.
   - Show a "Suggested" badge on the `suggestedStrategy` card if provided (leave the prop wired but unused until Phase 5.1).
   - Include a "Skip — I'll decide later" option that sets value to `'standard'`.
   - The component must be fully accessible: `role="radiogroup"`, each card is `role="radio"` with `aria-checked`.

2. Add basic CSS to `src/styles/strategy-picker.css` (or inline within the component using CSS modules/variables from `themes.css`). Keep it minimal — use existing CSS variables.

#### Verification Checklist
- [ ] `npm run build` passes
- [ ] Component renders all 12 strategies without horizontal overflow on 375px
- [ ] Selected strategy is visually distinguished
- [ ] `onChange` fires on selection
- [ ] `aria-checked` updates correctly
- [ ] "Skip" option sets value to `'standard'`
- [ ] Compact mode renders as a simple selector

---

### Slice 1.5 — Add Strategy Picker to `LifeGoalInputDialog`

**Files to modify**: `src/components/LifeGoalInputDialog.tsx`
**Files to read first**: Full `LifeGoalInputDialog.tsx` — understand the tab/step structure before touching it. Note the `coachingMode` prop and existing form state.

#### Steps

1. Add `strategyType: GoalStrategyType` to the `LifeGoalFormData` type, defaulting to `'standard'`.

2. Add `strategyType` to the initial `formData` state: `strategyType: DEFAULT_GOAL_STRATEGY`.

3. Add the `StrategyPicker` as an **optional collapsible section** in the form — not a new mandatory step. Place it after the "Life Area" field and before "Status". Label it: **"How will you pursue this goal? (optional)"** with a small expand/collapse toggle.

   **Why collapsible**: We do not want to add friction to goal creation for users who don't care about strategy yet. The picker should feel like an invitation, not a requirement.

4. When collapsed, show the current strategy as a small badge (`icon + label`). When expanded, show the full `StrategyPicker` component.

5. Pass `formData.strategyType` through `onSave` to the parent handlers in `GoalWorkspace.tsx` and `LifeGoalsSection.tsx` — add `strategy_type: formData.strategyType` to the goal payload object in both `handleSaveLifeGoal` callbacks.

6. Update the `LifeGoalFormData` type export if it is exported (check — it may be internal only).

#### Verification Checklist
- [ ] `npm run build` passes
- [ ] Strategy picker is collapsed by default — existing goal creation flow unchanged
- [ ] Expanding the picker shows all 12 strategies
- [ ] Selected strategy is included in the save payload
- [ ] Demo mode: strategy saves to demo data correctly
- [ ] Supabase mode: `goal_strategy_type` is written to the `goals` table
- [ ] No visual regression on existing form fields (test on 375px)

---

### Slice 1.6 — Strategy Badge on Goal Card

**Files to modify**: `src/features/goals/GoalWorkspace.tsx`
**Files to read first**: The goal card render section of `GoalWorkspace.tsx` (search for `goal-card__header`).

#### Steps

1. Import `GOAL_STRATEGY_META`, `normalizeGoalStrategy`, `GoalStrategyType` from `goalStrategy.ts`.

2. In the goal card view (non-editing state), add a small **strategy badge** in the card header area, next to or below the status badge:

   ```tsx
   {/* Strategy badge — only show if not 'standard' */}
   {goal.goal_strategy_type && goal.goal_strategy_type !== 'standard' && (() => {
     const meta = GOAL_STRATEGY_META[normalizeGoalStrategy(goal.goal_strategy_type)];
     return (
       <span className="goal-card__strategy-badge" title={meta.description}>
         {meta.icon} {meta.label}
       </span>
     );
   })()}
   ```

3. Add `.goal-card__strategy-badge` CSS — small pill, subdued colour, uses existing `--color-surface-glass` and `--color-text-secondary` variables.

4. In the edit form (inline edit), add a compact `StrategyPicker` (compact mode) as a field labelled "Approach".

5. Include `goal_strategy_type` in the `handleEditSubmit` payload.

#### Verification Checklist
- [ ] `npm run build` passes
- [ ] Badge does NOT appear on goals with `strategy_type = 'standard'` (clean default state)
- [ ] Badge appears correctly for all non-standard strategy types
- [ ] Badge tooltip shows strategy description
- [ ] Edit form includes compact strategy selector
- [ ] Saving edit updates `goal_strategy_type` in Supabase

---

## 6) Phase 2 — Goal Doctor (Diagnosis + Strategy Prescription)

**Goal**: Surface the existing `goalHealth.ts` signals as a user-facing "Goal Doctor" card. Add a diagnosis-to-prescription mapping and a "Switch Strategy" action.

**Estimated complexity**: Low-Medium. Logic is mostly already built — this phase is primarily UI wiring.

---

### Slice 2.1 — `goalDoctor.ts` — Diagnosis Engine

**Files to create**: `src/features/goals/goalDoctor.ts`
**Files to read first**: `src/features/goals/goalHealth.ts` (full), `src/features/goals/executionTypes.ts` (full), `src/features/goals/goalStrategy.ts`

#### Steps

1. Create `src/features/goals/goalDoctor.ts` with:

   ```typescript
   export type GoalDiagnosis = {
     diagnosisTitle: string;          // Short human-readable problem name
     diagnosisDetail: string;         // 1–2 sentence explanation
     prescribedStrategy: GoalStrategyType;
     prescriptionReason: string;      // Why this strategy fits this diagnosis
     urgency: 'low' | 'medium' | 'high';
     oneTapMessage: string;           // What to say to AI coach (pre-filled prompt)
   };
   ```

2. Implement `diagnoseAndPrescribe(healthResult: GoalHealthResult): GoalDiagnosis` using this mapping:

   | `primaryRiskReason` | `healthState` | Diagnosis Title | Prescribed Strategy | Urgency |
   |---|---|---|---|---|
   | `activation_risk` | any | "Hasn't started yet" | `micro` | high |
   | `under_defined_goal` | `at_risk` | "Goal is too vague" | `experiment` | high |
   | `under_defined_goal` | `caution` | "Needs more clarity" | `process` | medium |
   | `strategy_mismatch` | any | "Wrong approach" | `friction_removal` | medium |
   | `overload_or_low_priority` | any | "Too much at once" | `constraint` | medium |
   | `none` | `on_track` | "Looking healthy" | `standard` | low |
   | `none` | `caution` | "Keep an eye on this" | `process` | low |

3. Implement `buildGoalDoctorContext(goal: GoalRow, healthResult: GoalHealthResult): string` — returns a pre-filled prompt string for the AI Coach, e.g.:
   ```
   "My goal '${goal.title}' has been diagnosed with '${diagnosis.diagnosisTitle}'. The suggested strategy is ${strategyMeta.label}. Help me switch to this approach."
   ```

4. Export `diagnoseAndPrescribe`, `buildGoalDoctorContext`, and `GoalDiagnosis` type from `goalDoctor.ts`.
5. Add `export * from './goalDoctor';` to `src/features/goals/index.ts`.

#### Verification Checklist
- [ ] `npm run build` passes
- [ ] All 7 diagnosis cases are handled
- [ ] `diagnoseAndPrescribe` returns `urgency: 'low'` for `primaryRiskReason: 'none'`
- [ ] `buildGoalDoctorContext` returns a non-empty string for any valid input
- [ ] Exported from `index.ts`

---

### Slice 2.2 — `GoalDoctorCard` Component

**Files to create**: `src/components/GoalDoctorCard.tsx`
**Files to read first**: `src/features/goals/goalDoctor.ts`, `src/features/goals/goalHealth.ts` (especially `GoalHealthInput` type), `src/features/goals/GoalWorkspace.tsx` (how goal health is currently displayed, if at all)

#### Steps

1. Create `src/components/GoalDoctorCard.tsx`:

   ```tsx
   type GoalDoctorCardProps = {
     goal: GoalRow;
     healthResult: GoalHealthResult | null;  // null = loading or unavailable
     onSwitchStrategy: (strategy: GoalStrategyType) => void;
     onAskCoach: (prompt: string) => void;
     className?: string;
   };
   ```

2. Component renders:
   - **Header**: `🩺 Goal Health Check`
   - **If `healthResult` is null**: show a subtle loading skeleton or "Health data unavailable" state
   - **If `urgency === 'low'`**: show a collapsed/minimal "Looks healthy ✅" state — do not take up space unnecessarily
   - **If `urgency` is `'medium'` or `'high'`**: show full card:
     - Diagnosis title (bold) + detail (normal text)
     - Strategy prescription: `[icon] Suggested approach: [Strategy Label]`
     - Prescription reason (smaller text)
     - Two action buttons: `[Switch to {Strategy}]` and `[Ask AI Coach]`
   - The `[Ask AI Coach]` button calls `onAskCoach(buildGoalDoctorContext(goal, healthResult))`

3. Style using existing CSS variables. Use `--color-accent-purple` or `--color-accent-pink` for medium/high urgency states. Keep the card compact.

#### Verification Checklist
- [ ] `npm run build` passes
- [ ] Renders "healthy" state without taking up excessive space
- [ ] Shows diagnosis + prescription for `urgency: 'medium'` and `'high'`
- [ ] `onSwitchStrategy` fires with the prescribed strategy when clicked
- [ ] `onAskCoach` fires with the correct pre-filled prompt
- [ ] Handles `healthResult: null` gracefully

---

### Slice 2.3 — Wire Goal Doctor into `GoalWorkspace`

**Files to modify**: `src/features/goals/GoalWorkspace.tsx`
**Files to read first**: Full `GoalWorkspace.tsx`, `src/services/goalExecution.ts` (understand `evaluateGoalHealthFromSignals`)

#### Steps

1. Add state to track goal health per goal: `const [goalHealthById, setGoalHealthById] = useState<Record<string, GoalHealthResult>>({})`.
   - Note: `LifeGoalsSection.tsx` already has this pattern — follow it exactly.

2. After goals load in `refreshGoals`, for each goal call `evaluateGoalHealthFromSignals` (from `src/services/goalExecution.ts`) to populate `goalHealthById`. Do this as a fire-and-forget background call — do not block the goals from rendering.

3. In the active goal card view, render `<GoalDoctorCard>` below the progress bar and above the description:
   - Pass `healthResult={goalHealthById[goal.id] ?? null}`
   - `onSwitchStrategy`: call `updateGoal(goal.id, { goal_strategy_type: strategy })` then refresh
   - `onAskCoach`: call `onNavigateToAiCoach?.(prompt)`

4. Only render `GoalDoctorCard` if `entryChoice !== null` (i.e., user has entered the workspace).

5. When `onSwitchStrategy` is called:
   - Update the goal via `updateGoal`
   - Optimistically update local state
   - Show `setStatusMessage('Strategy updated to ' + strategyMeta.label)`

#### Verification Checklist
- [ ] `npm run build` passes
- [ ] Goal Doctor card renders on the active goal card
- [ ] Health evaluation happens in the background — goals list renders before health data arrives
- [ ] Switching strategy calls `updateGoal` and updates the card
- [ ] AI Coach button navigates to coach with pre-filled prompt
- [ ] Demo mode: health evaluation uses demo data path

---

### Slice 2.4 — Update `docs/AI_ENABLEMENT_ROADMAP.md`

**Files to modify**: `docs/AI_ENABLEMENT_ROADMAP.md`

#### Steps

1. Add a new checklist entry: `- [ ] **Goal Doctor → AI Coach bridge**: Goal Doctor card sends pre-filled diagnosis prompt to AI Coach when user taps "Ask Coach".`
2. Add a new entry under "AI in production today" once Slice 2.3 is complete and shipped.

#### Verification Checklist
- [ ] `docs/AI_ENABLEMENT_ROADMAP.md` updated

---

## 7) Phase 3 — Strategy Mode Card Views (First Three Modes)

**Goal**: For the three highest-value strategy types, render a meaningfully different goal card UI that replaces the standard card view.

**Estimated complexity**: Medium. Requires new components but no new data layer.

**Prerequisite**: Phase 1 and Phase 2 complete.

---

### Slice 3.1 — Micro Wins Strategy Mode

**Files to create**: `src/components/strategy-modes/MicroWinsCard.tsx`
**Files to read first**: `src/features/goals/GoalWorkspace.tsx` (standard goal card for comparison), `src/types/gamification.ts` (XP types), `src/services/goals.ts`

#### The Micro Wins Concept
Instead of showing one big goal, this mode shows 5–10 tiny daily tasks (micro-tasks). Each micro-task is completable with one tap, gives instant XP, and completion is tracked via a "Micro Stars" counter. 10 micro stars = 1 achievement star event.

The micro-tasks are stored in the goal's `progress_notes` field as a structured JSON string (to avoid a new DB table in Phase 3). Format: `{ "microTasks": [{ "id": "uuid", "title": "...", "done": false }, ...] }`. A fallback to plain text `progress_notes` is maintained.

#### Steps

1. Create `src/components/strategy-modes/MicroWinsCard.tsx`:
   - Props: `goal: GoalRow`, `onUpdate: (payload: GoalUpdate) => Promise<void>`, `session: Session`
   - Parse `goal.progress_notes` — if it contains `{ "microTasks": [...] }`, render micro-task mode; otherwise show an "Add micro-tasks" empty state.
   - Render each micro-task as a checkbox row with title. Tapping completes/uncompletes.
   - Show a "Micro Stars" counter: `⭐ X / 10`.
   - "Add micro-task" input: a simple text field + "Add" button that appends to the list and saves.
   - When a micro-task is completed: call `earnXP(XP_REWARDS.HABIT_COMPLETE ?? 10, 'micro_win', goal.id)`.
   - When 10 micro-tasks are completed total: fire a `CelebrationAnimation` with a "Micro Win Champion" message.
   - Include a "Convert to standard goal" link that clears micro-task mode.

2. In `GoalWorkspace.tsx`, add a strategy mode router in the goal card render:
   ```tsx
   {goal.goal_strategy_type === 'micro' ? (
     <MicroWinsCard goal={goal} onUpdate={...} session={session} />
   ) : (
     /* existing standard card content */
   )}
   ```

#### Verification Checklist
- [ ] `npm run build` passes
- [ ] Micro-tasks render from `progress_notes` JSON
- [ ] Completing a micro-task updates the goal and awards XP
- [ ] 10 completions trigger celebration
- [ ] "Add micro-task" works
- [ ] Falls back gracefully if `progress_notes` is plain text
- [ ] Demo mode works

---

### Slice 3.2 — Experiment Lab Strategy Mode

**Files to create**: `src/components/strategy-modes/ExperimentLabCard.tsx`

#### The Experiment Lab Concept
The goal becomes a testable hypothesis. The card shows:
- **Hypothesis**: "If I [do X] for [N days], then [outcome Y] will happen."
- **Test duration**: countdown to end date (derived from `target_date`)
- **Daily check-in**: one-tap "Did it today?" (stored in `progress_notes` as a log)
- **Experiment result** (shown when target date passes): `[Keep] [Adjust] [Discard]` buttons

#### Steps

1. Create `src/components/strategy-modes/ExperimentLabCard.tsx`:
   - Parse `goal.progress_notes` for experiment data: `{ "hypothesis": "...", "dailyLog": ["2026-03-01", ...], "result": null | "keep" | "adjust" | "discard" }`.
   - Show hypothesis statement (editable inline).
   - Show countdown: "X days remaining" or "Experiment ended — what's your verdict?"
   - Show a calendar heatmap-style row of the last 21 days (or since start date) — filled days are logged check-ins.
   - "Did it today?" button logs today's date to `dailyLog` and saves.
   - If experiment has ended (past `target_date`), show verdict buttons.
   - Award bonus XP (1.3× multiplier from `getStrategyXpMultiplier('experiment')`) on verdict selection.

2. Wire into `GoalWorkspace.tsx` strategy router (same pattern as Slice 3.1).

#### Verification Checklist
- [ ] `npm run build` passes
- [ ] Hypothesis editable and saved
- [ ] Countdown correct
- [ ] Daily log persists across sessions
- [ ] Verdict buttons appear after `target_date` passes
- [ ] XP awarded on verdict with experiment multiplier

---

### Slice 3.3 — Identity Builder Strategy Mode

**Files to create**: `src/components/strategy-modes/IdentityBuilderCard.tsx`

#### The Identity Builder Concept
The goal is framed as an identity claim: "I am a [identity]." The card shows:
- **Identity statement** (derived from `goal.title` or editable): "I am a runner."
- **Daily identity actions**: 3 small actions that reinforce the identity (editable list).
- **Identity level**: 0–5, earned by consecutive days of acting as the identity. Displayed as a progress arc or badge.
- **Today's actions**: tap each one to confirm "I acted as this identity today."

#### Steps

1. Create `src/components/strategy-modes/IdentityBuilderCard.tsx`:
   - Parse `progress_notes` for: `{ "identityStatement": "I am a...", "identityActions": ["...", "..."], "identityLog": ["date", ...], "identityLevel": 0 }`.
   - Show identity statement prominently (large text, motivational style).
   - Show 3 identity actions as one-tap checkboxes.
   - Show identity level (0–5) as a visual badge using ⚡ icons.
   - Level up when 7 consecutive days of actions are completed.
   - Award `earnXP(XP_REWARDS.HABIT_COMPLETE ?? 10, 'identity_action', goal.id)` per action.

2. Wire into `GoalWorkspace.tsx` strategy router.

#### Verification Checklist
- [ ] `npm run build` passes
- [ ] Identity statement editable
- [ ] Identity actions tappable and saved
- [ ] Identity level increases correctly
- [ ] XP awarded per action
- [ ] Demo mode works

---

## 8) Phase 4 — Advanced Strategy Modes

**Goal**: Implement Hero Quest, Anti-Goal Shield, and Chaos Dice — three mechanically distinct modes that showcase the app's game-like depth.

**Prerequisite**: Phase 3 complete.

---

### Slice 4.1 — Hero Quest Strategy Mode

**Concept**: The goal becomes a 5-stage quest: `Call to Adventure` → `Training` → `Trials` → `Boss Challenge` → `Transformation`. Each stage has tasks and is completed manually or automatically based on milestone completion.

**Key files**: Create `src/components/strategy-modes/HeroQuestCard.tsx`. Store quest state in `progress_notes` JSON. Wire into strategy router.

**XP**: Stage completions award 1.5× multiplied XP. Boss challenge completion triggers `CelebrationAnimation`.

---

### Slice 4.2 — Anti-Goal Shield Strategy Mode

**Concept**: The goal is framed as protecting a life area from decay. A shield visual shows integrity (0–100%). Missing a day adds a crack. Repairing requires 3 consecutive days of actions.

**Key files**: Create `src/components/strategy-modes/AntiGoalCard.tsx`. Store shield state in `progress_notes` JSON. Wire into strategy router.

---

### Slice 4.3 — Chaos Dice Strategy Mode

**Concept**: Each day, the user spins a virtual dice to get a random micro-challenge from a pre-seeded pool for their life wheel category. No planning required — just spin and act.

**Key files**:
- Create `src/features/goals/chaosChallenges.ts` with a pool of 10–15 challenges per life wheel category (hardcoded for now).
- Create `src/components/strategy-modes/ChaosDiceCard.tsx` — shows today's challenge, a dice spin animation, and a "Done!" button.
- Store which challenges have been completed in `progress_notes` JSON.
- Award 1.4× XP on completion.

---

## 9) Phase 5 — Archetype Integration + XP Multipliers + Telemetry

**Goal**: Connect the strategy engine to the personality archetype system, apply XP multipliers, and add telemetry.

**Prerequisite**: Phase 4 complete. Archetype system (`src/features/identity/`) must have a user's archetype hand available.

---

### Slice 5.1 — Archetype → Strategy Auto-Suggestion

**Files to modify**: `src/components/StrategyPicker.tsx`, `src/components/LifeGoalInputDialog.tsx`
**Files to read first**: `src/features/identity/archetypes/archetypeHandBuilder.ts`, `src/data/localDb.ts` (personality test storage)

#### Steps
1. In `LifeGoalInputDialog`, load the user's personality test from IndexedDB (use `getPersonalityTestsForUser` — already imported via `fetchPersonalityProfile`).
2. If an `archetype_hand` is available, derive the dominant suit from the `dominant.card.suit` field.
3. Map suit to suggested strategy using the Archetype → Strategy Affinity table in Section 4.
4. Pass `suggestedStrategy` to `StrategyPicker` — it will display the "Suggested for you" badge.

---

### Slice 5.2 — Strategy XP Multipliers

**Files to modify**: `src/features/goals/GoalWorkspace.tsx` (and strategy mode components)

#### Steps
1. In each strategy mode component, before calling `earnXP`, apply `getStrategyXpMultiplier(goal.goal_strategy_type)`.
2. Update XP award calls: `earnXP(Math.floor(baseXp * multiplier), sourceType, goal.id)`.
3. Show the multiplier in the goal card: `{multiplier > 1.0 ? `🔥 ${multiplier}× XP` : null}`.

---

### Slice 5.3 — Strategy Telemetry

**Files to modify**: `src/services/telemetry.ts` (or wherever telemetry events are recorded)

#### Steps
1. Add `goal_strategy_selected` event when user picks a strategy.
2. Add `goal_strategy_switched` event when Goal Doctor triggers a switch.
3. Add `goal_strategy_mode_action` event when user takes an action inside a strategy mode card (micro-task complete, experiment check-in, identity action, etc.).

Event shape: `{ eventType: 'goal_strategy_*', metadata: { goalId, strategyType, previousStrategy?, actionType? } }`.

---

## 10) Open Questions

Track unresolved design/technical decisions here. Resolve before the relevant slice begins.

| # | Question | Options | Resolution |
|---|---|---|---|
| Q1 | Should micro-tasks use `progress_notes` JSON or a new `goal_micro_tasks` table? | JSON (Phase 3, no migration) vs new table (Phase 4+, cleaner) | Decided: JSON for Phase 3; evaluate migration in Phase 4 if needed |
| Q2 | Should strategy types be enforced as a DB check constraint or only in TypeScript? | DB constraint (safer) vs TS-only (more flexible for future types) | Decided: DB constraint in migration, with TypeScript union type as source of truth |
| Q3 | Should `LifeGoalInputDialog` show strategy picker as a new required tab or a collapsible section? | New tab (more visible) vs collapsible (less friction) | Decided: Collapsible section — minimise friction for existing users |
| Q4 | How should strategy-specific data (micro-tasks, experiment log, etc.) be stored before we have a dedicated table? | `progress_notes` JSON (Phase 3 pragmatic) vs new columns (cleaner) | Decided: `progress_notes` JSON with clear parser functions; migrate to dedicated columns in a later Phase |
| Q5 | Should Goal Doctor run on every goal load or only on user request? | Background (auto) vs on-demand | Decided: Background, fire-and-forget, same pattern as `LifeGoalsSection.tsx` |

---

## 11) Decisions Log

| Date | Decision | Rationale |
|---|---|---|
| 2026-03-08 | Created standalone plan, not merged into `GOALS_TAB_REDESIGN_PLAN.md` | Strategy engine is a new feature system, not a redesign. Keeping it separate avoids polluting the existing redesign plan and makes agent handoff cleaner. |
| 2026-03-08 | 12 strategy types defined upfront | Better to define the full taxonomy now so the DB constraint and TypeScript union are comprehensive. New types can be added via migration + type update. |
| 2026-03-08 | `standard` is the default and means "no strategy selected" | Avoids breaking changes. All existing goals silently become `standard`. |
| 2026-03-08 | Phase 3 uses `progress_notes` JSON for strategy-specific data | Avoids 3+ new DB migrations in Phase 3. Acceptable tech debt; documented in Q4. |

---

## 12) Progress Log (Living Changelog)

> **Format per entry**:
> - **Date**:
> - **Slice**:
> - **What changed**:
> - **What's next**:
> - **Blockers / deviations** (if any):

### 2026-03-09
- **Slice**: Phase 1 complete (slices 1.1–1.6)
- **PR**: #1165
- **What shipped**:
  - `src/features/goals/goalStrategy.ts` — 12 strategy types with full metadata (label, icon, tagline, description, bestFor, xpMultiplier), `normalizeGoalStrategy()`, `getStrategyXpMultiplier()`
  - `src/components/StrategyPicker.tsx` — Full card grid (role="radiogroup") + compact single-line mode; ✨ Suggested chip support
  - `supabase/migrations/0178_goal_strategy_type.sql` — Additive migration, `goal_strategy_type TEXT NOT NULL DEFAULT 'standard'` with check constraint
  - `src/data/localDb.ts` + `src/data/goalsRepo.ts` — `goal_strategy_type` threaded through offline-first CRUD and Supabase sync
  - `src/components/LifeGoalInputDialog.tsx` (or equivalent) — Collapsible optional strategy picker section; zero disruption to existing flow
  - `src/features/goals/GoalWorkspace.tsx` — Strategy badge (non-standard goals only) + compact picker in edit form
  - `src/features/goals/index.ts` — Re-exports `goalStrategy`
- **What's next**: Phase 2 — Goal Doctor diagnosis engine (slices 2.1–2.4)

- **2026-03-08**
  - **Slice**: Document created (v1)
  - **What changed**: Initial plan written covering Phases 1–5, 19 slices, architecture overview, type definitions, invariants, Q&A log, decisions log.
  - **What's next**: Begin Phase 1, Slice 1.1 — create `src/features/goals/goalStrategy.ts`.
  - **Blockers**: None.

---

## 13) Linked Documents

- [`DEV_PLAN.md`](./DEV_PLAN.md) — Master milestone tracker (add this plan to Linked Feature Plans section)
- [`BUILD_PLAN.md`](./BUILD_PLAN.md) — Execution companion (add strategy engine items to build order)
- [`GOALS_TAB_REDESIGN_PLAN.md`](./GOALS_TAB_REDESIGN_PLAN.md) — Goals tab UX plan (strategy picker is additive to this)
- [`docs/AI_ENABLEMENT_ROADMAP.md`](./docs/AI_ENABLEMENT_ROADMAP.md) — AI roadmap (Goal Doctor bridge documented here)
- [`src/features/goals/goalStrategy.ts`](./src/features/goals/goalStrategy.ts) — Core type file (created in Slice 1.1)
- [`src/features/goals/goalDoctor.ts`](./src/features/goals/goalDoctor.ts) — Diagnosis engine (created in Slice 2.1)