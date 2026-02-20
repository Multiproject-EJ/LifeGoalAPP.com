# Goals + AI Chat + Onboarding Alignment — Execution Plan

## Why this plan exists
This plan turns current feedback into an execution roadmap that is practical for development and clear for product decisions.

Primary goals:
1. Add a **"Chat with AI"** pathway for deeper goal coaching.
2. Let users **confirm a final goal in chat** and have the system create the goal automatically.
3. Complete the remaining Goals UX phases (single-goal mode, guided wizard, wheel submenu).
4. Persist meaningful onboarding outputs into real goals/habits.

### Implementation status (updated)
- ✅ Chat entry now exists in `LifeGoalInputDialog` alongside quick generation.
- ✅ Chat transcript panel now captures local multi-turn messages and drafts a summary card.
- ✅ Summary card now supports **confirm-to-create-goal** in one action (goal + steps via existing save flow).
- ✅ Added `goal-coach-chat` edge function MVP contract and wired chat UI to it.
- ✅ Added finalize-on-demand flow for chat-to-goal confirmation with stronger backend/schema guardrails.
- ✅ Added personality summary + existing goals context injection, with opt-in gating for goal evolution snapshots.
- ✅ Added richer structured context payloads (goals + goal evolution events) and telemetry around context usage.
- ✅ Added feature-flagged context experiment variant (`control` vs `context_rich`) and telemetry metadata tagging by context profile.
- ✅ Added dashboard-ready telemetry summary helper for chat-to-goal conversion by context profile.
- ✅ Wired the chat conversion summary helper into Account telemetry settings as an internal report view.
- ✅ Added date-window filters and daily trend reporting in the surfaced telemetry report view.
- ✅ Added cohort segmentation (new vs returning) and exportable experiment snapshots in telemetry reporting.
- ✅ Guided – Coached now runs a real stepper flow in the creation dialog (Outcome → First actions → Timeline → Confirm).
- ✅ Added single-goal mode foundations in Goals workspace (search + previous/next navigation with one-goal card rendering).
- ✅ Integrated a compact Life Wheel launcher into single-goal mode for category jumping without leaving one-goal view.
- ⏳ Next: add goal strength/progress indicators to the single-goal card.

---

## Current state (baseline)
- Two-path entry exists in Goals (`Slice by Slice`, `Guided – Coached`), and guided mode now advances through a stepper sequence with next/back controls.
- Slice path now defaults to a one-goal-at-a-time card viewer with search and sequential navigation controls.
- Life Wheel category exploration and category context already exist.
- AI goal generation exists in the dialog (`Generate with AI`) as a one-shot suggestion.
- Onboarding captures goal/habit text but does not persist them into domain records.

---

## North-star user journeys

### Journey A — Quick mode (existing, keep)
User enters a short description -> taps **Generate with AI** -> accepts/edit suggestion -> saves.

### Journey B — Chat mode (new)
User taps **Chat with AI** -> has multi-turn coaching -> AI summarizes agreed goal (title, why, target date, milestones, first tasks, optional reminders) -> user confirms -> goal + steps (+ optional alerts) are created in system.

### Journey C — Guided wizard (upgrade)
User chooses **Guided – Coached** -> stepper flow (Outcome -> Metrics -> Timeline -> First actions -> Confirm) -> optional "Refine in chat" step -> save.

---

## Workstreams

## WS1 — Product + UX design
### Deliverables
- Goal creation modal IA update with two AI actions:
  - `Generate with AI` (quick)
  - `Chat with AI` (deep)
- Chat panel states:
  - Empty state
  - In-progress coaching
  - AI summary card
  - Confirmation state
- Guided wizard stepper spec and validation rules.

### Acceptance criteria
- User clearly understands when to use quick vs chat mode.
- Chat always ends in a clear **"Create this goal"** confirmation.

---

## WS2 — Front-end implementation
### Step 1: Add Chat with AI entry points
- Add a `Chat with AI` CTA in `LifeGoalInputDialog`.
- Add the same CTA to Goals workspace main create area for discoverability.

### Step 2: Build `GoalCoachChatPanel` component
- New component with:
  - message list
  - input composer
  - loading/error/retry states
  - "Use summary" / "Create goal" actions
- Keep chat transcript local until user confirms creation.

### Step 3: Summary-to-goal mapping
- Parse AI summary into strongly typed payload:
  - goal fields (`title`, `description`, `life_wheel_category`, `target_date`, `status_tag`)
  - steps/substeps
  - optional alerts
- Reuse existing `insertGoal`, `insertStep`, `insertSubstep`, `insertAlert` services.

### Step 4: Guided wizard (true flow)
- Implement dedicated state machine for step sequence:
  - Outcome
  - Success metrics
  - Timeline
  - First actions
  - Confirmation
- Optional bridge button: "Refine with chat".

### Acceptance criteria
- Confirming chat summary creates records end-to-end without manual copy/paste.
- Guided path is functionally distinct from quick form.

---

## WS3 — AI backend integration
### Step 1: New edge function
- Add `goal-coach-chat` edge function for multi-turn coaching.
- Request shape:
  - `messages[]`
  - optional context (`personality_summary`, `life_wheel_category`, existing goals snippets)
- Response shape:
  - assistant message
  - optional structured `draft_goal` object when confidence is sufficient.

### Step 2: Safety + schema guardrails
- Enforce JSON schema for structured summary.
- If malformed output, return fallback assistant response + no draft.

### Step 3: Model + provider strategy
- Respect user-level `ai_settings` model/provider conventions used by existing AI functions.

### Acceptance criteria
- Function can handle at least 10 turns reliably.
- Function returns valid structured draft when user requests finalization.

---

## WS4 — Personality-aware coaching
### Step 1: Context injection
- Include personality profile context when available:
  - `personality_summary`
  - key trait/axis highlights.

### Step 2: Prompting behavior
- Adjust tone and planning style:
  - high conscientiousness: tighter milestones
  - low stress resilience: smaller step sizes + buffers
  - etc.

### Step 3: Explainability in UI
- Show subtle note: "Tailored using your personality profile" with opt-out toggle.

### Acceptance criteria
- Coaching recommendations differ meaningfully with different trait profiles.
- User can disable personality-tailored coaching from settings.

---

## WS5 — Goals UX completion (phases 2–4)
### Phase 2: Single-goal mode
- Add one-goal-at-a-time card view.
- Add prev/next controls + search.

### Phase 3: Guided flow
- Ship wizard described above.

### Phase 4: Life wheel as submenu
- Compact wheel launcher integrated with single-goal mode.

### Acceptance criteria
- No default bulk list overload in primary path.
- User can always navigate by category and by sequential goal review.

---

## WS6 — Onboarding persistence upgrades
### Game of Life onboarding
- On completion (or relevant steps), persist:
  - `goalName` -> draft goal or active goal
  - `habitName` -> habit seed in habits system

### Day Zero onboarding
- Persist selected life area + tiny habit + reminder as starter records.

### Acceptance criteria
- Onboarding outputs appear in Goals/Habits after completion.
- No duplicate creation on repeated onboarding resume.

---

## WS7 — Telemetry + experiments
Track:
- entry choice selected (`slice`, `guided`, `chat`)
- AI mode used (`quick_generate`, `chat_coach`)
- chat-to-goal conversion
- abandonment points per wizard step
- chat telemetry events for draft/creation path (`goal_coach_chat_sent`, `goal_coach_chat_draft_received`, `goal_coach_chat_goal_created`)

Use feature flags for:
- chat mode rollout
- personality-tailored prompts rollout

---


---

## WS8 — Living goals history (evolution snapshots)
### Step 1: Snapshot lifecycle events
- Save snapshots whenever a goal is created, updated, retitled, timeline-shifted, status-changed, or removed.
- Store before/after payloads and an adaptation summary.

### Step 2: UX language shift
- Replace failure framing with evolution framing in goal history copy.
- Surface "Goal evolved" as a positive event in review UI.

### Step 3: AI access controls
- Add opt-in toggle for "Goal evolution history" in AI settings.
- If enabled, AI can use goal snapshots to understand long-term adaptation.

### Acceptance criteria
- Users can view an auditable history of goal evolution.
- AI only reads goal snapshots when the explicit privacy toggle is enabled.

## Suggested delivery phases (6 sprints)

### Sprint 1 — Foundations
- Update plans/status docs.
- Introduce feature flags and telemetry events.
- UI scaffolding for chat panel.

### Sprint 2 — Chat MVP
- `goal-coach-chat` edge function MVP.
- Front-end chat panel with transcript + retries.

### Sprint 3 — Goal creation from chat
- Structured summary mapping.
- Create goal/steps/alerts from confirmation.

### Sprint 4 — Guided wizard
- True stepper flow in Guided path.
- Bridge into chat refine step.

### Sprint 5 — Single-goal mode + wheel submenu
- Prev/next + search.
- Compact wheel launcher integration.

### Sprint 6 — Onboarding persistence + polish
- Persist onboarding outputs.
- UX refinement, QA, analytics review.

---

## Definition of done (program level)
- Users can choose quick AI or deep chat AI.
- Chat can end in one-click "Create goal as agreed".
- Guided path is a real wizard.
- Single-goal navigation and wheel submenu are live.
- Onboarding seeds real goals/habits.
- Goal evolution snapshots are stored and can be shared with AI only when opted in.
- Docs and status tables reflect reality.

---

## Immediate next actions (this week)
1. Create technical RFC for `goal-coach-chat` payload/response schema.
2. Add `Chat with AI` button + placeholder panel in `LifeGoalInputDialog`.
3. Implement telemetry events for mode selection and conversion funnel.
4. Update Goals redesign status table to reflect Phase 1 partial implementation.
5. Break this plan into GitHub issues (one per workstream milestone).
